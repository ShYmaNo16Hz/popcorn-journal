import { defineStore } from 'pinia'
import { toRaw } from 'vue'
import { exportBackup, parseBackup, summarize } from '../services/backup'
import { storage } from '../services/storage'
import { mergeUserData } from '../services/sync/merge'
import type { UserData } from '../types/userData'
import { useHistoryStore } from './history'
import { useLibraryStore } from './library'

export const useBackupStore = defineStore('backup', () => {
  function current(): UserData {
    return {
      library: structuredClone(toRaw(useLibraryStore().library)),
      history: structuredClone(toRaw(useHistoryStore().history)),
    }
  }

  async function exportData(): Promise<void> {
    await exportBackup(current())
  }

  /**
   * Merges a backup into the current data (nothing is lost: union of both,
   * newer changes win). The current files are copied aside first.
   */
  async function importData(text: string) {
    const library = useLibraryStore()
    const history = useHistoryStore()
    if (!library.loaded || !history.loaded) {
      throw new Error('Your data failed to load; not importing over it.')
    }
    const incoming = parseBackup(text)
    await storage.snapshotUserFiles(
      `pre-import-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    )
    const merged = mergeUserData(current(), incoming)
    library.replace(merged.library)
    history.replace(merged.history)
    await storage.flush()
    return summarize(incoming)
  }

  return { exportData, importData }
})
