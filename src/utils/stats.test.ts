import { describe, expect, it } from 'vitest'
import type { Movie, Series } from '../types/media'
import type { History, Library } from '../types/userData'
import { computeStats, splitDuration } from './stats'

const series: Series = {
  tmdbId: 1,
  title: 'Show',
  posterPath: null,
  overview: '',
  year: 2020,
  status: 'Ended',
  seasons: [
    {
      number: 1,
      name: 'S1',
      episodes: [
        {
          season: 1,
          number: 1,
          title: 'a',
          airDate: '2020-01-01',
          runtime: 60,
        },
        {
          season: 1,
          number: 2,
          title: 'b',
          airDate: '2020-01-08',
          runtime: 40,
        },
        {
          season: 1,
          number: 3,
          title: 'c',
          airDate: '2020-01-15',
          runtime: null,
        },
      ],
    },
  ],
  nextEpisode: null,
  fetchedAt: '2026-01-01T00:00:00Z',
}

const movie: Movie = {
  tmdbId: 9,
  title: 'Film',
  posterPath: null,
  overview: '',
  year: 2024,
  runtime: 120,
  fetchedAt: '2026-01-01T00:00:00Z',
}

const library: Library = {
  v: 1,
  series: {
    '1': { status: 'completed', addedAt: '', updatedAt: '' },
    '2': { status: 'watching', addedAt: '', updatedAt: '' },
    '3': { status: 'watching', addedAt: '', updatedAt: '', removedAt: 'x' },
  },
  movies: {},
}

const history: History = {
  v: 1,
  episodes: {
    '1': {
      S01E01: { at: '2026-03-01T00:00:00Z', count: 2 }, // 60 × 2
      S01E02: { at: '2025-03-01T00:00:00Z' }, // 40
      S01E03: { at: '2026-03-02T00:00:00Z' }, // unknown → average 50
      S01E04: { at: null, updatedAt: 'x' }, // tombstone, ignored
    },
    '2': { S01E01: { at: '2026-01-01T00:00:00Z' } }, // no snapshot cached
  },
  movies: {
    '9': { at: '2026-05-01T00:00:00Z', count: 3 },
    '10': { at: null, updatedAt: 'x' },
  },
}

describe('computeStats', () => {
  const stats = computeStats(
    library,
    history,
    { '1': series },
    { '9': movie },
    new Date('2026-10-18T12:00:00Z'),
  )

  it('counts views including rewatches, ignoring tombstones', () => {
    expect(stats.episodes).toBe(5)
    expect(stats.movies).toBe(3)
  })

  it('sums watch time, using the show average for unknown runtimes', () => {
    expect(stats.seriesMinutes).toBe(60 * 2 + 40 + 50)
    expect(stats.movieMinutes).toBe(360)
  })

  it('counts this year by last-watched date', () => {
    expect(stats.thisYear).toEqual({ episodes: 3, movies: 1 })
  })

  it('counts library shows by status, skipping removed ones', () => {
    expect(stats.showsWatching).toBe(1)
    expect(stats.showsCompleted).toBe(1)
  })

  it('reports titles without cached metadata', () => {
    expect(stats.missingMetadata).toBe(1)
  })
})

describe('splitDuration', () => {
  it('splits minutes into days, hours, minutes', () => {
    expect(splitDuration(4000)).toEqual({ days: 2, hours: 18, minutes: 40 })
  })
})
