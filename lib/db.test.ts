import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

// Mock web-push before importing db
vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}))

// Mock console methods to verify logging
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

// Store references to imported modules (will be re-imported each test)
let webpush: typeof import('web-push').default
let dbModule: typeof import('./db')
let testDbPath: string

// Helper to create a past time in SQLite-compatible format
function getPastTime(): string {
  // Use a time 1 hour in the past to ensure it's definitely due
  const date = new Date(Date.now() - 3600000)
  return date.toISOString().replace('T', ' ').replace('Z', '')
}

describe('Notification Dispatcher', () => {
  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks()
    
    // Create a unique database path for this test
    testDbPath = path.join(os.tmpdir(), `test-db-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`)
    
    // Set environment variables before importing
    process.env.SQLITE_DB_PATH = testDbPath
    process.env.DISABLE_DISPATCHER = 'true'
    
    // Reset modules to get fresh imports with new env vars
    vi.resetModules()
    
    // Re-import modules
    webpush = (await import('web-push')).default
    dbModule = await import('./db')
    
    // Initialize the database
    dbModule.getDb()
  })

  afterEach(() => {
    // Close and cleanup database
    if (dbModule) {
      dbModule.resetDb()
    }
    
    // Clean up test database files
    if (testDbPath && fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath)
        if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`)
        if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`)
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  describe('when there are no due reminders', () => {
    it('should not send any notifications', async () => {
      await dbModule.dispatchNotifications()

      expect(webpush.sendNotification).not.toHaveBeenCalled()
      expect(mockConsoleLog).toHaveBeenCalledWith('[Dispatcher] Checking for due reminders...')
    })
  })

  describe('when there are due reminders', () => {
    it('should send notification for due reminder', async () => {
      // Create subscription and reminder within the test
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/test-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      dbModule.createReminder(subscriptionId, getPastTime())
      
      ;(webpush.sendNotification as Mock).mockResolvedValue({})

      await dbModule.dispatchNotifications()

      expect(webpush.sendNotification).toHaveBeenCalledTimes(1)
      expect(webpush.sendNotification).toHaveBeenCalledWith(
        {
          endpoint: 'https://push.example.com/test-endpoint',
          keys: {
            p256dh: 'test-p256dh-key',
            auth: 'test-auth-key',
          },
        },
        expect.stringContaining('Time to feed your starter!')
      )
    })

    it('should delete reminder after successful notification', async () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/test-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      dbModule.createReminder(subscriptionId, getPastTime())
      
      ;(webpush.sendNotification as Mock).mockResolvedValue({})

      // Initially reminder exists
      const remindersBefore = dbModule.getDueReminders()
      expect(remindersBefore).toHaveLength(1)

      await dbModule.dispatchNotifications()

      // After notification, reminder should be deleted (not just marked as notified)
      const remindersAfter = dbModule.getDueReminders()
      expect(remindersAfter).toHaveLength(0)
      
      // Verify reminder is actually deleted from DB, not just filtered
      const db = dbModule.getDb()
      const allReminders = db.prepare('SELECT * FROM reminders').all()
      expect(allReminders).toHaveLength(0)
    })

    it('should log successful notification', async () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/test-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      dbModule.createReminder(subscriptionId, getPastTime())
      
      ;(webpush.sendNotification as Mock).mockResolvedValue({})

      await dbModule.dispatchNotifications()

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Dispatcher] Notification sent to https://push.example.com/test-endpoint'
      )
    })
  })

  describe('when notification fails with 410 (Gone)', () => {
    it('should delete the subscription from database', async () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/expired-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      dbModule.createReminder(subscriptionId, getPastTime())
      
      const error = new Error('Subscription expired')
      ;(error as any).statusCode = 410
      ;(webpush.sendNotification as Mock).mockRejectedValue(error)

      // Verify subscription exists before
      const db = dbModule.getDb()
      const subsBefore = db.prepare('SELECT * FROM push_subscriptions').all()
      expect(subsBefore).toHaveLength(1)

      await dbModule.dispatchNotifications()

      // Verify subscription was deleted
      const subsAfter = db.prepare('SELECT * FROM push_subscriptions').all()
      expect(subsAfter).toHaveLength(0)
    })

    it('should log the removal of invalid subscription', async () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/expired-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      dbModule.createReminder(subscriptionId, getPastTime())
      
      const error = new Error('Subscription expired')
      ;(error as any).statusCode = 410
      ;(webpush.sendNotification as Mock).mockRejectedValue(error)

      await dbModule.dispatchNotifications()

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Dispatcher] Removing invalid subscription: https://push.example.com/expired-endpoint'
      )
    })
  })

  describe('when notification fails with 404 (Not Found)', () => {
    it('should delete the subscription from database', async () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/not-found-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      dbModule.createReminder(subscriptionId, getPastTime())
      
      const error = new Error('Subscription not found')
      ;(error as any).statusCode = 404
      ;(webpush.sendNotification as Mock).mockRejectedValue(error)

      await dbModule.dispatchNotifications()

      const db = dbModule.getDb()
      const subsAfter = db.prepare('SELECT * FROM push_subscriptions').all()
      expect(subsAfter).toHaveLength(0)
    })
  })

  describe('when notification fails with other error', () => {
    it('should keep the subscription in database', async () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/error-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      dbModule.createReminder(subscriptionId, getPastTime())
      
      const error = new Error('Network error')
      ;(error as any).statusCode = 500
      ;(webpush.sendNotification as Mock).mockRejectedValue(error)

      await dbModule.dispatchNotifications()

      // Subscription should still exist
      const db = dbModule.getDb()
      const subsAfter = db.prepare('SELECT * FROM push_subscriptions').all()
      expect(subsAfter).toHaveLength(1)
    })

    it('should log the error', async () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/error-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      dbModule.createReminder(subscriptionId, getPastTime())
      
      const error = new Error('Network error')
      ;(error as any).statusCode = 500
      ;(webpush.sendNotification as Mock).mockRejectedValue(error)

      await dbModule.dispatchNotifications()

      expect(mockConsoleError).toHaveBeenCalledWith(
        '[Dispatcher] Failed to send notification to https://push.example.com/error-endpoint:',
        error
      )
    })

    it('should not delete reminder on failure', async () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/error-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      dbModule.createReminder(subscriptionId, getPastTime())
      
      const error = new Error('Network error')
      ;(error as any).statusCode = 500
      ;(webpush.sendNotification as Mock).mockRejectedValue(error)

      // Reminder should still exist after failed notification (will retry)
      await dbModule.dispatchNotifications()

      const remindersAfter = dbModule.getDueReminders()
      expect(remindersAfter).toHaveLength(1)
    })
  })

  describe('with multiple reminders', () => {
    it('should send notifications to all due reminders', async () => {
      const sub1 = dbModule.saveSubscription('https://push.example.com/endpoint-1', 'key1', 'auth1')
      const sub2 = dbModule.saveSubscription('https://push.example.com/endpoint-2', 'key2', 'auth2')
      const sub3 = dbModule.saveSubscription('https://push.example.com/endpoint-3', 'key3', 'auth3')
      
      const pastTime = getPastTime()
      dbModule.createReminder(sub1, pastTime)
      dbModule.createReminder(sub2, pastTime)
      dbModule.createReminder(sub3, pastTime)
      
      ;(webpush.sendNotification as Mock).mockResolvedValue({})

      await dbModule.dispatchNotifications()

      expect(webpush.sendNotification).toHaveBeenCalledTimes(3)
    })

    it('should continue processing after one failure', async () => {
      const sub1 = dbModule.saveSubscription('https://push.example.com/endpoint-1', 'key1', 'auth1')
      const sub2 = dbModule.saveSubscription('https://push.example.com/endpoint-2', 'key2', 'auth2')
      const sub3 = dbModule.saveSubscription('https://push.example.com/endpoint-3', 'key3', 'auth3')
      
      const pastTime = getPastTime()
      dbModule.createReminder(sub1, pastTime)
      dbModule.createReminder(sub2, pastTime)
      dbModule.createReminder(sub3, pastTime)
      
      // First call succeeds, second fails with 410, third succeeds
      ;(webpush.sendNotification as Mock)
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(Object.assign(new Error('Gone'), { statusCode: 410 }))
        .mockResolvedValueOnce({})

      await dbModule.dispatchNotifications()

      expect(webpush.sendNotification).toHaveBeenCalledTimes(3)
      
      // Check database state: 2 subscriptions remain (one deleted), 
      // and the failed one's reminder is also gone due to CASCADE
      const db = dbModule.getDb()
      const subsAfter = db.prepare('SELECT * FROM push_subscriptions').all()
      expect(subsAfter).toHaveLength(2)
    })
  })
})
