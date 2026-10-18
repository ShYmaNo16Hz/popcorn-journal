// New-episode reminders (pure): which local notifications should be pending.
import type { Episode, Series } from '../types/media'
import { episodeKey } from './episodeKey'

export const REMINDER_HOUR = 19 // local time on the air date
export const MAX_REMINDERS = 60 // iOS keeps at most 64 pending notifications

export interface Reminder {
  id: number
  seriesId: number
  title: string
  body: string
  at: Date
}

/** Stable 31-bit id per show + episode, so rescheduling replaces the same notification. */
export function reminderId(seriesId: number, episode: Episode): number {
  const text = `${seriesId}:${episodeKey(episode.season, episode.number)}`
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0
  }
  return Math.abs(hash) || 1
}

function airTime(airDate: string, hour: number): Date {
  const [year, month, day] = airDate.split('-').map(Number)
  return new Date(year!, month! - 1, day!, hour)
}

/** Upcoming episodes (regular seasons + TMDB's next episode), soonest first, capped. */
export function planReminders(
  shows: Series[],
  now: Date,
  hour = REMINDER_HOUR,
  label: (episode: Episode) => string = (e) =>
    `${episodeKey(e.season, e.number)} · ${e.title}`,
): Reminder[] {
  const reminders = new Map<number, Reminder>()
  for (const series of shows) {
    const candidates = series.seasons
      .filter((season) => season.number > 0)
      .flatMap((season) => season.episodes)
    if (series.nextEpisode) candidates.push(series.nextEpisode)
    for (const episode of candidates) {
      if (!episode.airDate) continue
      const at = airTime(episode.airDate, hour)
      if (at <= now) continue
      const id = reminderId(series.tmdbId, episode)
      reminders.set(id, {
        id,
        seriesId: series.tmdbId,
        title: series.title,
        body: label(episode),
        at,
      })
    }
  }
  return [...reminders.values()]
    .sort((a, b) => a.at.getTime() - b.at.getTime() || a.id - b.id)
    .slice(0, MAX_REMINDERS)
}
