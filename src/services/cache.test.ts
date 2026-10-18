import { describe, expect, it } from 'vitest'
import type { Series } from '../types/media'
import { isSeriesStale } from './cache'

const series = (
  status: string,
  fetchedAt: string,
  nextAirDate: string | null = null,
): Series => ({
  tmdbId: 1,
  title: 'X',
  posterPath: null,
  overview: '',
  year: null,
  status,
  seasons: [],
  nextEpisode: nextAirDate
    ? { season: 1, number: 5, title: '', airDate: nextAirDate, runtime: null }
    : null,
  fetchedAt,
})

describe('isSeriesStale', () => {
  const now = new Date('2026-10-18T12:00:00Z')

  it('refreshes returning shows older than 7 days', () => {
    expect(
      isSeriesStale(series('Returning Series', '2026-10-10T12:00:00Z'), now),
    ).toBe(true)
    expect(
      isSeriesStale(series('Returning Series', '2026-10-12T12:00:00Z'), now),
    ).toBe(false)
  })

  it('never refreshes ended or canceled shows', () => {
    expect(isSeriesStale(series('Ended', '2020-01-01T00:00:00Z'), now)).toBe(
      false,
    )
    expect(isSeriesStale(series('Canceled', '2020-01-01T00:00:00Z'), now)).toBe(
      false,
    )
  })

  it('treats an unparseable fetch date as stale', () => {
    expect(isSeriesStale(series('Returning Series', 'nope'), now)).toBe(true)
  })
})

describe('isSeriesStale with an announced next episode', () => {
  const now = new Date('2026-10-18T12:00:00')

  it('refreshes once the next episode has aired (fetched over a day ago)', () => {
    expect(
      isSeriesStale(
        series('Returning Series', '2026-10-16T12:00:00', '2026-10-17'),
        now,
      ),
    ).toBe(true)
  })

  it('does not refresh more than once a day while TMDB catches up', () => {
    expect(
      isSeriesStale(
        series('Returning Series', '2026-10-18T08:00:00', '2026-10-17'),
        now,
      ),
    ).toBe(false)
  })

  it('waits while the next episode is still in the future', () => {
    expect(
      isSeriesStale(
        series('Returning Series', '2026-10-16T12:00:00', '2026-10-25'),
        now,
      ),
    ).toBe(false)
  })
})
