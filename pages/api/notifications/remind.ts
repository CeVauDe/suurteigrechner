import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb, createReminder } from '../../../lib/db'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { endpoint, scheduledTime } = req.body

    if (!endpoint || !scheduledTime) {
      return res.status(400).json({ message: 'Endpoint and scheduledTime are required' })
    }

    const db = getDb()
    const subscription = db.prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?').get(endpoint) as { id: number }

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found. Please subscribe first.' })
    }

    createReminder(subscription.id, scheduledTime)

    res.status(201).json({ message: 'Reminder scheduled successfully' })
  } catch (error) {
    console.error('Error scheduling reminder:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
