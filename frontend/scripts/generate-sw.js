import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env file jika ada (untuk local dev)
config({ path: join(__dirname, '../.env') })
config({ path: join(__dirname, '../.env.local') })

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || '',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.VITE_FIREBASE_APP_ID || '',
}

const swContent = `// Firebase Messaging + PWA Service Worker - Auto-generated
// DO NOT EDIT DIRECTLY - edit scripts/generate-sw.js instead

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js')

// ==================== FIREBASE MESSAGING ====================

// Firebase config (injected at build time)
const firebaseConfig = ${JSON.stringify(firebaseConfig, null, 2)}

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

// Get messaging instance
const messaging = firebase.messaging()

// Handle background messages via Firebase SDK
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload)
  
  const notificationTitle = payload.notification?.title || 'Sahala Barber'
  const notificationOptions = {
    body: payload.notification?.body || 'Ada notifikasi baru untuk Anda',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    tag: payload.data?.appointmentId || 'notification-' + Date.now(),
    data: payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Buka' },
      { action: 'close', title: 'Tutup' }
    ]
  }

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event)
  
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen)
          }
          return
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// ==================== PWA CACHING ====================

const CACHE_NAME = 'sahala-barber-v4'
const ASSETS_CACHE = 'sahala-barber-assets-v4'

self.addEventListener('install', (event) => {
  console.log('[SW] Installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated')
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== ASSETS_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) return

  // API requests - always network only
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request))
    return
  }

  // Static assets with hash in /assets/* - network first
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(fetch(event.request))
    return
  }

  // Images and fonts - cache first
  if (url.pathname.match(/\\.(png|jpg|jpeg|svg|gif|webp|woff|woff2|ico)$/)) {
    event.respondWith(
      caches.open(ASSETS_CACHE).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached
          
          return fetch(event.request).then((response) => {
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
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/index.html')
        })
      })
  )
})
`

const outputPath = join(__dirname, '../public/firebase-messaging-sw.js')
writeFileSync(outputPath, swContent)
console.log('Generated firebase-messaging-sw.js with Firebase config')
