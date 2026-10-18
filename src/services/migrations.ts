// Schema migrations for user-data files. Each step upgrades version n → n+1.
// When a file's shape changes: bump CURRENT_VERSION, add a step, add a test.
import type { History, Library } from '../types/userData'

export type UserFileName = 'library' | 'history'

type Json = Record<string, unknown> & { v: number }
export type Migration = (data: Json) => Json

export const CURRENT_VERSION: Record<UserFileName, number> = {
  library: 1,
  history: 1,
}

const MIGRATIONS: Record<UserFileName, Record<number, Migration>> = {
  library: {},
  history: {},
}

export class MigrationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MigrationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Runs `steps` until `raw` reaches `target`. Throws instead of guessing. */
export function runMigrations(
  raw: unknown,
  target: number,
  steps: Record<number, Migration>,
): Json {
  if (!isRecord(raw) || typeof raw.v !== 'number') {
    throw new MigrationError('File has no schema version "v"')
  }
  if (raw.v > target) {
    // Written by a newer app version — never downgrade or overwrite it
    throw new MigrationError(
      `File version ${raw.v} is newer than supported ${target}`,
    )
  }
  let data = raw as Json
  while (data.v < target) {
    const step = steps[data.v]
    if (!step) throw new MigrationError(`No migration from v${data.v}`)
    data = step(data)
  }
  return data
}

export function migrateLibrary(raw: unknown): Library {
  const data = runMigrations(raw, CURRENT_VERSION.library, MIGRATIONS.library)
  if (!isRecord(data.series) || !isRecord(data.movies)) {
    throw new MigrationError('library.json is missing series/movies')
  }
  return data as unknown as Library
}

export function migrateHistory(raw: unknown): History {
  const data = runMigrations(raw, CURRENT_VERSION.history, MIGRATIONS.history)
  if (!isRecord(data.episodes) || !isRecord(data.movies)) {
    throw new MigrationError('history.json is missing episodes/movies')
  }
  return data as unknown as History
}
