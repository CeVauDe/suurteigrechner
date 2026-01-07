import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import webpush from 'web-push'
import { DEFAULT_NOTIFICATION_MESSAGE } from './notificationMessages'

// Use Railway's mounted volume, fallback to temp directory, then current dir
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(os.tmpdir(), 'db.sqlite')

// Flag to disable dispatcher auto-start (useful for testing)
const DISABLE_DISPATCHER = process.env.DISABLE_DISPATCHER === 'true'

let db: Database.Database | null = null

// Configure web-push
const publicKey = process.env.VAPID_PUBLIC_KEY || ''
const privateKey = process.env.VAPID_PRIVATE_KEY || ''

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    'mailto:admin@suurteigrechner.de',
    publicKey,
    privateKey
  )
}

export async function dispatchNotifications() {
  console.log('[Dispatcher] Checking for due reminders...')
  try {
    const reminders = getDueReminders() as any[]
    if (reminders.length === 0) return
    
    console.log(`[Dispatcher] Found ${reminders.length} due reminders`)

    for (const reminder of reminders) {
      const pushSubscription = {
        endpoint: reminder.endpoint,
        keys: {
          p256dh: reminder.p256dh,
          auth: reminder.auth
        }
      }

      try {
        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify({
            title: 'Suurteigrechner',
            body: reminder.message || DEFAULT_NOTIFICATION_MESSAGE,
            icon: '/icons/icon-192x192.png',
            data: { url: '/feedingplan' }
          })
        )
        console.log(`[Dispatcher] Notification sent to ${reminder.endpoint}`)
        deleteReminder(reminder.id)
      } catch (error: any) {
        console.error(`[Dispatcher] Failed to send notification to ${reminder.endpoint}:`, error)
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[Dispatcher] Removing invalid subscription: ${reminder.endpoint}`)
          deleteSubscription(reminder.endpoint)
        }
      }
    }
  } catch (error) {
    console.error('[Dispatcher] Error in dispatcher loop:', error)
  }
}

function startDispatcher() {
  if (DISABLE_DISPATCHER) return
  if ((global as any).__dispatcherStarted) return

  console.log('[Dispatcher] Initializing notification dispatcher...')
  const INTERVAL = 60 * 1000 // Run every minute
  setInterval(dispatchNotifications, INTERVAL)
  dispatchNotifications()
  ;(global as any).__dispatcherStarted = true
}

function initDb() {
  if (db) return db

  console.log('[DB] Initializing database at:', DB_PATH)
  console.log('[DB] Volume mount exists:', fs.existsSync(path.dirname(DB_PATH)))

  // Ensure the directory exists
  const dbDir = path.dirname(DB_PATH)
  try {
    if (!fs.existsSync(dbDir)) {
      console.log('[DB] Creating directory:', dbDir)
      fs.mkdirSync(dbDir, { recursive: true })
    }
  } catch (err) {
    console.error('[DB] Failed to create directory:', dbDir, err)
    throw new Error(`Cannot create database directory: ${dbDir}`)
  }

  try {
    db = new Database(DB_PATH)
    console.log('[DB] Database opened successfully')

    // Enable WAL mode for better concurrency (optional but recommended)
    db.pragma('journal_mode = WAL')

    // Create table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL CHECK(length(text) > 0 AND length(text) <= 280),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT UNIQUE NOT NULL,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subscription_id INTEGER NOT NULL,
        scheduled_time DATETIME NOT NULL,
        FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
      );
    `)
    
    // Migration: Remove last_notified_at column if it exists (no longer needed)
    const hasLastNotifiedAt = db.prepare(`
      SELECT COUNT(*) as count FROM pragma_table_info('reminders') WHERE name = 'last_notified_at'
    `).get() as { count: number }
    
    if (hasLastNotifiedAt.count > 0) {
      console.log('[DB] Migrating: removing last_notified_at column from reminders table')
      db.exec(`
        CREATE TABLE reminders_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          subscription_id INTEGER NOT NULL,
          scheduled_time DATETIME NOT NULL,
          FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
        );
        INSERT INTO reminders_new (id, subscription_id, scheduled_time)
          SELECT id, subscription_id, scheduled_time FROM reminders;
        DROP TABLE reminders;
        ALTER TABLE reminders_new RENAME TO reminders;
      `)
      console.log('[DB] Migration complete')
    }
    
    // Migration: Add message column to reminders table if it doesn't exist
    const hasMessageColumn = db.prepare(`
      SELECT COUNT(*) as count FROM pragma_table_info('reminders') WHERE name = 'message'
    `).get() as { count: number }
    
    if (hasMessageColumn.count === 0) {
      console.log('[DB] Migrating: adding message column to reminders table')
      db.exec(`ALTER TABLE reminders ADD COLUMN message TEXT`)
      console.log('[DB] Migration complete')
    }
    
    // Migration: Convert ISO datetime format to SQLite format
    // Check if any reminders have 'T' in scheduled_time (ISO format)
    const hasIsoFormat = db.prepare(`
      SELECT COUNT(*) as count FROM reminders WHERE scheduled_time LIKE '%T%'
    `).get() as { count: number }
    
    if (hasIsoFormat.count > 0) {
      console.log('[DB] Migrating: converting ISO datetime format to SQLite format')
      db.exec(`
        UPDATE reminders 
        SET scheduled_time = replace(replace(scheduled_time, 'T', ' '), 'Z', '')
        WHERE scheduled_time LIKE '%T%'
      `)
      console.log('[DB] Migration complete')
    }
    
    console.log('[DB] Tables initialized')

    // Start the notification dispatcher
    startDispatcher()
  } catch (err) {
    console.error('[DB] Failed to open database:', err)
    throw err
  }

  return db
}

export interface Entry {
  id: number
  text: string
  created_at: string
}

export interface PushSubscriptionRow {
  id: number
  endpoint: string
  p256dh: string
  auth: string
  created_at: string
}

export interface ReminderRow {
  id: number
  subscription_id: number
  scheduled_time: string
  message: string | null
}

export function getLatestEntries(limit = 10): Entry[] {
  const database = initDb()
  const stmt = database.prepare('SELECT id, text, created_at FROM entries ORDER BY created_at DESC LIMIT ?')
  return stmt.all(limit) as Entry[]
}

export function createEntry(text: string): Entry {
  const trimmed = text.trim()
  if (!trimmed || trimmed.length > 280) {
    throw new Error('Text must be between 1 and 280 characters')
  }

  const database = initDb()
  const stmt = database.prepare('INSERT INTO entries (text) VALUES (?)')
  const info = stmt.run(trimmed)
  
  const getStmt = database.prepare('SELECT id, text, created_at FROM entries WHERE id = ?')
  return getStmt.get(info.lastInsertRowid) as Entry
}

export function getDb() {
  return initDb()
}

// Push Subscription Helpers
export function saveSubscription(endpoint: string, p256dh: string, auth: string): number {
  const database = initDb()
  const stmt = database.prepare(`
    INSERT INTO push_subscriptions (endpoint, p256dh, auth)
    VALUES (?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET
      p256dh = excluded.p256dh,
      auth = excluded.auth
  `)
  const info = stmt.run(endpoint, p256dh, auth)
  
  if (info.changes === 0) {
    // If it was an update, we need to find the ID
    const getStmt = database.prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?')
    const row = getStmt.get(endpoint) as { id: number }
    return row.id
  }
  
  return info.lastInsertRowid as number
}

export function deleteSubscription(endpoint: string) {
  const database = initDb()
  const stmt = database.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
  stmt.run(endpoint)
}

// Reminder Helpers

// Convert ISO datetime (2026-01-07T13:00:00.000Z) to SQLite format (2026-01-07 13:00:00.000)
function toSqliteDatetime(isoString: string): string {
  return isoString.replace('T', ' ').replace('Z', '')
}

export function createReminder(subscriptionId: number, scheduledTime: string, message?: string): number {
  const database = initDb()
  // Convert ISO format to SQLite-compatible format for proper datetime comparisons
  const sqliteTime = toSqliteDatetime(scheduledTime)
  const stmt = database.prepare('INSERT INTO reminders (subscription_id, scheduled_time, message) VALUES (?, ?, ?)')
  const info = stmt.run(subscriptionId, sqliteTime, message || null)
  return info.lastInsertRowid as number
}

export function countActiveReminders(subscriptionId: number): number {
  const database = initDb()
  const stmt = database.prepare(`
    SELECT COUNT(*) as count FROM reminders 
    WHERE subscription_id = ? AND scheduled_time > datetime('now')
  `)
  const result = stmt.get(subscriptionId) as { count: number }
  return result.count
}

export function getDueReminders() {
  const database = initDb()
  // Get reminders where scheduled_time is in the past
  const stmt = database.prepare(`
    SELECT r.id, r.subscription_id, r.scheduled_time, r.message, s.endpoint, s.p256dh, s.auth
    FROM reminders r
    JOIN push_subscriptions s ON r.subscription_id = s.id
    WHERE r.scheduled_time <= datetime('now')
  `)
  return stmt.all()
}

export function deleteReminder(id: number) {
  const database = initDb()
  const stmt = database.prepare('DELETE FROM reminders WHERE id = ?')
  stmt.run(id)
}

export function deleteReminderByIdAndSubscription(id: number, subscriptionId: number): boolean {
  const database = initDb()
  const stmt = database.prepare('DELETE FROM reminders WHERE id = ? AND subscription_id = ?')
  const info = stmt.run(id, subscriptionId)
  return info.changes > 0
}

// Test helper to reset the database singleton
export function resetDb() {
  if (db) {
    db.close()
    db = null
  }
  ;(global as any).__dispatcherStarted = false
}
