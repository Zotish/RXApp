import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Register PWA Service Worker with automatic updates
if ('serviceWorker' in navigator) {
  registerSW({
    immediate: true,
    onNeedRefresh() {
      // Dispatches event so custom banner/toast can notify user or reload
      window.dispatchEvent(new CustomEvent('veda-sw-update-available'))
    },
    onOfflineReady() {
      console.log('Veda health companion is ready for offline use.')
    },
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

