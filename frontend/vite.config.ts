import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const projectRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        id: '/',
        name: 'Prorata - Votre quotidien à deux',
        short_name: 'Prorata',
        description: 'Organisez vos repas, partagez vos courses et gérez votre budget de couple',
        theme_color: '#15171C',
        background_color: '#F5F5F1',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['finance', 'lifestyle'],
        lang: 'fr-FR',
        dir: 'ltr',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,webp,svg,woff2,ttf}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /^https?:$/.test(url.protocol) && url.pathname.includes('/api/'),
            handler: 'NetworkOnly',
            options: {
              // Authenticated data is cached per user by the household module.
              // A shared URL-only API cache can expose a previous account's data.
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        // By default the dev service worker is written to ./dev-dist, at the
        // root of the project - which is a bind mount when running in Docker
        // and is not always writable from the container. Keeping it inside
        // node_modules avoids that, and keeps the build artifact out of the repo.
        resolveTempFolder: () => resolve(projectRoot, 'node_modules/.vite-pwa-dev')
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})