import Head from 'next/head'
import { useState, useEffect } from 'react'
import Calculator from './calculator'

interface Entry {
  id: number
  text: string
  created_at: string
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (isOnline) {
      fetchLatest()
    }
  }, [isOnline])

  async function fetchLatest() {
    try {
      const res = await fetch('/api/entries')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setEntries(data.entries)
    } catch (err) {
      console.error('Fetch error:', err)
      setError('Failed to load entries')
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit')
      }
      
      await fetchLatest()
      setText('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit entry'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Suurteigrechner</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="description" content="A sourdough calculator and starter management tool" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Suurteigrechner" />
      </Head>

      <div className="min-h-screen py-12 px-4">
        <Calculator />
        <div className="max-w-3xl mx-auto">
          {/* Heading */}
          <h1 className="text-6xl font-bold text-center mb-12 text-slate-100">
            Guestbook
          </h1>

          {/* Offline Notice */}
          {!isOnline && (
            <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-center text-yellow-400">
              <p className="text-sm">You are offline. Guestbook features are not available, but the calculator works fine!</p>
            </div>
          )}

          {/* Input Form */}
          <div className="mb-16">
            <form onSubmit={submit} className="max-w-2xl mx-auto">
              {error && (
                <div className="mb-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-center">
                  {error}
                </div>
              )}
              <div className="text-center text-slate-500 text-lg">
                <input
                  type="text"
                  maxLength={280}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Leave a message..."
                  aria-label="Your message"
                  disabled={!isOnline}
                />
                <button
                  type="submit"
                  disabled={loading || text.trim().length === 0 || !isOnline}
                  className="flex-shrink-0 bg-sky-500 hover:bg-sky-600 font-medium rounded-full px-5 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {!isOnline ? 'Offline' : loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          </div>

          {/* Messages List */}
          <div className="space-y-8">
            {!isOnline && entries.length === 0 ? (
              <p className="text-center text-slate-500 text-lg">
                Guestbook entries are not available offline.
              </p>
            ) : entries.length === 0 ? (
              <p className="text-center text-slate-500 text-lg">
                No messages yet. Be the first!
              </p>
            ) : (
              entries.slice(0, 10).map((entry) => (
                <div key={entry.id} className="text-center">
                  <blockquote className="text-xl text-slate-200 italic mb-1">
                    "{entry.text}"
                  </blockquote>
                  <p className="text-xs text-slate-500 opacity-70">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
