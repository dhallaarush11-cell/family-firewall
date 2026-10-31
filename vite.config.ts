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
        'favicon.svg',
        'fonts/*.ttf',
        'shield-icon.svg',
        'pwa-192x192.svg',
        'pwa-512x512.svg',
        'audio/**/*.mp3'
      ],
      manifest: {
        name: 'Family Firewall',
        short_name: 'FamilyFirewall',
        description: 'Rehearse together. Pause together. Protective scam rehearsal and safety pause for families.',
        theme_color: '#0B4F4A',
        background_color: '#FFF1CC',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          },
          {
            src: '/pwa-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
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
