import { describe, expect, it } from 'vitest'
import type { Episode, Series } from '../types/media'
import { MAX_REMINDERS, planReminders, reminderId } from './reminders'

const ep = (
  season: number,
  number: number,
  airDate: string | null,
): Episode => ({
  season,
  number,
  title: `Ep ${number}`,
  airDate,
  runtime: 22,
})

const show = (
  tmdbId: number,
  episodes: Episode[],
  nextEpisode: Episode | null = null,
): Series => ({
  tmdbId,
  title: `Show ${tmdbId}`,
  posterPath: null,
  overview: '',
  year: 2020,
  status: 'Returning Series',
  seasons: [
    { number: 0, name: 'Specials', episodes: [ep(0, 1, '2026-10-20')] },
    { number: 1, name: 'S1', episodes },
  ],
  nextEpisode,
  fetchedAt: '',
})

const now = new Date(2026, 9, 18, 12, 0) // 18 Oct 2026, 12:00 local

describe('planReminders', () => {
  it('schedules future episodes at 19:00 local on the air date, skipping specials and TBA', () => {
    const plans = planReminders(
      [
        show(1, [
          ep(1, 1, '2026-10-11'),
          ep(1, 2, '2026-10-25'),
          ep(1, 3, null),
        ]),
      ],
      now,
    )
    expect(plans).toHaveLength(1)
    expect(plans[0]).toMatchObject({
      seriesId: 1,
      title: 'Show 1',
      body: 'S01E02 · Ep 2',
    })
    expect(plans[0]!.at).toEqual(new Date(2026, 9, 25, 19, 0))
  })

  it("includes today's episode until 19:00, then drops it", () => {
    const series = [show(1, [ep(1, 1, '2026-10-18')])]
    expect(planReminders(series, now)).toHaveLength(1)
    expect(planReminders(series, new Date(2026, 9, 18, 19, 30))).toHaveLength(0)
  })

  it("adds TMDB's next episode without duplicating one from the season list", () => {
    const next = ep(1, 2, '2026-10-25')
    expect(planReminders([show(1, [next], next)], now)).toHaveLength(1)
    expect(
      planReminders([show(1, [], ep(2, 1, '2027-01-05'))], now)[0]?.body,
    ).toBe('S02E01 · Ep 1')
  })

  it('orders by air time across shows and caps the total', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      show(i + 1, [
        ep(1, 1, `2026-11-${String((i % 28) + 1).padStart(2, '0')}`),
        ep(1, 2, '2026-12-31'),
      ]),
    )
    const plans = planReminders(many, now)
    expect(plans).toHaveLength(MAX_REMINDERS)
    const times = plans.map((p) => p.at.getTime())
    expect(times).toEqual([...times].sort((a, b) => a - b))
  })

  it('uses stable ids per show and episode', () => {
    const e = ep(1, 2, '2026-10-25')
    expect(reminderId(1, e)).toBe(reminderId(1, e))
    expect(reminderId(1, e)).not.toBe(reminderId(2, e))
    expect(reminderId(1, e)).toBeGreaterThan(0)
  })
})
