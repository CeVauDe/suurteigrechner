import type { NextApiRequest, NextApiResponse } from 'next'
import { saveSubscription } from '../../../lib/db'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { subscription } = req.body

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ message: 'Invalid subscription object' })
    }

    saveSubscription(
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth
    )

    res.status(201).json({ message: 'Subscription saved successfully' })
  } catch (error) {
    console.error('Error saving subscription:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
