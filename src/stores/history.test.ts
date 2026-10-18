import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistoryStore, watchCount } from './history'
import { useLibraryStore } from './library'

// No network or disk in these tests
vi.mock('../services/cache', () => ({
  isSeriesStale: () => false,
  readCachedSeries: vi.fn(async () => null),
  readCachedMovie: vi.fn(async () => null),
  refreshSeries: vi.fn(async (tmdbId: number) => ({ tmdbId, seasons: [] })),
  refreshMovie: vi.fn(async (tmdbId: number) => ({ tmdbId, title: '' })),
}))

const SOPRANOS = 1398
const ep = (season: number, number: number) => ({ season, number })

describe('watchCount', () => {
  it('is 0 for missing entries and tombstones, count ?? 1 otherwise', () => {
    expect(watchCount(undefined)).toBe(0)
    expect(watchCount({ at: null, updatedAt: 'x', count: 3 })).toBe(0)
    expect(watchCount({ at: 'x' })).toBe(1)
    expect(watchCount({ at: 'x', count: 3 })).toBe(3)
  })
})

describe('history store', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('ticks a whole season and adds the show to the library', () => {
    const history = useHistoryStore()
    history.setEpisodesWatched(
      SOPRANOS,
      [ep(1, 1), ep(1, 2), ep(1, 3)],
      true,
      '2026-10-18T21:00:00.000Z',
    )

    expect(Object.keys(history.history.episodes['1398']!)).toEqual([
      'S01E01',
      'S01E02',
      'S01E03',
    ])
    expect(history.episodeEntry(SOPRANOS, ep(1, 2))?.at).toBe(
      '2026-10-18T21:00:00.000Z',
    )
    expect(useLibraryStore().library.series['1398']?.status).toBe('watching')
  })

  it('unticking writes a tombstone instead of deleting the key', () => {
    const history = useHistoryStore()
    history.setEpisodesWatched(SOPRANOS, [ep(1, 2)], true)
    history.setEpisodesWatched(SOPRANOS, [ep(1, 2)], false)

    const entry = history.episodeEntry(SOPRANOS, ep(1, 2))
    expect(entry).toMatchObject({ at: null })
    expect(entry?.updatedAt).toBeTypeOf('string')
    expect(history.isEpisodeWatched(SOPRANOS, ep(1, 2))).toBe(false)
  })

  it('tracks episode rewatch counts and keeps them when re-ticking', () => {
    const history = useHistoryStore()
    history.setEpisodeWatchCount(SOPRANOS, ep(1, 1), 3)
    expect(watchCount(history.episodeEntry(SOPRANOS, ep(1, 1)))).toBe(3)

    history.setEpisodesWatched(SOPRANOS, [ep(1, 1)], true)
    expect(watchCount(history.episodeEntry(SOPRANOS, ep(1, 1)))).toBe(3)

    history.setEpisodeWatchCount(SOPRANOS, ep(1, 1), 0)
    expect(history.episodeEntry(SOPRANOS, ep(1, 1))).toMatchObject({ at: null })
  })

  it('marks movies watched with a date, counts rewatches and syncs library status', () => {
    const history = useHistoryStore()
    const library = useLibraryStore()

    history.setMovieWatched(866398, '2026-10-10T22:00:00.000Z')
    expect(library.library.movies['866398']?.status).toBe('watched')

    history.setMovieWatchCount(866398, 2)
    expect(history.movieEntry(866398)).toMatchObject({
      at: '2026-10-10T22:00:00.000Z',
      count: 2,
    })

    // Changing the date keeps the count
    history.setMovieWatched(866398, '2026-10-12T22:00:00.000Z')
    expect(watchCount(history.movieEntry(866398))).toBe(2)

    history.setMovieWatched(866398, null)
    expect(history.movieEntry(866398)).toMatchObject({ at: null })
    expect(library.library.movies['866398']?.status).toBe('planned')
  })
})
