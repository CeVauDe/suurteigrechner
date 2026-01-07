import type { NextApiRequest, NextApiResponse } from 'next'
import DOMPurify from 'isomorphic-dompurify'
import { getDb, createReminder } from '../../../lib/db'
import { MAX_MESSAGE_LENGTH } from '../../../lib/notificationMessages'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { endpoint, scheduledTime, message } = req.body

    if (!endpoint || !scheduledTime) {
      return res.status(400).json({ message: 'Endpoint and scheduledTime are required' })
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

    createReminder(subscription.id, scheduledTime, sanitizedMessage)

    res.status(201).json({ message: 'Reminder scheduled successfully' })
  } catch (error) {
    console.error('Error scheduling reminder:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
