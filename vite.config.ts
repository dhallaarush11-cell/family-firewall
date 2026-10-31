import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon-64.png',
        'apple-touch-icon.png',
        'logo-full-640.png',
        'logo-icon-256.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-192x192.png',
        'pwa-maskable-512x512.png',
        'fonts/*.ttf',
        'audio/**/*.mp3'
      ],
      manifest: {
        name: 'Family Firewall',
        short_name: 'FamilyFirewall',
        description: 'Rehearse together. Pause together. Protective scam rehearsal and safety pause for families.',
        theme_color: '#FFF1CC',
        background_color: '#FFF1CC',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-maskable-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,ttf,woff,woff2,json,mp3,wav}'
        ],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024 // 6MB to cache bundled fonts and audio
      }
    })
  ],
})
