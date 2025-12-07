import type { VercelRequest, VercelResponse } from '@vercel/node'
import admin from 'firebase-admin'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

// Lazy initialized app
let firebaseApp: admin.app.App | null = null

// Initialize Firebase Admin (singleton pattern)
function getFirebaseAdmin(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp
  }

  // Parse service account dari environment variable
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  
  if (!rawServiceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set')
  }

  let serviceAccount: admin.ServiceAccount
  try {
    serviceAccount = JSON.parse(rawServiceAccount)
  } catch (parseError) {
    throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT JSON: ${parseError}`)
  }

  // Validate required fields
  if (!serviceAccount.projectId && !(serviceAccount as any).project_id) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing project_id')
  }
  if (!serviceAccount.privateKey && !(serviceAccount as any).private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing private_key')
  }
  if (!serviceAccount.clientEmail && !(serviceAccount as any).client_email) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing client_email')
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })

  return firebaseApp
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, title, body, appointmentId, queueNumber } = req.body

    if (!userId || !title || !body) {
      return res.status(400).json({ 
        error: 'userId, title, dan body harus diisi' 
      })
    }

    // Initialize Firebase Admin
    let app: admin.app.App
    try {
      app = getFirebaseAdmin()
    } catch (initError: any) {
      console.error('Firebase Admin init error:', initError)
      return res.status(500).json({ 
        error: `Firebase init error: ${initError.message}` 
      })
    }
    const db = getFirestore(app)
    const messaging = getMessaging(app)

    // Get user's FCM token from Firestore
    const userDoc = await db.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User tidak ditemukan' })
    }

    const userData = userDoc.data()
    const fcmToken = userData?.fcmToken

    if (!fcmToken) {
      return res.status(400).json({ 
        error: 'User belum mengaktifkan notifikasi' 
      })
    }

    // Send FCM notification
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        appointmentId: appointmentId || '',
        queueNumber: queueNumber?.toString() || '',
        url: appointmentId ? `/appointments/${appointmentId}` : '/',
      },
      webpush: {
        notification: {
          icon: '/icons/icon-192.svg',
          badge: '/icons/icon-192.svg',
          vibrate: [200, 100, 200] as any,
        },
        fcmOptions: {
          link: appointmentId ? `/appointments/${appointmentId}` : '/',
        },
      },
    }

    const response = await messaging.send(message)

    // Log notification to Firestore
    await db.collection('notifications').add({
      userId,
      title,
      body,
      appointmentId: appointmentId || null,
      queueNumber: queueNumber || null,
      sentAt: FieldValue.serverTimestamp(),
      fcmMessageId: response,
    })

    return res.status(200).json({
      success: true,
      messageId: response,
    })

  } catch (error: any) {
    console.error('Error sending notification:', error)

    // Handle FCM specific errors
    if (error.code === 'messaging/registration-token-not-registered') {
      return res.status(400).json({
        error: 'Token notifikasi user sudah tidak valid'
      })
    }

    return res.status(500).json({
      error: error.message || 'Gagal mengirim notifikasi'
    })
  }
}
