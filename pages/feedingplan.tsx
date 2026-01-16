import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { NOTIFICATION_MESSAGES, DEFAULT_NOTIFICATION_MESSAGE, MAX_MESSAGE_LENGTH } from '../lib/notificationMessages'
import { LocalReminder, MAX_REMINDERS, RECURRENCE_OPTIONS } from '../lib/types'
import { saveReminderLocally, getFutureReminders, deleteReminderLocally } from '../lib/reminderStorage'

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
  const [reminderMessage, setReminderMessage] = useState<string>(DEFAULT_NOTIFICATION_MESSAGE)
  const [isCustomMessage, setIsCustomMessage] = useState(false)
  const [recurrenceIntervalHours, setRecurrenceIntervalHours] = useState<number | null>(null)
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [futureReminders, setFutureReminders] = useState<LocalReminder[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Load and refresh reminders
  const refreshReminders = useCallback(() => {
    const reminders = getFutureReminders()
    setFutureReminders(reminders)
  }, [])

  useEffect(() => {
    // Set default to 1 hour from now
    const defaultTime = new Date(Date.now() + 1 * 60 * 60 * 1000)
    setReminderDateTime(formatDateTimeLocal(defaultTime))
    
    // Load reminders from localStorage
    refreshReminders()
    
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setIsSubscribed(!!subscription)
        })
      })
    }
  }, [refreshReminders])

  // Periodic cleanup every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshReminders()
    }, 60 * 1000)
    return () => clearInterval(interval)
  }, [refreshReminders])

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

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

      // Convert end date to end-of-day UTC if provided
      let endDateUtc: string | undefined
      if (recurrenceIntervalHours && endDate) {
        endDateUtc = new Date(endDate + 'T23:59:59').toISOString()
      }

      const res = await fetch('/api/notifications/remind', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          scheduledTime,
          message: reminderMessage.trim() || undefined,
          recurrenceIntervalHours,
          endDate: endDateUtc
        }),
        headers: { 'Content-Type': 'application/json' }
      })

      if (res.ok) {
        const data = await res.json()
        const formattedTime = selectedDate.toLocaleString()
        
        // Save locally with server ID
        const newReminder: LocalReminder = {
          id: data.id,
          scheduledTime: scheduledTime,
          message: reminderMessage.trim() || DEFAULT_NOTIFICATION_MESSAGE,
          createdAt: new Date().toISOString(),
          recurrenceIntervalHours,
          endDate: data.endDate  // Use server's end date (may be capped at 1 year)
        }
        saveReminderLocally(newReminder)
        refreshReminders()
        
        const recurrenceLabel = RECURRENCE_OPTIONS.find(o => o.hours === recurrenceIntervalHours)?.label
        const toastMessage = recurrenceIntervalHours 
          ? `${recurrenceLabel} Erinnerig gsetzt ab ${formattedTime}!`
          : `Erinnerig gsetzt für ${formattedTime}!`
        setToast({ message: toastMessage, type: 'success' })
        setStatus('')
        
        // Reset form
        setEndDate('')
      } else {
        const data = await res.json()
        setStatus(`Fehler: ${data.message}`)
      }
    } catch (err) {
      console.error('Failed to schedule reminder:', err)
      setStatus('Erinnerig konnt nöd gsetzt werde.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReminder = async (reminder: LocalReminder) => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const res = await fetch('/api/notifications/cancel', {
          method: 'POST',
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            reminderId: reminder.id
          }),
          headers: { 'Content-Type': 'application/json' }
        })

        if (res.ok) {
          setToast({ message: 'Erinnerig glöscht', type: 'success' })
        } else {
          // Reminder might have already been sent
          setToast({ message: 'Erinnerig isch villicht scho gschickt worde', type: 'error' })
        }
      }
    } catch (err) {
      console.error('Failed to cancel reminder:', err)
      setToast({ message: 'Erinnerig isch villicht scho gschickt worde', type: 'error' })
    }

    // Always remove locally
    deleteReminderLocally(reminder.id)
    refreshReminders()
  }

  const isAtLimit = futureReminders.length >= MAX_REMINDERS

  return (
    <>
      <Head>
        <title>Füetterigszitplan - Suurteigrechner</title>
      </Head>
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-sm">
              <div className="card-body p-4">
                <h1 className="h2 mb-4 text-center">Füetterigszitplan</h1>
                
                <div className="mb-4">
                  <label className="form-label">Erinner mich am</label>
                  <input 
                    type="datetime-local" 
                    className="form-control form-control-lg" 
                    value={reminderDateTime} 
                    onChange={(e) => setReminderDateTime(e.target.value)}
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label">Nachricht</label>
                  {isCustomMessage ? (
                    <input 
                      type="text"
                      className="form-control form-control-lg"
                      value={reminderMessage}
                      onChange={(e) => setReminderMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                      onBlur={() => {
                        // If empty, switch back to dropdown with default
                        if (!reminderMessage.trim()) {
                          setIsCustomMessage(false)
                          setReminderMessage(DEFAULT_NOTIFICATION_MESSAGE)
                        }
                      }}
                      placeholder="Schriib dini eigeti Nachricht..."
                      maxLength={MAX_MESSAGE_LENGTH}
                      autoFocus
                    />
                  ) : (
                    <select
                      className="form-select form-select-lg"
                      value={reminderMessage}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomMessage(true)
                          setReminderMessage('')
                        } else {
                          setReminderMessage(e.target.value)
                        }
                      }}
                    >
                      {NOTIFICATION_MESSAGES.map((msg, index) => (
                        <option key={index} value={msg}>{msg}</option>
                      ))}
                      <option value="__custom__">✏️ Eigeti Nachricht...</option>
                    </select>
                  )}
                  {isCustomMessage && (
                    <div className="form-text text-end">
                      {reminderMessage.length}/{MAX_MESSAGE_LENGTH}
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label className="form-label">Wiederholig</label>
                  <select 
                    className="form-select form-select-lg"
                    value={recurrenceIntervalHours ?? ''}
                    onChange={(e) => setRecurrenceIntervalHours(e.target.value ? Number(e.target.value) : null)}
                  >
                    {RECURRENCE_OPTIONS.map(opt => (
                      <option key={opt.hours ?? 'once'} value={opt.hours ?? ''}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {recurrenceIntervalHours !== null && (
                  <div className="mb-4">
                    <label className="form-label">Bis (optional)</label>
                    <input 
                      type="date" 
                      className="form-control form-control-lg"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    />
                    <div className="form-text">Maximal 1 Jahr. Ohni Uswahl lauft d&apos;Erinnerig 1 Jahr.</div>
                  </div>
                )}

                <div className="d-grid gap-2">
                  {!isSubscribed ? (
                    <button 
                      className="btn btn-secondary btn-lg" 
                      onClick={subscribeUser}
                      disabled={loading}
                    >
                      {loading ? 'Lade...' : 'Benachrichtigunge aktiviere'}
                    </button>
                  ) : (
                    <button 
                      className="btn btn-primary btn-lg" 
                      onClick={scheduleReminder}
                      disabled={loading || isAtLimit}
                      title={isAtLimit ? `Maximal ${MAX_REMINDERS} Erinnerige erlaubt` : undefined}
                    >
                      {loading ? 'Lade...' : isAtLimit ? `Maximum erreicht (${MAX_REMINDERS})` : 'Erinnerig setze'}
                    </button>
                  )}
                </div>

                {toast && (
                  <div className={`alert mt-4 alert-dismissible fade show ${toast.type === 'success' ? 'alert-success' : 'alert-warning'}`}>
                    {toast.message}
                    <button type="button" className="btn-close" onClick={() => setToast(null)} aria-label="Schliesse"></button>
                  </div>
                )}

                {status && (
                  <div className={`alert mt-4 ${status.includes('Fehler') ? 'alert-danger' : 'alert-info'}`}>
                    {status}
                  </div>
                )}

                {futureReminders.length > 0 && (
                  <div className="mt-4">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h5 className="mb-0">Geplanti Erinnerige</h5>
                      <span className="badge bg-secondary">{futureReminders.length}/{MAX_REMINDERS}</span>
                    </div>
                    <ul className="list-group">
                      {futureReminders.map(reminder => (
                        <li key={reminder.id} className="list-group-item d-flex justify-content-between align-items-start">
                          <div className="me-2">
                            <div className="fw-bold">
                              {new Date(reminder.scheduledTime).toLocaleString()}
                              {reminder.recurrenceIntervalHours && (
                                <span className="badge bg-info ms-2">
                                  {RECURRENCE_OPTIONS.find(o => o.hours === reminder.recurrenceIntervalHours)?.label}
                                </span>
                              )}
                            </div>
                            <small className="text-muted">{reminder.message}</small>
                            {reminder.recurrenceIntervalHours && reminder.endDate && (
                              <small className="text-muted d-block">
                                bis {new Date(reminder.endDate).toLocaleDateString()}
                              </small>
                            )}
                          </div>
                          <button 
                            className="btn btn-sm btn-outline-primary align-self-center" 
                            onClick={() => handleDeleteReminder(reminder)}
                            title="Erinnerig lösche"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-5 text-center">
                  <Link href="/" className="text-decoration-none">← Zrugg zum Rechner</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
