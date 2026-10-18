/// <reference types="vitest/config" />
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as {
  version: string
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  // App version shown in Settings, from package.json
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Expose the TMDB read token to the client; TMDB_API_KEY (v3) stays out of the bundle
  envPrefix: ['VITE_', 'TMDB_API_READ_ACCESS_TOKEN'],
  test: {
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
})
