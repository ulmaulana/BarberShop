import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

// Menggunakan config Firebase yang sama, tapi instance terpisah
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

function createAdminFirebaseApp(): FirebaseApp {
  const existingApp = getApps().find(app => app.name === 'adminApp')
  if (existingApp) {
    return existingApp
  }
  // Named instance: 'adminApp' untuk isolasi auth admin
  return initializeApp(firebaseConfig, 'adminApp')
}

export const adminFirebaseApp = createAdminFirebaseApp()
export const adminAuth = getAuth(adminFirebaseApp)
export const adminFirestore = getFirestore(adminFirebaseApp)
export const adminFunctions = getFunctions(adminFirebaseApp, 'asia-southeast2')
export const adminStorage = getStorage(adminFirebaseApp)
