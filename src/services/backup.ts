// Backup file: a single JSON with library + history, moved via the share sheet.
// The only way to move data between iOS and Android.
import { Share } from '@capacitor/share'
import type { UserData } from '../types/userData'
import { localDate } from '../utils/date'
import { MigrationError, migrateHistory, migrateLibrary } from './migrations'
import { writeExportFile } from './storage'

const FORMAT = 'popcorn-journal-backup'

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

export function serializeBackup(data: UserData, now = new Date()): string {
  return JSON.stringify(
    {
      format: FORMAT,
      exportedAt: now.toISOString(),
      library: data.library,
      history: data.history,
    },
    null,
    2,
  )
}

/** Validates a backup file and upgrades its contents to the current schema. */
export function parseBackup(text: string): UserData {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('This file is not valid JSON.')
  }
  const file = raw as { format?: unknown; library?: unknown; history?: unknown }
  if (file?.format !== FORMAT) {
    throw new BackupError('This is not a Popcorn Journal backup file.')
  }
  try {
    return {
      library: migrateLibrary(file.library),
      history: migrateHistory(file.history),
    }
  } catch (error) {
    if (error instanceof MigrationError) throw new BackupError(error.message)
    throw error
  }
}

export function backupFileName(now = new Date()): string {
  return `popcorn-journal-backup-${localDate(now)}.json`
}

/** Counts shown to the user after an import. */
export function summarize(data: UserData) {
  const watched = (entry: { at: string | null }) => entry.at !== null
  return {
    series: Object.values(data.library.series).filter((e) => !e.removedAt)
      .length,
    movies: Object.values(data.library.movies).filter((e) => !e.removedAt)
      .length,
    episodes: Object.values(data.history.episodes)
      .flatMap((episodes) => Object.values(episodes))
      .filter(watched).length,
  }
}

/** Writes the backup and opens the share sheet (web: downloads it). */
export async function exportBackup(data: UserData): Promise<void> {
  const now = new Date()
  const uri = await writeExportFile(
    backupFileName(now),
    serializeBackup(data, now),
  )
  if (!uri) return
  try {
    await Share.share({ title: backupFileName(now), files: [uri] })
  } catch (error) {
    // Dismissing the share sheet rejects; that's not an error for us
    if (!String(error).toLowerCase().includes('cancel')) throw error
  }
}
