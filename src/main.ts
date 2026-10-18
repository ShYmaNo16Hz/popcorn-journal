import { Capacitor } from '@capacitor/core'
import { IonicVue } from '@ionic/vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { setupPwaUpdates } from './services/pwa'
import { useHistoryStore } from './stores/history'
import { useLibraryStore } from './stores/library'
import { useRemindersStore } from './stores/reminders'

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css'

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'

/* Optional CSS utils */
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'

/* Dark mode following the system setting */
import '@ionic/vue/css/palettes/dark.system.css'

const pinia = createPinia()
const app = createApp(App).use(IonicVue).use(pinia).use(router)

// Load user data before the first render so screens never flash empty
Promise.all([
  useLibraryStore(pinia).load(),
  useHistoryStore(pinia).load(),
  router.isReady(),
]).then(() => {
  app.mount('#app')
  useRemindersStore(pinia)
    .init()
    .catch((error) => console.error(error))
})

// Offline support + updates for the web install; the native apps bundle
// their files already, a service worker there would only serve stale copies
if (!Capacitor.isNativePlatform()) {
  setupPwaUpdates()
}
