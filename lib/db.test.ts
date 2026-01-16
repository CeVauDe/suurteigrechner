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

// Mock notificationMessages to avoid import issues during test
vi.mock('./notificationMessages', () => ({
  DEFAULT_NOTIFICATION_MESSAGE: 'Ziit zum Starter füettere! 🍞',
  NOTIFICATION_MESSAGES: ['Ziit zum Starter füettere! 🍞'],
  MAX_MESSAGE_LENGTH: 255,
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
        expect.stringContaining('Ziit zum Starter füettere!')
      )
    })

    it('should send notification with custom message', async () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/test-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      const customMessage = 'Lueg mal wie din Teig ufgoht! 🥖'
      dbModule.createReminder(subscriptionId, getPastTime(), customMessage)
      
      ;(webpush.sendNotification as Mock).mockResolvedValue({})

      await dbModule.dispatchNotifications()

      expect(webpush.sendNotification).toHaveBeenCalledTimes(1)
      expect(webpush.sendNotification).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining(customMessage)
      )
    })

    it('should use default message when custom message is null', async () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/test-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      dbModule.createReminder(subscriptionId, getPastTime(), undefined)
      
      ;(webpush.sendNotification as Mock).mockResolvedValue({})

      await dbModule.dispatchNotifications()

      expect(webpush.sendNotification).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining('Ziit zum Starter füettere!')
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

  describe('createReminder with message', () => {
    it('should store custom message in database', () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/test-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      const customMessage = 'Ziit zum Stretche und Falde! 🫳'
      dbModule.createReminder(subscriptionId, getPastTime(), customMessage)
      
      const reminders = dbModule.getDueReminders() as any[]
      expect(reminders).toHaveLength(1)
      expect(reminders[0].message).toBe(customMessage)
    })

    it('should store null when no message provided', () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/test-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      dbModule.createReminder(subscriptionId, getPastTime())
      
      const reminders = dbModule.getDueReminders() as any[]
      expect(reminders).toHaveLength(1)
      expect(reminders[0].message).toBeNull()
    })

    it('should handle emoji messages correctly', () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/test-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      const emojiMessage = '🍞🥖🫓🥐 Baking time! 🔥'
      dbModule.createReminder(subscriptionId, getPastTime(), emojiMessage)
      
      const reminders = dbModule.getDueReminders() as any[]
      expect(reminders).toHaveLength(1)
      expect(reminders[0].message).toBe(emojiMessage)
    })

    it('should return the reminder id', () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/test-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      const reminderId = dbModule.createReminder(subscriptionId, getPastTime(), 'Test message')
      
      expect(typeof reminderId).toBe('number')
      expect(reminderId).toBeGreaterThan(0)
    })
  })

  describe('countActiveReminders', () => {
    // Helper to create a future time
    function getFutureTime(hoursFromNow: number = 1): string {
      const date = new Date(Date.now() + hoursFromNow * 3600000)
      return date.toISOString()
    }

    it('should return 0 when no reminders exist', () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/test-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      
      const count = dbModule.countActiveReminders(subscriptionId)
      expect(count).toBe(0)
    })

    it('should count only future reminders', () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/test-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      
      // Create one past reminder and two future reminders
      dbModule.createReminder(subscriptionId, getPastTime())
      dbModule.createReminder(subscriptionId, getFutureTime(1))
      dbModule.createReminder(subscriptionId, getFutureTime(2))
      
      const count = dbModule.countActiveReminders(subscriptionId)
      expect(count).toBe(2)
    })

    it('should count reminders only for the specified subscription', () => {
      const sub1 = dbModule.saveSubscription('https://push.example.com/endpoint-1', 'key1', 'auth1')
      const sub2 = dbModule.saveSubscription('https://push.example.com/endpoint-2', 'key2', 'auth2')
      
      dbModule.createReminder(sub1, getFutureTime(1))
      dbModule.createReminder(sub1, getFutureTime(2))
      dbModule.createReminder(sub2, getFutureTime(1))
      
      expect(dbModule.countActiveReminders(sub1)).toBe(2)
      expect(dbModule.countActiveReminders(sub2)).toBe(1)
    })
  })

  describe('deleteReminderByIdAndSubscription', () => {
    // Helper to create a future time
    function getFutureTime(hoursFromNow: number = 1): string {
      const date = new Date(Date.now() + hoursFromNow * 3600000)
      return date.toISOString()
    }

    it('should delete reminder when id and subscription match', () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/test-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      const reminderId = dbModule.createReminder(subscriptionId, getFutureTime())
      
      const deleted = dbModule.deleteReminderByIdAndSubscription(reminderId, subscriptionId)
      
      expect(deleted).toBe(true)
      expect(dbModule.countActiveReminders(subscriptionId)).toBe(0)
    })

    it('should return false when reminder does not exist', () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/test-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      
      const deleted = dbModule.deleteReminderByIdAndSubscription(99999, subscriptionId)
      
      expect(deleted).toBe(false)
    })

    it('should not delete reminder belonging to different subscription', () => {
      const sub1 = dbModule.saveSubscription('https://push.example.com/endpoint-1', 'key1', 'auth1')
      const sub2 = dbModule.saveSubscription('https://push.example.com/endpoint-2', 'key2', 'auth2')
      
      const reminderId = dbModule.createReminder(sub1, getFutureTime())
      
      // Try to delete sub1's reminder using sub2's id
      const deleted = dbModule.deleteReminderByIdAndSubscription(reminderId, sub2)
      
      expect(deleted).toBe(false)
      // Reminder should still exist
      expect(dbModule.countActiveReminders(sub1)).toBe(1)
    })

    it('should only delete the specified reminder', () => {
      const subscriptionId = dbModule.saveSubscription(
        'https://push.example.com/test-endpoint',
        'test-p256dh-key',
        'test-auth-key'
      )
      const reminder1 = dbModule.createReminder(subscriptionId, getFutureTime(1))
      dbModule.createReminder(subscriptionId, getFutureTime(2))
      dbModule.createReminder(subscriptionId, getFutureTime(3))
      
      const deleted = dbModule.deleteReminderByIdAndSubscription(reminder1, subscriptionId)
      
      expect(deleted).toBe(true)
      expect(dbModule.countActiveReminders(subscriptionId)).toBe(2)
    })
  })

  describe('Recurring Reminders', () => {
    describe('createReminder with recurrence options', () => {
      it('should create a recurring reminder with interval and end date', () => {
        const subscriptionId = dbModule.saveSubscription(
          'https://push.example.com/test-endpoint',
          'test-p256dh-key',
          'test-auth-key'
        )
        
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
        dbModule.createReminder({
          subscriptionId,
          scheduledTime: getPastTime(),
          message: 'Daily reminder',
          recurrenceIntervalHours: 24,
          endDate: endDate.toISOString()
        })
        
        const reminders = dbModule.getDueReminders() as any[]
        expect(reminders).toHaveLength(1)
        expect(reminders[0].message).toBe('Daily reminder')
        expect(reminders[0].recurrence_interval_hours).toBe(24)
        expect(reminders[0].end_date).not.toBeNull()
      })

      it('should create a one-time reminder when no recurrence specified', () => {
        const subscriptionId = dbModule.saveSubscription(
          'https://push.example.com/test-endpoint',
          'test-p256dh-key',
          'test-auth-key'
        )
        
        dbModule.createReminder({
          subscriptionId,
          scheduledTime: getPastTime(),
          message: 'One-time reminder'
        })
        
        const reminders = dbModule.getDueReminders() as any[]
        expect(reminders).toHaveLength(1)
        expect(reminders[0].recurrence_interval_hours).toBeNull()
        expect(reminders[0].end_date).toBeNull()
      })

      it('should support legacy function signature for backwards compatibility', () => {
        const subscriptionId = dbModule.saveSubscription(
          'https://push.example.com/test-endpoint',
          'test-p256dh-key',
          'test-auth-key'
        )
        
        // Old signature: createReminder(subscriptionId, scheduledTime, message)
        dbModule.createReminder(subscriptionId, getPastTime(), 'Legacy message')
        
        const reminders = dbModule.getDueReminders() as any[]
        expect(reminders).toHaveLength(1)
        expect(reminders[0].message).toBe('Legacy message')
        expect(reminders[0].recurrence_interval_hours).toBeNull()
      })
    })

    describe('updateReminderScheduledTime', () => {
      it('should update the scheduled time of a reminder', () => {
        const subscriptionId = dbModule.saveSubscription(
          'https://push.example.com/test-endpoint',
          'test-p256dh-key',
          'test-auth-key'
        )
        
        const reminderId = dbModule.createReminder(subscriptionId, getPastTime())
        
        const newTime = new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
        dbModule.updateReminderScheduledTime(reminderId, newTime.toISOString())
        
        // Should no longer be in due reminders (it's in the future now)
        const dueReminders = dbModule.getDueReminders() as any[]
        expect(dueReminders).toHaveLength(0)
        
        // But should still exist in active reminders
        expect(dbModule.countActiveReminders(subscriptionId)).toBe(1)
      })
    })

    describe('dispatcher with recurring reminders', () => {
      it('should reschedule recurring reminder after sending', async () => {
        const subscriptionId = dbModule.saveSubscription(
          'https://push.example.com/test-endpoint',
          'test-p256dh-key',
          'test-auth-key'
        )
        
        const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week from now
        dbModule.createReminder({
          subscriptionId,
          scheduledTime: getPastTime(),
          message: 'Daily reminder',
          recurrenceIntervalHours: 24,
          endDate: endDate.toISOString()
        })
        
        ;(webpush.sendNotification as Mock).mockResolvedValue({})

        await dbModule.dispatchNotifications()

        expect(webpush.sendNotification).toHaveBeenCalledTimes(1)
        
        // Reminder should still exist (rescheduled, not deleted)
        const db = dbModule.getDb()
        const reminders = db.prepare('SELECT * FROM reminders').all() as any[]
        expect(reminders).toHaveLength(1)
        
        // Scheduled time should be updated to ~24 hours later
        const newScheduledTime = new Date(reminders[0].scheduled_time.replace(' ', 'T') + 'Z')
        const expectedTime = new Date(Date.now() + 23 * 60 * 60 * 1000) // roughly 24h from original past time
        expect(newScheduledTime.getTime()).toBeGreaterThan(Date.now())
      })

      it('should delete one-time reminder after sending', async () => {
        const subscriptionId = dbModule.saveSubscription(
          'https://push.example.com/test-endpoint',
          'test-p256dh-key',
          'test-auth-key'
        )
        
        dbModule.createReminder(subscriptionId, getPastTime())
        
        ;(webpush.sendNotification as Mock).mockResolvedValue({})

        await dbModule.dispatchNotifications()

        // One-time reminder should be deleted
        const db = dbModule.getDb()
        const reminders = db.prepare('SELECT * FROM reminders').all()
        expect(reminders).toHaveLength(0)
      })

      it('should delete recurring reminder when end_date is reached', async () => {
        const subscriptionId = dbModule.saveSubscription(
          'https://push.example.com/test-endpoint',
          'test-p256dh-key',
          'test-auth-key'
        )
        
        // End date is in the past (so next occurrence would be after end date)
        const endDate = new Date(Date.now() - 1000) // 1 second ago
        dbModule.createReminder({
          subscriptionId,
          scheduledTime: getPastTime(),
          message: 'Final reminder',
          recurrenceIntervalHours: 24,
          endDate: endDate.toISOString()
        })
        
        ;(webpush.sendNotification as Mock).mockResolvedValue({})

        await dbModule.dispatchNotifications()

        expect(webpush.sendNotification).toHaveBeenCalledTimes(1)
        
        // Reminder should be deleted (end date passed)
        const db = dbModule.getDb()
        const reminders = db.prepare('SELECT * FROM reminders').all()
        expect(reminders).toHaveLength(0)
      })

      it('should append last notification message when end_date is reached', async () => {
        const subscriptionId = dbModule.saveSubscription(
          'https://push.example.com/test-endpoint',
          'test-p256dh-key',
          'test-auth-key'
        )
        
        // End date is in the past (so this is the last notification)
        const endDate = new Date(Date.now() - 1000)
        dbModule.createReminder({
          subscriptionId,
          scheduledTime: getPastTime(),
          message: 'Daily reminder',
          recurrenceIntervalHours: 24,
          endDate: endDate.toISOString()
        })
        
        ;(webpush.sendNotification as Mock).mockResolvedValue({})

        await dbModule.dispatchNotifications()

        expect(webpush.sendNotification).toHaveBeenCalledWith(
          expect.any(Object),
          expect.stringContaining('Letschti Erinnerig')
        )
      })

      it('should not append last notification message for regular recurring notifications', async () => {
        const subscriptionId = dbModule.saveSubscription(
          'https://push.example.com/test-endpoint',
          'test-p256dh-key',
          'test-auth-key'
        )
        
        // End date is far in the future
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        dbModule.createReminder({
          subscriptionId,
          scheduledTime: getPastTime(),
          message: 'Daily reminder',
          recurrenceIntervalHours: 24,
          endDate: endDate.toISOString()
        })
        
        ;(webpush.sendNotification as Mock).mockResolvedValue({})

        await dbModule.dispatchNotifications()

        // Should NOT contain the "last notification" suffix
        const callArgs = (webpush.sendNotification as Mock).mock.calls[0][1]
        expect(callArgs).not.toContain('Letschti Erinnerig')
        expect(callArgs).toContain('Daily reminder')
      })

      it('should handle multiple recurring reminders with different intervals', async () => {
        const subscriptionId = dbModule.saveSubscription(
          'https://push.example.com/test-endpoint',
          'test-p256dh-key',
          'test-auth-key'
        )
        
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        
        // Daily reminder
        dbModule.createReminder({
          subscriptionId,
          scheduledTime: getPastTime(),
          message: 'Daily',
          recurrenceIntervalHours: 24,
          endDate: endDate.toISOString()
        })
        
        // Weekly reminder
        dbModule.createReminder({
          subscriptionId,
          scheduledTime: getPastTime(),
          message: 'Weekly',
          recurrenceIntervalHours: 168,
          endDate: endDate.toISOString()
        })
        
        ;(webpush.sendNotification as Mock).mockResolvedValue({})

        await dbModule.dispatchNotifications()

        expect(webpush.sendNotification).toHaveBeenCalledTimes(2)
        
        // Both reminders should still exist (rescheduled)
        const db = dbModule.getDb()
        const reminders = db.prepare('SELECT * FROM reminders ORDER BY recurrence_interval_hours').all() as any[]
        expect(reminders).toHaveLength(2)
        expect(reminders[0].recurrence_interval_hours).toBe(24)
        expect(reminders[1].recurrence_interval_hours).toBe(168)
      })
    })

    describe('schema migration', () => {
      it('should have recurrence_interval_hours column', () => {
        const db = dbModule.getDb()
        const columns = db.prepare(`PRAGMA table_info(reminders)`).all() as any[]
        const hasColumn = columns.some((col: any) => col.name === 'recurrence_interval_hours')
        expect(hasColumn).toBe(true)
      })

      it('should have end_date column', () => {
        const db = dbModule.getDb()
        const columns = db.prepare(`PRAGMA table_info(reminders)`).all() as any[]
        const hasColumn = columns.some((col: any) => col.name === 'end_date')
        expect(hasColumn).toBe(true)
      })
    })
  })
})
