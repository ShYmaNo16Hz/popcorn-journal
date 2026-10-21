import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistoryStore, watchCount } from './history'
import { useLibraryStore } from './library'
import type { Series } from '../types/media'

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

    // A rewatch moves `at` to now; lowering the count keeps it
    history.setMovieWatchCount(866398, 3)
    const rewatchedAt = history.movieEntry(866398)?.at
    expect(rewatchedAt).not.toBe('2026-10-10T22:00:00.000Z')
    expect(history.movieEntry(866398)?.count).toBe(3)
    history.setMovieWatchCount(866398, 2)
    expect(history.movieEntry(866398)).toMatchObject({
      at: rewatchedAt,
      count: 2,
    })

    // Changing the date keeps the count
    history.setMovieWatched(866398, '2026-10-12T22:00:00.000Z')
    expect(watchCount(history.movieEntry(866398))).toBe(2)

    history.setMovieWatched(866398, null)
    expect(history.movieEntry(866398)).toMatchObject({ at: null })
    expect(library.library.movies['866398']?.status).toBe('planned')
  })

  it('remembers where an episode was left off and clears it once ticked', () => {
    const history = useHistoryStore()
    const library = useLibraryStore()

    history.setEpisodeStoppedAt(SOPRANOS, ep(1, 2), 15)
    const entry = history.episodeEntry(SOPRANOS, ep(1, 2))
    expect(entry).toMatchObject({ at: null, stoppedAt: 15 })
    expect(entry?.updatedAt).toBeTruthy()
    expect(watchCount(entry)).toBe(0)
    expect(library.seriesEntry(SOPRANOS)).toBeTruthy()

    history.setEpisodesWatched(SOPRANOS, [ep(1, 2)], true)
    expect(history.episodeEntry(SOPRANOS, ep(1, 2))?.stoppedAt).toBeUndefined()
    expect(watchCount(history.episodeEntry(SOPRANOS, ep(1, 2)))).toBe(1)
  })

  it('clears episode progress on demand, but not when unticking', () => {
    const history = useHistoryStore()
    history.setEpisodeStoppedAt(SOPRANOS, ep(1, 3), 20)
    history.setEpisodeStoppedAt(SOPRANOS, ep(1, 3), null)
    expect(history.episodeEntry(SOPRANOS, ep(1, 3))).not.toHaveProperty(
      'stoppedAt',
    )

    history.setEpisodeStoppedAt(SOPRANOS, ep(1, 3), 20)
    history.setEpisodesWatched(SOPRANOS, [ep(1, 3)], false)
    // e.g. "Mark season unwatched" on a season with a partly watched episode
    expect(history.episodeEntry(SOPRANOS, ep(1, 3))?.stoppedAt).toBe(20)
  })

  it('ticks an episode when the minute reaches its runtime; ignores watched ones', () => {
    const history = useHistoryStore()
    history.setEpisodeStoppedAt(SOPRANOS, ep(1, 4), 50, 50)
    expect(history.episodeEntry(SOPRANOS, ep(1, 4))).not.toHaveProperty(
      'stoppedAt',
    )
    expect(history.isEpisodeWatched(SOPRANOS, ep(1, 4))).toBe(true)

    history.setEpisodeStoppedAt(SOPRANOS, ep(1, 4), 10, 50)
    expect(history.episodeEntry(SOPRANOS, ep(1, 4))).not.toHaveProperty(
      'stoppedAt',
    )
  })

  it('ignores partial progress on a watched movie, even if removed from the library', () => {
    const history = useHistoryStore()
    const library = useLibraryStore()
    history.setMovieWatched(866398, '2026-10-10T22:00:00.000Z')
    library.removeMovie(866398)

    history.setMovieStoppedAt(866398, 30, 120)
    expect(history.movieEntry(866398)).not.toHaveProperty('stoppedAt')
    expect(library.movieEntry(866398)).toBeUndefined()
  })

  it('marks a movie watched when the minute reaches its runtime', () => {
    const history = useHistoryStore()
    const library = useLibraryStore()
    history.setMovieStoppedAt(866398, 45, 120)
    history.setMovieStoppedAt(866398, 120, 120)
    expect(watchCount(history.movieEntry(866398))).toBe(1)
    expect(history.movieEntry(866398)).not.toHaveProperty('stoppedAt')
    expect(library.movieEntry(866398)?.status).toBe('watched')
  })

  it('puts a partly watched movie on the watchlist; marking it watched clears progress', () => {
    const history = useHistoryStore()
    const library = useLibraryStore()

    history.setMovieStoppedAt(866398, 45)
    expect(history.movieEntry(866398)).toMatchObject({
      at: null,
      stoppedAt: 45,
    })
    expect(library.movieEntry(866398)?.status).toBe('planned')

    history.setMovieWatched(866398, '2026-10-10T22:00:00.000Z')
    expect(history.movieEntry(866398)?.stoppedAt).toBeUndefined()
    expect(library.movieEntry(866398)?.status).toBe('watched')
  })
})

describe('markSeriesWatched', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const episode = (season: number, number: number, airDate: string | null) => ({
    season,
    number,
    title: '',
    airDate,
    runtime: 50,
  })
  const show = (status: string): Series => ({
    tmdbId: SOPRANOS,
    title: 'The Sopranos',
    posterPath: null,
    overview: '',
    year: 1999,
    status,
    seasons: [
      { number: 0, name: 'Specials', episodes: [episode(0, 1, '2000-01-01')] },
      {
        number: 1,
        name: 'Season 1',
        episodes: [
          episode(1, 1, '2000-01-01'),
          episode(1, 2, '2000-01-08'),
          episode(1, 3, null),
        ],
      },
    ],
    nextEpisode: null,
    fetchedAt: '',
  })
  const today = '2026-10-21'

  it('ticks aired regular episodes only and completes an ended show', () => {
    const history = useHistoryStore()
    const library = useLibraryStore()
    history.markSeriesWatched(SOPRANOS, show('Ended'), today)

    expect(Object.keys(history.history.episodes['1398']!)).toEqual([
      'S01E01',
      'S01E02',
    ])
    expect(library.seriesEntry(SOPRANOS)?.status).toBe('completed')
  })

  it('keeps watching for a returning show', () => {
    const history = useHistoryStore()
    const library = useLibraryStore()
    history.markSeriesWatched(SOPRANOS, show('Returning Series'), today)
    expect(library.seriesEntry(SOPRANOS)?.status).toBe('watching')
  })

  it('does not override a status the user picked', async () => {
    const history = useHistoryStore()
    const library = useLibraryStore()
    await library.addSeries(SOPRANOS, 'dropped')
    history.markSeriesWatched(SOPRANOS, show('Ended'), today)
    expect(library.seriesEntry(SOPRANOS)?.status).toBe('dropped')
  })
})
