import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import { AppProviders } from './providers/AppProviders'
import { testCloudinaryUpload } from './utils/testCloudinary'

// Make test function available in console for debugging
if (import.meta.env.DEV) {
  (window as any).testCloudinaryUpload = testCloudinaryUpload
  console.log('💡 Cloudinary test available: Run testCloudinaryUpload() in console')
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppProviders />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/firebase-messaging-sw.js')
      .catch((error) => {
        console.error('Service worker registration failed', error)
      })
  })
}
