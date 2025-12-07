import { getMessaging, getToken, onMessage, type MessagePayload } from 'firebase/messaging'
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore'
import { customerFirebaseApp, customerFirestore } from '../config/firebaseCustomer'

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY

let messaging: ReturnType<typeof getMessaging> | null = null

// Initialize messaging (hanya di browser yang support)
function getMessagingInstance() {
  if (typeof window === 'undefined') return null
  if (!('Notification' in window)) return null
  if (!('serviceWorker' in navigator)) return null
  
  if (!messaging) {
    try {
      messaging = getMessaging(customerFirebaseApp)
    } catch (error) {
      console.error('Error initializing messaging:', error)
      return null
    }
  }
  return messaging
}

// Check apakah notifikasi didukung
export function isNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

// Check status permission
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

// Request permission dan dapatkan FCM token
export async function requestNotificationPermission(): Promise<{
  success: boolean
  token?: string
  error?: string
}> {
  if (!isNotificationSupported()) {
    return { success: false, error: 'Notifikasi tidak didukung di browser ini' }
  }

  try {
    const permission = await Notification.requestPermission()
    
    if (permission !== 'granted') {
      return { success: false, error: 'Izin notifikasi ditolak' }
    }

    // Register service worker untuk FCM
    const registration = await registerServiceWorker()
    if (!registration) {
      return { success: false, error: 'Gagal mendaftarkan service worker' }
    }

    // Get FCM token
    const token = await getFCMToken(registration)
    if (!token) {
      return { success: false, error: 'Gagal mendapatkan token notifikasi' }
    }

    return { success: true, token }
  } catch (error) {
    console.error('Error requesting notification permission:', error)
    return { success: false, error: String(error) }
  }
}

// Register service worker
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    // Kirim config ke service worker
    const config = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    }

    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    })

    // Tunggu service worker aktif
    await navigator.serviceWorker.ready

    // Kirim config ke service worker
    if (registration.active) {
      registration.active.postMessage({
        type: 'INIT_FIREBASE',
        config
      })
    }

    console.log('Service Worker registered:', registration)
    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

// Get FCM Token
async function getFCMToken(registration: ServiceWorkerRegistration): Promise<string | null> {
  const messagingInstance = getMessagingInstance()
  if (!messagingInstance) return null

  try {
    const token = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    })
    
    console.log('FCM Token:', token)
    return token
  } catch (error) {
    console.error('Error getting FCM token:', error)
    return null
  }
}

// Simpan FCM token ke Firestore untuk user
export async function saveFCMTokenToUser(userId: string, token: string): Promise<boolean> {
  try {
    const userRef = doc(customerFirestore, 'users', userId)
    const userDoc = await getDoc(userRef)

    if (userDoc.exists()) {
      await updateDoc(userRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date().toISOString()
      })
    } else {
      await setDoc(userRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date().toISOString()
      }, { merge: true })
    }

    console.log('FCM token saved for user:', userId)
    return true
  } catch (error) {
    console.error('Error saving FCM token:', error)
    return false
  }
}

// Listen untuk foreground messages
export function onForegroundMessage(callback: (payload: MessagePayload) => void): (() => void) | null {
  const messagingInstance = getMessagingInstance()
  if (!messagingInstance) return null

  return onMessage(messagingInstance, (payload) => {
    console.log('Foreground message received:', payload)
    callback(payload)
  })
}

// Tampilkan notifikasi secara manual (untuk foreground)
export function showLocalNotification(title: string, options?: NotificationOptions) {
  if (!isNotificationSupported()) return
  if (Notification.permission !== 'granted') return

  new Notification(title, {
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    ...options
  })
}
