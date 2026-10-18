import { describe, expect, it, vi } from 'vitest'
import type { UserData } from '../types/userData'
import { BackupError, parseBackup, serializeBackup, summarize } from './backup'

vi.mock('@capacitor/share', () => ({ Share: { share: vi.fn() } }))

const data: UserData = {
  library: {
    v: 1,
    series: {
      '1398': { status: 'watching', addedAt: 'a', updatedAt: 'a' },
      '456': {
        status: 'watching',
        addedAt: 'a',
        updatedAt: 'b',
        removedAt: 'b',
      },
    },
    movies: { '866398': { status: 'planned', addedAt: 'a', updatedAt: 'a' } },
  },
  history: {
    v: 1,
    episodes: {
      '1398': { S01E01: { at: 'a' }, S01E02: { at: null, updatedAt: 'b' } },
    },
    movies: {},
  },
}

describe('backup files', () => {
  it('round-trips through serialize/parse', () => {
    expect(parseBackup(serializeBackup(data))).toEqual(data)
  })

  it('rejects non-JSON and foreign JSON files', () => {
    expect(() => parseBackup('nope')).toThrow(BackupError)
    expect(() => parseBackup('{"hello":1}')).toThrow(
      'not a Popcorn Journal backup',
    )
  })

  it('rejects backups from a newer app version', () => {
    const text = JSON.stringify({
      format: 'popcorn-journal-backup',
      library: { ...data.library, v: 99 },
      history: data.history,
    })
    expect(() => parseBackup(text)).toThrow(BackupError)
  })

  it('summarizes active titles and watched episodes', () => {
    expect(summarize(data)).toEqual({ series: 1, movies: 1, episodes: 1 })
  })
})
