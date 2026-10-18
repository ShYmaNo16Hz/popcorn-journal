import { describe, expect, it } from 'vitest'
import type { UserData } from '../../types/userData'
import { mergeHistory, mergeLibrary, mergeUserData } from './merge'

const T1 = '2026-10-18T20:00:00.000Z'
const T2 = '2026-10-18T21:00:00.000Z'
const T3 = '2026-10-19T10:00:00.000Z'

const phone: UserData = {
  library: {
    v: 1,
    series: {
      '1398': { status: 'watching', addedAt: T1, updatedAt: T1 },
      '456': { status: 'watching', addedAt: T1, updatedAt: T3, removedAt: T3 },
    },
    movies: { '866398': { status: 'planned', addedAt: T1, updatedAt: T1 } },
  },
  history: {
    v: 1,
    episodes: {
      '1398': {
        S01E01: { at: T1, updatedAt: T1 },
        S01E02: { at: null, updatedAt: T3 }, // unticked later on the phone
      },
    },
    movies: {},
  },
}

const ipad: UserData = {
  library: {
    v: 1,
    series: {
      '1398': { status: 'paused', addedAt: T1, updatedAt: T2 },
      '456': { status: 'watching', addedAt: T1, updatedAt: T2 },
    },
    movies: { '693134': { status: 'watched', addedAt: T2, updatedAt: T2 } },
  },
  history: {
    v: 1,
    episodes: {
      '1398': {
        S01E02: { at: T2, updatedAt: T2 },
        S01E03: { at: T2, updatedAt: T2, count: 2 },
      },
      '456': { S38E01: { at: T2 } }, // legacy entry without updatedAt
    },
    movies: { '693134': { at: T2, updatedAt: T2 } },
  },
}

describe('mergeUserData', () => {
  const merged = mergeUserData(phone, ipad)

  it('unions keys from both sides', () => {
    expect(Object.keys(merged.library.movies).sort()).toEqual([
      '693134',
      '866398',
    ])
    expect(Object.keys(merged.history.episodes['1398']!).sort()).toEqual([
      'S01E01',
      'S01E02',
      'S01E03',
    ])
    expect(merged.history.episodes['456']).toEqual({ S38E01: { at: T2 } })
  })

  it('newer updatedAt wins in the library', () => {
    expect(merged.library.series['1398']?.status).toBe('paused')
  })

  it('a newer removal (library tombstone) wins', () => {
    expect(merged.library.series['456']?.removedAt).toBe(T3)
  })

  it('a newer untick (history tombstone) wins', () => {
    expect(merged.history.episodes['1398']?.S01E02).toEqual({
      at: null,
      updatedAt: T3,
    })
  })

  it('keeps rewatch counts', () => {
    expect(merged.history.episodes['1398']?.S01E03?.count).toBe(2)
  })

  it('is commutative', () => {
    expect(mergeUserData(ipad, phone)).toEqual(merged)
  })

  it('is idempotent', () => {
    expect(mergeUserData(phone, phone)).toEqual(phone)
    expect(mergeUserData(merged, merged)).toEqual(merged)
    expect(mergeUserData(merged, ipad)).toEqual(merged)
  })
})

describe('tie-breaking', () => {
  it('picks the same winner either way when timestamps are equal', () => {
    const a = {
      v: 1 as const,
      episodes: {},
      movies: { '1': { at: T1, updatedAt: T2 } },
    }
    const b = {
      v: 1 as const,
      episodes: {},
      movies: { '1': { at: null, updatedAt: T2 } },
    }
    expect(mergeHistory(a, b)).toEqual(mergeHistory(b, a))
  })

  it('is insensitive to key order', () => {
    const a = {
      v: 1 as const,
      series: {
        '1': { status: 'paused' as const, addedAt: T1, updatedAt: T2 },
      },
      movies: {},
    }
    const b = {
      v: 1 as const,
      series: {
        '1': { updatedAt: T2, addedAt: T1, status: 'dropped' as const },
      },
      movies: {},
    }
    expect(mergeLibrary(a, b)).toEqual(mergeLibrary(b, a))
  })
})
