import React, { useEffect, useState } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [retrying, setRetrying] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  const handleRetry = () => {
    setRetrying(true)
    setTimeout(() => {
      setRetrying(false)
      if (navigator.onLine) {
        setIsOffline(false)
      }
    }, 1000)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500/90 dark:bg-amber-600/90 backdrop-blur-sm text-white px-4 py-2 shadow-md transition-all duration-300"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm font-medium">
        <div className="flex items-center space-x-2">
          <WifiOff className="w-4 h-4 flex-shrink-0 animate-pulse" />
          <span>
            <strong>Offline Mode</strong> — Viewing cached application shell. Connect to internet for real-time sync.
          </span>
        </div>
        <button
          onClick={handleRetry}
          disabled={retrying}
          className="ml-3 flex items-center space-x-1 px-2.5 py-1 rounded bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer text-xs font-semibold disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
          <span>{retrying ? 'Checking...' : 'Retry'}</span>
        </button>
      </div>
    </div>
  )
}
export default OfflineBanner
