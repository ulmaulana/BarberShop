import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/global.css'
import { AppProviders } from './providers/AppProviders'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppProviders />
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .catch((error) => {
        console.error('Service worker registration failed', error)
      })
  })
}
