import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions/v1'
import type { Request, Response } from 'firebase-functions/v1'

if (!admin.apps.length) {
  admin.initializeApp()
}

const REGION = 'asia-southeast2'

export const healthCheck = functions.region(REGION).https.onRequest(
  (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      method: req.method,
    })
  },
)
