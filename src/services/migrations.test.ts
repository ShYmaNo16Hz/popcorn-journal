import { describe, expect, it } from 'vitest'
import {
  MigrationError,
  migrateHistory,
  migrateLibrary,
  runMigrations,
} from './migrations'
import type { Migration } from './migrations'

describe('runMigrations', () => {
  const steps: Record<number, Migration> = {
    1: (data) => ({ ...data, v: 2, added: true }),
    2: (data) => ({ ...data, v: 3, renamed: data.added }),
  }

  it('applies every step up to the target version', () => {
    expect(runMigrations({ v: 1 }, 3, steps)).toEqual({
      v: 3,
      added: true,
      renamed: true,
    })
  })

  it('returns current-version data unchanged', () => {
    const data = { v: 3, x: 1 }
    expect(runMigrations(data, 3, steps)).toEqual(data)
  })

  it('refuses files from a newer app version', () => {
    expect(() => runMigrations({ v: 4 }, 3, steps)).toThrow(MigrationError)
  })

  it('refuses data without a version', () => {
    expect(() => runMigrations({}, 3, steps)).toThrow(MigrationError)
    expect(() => runMigrations(null, 3, steps)).toThrow(MigrationError)
    expect(() => runMigrations([], 3, steps)).toThrow(MigrationError)
  })

  it('fails when a step is missing', () => {
    expect(() => runMigrations({ v: 1 }, 3, { 2: steps[2]! })).toThrow(
      'No migration from v1',
    )
  })
})

describe('migrateLibrary / migrateHistory', () => {
  it('accepts v1 files', () => {
    const library = { v: 1, series: { '1398': {} }, movies: {} }
    expect(migrateLibrary(library)).toEqual(library)
    const history = { v: 1, episodes: {}, movies: {} }
    expect(migrateHistory(history)).toEqual(history)
  })

  it('rejects files missing their collections', () => {
    expect(() => migrateLibrary({ v: 1, series: {} })).toThrow(MigrationError)
    expect(() => migrateHistory({ v: 1, movies: {} })).toThrow(MigrationError)
  })
})
