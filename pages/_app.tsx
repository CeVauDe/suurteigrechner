import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useState, useEffect } from 'react'
import { useServiceWorkerUpdate } from '../lib/useServiceWorkerUpdate'
import '../styles/globals.scss'
import Nav from '../components/Nav'

export default function App({ Component, pageProps }: AppProps) {
  const { updateAvailable, handleUpdate } = useServiceWorkerUpdate()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('Service Worker registration failed:', err)
      })
    }
    // Dynamically load Bootstrap JS bundle on the client
    import('bootstrap/dist/js/bootstrap.bundle').catch(() => {
      /* non-fatal if the import fails in some environments */
    })
  }, [])

  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta name="description" content="A sourdough calculator and starter management tool" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" href="/icon-192x192.png" />
      </Head>

      {mounted && updateAvailable && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white rounded-lg shadow-lg p-4 max-w-sm z-50">
          <p className="mb-3 text-sm">A new version of the app is available!</p>
          <button
            onClick={handleUpdate}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Update Now
          </button>
        </div>
      )}

      <Nav />
      <main className="pt-20">
        <Component {...pageProps} />
      </main>
    </>
  )
}
