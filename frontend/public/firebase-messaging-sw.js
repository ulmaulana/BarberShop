// Firebase Messaging Service Worker
// Import Firebase scripts (version 9 compat untuk service worker)
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js')

// Firebase config - akan di-inject dari main app
// Note: Service worker tidak bisa akses import.meta.env
// Config diambil dari query string saat register

self.addEventListener('install', (event) => {
  console.log('[FCM SW] Installing...')
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[FCM SW] Activated')
  event.waitUntil(clients.claim())
})

// Handle messages dari main thread untuk init Firebase
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'INIT_FIREBASE') {
    const config = event.data.config
    if (!firebase.apps.length) {
      firebase.initializeApp(config)
      console.log('[FCM SW] Firebase initialized')
    }
  }
})

// Initialize dengan default config (akan di-override dari main app)
// Cek apakah sudah ada app yang terinisialisasi
let messaging = null

try {
  // Akan diinisialisasi dari main app via postMessage
  if (firebase.apps.length > 0) {
    messaging = firebase.messaging()
  }
} catch (e) {
  console.log('[FCM SW] Messaging not initialized yet')
}

// Handle background messages
self.addEventListener('push', (event) => {
  console.log('[FCM SW] Push received:', event)
  
  if (!event.data) return

  const payload = event.data.json()
  console.log('[FCM SW] Push payload:', payload)

  const notificationTitle = payload.notification?.title || 'Sahala Barber'
  const notificationOptions = {
    body: payload.notification?.body || 'Ada notifikasi baru untuk Anda',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    tag: payload.data?.appointmentId || 'notification',
    data: payload.data || {},
    vibrate: [200, 100, 200],
    actions: [
      {
        action: 'open',
        title: 'Buka App'
      },
      {
        action: 'close',
        title: 'Tutup'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  )
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification clicked:', event)
  
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  // Open or focus the app
  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Cari window yang sudah terbuka
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          if (urlToOpen !== '/') {
            client.navigate(urlToOpen)
          }
          return
        }
      }
      // Jika tidak ada window terbuka, buka baru
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})
