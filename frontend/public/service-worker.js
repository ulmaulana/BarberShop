const CACHE_NAME = 'sahala-barber-v3'
const ASSETS_CACHE = 'sahala-barber-assets-v3'

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

  // Skip non-http(s) requests (chrome-extension://, etc)
  if (!url.protocol.startsWith('http')) return

  // API requests - always network only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request))
    return
  }

  // Static assets dengan hash di /assets/* - network first, no cache
  // Vercel sudah set immutable cache header untuk files ini
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(fetch(event.request))
    return
  }

  // Images dan fonts - cache first
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|woff|woff2|ico)$/)) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached
          
          return fetch(event.request).then((response) => {
            // Cache hanya jika response benar (200) dan content-type sesuai
            if (response.status === 200 && !response.headers.get('content-type')?.includes('text/html')) {
              cache.put(event.request, response.clone())
            }
            return response
          }).catch(() => cached)
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
