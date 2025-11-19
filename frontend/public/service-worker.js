const CACHE_NAME = 'sahala-barber-v2'
const ASSETS_CACHE = 'sahala-barber-assets-v2'

self.addEventListener('install', (event) => {
  // Skip waiting untuk langsung activate
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== ASSETS_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  )
  // Claim clients immediately
  return self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // API requests - always network only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request))
    return
  }

  // Static assets (JS, CSS, images) - cache first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|gif|webp|woff|woff2)$/)) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached
          
          return fetch(event.request).then((response) => {
            // Cache successful responses
            if (response.status === 200) {
              cache.put(event.request, response.clone())
            }
            return response
          })
        })
      })
    )
    return
  }

  // HTML pages - network first, cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback to cache only if network fails
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/index.html')
        })
      })
  )
})
