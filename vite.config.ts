/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as {
  version: string
}

const CREAM = '#FDFAF6' // logo background

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // Web install (Add to Home Screen) + offline. The service worker is
    // registered from main.ts on the web only, never inside the native apps.
    VitePWA({
      // 'prompt': src/services/pwa.ts decides when to apply an update
      registerType: 'prompt',
      injectRegister: null,
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Popcorn Journal',
        short_name: 'Popcorn',
        description: 'Track the shows and movies you watch.',
        start_url: '/',
        display: 'standalone',
        theme_color: CREAM,
        background_color: CREAM,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Posters: keep them for offline browsing
            urlPattern: ({ url }) => url.origin === 'https://image.tmdb.org',
            handler: 'CacheFirst',
            options: {
              cacheName: 'tmdb-images',
              expiration: {
                maxEntries: 800,
                maxAgeSeconds: 60 * 60 * 24 * 90,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  // App version shown in Settings, from package.json
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Expose the TMDB read token to the client; TMDB_API_KEY (v3) stays out of the bundle
  envPrefix: ['VITE_', 'TMDB_API_READ_ACCESS_TOKEN'],
  test: {
    include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
    passWithNoTests: true,
  },
})
