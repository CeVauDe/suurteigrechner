import type { NextApiRequest, NextApiResponse } from 'next'
import DOMPurify from 'isomorphic-dompurify'
import { getDb, createReminder, countActiveReminders } from '../../../lib/db'
import { MAX_MESSAGE_LENGTH } from '../../../lib/notificationMessages'
import { MAX_REMINDERS, RECURRENCE_OPTIONS } from '../../../lib/types'

// Valid recurrence interval values
const VALID_INTERVALS = RECURRENCE_OPTIONS.map(o => o.hours)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { endpoint, scheduledTime, message, recurrenceIntervalHours, endDate } = req.body

    if (!endpoint || !scheduledTime) {
      return res.status(400).json({ message: 'Endpoint and scheduledTime are required' })
    }

    // Validate recurrence interval if provided
    if (recurrenceIntervalHours !== undefined && recurrenceIntervalHours !== null) {
      if (!VALID_INTERVALS.includes(recurrenceIntervalHours)) {
        return res.status(400).json({ 
          message: `Invalid recurrence interval. Must be one of: ${VALID_INTERVALS.filter(v => v !== null).join(', ')} hours` 
        })
      }
    }

    // Validate end date if provided
    let finalEndDate: string | null = null
    const maxEndDate = new Date()
    maxEndDate.setFullYear(maxEndDate.getFullYear() + 1)

    if (recurrenceIntervalHours) {
      if (endDate) {
        const endDateObj = new Date(endDate)
        if (isNaN(endDateObj.getTime())) {
          return res.status(400).json({ message: 'Invalid end date format' })
        }
        if (endDateObj <= new Date()) {
          return res.status(400).json({ message: 'End date must be in the future' })
        }
        if (endDateObj <= new Date(scheduledTime)) {
          return res.status(400).json({ message: 'End date must be after scheduled time' })
        }
        // Cap at max 1 year
        finalEndDate = endDateObj > maxEndDate ? maxEndDate.toISOString() : endDate
      } else {
        // Default to 1 year from now for recurring reminders
        finalEndDate = maxEndDate.toISOString()
      }
    }

    // Sanitize and validate message if provided
    let sanitizedMessage: string | undefined
    if (message !== undefined && message !== null && message !== '') {
      const messageStr = String(message)
      
      // Check length (UTF-8 safe - JavaScript strings are UTF-16)
      if (messageStr.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ 
          message: `Message must be ${MAX_MESSAGE_LENGTH} characters or less` 
        })
      }
      
      // Sanitize HTML to prevent XSS (allows safe HTML for future rendering)
      sanitizedMessage = DOMPurify.sanitize(messageStr, {
        ALLOWED_TAGS: [], // Strip all HTML tags for now, keeping text content
        ALLOWED_ATTR: [],
      }).trim()
      
      // If sanitization resulted in empty string, don't use it
      if (sanitizedMessage === '') {
        sanitizedMessage = undefined
      }
    }

    const db = getDb()
    const subscription = db.prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?').get(endpoint) as { id: number }

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found. Please subscribe first.' })
    }

    // Check reminder limit
    const activeCount = countActiveReminders(subscription.id)
    if (activeCount >= MAX_REMINDERS) {
      return res.status(429).json({ 
        message: `Du hesch scho ${MAX_REMINDERS} Erinnerige. Lösch zerscht eini.` 
      })
    }

    const reminderId = createReminder({
      subscriptionId: subscription.id,
      scheduledTime,
      message: sanitizedMessage,
      recurrenceIntervalHours: recurrenceIntervalHours || null,
      endDate: finalEndDate
    })

    res.status(201).json({ 
      id: reminderId, 
      message: 'Erinnerig gsetzt!',
      endDate: finalEndDate  // Return the actual end date (may be capped)
    })
  } catch (error) {
    console.error('Error scheduling reminder:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
