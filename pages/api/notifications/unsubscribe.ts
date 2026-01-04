import type { NextApiRequest, NextApiResponse } from 'next'
import { deleteSubscription } from '../../../lib/db'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { endpoint } = req.body

    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint is required' })
    }

    deleteSubscription(endpoint)

    res.status(200).json({ message: 'Subscription removed successfully' })
  } catch (error) {
    console.error('Error removing subscription:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
