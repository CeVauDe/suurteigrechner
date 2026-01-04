import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb, createReminder } from '../../../lib/db'

/**
 * DEBUG ONLY: This route helps test the notification dispatcher by:
 * 1. Finding the most recent subscription.
 * 2. Creating a reminder for it that is already due (1 minute ago).
 * 3. Returning the status.
 * 
 * The background dispatcher (running every 5 mins) should pick it up.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Not available in production' })
  }

  try {
    const db = getDb()
    
    // 1. Get the latest subscription
    const subscription = db.prepare('SELECT id, endpoint FROM push_subscriptions ORDER BY created_at DESC LIMIT 1').get() as { id: number, endpoint: string } | undefined

    if (!subscription) {
      return res.status(404).json({ message: 'No subscriptions found. Please subscribe in the UI first.' })
    }

    // 2. Create a reminder that is already due (1 minute ago)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    
    // Clear existing reminders for this sub to avoid cooldown issues during testing
    db.prepare('DELETE FROM reminders WHERE subscription_id = ?').run(subscription.id)
    
    createReminder(subscription.id, oneMinuteAgo)

    res.status(200).json({ 
      message: 'Debug reminder created!',
      details: {
        subscriptionId: subscription.id,
        endpoint: subscription.endpoint,
        scheduledTime: oneMinuteAgo,
        note: 'The background dispatcher will pick this up within 5 minutes. Check server logs.'
      }
    })
  } catch (error) {
    console.error('Debug route error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
