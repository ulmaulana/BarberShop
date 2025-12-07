import type { VercelRequest, VercelResponse } from '@vercel/node'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin (singleton pattern)
function getFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!
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
  if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing required fields (project_id, private_key, or client_email)')
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  })
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
    let app
    try {
      app = getFirebaseAdmin()
    } catch (initError: any) {
      console.error('Firebase Admin init error:', initError)
      return res.status(500).json({ 
        error: `Firebase init error: ${initError.message}` 
      })
    }
    const db = admin.firestore(app)
    const messaging = admin.messaging(app)

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
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
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
