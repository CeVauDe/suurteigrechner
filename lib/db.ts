import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import webpush from 'web-push'

// Use Railway's mounted volume, fallback to temp directory, then current dir
const DB_PATH = process.env.SQLITE_DB_PATH || path.join(os.tmpdir(), 'db.sqlite')

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

async function dispatchNotifications() {
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
            body: 'Time to feed your starter! 🥖',
            icon: '/icons/icon-192x192.png',
            data: { url: '/feedingplan' }
          })
        )
        console.log(`[Dispatcher] Notification sent to ${reminder.endpoint}`)
        updateReminderNotified(reminder.id)
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
  if ((global as any).__dispatcherStarted) return

  console.log('[Dispatcher] Initializing notification dispatcher...')
  const INTERVAL = 5 * 60 * 1000
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
        last_notified_at DATETIME,
        FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
      );
    `)
    
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
  last_notified_at: string | null
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
export function createReminder(subscriptionId: number, scheduledTime: string) {
  const database = initDb()
  const stmt = database.prepare('INSERT INTO reminders (subscription_id, scheduled_time) VALUES (?, ?)')
  stmt.run(subscriptionId, scheduledTime)
}

export function getDueReminders() {
  const database = initDb()
  // Get reminders where scheduled_time is in the past AND (last_notified_at is null OR > 15 mins ago)
  const stmt = database.prepare(`
    SELECT r.*, s.endpoint, s.p256dh, s.auth
    FROM reminders r
    JOIN push_subscriptions s ON r.subscription_id = s.id
    WHERE r.scheduled_time <= CURRENT_TIMESTAMP
    AND (r.last_notified_at IS NULL OR r.last_notified_at <= datetime('now', '-15 minutes'))
  `)
  return stmt.all()
}

export function updateReminderNotified(id: number) {
  const database = initDb()
  const stmt = database.prepare('UPDATE reminders SET last_notified_at = CURRENT_TIMESTAMP WHERE id = ?')
  stmt.run(id)
}
