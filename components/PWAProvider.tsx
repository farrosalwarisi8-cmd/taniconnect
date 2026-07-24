'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAProvider() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('[PWA] Service Worker registered:', reg.scope)
          })
          .catch((err) => {
            console.warn('[PWA] SW registration failed:', err)
          })
      })
    }

    // Detect kalau sudah installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Cek user pernah dismiss install banner
    const dismissed = localStorage.getItem('pwa_install_dismissed')
    if (dismissed) {
      const dismissedTime = parseInt(dismissed)
      const daysSince = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
      // Kalau sudah > 7 hari, tampilkan lagi
      if (daysSince < 7) return
    }

    // Listen beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      const event = e as BeforeInstallPromptEvent
      setDeferredPrompt(event)
      // Delay 3 detik sebelum tampilkan banner (biar ga ganggu)
      setTimeout(() => setShowInstallBanner(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)

    // Detect installed
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true)
      setShowInstallBanner(false)
      setDeferredPrompt(null)
      console.log('[PWA] App installed successfully')
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      console.log(`[PWA] User ${outcome} the install prompt`)

      if (outcome === 'dismissed') {
        localStorage.setItem('pwa_install_dismissed', Date.now().toString())
      }

      setDeferredPrompt(null)
      setShowInstallBanner(false)
    } catch (err) {
      console.error('[PWA] Install error:', err)
    }
  }

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', Date.now().toString())
    setShowInstallBanner(false)
  }

  // Kalau sudah installed atau tidak support, jangan tampilkan
  if (isInstalled || !showInstallBanner || !deferredPrompt) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-slide-in-right">
      <div
        className="bg-white rounded-2xl shadow-2xl border-2 border-primary overflow-hidden"
        style={{ boxShadow: '0px 24px 64px rgba(15,118,67,0.35)' }}
      >
        <div className="bg-gradient-to-r from-primary to-primary-dark p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shrink-0">
            🌿
          </div>
          <div className="flex-1 min-w-0 text-white">
            <p className="font-bold text-base leading-tight">Install TaniConnect</p>
            <p className="text-xs opacity-90">Akses lebih cepat dari homescreen</p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            aria-label="Tutup"
            style={{ minHeight: 32 }}
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <p className="text-sm text-fg-dark mb-3">
            📱 Install app TaniConnect ke HP-mu untuk pengalaman lebih baik:
          </p>
          <ul className="text-xs text-fg/70 space-y-1 mb-4">
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Buka cepat tanpa browser
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Icon di homescreen HP
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> Bekerja saat offline
            </li>
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="flex-1 px-4 py-2 rounded-full border border-border text-fg text-sm font-medium hover:bg-surface"
              style={{ minHeight: 40 }}
            >
              Nanti
            </button>
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 px-4 py-2 rounded-full bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-semibold hover:shadow-lg"
              style={{ minHeight: 40 }}
            >
              ⬇️ Install
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}