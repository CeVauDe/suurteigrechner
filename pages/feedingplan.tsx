import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  try {
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  } catch (e) {
    console.error('Failed to decode VAPID public key:', e)
    throw new Error('Invalid VAPID public key format')
  }
}

export default function FeedingPlan() {
  const [reminderDateTime, setReminderDateTime] = useState('')
  const [status, setStatus] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Set default to 12 hours from now
    const defaultTime = new Date(Date.now() + 12 * 60 * 60 * 1000)
    setReminderDateTime(formatDateTimeLocal(defaultTime))
    
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription)
        })
      })
    }
  }, [])

  // Format Date to datetime-local input format (YYYY-MM-DDTHH:mm)
  function formatDateTimeLocal(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const subscribeUser = async () => {
    setLoading(true)
    try {
      // Request permission explicitly
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('Permission not granted for notifications.')
        setLoading(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      
      // Unsubscribe existing to avoid conflicts with old VAPID keys
      const existingSubscription = await registration.pushManager.getSubscription()
      if (existingSubscription) {
        await existingSubscription.unsubscribe()
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      
      if (!publicKey) {
        throw new Error('VAPID public key is missing. Check that NEXT_PUBLIC_VAPID_PUBLIC_KEY is set.')
      }

      // Clean the key (remove whitespace/quotes)
      const cleanPublicKey = publicKey.trim().replace(/"/g, '')

      let subscription
      try {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(cleanPublicKey)
        })
      } catch (pushError: unknown) {
        const errorMessage = pushError instanceof Error ? pushError.message : String(pushError)
        console.error('Push subscription failed:', pushError)
        if (errorMessage.includes('push service')) {
          throw new Error('Push service error. Check browser settings allow push notifications.')
        }
        throw pushError
      }

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription }),
        headers: { 'Content-Type': 'application/json' }
      })

      setIsSubscribed(true)
      setStatus('Successfully subscribed to notifications!')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('Failed to subscribe:', err)
      setStatus(`Failed to subscribe: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  const scheduleReminder = async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        setStatus('Please enable notifications first.')
        return
      }

      const selectedDate = new Date(reminderDateTime)
      if (isNaN(selectedDate.getTime())) {
        setStatus('Please select a valid date and time.')
        return
      }

      if (selectedDate <= new Date()) {
        setStatus('Please select a time in the future.')
        return
      }

      const scheduledTime = selectedDate.toISOString()

      const res = await fetch('/api/notifications/remind', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          scheduledTime
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      if (res.ok) {
        const formattedTime = selectedDate.toLocaleString()
        setStatus(`Reminder set for ${formattedTime}!`)
      } else {
        const data = await res.json()
        setStatus(`Error: ${data.message}`)
      }
    } catch (err) {
      console.error('Failed to schedule reminder:', err)
      setStatus('Failed to schedule reminder.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Feeding Plan - Suurteigrechner</title>
      </Head>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h1 className="h2 mb-4 text-center">Feeding Plan</h1>
                
                <div className="mb-4">
                  <label className="form-label">Remind me at</label>
                  <input 
                    type="datetime-local" 
                    className="form-control form-control-lg" 
                    value={reminderDateTime} 
                    onChange={(e) => setReminderDateTime(e.target.value)}
                  />
                </div>

                <div className="d-grid gap-2">
                  {!isSubscribed ? (
                    <button 
                      className="btn btn-primary btn-lg" 
                      onClick={subscribeUser}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Enable Notifications'}
                    </button>
                  ) : (
                    <button 
                      className="btn btn-success btn-lg" 
                      onClick={scheduleReminder}
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Set Reminder'}
                    </button>
                  )}
                </div>

                {status && (
                  <div className={`alert mt-4 ${status.includes('Error') || status.includes('Failed') ? 'alert-danger' : 'alert-info'}`}>
                    {status}
                  </div>
                )}

                <div className="mt-5 text-center">
                  <Link href="/" className="text-decoration-none">← Back to Calculator</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
