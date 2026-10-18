// Web install only: service worker registration and update policy.
// Checks for a new version on startup, on every return from the background
// and hourly. An update is applied (page reload) right after startup/resume,
// never in the middle of use, and only after pending writes are flushed.
import { registerSW } from 'virtual:pwa-register'
import { storage } from './storage'

const CHECK_INTERVAL_MS = 60 * 60 * 1000
const APPLY_WINDOW_MS = 10_000 // "just opened": safe to reload

export function setupPwaUpdates(): void {
  let openedAt = Date.now()
  let updateReady = false
  let applying = false

  async function apply() {
    if (applying) return
    applying = true
    await storage.flush() // don't lose a debounced write to the reload
    await updateSW(true)
  }

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true
      if (Date.now() - openedAt < APPLY_WINDOW_MS) void apply()
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => void registration.update(), CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return
        openedAt = Date.now()
        if (updateReady) void apply()
        else void registration.update()
      })
    },
  })
}
