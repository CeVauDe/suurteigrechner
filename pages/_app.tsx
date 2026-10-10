import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useEffect } from 'react'
import '../styles/globals.scss'
import Nav from '../components/Nav'

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service Worker registration failed:', err)
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
        <meta name="description" content="A browser-based sourdough calculator with local saved recipes" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="icon" type="image/png" href="/icon-192x192.png" />
        <link  rel="stylesheet"  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />
      </Head>

      <Nav />
      <main className="pt-20">
        <Component {...pageProps} />
      </main>
    </>
  )
}
