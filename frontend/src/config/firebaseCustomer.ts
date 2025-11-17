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

function createCustomerFirebaseApp(): FirebaseApp {
  const existingApp = getApps().find(app => app.name === 'customerApp')
  if (existingApp) {
    return existingApp
  }
  // Named instance: 'customerApp' untuk isolasi auth customer
  return initializeApp(firebaseConfig, 'customerApp')
}

export const customerFirebaseApp = createCustomerFirebaseApp()
export const customerAuth = getAuth(customerFirebaseApp)
export const customerFirestore = getFirestore(customerFirebaseApp)
export const customerFunctions = getFunctions(customerFirebaseApp, 'asia-southeast2')
export const customerStorage = getStorage(customerFirebaseApp)
