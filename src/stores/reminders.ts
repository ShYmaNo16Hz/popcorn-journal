import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  remindersSupported,
  requestReminderPermission,
  syncReminders,
} from '../services/notifications'
import { storage } from '../services/storage'
import type { Series } from '../types/media'
import { planReminders } from '../utils/reminders'
import { strings } from '../utils/strings'
import { useLibraryStore } from './library'
import { useMetadataStore } from './metadata'

const SYNC_DELAY_MS = 2000

export const useRemindersStore = defineStore('reminders', () => {
  const library = useLibraryStore()
  const metadata = useMetadataStore()

  const supported = remindersSupported()
  const enabled = ref(false)

  // Shows you're watching, as far as their snapshots are loaded
  const watching = computed<Series[]>(() =>
    Object.entries(library.series)
      .filter(([, entry]) => entry.status === 'watching')
      .flatMap(([id]) => metadata.series[id] ?? []),
  )

  const planned = computed(() =>
    enabled.value
      ? planReminders(watching.value, new Date(), undefined, (episode) =>
          strings.reminders.body(
            strings.series.episodeLabel(episode.season, episode.number),
            episode.title,
          ),
        )
      : [],
  )

  let timer: ReturnType<typeof setTimeout> | undefined
  function scheduleSync() {
    clearTimeout(timer)
    timer = setTimeout(() => {
      syncReminders(planned.value).catch((error) => console.error(error))
    }, SYNC_DELAY_MS)
  }

  /** Loads the preference and keeps notifications in sync from then on. */
  async function init(): Promise<void> {
    if (!supported) return
    enabled.value = (await storage.readPrefs()).reminders === true
    for (const id of Object.keys(library.series)) {
      metadata.ensureSeries(Number(id)).catch((error) => console.error(error))
    }
    watch(
      () => planned.value.map((r) => `${r.id}@${r.at.getTime()}`).join(),
      scheduleSync,
      {
        immediate: true,
      },
    )
  }

  /** Returns false when the user denied notification permission. */
  async function setEnabled(value: boolean): Promise<boolean> {
    if (value && !(await requestReminderPermission())) return false
    enabled.value = value
    const prefs = await storage.readPrefs()
    await storage.writePrefs({ ...prefs, reminders: value })
    return true
  }

  return { supported, enabled, planned, init, setEnabled }
})
