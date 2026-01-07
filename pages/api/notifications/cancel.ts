import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb, deleteReminderByIdAndSubscription } from '../../../lib/db'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { endpoint, reminderId } = req.body

    if (!endpoint || !reminderId) {
      return res.status(400).json({ message: 'Endpoint and reminderId are required' })
    }

    const db = getDb()
    const subscription = db.prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?').get(endpoint) as { id: number } | undefined

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription nöd gfunde.' })
    }

    const deleted = deleteReminderByIdAndSubscription(reminderId, subscription.id)

    if (deleted) {
      res.status(200).json({ message: 'Erinnerig glöscht' })
    } else {
      res.status(404).json({ message: 'Erinnerig nöd gfunde' })
    }
  } catch (error) {
    console.error('Error cancelling reminder:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
