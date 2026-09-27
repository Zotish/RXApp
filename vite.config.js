import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'veda-icon.svg'],
      manifest: {
        name: 'Veda – The Ultimate Care',
        short_name: 'Veda',
        description: 'A clear bilingual health companion for symptom guidance, first aid, nearby care and teleconsultation.',
        theme_color: '#FAF9F5',
        background_color: '#FAF9F5',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'veda-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
          { src: 'favicon.svg',   sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /\/api\/(public\/symptoms|public\/conditions|public\/first-aid)/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'veda-api-cache', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 } },
          },
        ],
      },
    }),
  ],
})
