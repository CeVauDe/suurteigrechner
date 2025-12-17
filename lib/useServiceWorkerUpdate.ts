import { useEffect, useState } from 'react'

export function useServiceWorkerUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [waitingServiceWorker, setWaitingServiceWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleServiceWorkerUpdate = (registration: ServiceWorkerRegistration) => {
      setUpdateAvailable(true)
      setWaitingServiceWorker(registration.waiting)
    }

    if ('serviceWorker' in navigator) {
      const unsubscribe = navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is ready
                handleServiceWorkerUpdate(registration)
              }
            })
          }
        })
      })

      return () => {
        unsubscribe
      }
    }
  }, [])

  const handleUpdate = () => {
    if (waitingServiceWorker) {
      waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  return { updateAvailable, handleUpdate }
}
