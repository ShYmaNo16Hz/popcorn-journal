import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useHistoryStore } from './history'
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
const BEEKEEPER = 866398

describe('library removal', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('removing keeps a tombstone and hides the title', async () => {
    const library = useLibraryStore()
    await library.addSeries(SOPRANOS)
    library.removeSeries(SOPRANOS)

    const raw = library.library.series['1398']
    expect(raw?.removedAt).toBeTypeOf('string')
    expect(raw?.updatedAt).toBe(raw?.removedAt)
    expect(library.seriesEntry(SOPRANOS)).toBeUndefined()
    expect(library.series).toEqual({})
  })

  it('ignores status changes on removed titles', async () => {
    const library = useLibraryStore()
    await library.addSeries(SOPRANOS)
    library.removeSeries(SOPRANOS)
    library.setSeriesStatus(SOPRANOS, 'paused')
    expect(library.library.series['1398']?.status).toBe('watching')
  })

  it('re-adding clears the tombstone and keeps the watch count', async () => {
    const library = useLibraryStore()
    await library.addSeries(SOPRANOS)
    library.setSeriesWatchCount(SOPRANOS, 2)
    library.removeSeries(SOPRANOS)
    await library.addSeries(SOPRANOS, 'planned')

    const entry = library.seriesEntry(SOPRANOS)
    expect(entry).toMatchObject({ status: 'planned', watchCount: 2 })
    expect(entry && 'removedAt' in entry).toBe(false)
  })

  it('keeps history, and ticking an episode re-adds the show', async () => {
    const library = useLibraryStore()
    const history = useHistoryStore()
    history.setEpisodesWatched(SOPRANOS, [{ season: 1, number: 1 }], true)
    library.removeSeries(SOPRANOS)
    expect(history.isEpisodeWatched(SOPRANOS, { season: 1, number: 1 })).toBe(
      true,
    )

    history.setEpisodesWatched(SOPRANOS, [{ season: 1, number: 2 }], true)
    expect(library.seriesEntry(SOPRANOS)?.status).toBe('watching')
  })

  it('marking a removed movie watched brings it back as watched', async () => {
    const library = useLibraryStore()
    const history = useHistoryStore()
    await library.addMovie(BEEKEEPER)
    library.removeMovie(BEEKEEPER)
    expect(library.movies).toEqual({})

    history.setMovieWatched(BEEKEEPER, '2026-10-10T22:00:00.000Z')
    expect(library.movieEntry(BEEKEEPER)?.status).toBe('watched')
  })
})
