import { describe, expect, it } from 'vitest'
import type { Episode, Series } from '../types/media'
import { episodesUpTo, isAired, seriesProgress } from './progress'

const TODAY = '2026-10-18'

const ep = (
  season: number,
  number: number,
  airDate: string | null,
): Episode => ({
  season,
  number,
  title: `S${season}E${number}`,
  airDate,
  runtime: 30,
})

// S0 specials, S1 fully aired, S2 airing weekly: E1–E2 aired, E3 airs today, E4 next week, E5 TBA
const simpsonsLike = (nextEpisode: Episode | null = null): Series => ({
  tmdbId: 456,
  title: 'Show',
  posterPath: null,
  overview: '',
  year: 2025,
  status: 'Returning Series',
  seasons: [
    { number: 0, name: 'Specials', episodes: [ep(0, 1, '2025-12-24')] },
    {
      number: 1,
      name: 'Season 1',
      episodes: [ep(1, 1, '2025-09-01'), ep(1, 2, '2025-09-08')],
    },
    {
      number: 2,
      name: 'Season 2',
      episodes: [
        ep(2, 1, '2026-10-04'),
        ep(2, 2, '2026-10-11'),
        ep(2, 3, TODAY),
        ep(2, 4, '2026-10-25'),
        ep(2, 5, null),
      ],
    },
  ],
  nextEpisode,
  fetchedAt: '2026-10-18T00:00:00Z',
})

const watchedSet = (...keys: string[]) => {
  const set = new Set(keys)
  return (e: Episode) => set.has(`${e.season}x${e.number}`)
}

describe('isAired', () => {
  it('counts today as aired and TBA as not aired', () => {
    expect(isAired(ep(1, 1, TODAY), TODAY)).toBe(true)
    expect(isAired(ep(1, 1, '2026-10-19'), TODAY)).toBe(false)
    expect(isAired(ep(1, 1, null), TODAY)).toBe(false)
  })
})

describe('seriesProgress', () => {
  it('starts at the first episode, excluding specials', () => {
    const p = seriesProgress(simpsonsLike(), watchedSet(), TODAY)
    expect(p).toMatchObject({ watched: 0, aired: 5, caughtUp: false })
    expect(p.nextUp).toMatchObject({ season: 1, number: 1 })
  })

  it('continues after the furthest watched episode', () => {
    const p = seriesProgress(
      simpsonsLike(),
      watchedSet('1x1', '1x2', '2x1'),
      TODAY,
    )
    expect(p.watched).toBe(3)
    expect(p.nextUp).toMatchObject({ season: 2, number: 2 })
  })

  it('falls back to an earlier skipped episode when the latest is watched', () => {
    const p = seriesProgress(
      simpsonsLike(),
      watchedSet('1x1', '2x1', '2x2', '2x3'),
      TODAY,
    )
    expect(p.nextUp).toMatchObject({ season: 1, number: 2 })
    expect(p.caughtUp).toBe(false)
  })

  it('when caught up, shows the next episode to air with its date', () => {
    const p = seriesProgress(
      simpsonsLike(),
      watchedSet('1x1', '1x2', '2x1', '2x2', '2x3'),
      TODAY,
    )
    expect(p).toMatchObject({
      watched: 5,
      aired: 5,
      caughtUp: true,
      nextUp: null,
    })
    expect(p.upcoming).toMatchObject({
      season: 2,
      number: 4,
      airDate: '2026-10-25',
    })
  })

  it("uses TMDB's next_episode_to_air when the season list doesn't have it yet", () => {
    const series = simpsonsLike(ep(3, 1, '2027-01-10'))
    series.seasons = series.seasons.slice(0, 2) // only S0–S1 known, all aired
    const p = seriesProgress(series, watchedSet('1x1', '1x2'), TODAY)
    expect(p.caughtUp).toBe(true)
    expect(p.upcoming).toMatchObject({
      season: 3,
      number: 1,
      airDate: '2027-01-10',
    })
  })

  it('has no upcoming episode for a finished show', () => {
    const series = simpsonsLike()
    series.seasons = series.seasons.slice(0, 2)
    expect(seriesProgress(series, watchedSet(), TODAY).upcoming).toBeNull()
  })
})

describe('episodesUpTo', () => {
  it('returns aired regular episodes up to the target, across seasons', () => {
    const keys = episodesUpTo(
      simpsonsLike(),
      ep(2, 2, '2026-10-11'),
      TODAY,
    ).map((e) => `${e.season}x${e.number}`)
    expect(keys).toEqual(['1x1', '1x2', '2x1', '2x2'])
  })

  it('only marks the special itself for season 0', () => {
    const special = ep(0, 1, '2025-12-24')
    expect(episodesUpTo(simpsonsLike(), special, TODAY)).toEqual([special])
  })
})
