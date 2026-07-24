// TaniConnect Service Worker v1.0
// Basic offline support + smart cache strategy

const CACHE_NAME = 'taniconnect-v1'
const OFFLINE_URL = '/offline.html'

// URL yang di-cache saat install (essential files)
const PRECACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Install event — cache precache URLs
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching precache URLs')
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache failed:', err)
      })
    })
  )
  self.skipWaiting()
})

// Activate event — clear old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    })
  )
  self.clients.claim()
})

// Fetch event — smart caching strategy
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Skip external APIs (jangan di-cache untuk data dinamis!)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.in') ||
    url.hostname.includes('groq.com') ||
    url.hostname.includes('midtrans.com') ||
    url.hostname.includes('badanpangan.go.id') ||
    url.hostname.includes('bi.go.id') ||
    url.pathname.startsWith('/api/')
  ) {
    return
  }

  // Network-first untuk HTML pages (biar selalu dapat konten terbaru)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
          return response
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match(OFFLINE_URL)
          })
        })
    )
    return
  }

  // Cache-first untuk static assets (images, fonts, css, js)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Fallback untuk image gagal
          if (event.request.destination === 'image') {
            return caches.match('/icons/icon-192.png')
          }
          return new Response('Offline', { status: 503 })
        })
    })
  )
})