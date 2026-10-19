import React, { useEffect, useState } from 'react'
import { Download, X, Share, PlusSquare, Monitor } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISS_KEY = 'todoflow_pwa_dismissed_until'
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // 1. Detect if running standalone already
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    if (isStandalone) {
      return
    }

    // 2. Check if user recently dismissed
    const dismissedUntil = localStorage.getItem(DISMISS_KEY)
    if (dismissedUntil && Date.now() < Number(dismissedUntil)) {
      return
    }

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    const isSafari =
      userAgent.includes('safari') &&
      !userAgent.includes('chrome') &&
      !userAgent.includes('crios') &&
      !userAgent.includes('android')

    if (isIOSDevice && isSafari) {
      setIsIOS(true)
      // Show prompt after a slight delay to avoid jarring initial load
      const timer = setTimeout(() => setIsVisible(true), 3000)
      return () => clearTimeout(timer)
    }

    // 4. Standard beforeinstallprompt event (Chromium, Android, Edge)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Show prompt after a slight delay
      setTimeout(() => setIsVisible(true), 2500)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Listen for appinstalled
    window.addEventListener('appinstalled', () => {
      setIsVisible(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true)
      return
    }

    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setIsVisible(false)
      } else {
        handleDismiss()
      }
    } catch (err) {
      console.warn('[PWA] Prompt error:', err)
    } finally {
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    setShowIOSGuide(false)
    // Squelch prompt for 7 days
    localStorage.setItem(DISMISS_KEY, String(Date.now() + SEVEN_DAYS_MS))
  }

  if (!isVisible) return null

  return (
    <>
      <div
        role="region"
        aria-label="Install TodoFlow Application"
        className="fixed bottom-4 right-4 z-40 max-w-sm w-[calc(100vw-2rem)] sm:w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-2xl backdrop-blur-md animate-fade-in transition-all"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Install TodoFlow
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Fast desktop & mobile access with offline support.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Close install prompt"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {showIOSGuide ? (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 space-y-2">
            <p className="font-medium text-gray-900 dark:text-gray-100">
              How to install on iOS Safari:
            </p>
            <div className="flex items-center space-x-2">
              <Share className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span>1. Tap the <strong>Share</strong> button at the bottom of Safari.</span>
            </div>
            <div className="flex items-center space-x-2">
              <PlusSquare className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <span>2. Scroll down and tap <strong>Add to Home Screen</strong>.</span>
            </div>
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-2 w-full text-center text-indigo-600 dark:text-indigo-400 hover:underline text-xs"
            >
              Got it
            </button>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-end space-x-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer"
            >
              Not now
            </button>
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isIOS ? 'Show Steps' : 'Install'}</span>
            </button>
          </div>
        )}
      </div>
    </>
  )
}
export default InstallPrompt
