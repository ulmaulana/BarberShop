import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions/v1'
import type { Request, Response } from 'firebase-functions/v1'

if (!admin.apps.length) {
  admin.initializeApp()
}

const REGION = 'asia-southeast2'
const db = admin.firestore()

export const healthCheck = functions.region(REGION).https.onRequest(
  (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      method: req.method,
    })
  },
)

// Send notification to customer
interface SendNotificationData {
  userId: string
  title: string
  body: string
  appointmentId?: string
  queueNumber?: number
}

export const sendCustomerNotification = functions
  .region(REGION)
  .https.onCall(async (data: SendNotificationData, context) => {
    // Verify admin is calling
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Harus login untuk mengirim notifikasi'
      )
    }

    const { userId, title, body, appointmentId, queueNumber } = data

    if (!userId || !title || !body) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'userId, title, dan body harus diisi'
      )
    }

    try {
      // Get user's FCM token from Firestore
      const userDoc = await db.collection('users').doc(userId).get()
      
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User tidak ditemukan')
      }

      const userData = userDoc.data()
      const fcmToken = userData?.fcmToken

      if (!fcmToken) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'User belum mengaktifkan notifikasi'
        )
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
            vibrate: [200, 100, 200],
          },
          fcmOptions: {
            link: appointmentId ? `/appointments/${appointmentId}` : '/',
          },
        },
      }

      const response = await admin.messaging().send(message)
      
      // Log notification to Firestore
      await db.collection('notifications').add({
        userId,
        title,
        body,
        appointmentId: appointmentId || null,
        queueNumber: queueNumber || null,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        fcmMessageId: response,
        sentBy: context.auth.uid,
      })

      return {
        success: true,
        messageId: response,
      }
    } catch (error: any) {
      console.error('Error sending notification:', error)
      
      // Handle FCM specific errors
      if (error.code === 'messaging/registration-token-not-registered') {
        // Token is invalid, remove it from user
        await db.collection('users').doc(userId).update({
          fcmToken: admin.firestore.FieldValue.delete(),
        })
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Token notifikasi user sudah tidak valid'
        )
      }

      throw new functions.https.HttpsError(
        'internal',
        error.message || 'Gagal mengirim notifikasi'
      )
    }
  })

// Bulk send notification to multiple users (for queue updates)
interface BulkNotificationData {
  userIds: string[]
  title: string
  body: string
}

export const sendBulkNotification = functions
  .region(REGION)
  .https.onCall(async (data: BulkNotificationData, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Harus login untuk mengirim notifikasi'
      )
    }

    const { userIds, title, body } = data

    if (!userIds?.length || !title || !body) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'userIds, title, dan body harus diisi'
      )
    }

    const results: { userId: string; success: boolean; error?: string }[] = []

    for (const userId of userIds) {
      try {
        const userDoc = await db.collection('users').doc(userId).get()
        const fcmToken = userDoc.data()?.fcmToken

        if (!fcmToken) {
          results.push({ userId, success: false, error: 'No FCM token' })
          continue
        }

        await admin.messaging().send({
          token: fcmToken,
          notification: { title, body },
          webpush: {
            notification: {
              icon: '/icons/icon-192.svg',
              vibrate: [200, 100, 200],
            },
          },
        })

        results.push({ userId, success: true })
      } catch (error: any) {
        results.push({ userId, success: false, error: error.message })
      }
    }

    return {
      total: userIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    }
  })
