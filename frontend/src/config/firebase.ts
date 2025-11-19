import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED, type Firestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

function createFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    return initializeApp(firebaseConfig)
  }
  return getApps()[0]
}

export const firebaseApp = createFirebaseApp()
export const firebaseAuth = getAuth(firebaseApp)

// Initialize Firestore with memory-only cache to avoid persistence issues
let firestore: Firestore
try {
  firestore = initializeFirestore(firebaseApp, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    // Disable local persistence to prevent state conflicts
    localCache: undefined
  })
} catch (error) {
  // Already initialized, use existing instance
  firestore = getFirestore(firebaseApp)
}

export { firestore }
export const firebaseFunctions = getFunctions(firebaseApp, 'asia-southeast2')
export const firebaseStorage = getStorage(firebaseApp)
