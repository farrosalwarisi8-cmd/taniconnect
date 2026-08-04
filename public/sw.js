const CACHE_NAME = 'taniconnect-v1.2'
const OFFLINE_URL = '/offline.html'
const PRECACHE_URLS = ['/', '/offline.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(PRECACHE_URLS).catch(function () { })
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (n) { return n !== CACHE_NAME }).map(function (n) { return caches.delete(n) })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return

  var url = new URL(event.request.url)

  // Skip service worker caching for dynamic API, auth, manifest, and external domains
  if (
    url.hostname.includes('supabase') ||
    url.hostname.includes('groq') ||
    url.hostname.includes('midtrans') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('unsplash') ||
    url.hostname.includes('badanpangan') ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/manifest.json' ||
    url.pathname.startsWith('/icons/')
  ) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(function (response) {
        var clone = response.clone()
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, clone)
        })
        return response
      }).catch(function () {
        return caches.match(event.request).then(function (cached) {
          return cached || caches.match(OFFLINE_URL)
        })
      })
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached

      return fetch(event.request).then(function (response) {
        if (response && response.status === 200 && response.type === 'basic') {
          var clone = response.clone()
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, clone)
          })
        }
        return response
      }).catch(function () {
        if (event.request.destination === 'image') {
          return caches.match('/icons/icon-192.png')
        }
        return new Response('Unavailable', { status: 404 })
      })
    })
  )
})