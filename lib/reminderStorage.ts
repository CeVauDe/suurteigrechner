import { LocalReminder } from './types'

const REMINDERS_KEY = 'suurteig_reminders'

/**
 * Save a reminder to localStorage
 */
export function saveReminderLocally(reminder: LocalReminder): void {
  if (typeof window === 'undefined') return
  
  const stored = localStorage.getItem(REMINDERS_KEY)
  const reminders: LocalReminder[] = stored ? JSON.parse(stored) : []
  reminders.push(reminder)
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(reminders))
}

/**
 * Get all future reminders, automatically cleaning up past ones
 * Returns reminders sorted by scheduled time (earliest first)
 */
export function getFutureReminders(): LocalReminder[] {
  if (typeof window === 'undefined') return []
  
  const stored = localStorage.getItem(REMINDERS_KEY)
  if (!stored) return []
  
  const reminders: LocalReminder[] = JSON.parse(stored)
  const now = new Date().toISOString()
  
  // Filter to only future/active reminders
  const futureReminders = reminders.filter(r => {
    // For recurring reminders, check if end date is still in the future
    if (r.recurrenceIntervalHours && r.endDate) {
      return r.endDate > now
    }
    // For one-time reminders, check scheduled time
    return r.scheduledTime > now
  })
  
  // Persist the cleaned list (removes past reminders)
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(futureReminders))
  
  // Sort by scheduled time (earliest first)
  return futureReminders.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
}

/**
 * Delete a reminder from localStorage by its server ID
 */
export function deleteReminderLocally(id: number): void {
  if (typeof window === 'undefined') return
  
  const stored = localStorage.getItem(REMINDERS_KEY)
  if (!stored) return
  
  const reminders: LocalReminder[] = JSON.parse(stored)
  const filtered = reminders.filter(r => r.id !== id)
  localStorage.setItem(REMINDERS_KEY, JSON.stringify(filtered))
}
