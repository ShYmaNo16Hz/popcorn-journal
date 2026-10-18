// Watch statistics (pure). Rewatches count towards totals and time.
import type { Movie, Series } from '../types/media'
import type { History, Library } from '../types/userData'
import { parseEpisodeKey } from './episodeKey'
import { watchCount } from './progress'

export interface WatchStats {
  episodes: number // episode views, rewatches included
  seriesMinutes: number
  movies: number // movie views, rewatches included
  movieMinutes: number
  showsWatching: number
  showsCompleted: number
  thisYear: { episodes: number; movies: number } // by last-watched date
  missingMetadata: number // shows/movies whose runtimes aren't cached yet
}

function runtimeLookup(series: Series): (key: string) => number {
  const byKey = new Map<string, number | null>()
  const known: number[] = []
  for (const season of series.seasons) {
    for (const episode of season.episodes) {
      byKey.set(`${episode.season}x${episode.number}`, episode.runtime)
      if (episode.runtime) known.push(episode.runtime)
    }
  }
  // Unknown runtimes fall back to the show's average episode length
  const average = known.length
    ? known.reduce((a, b) => a + b, 0) / known.length
    : 0
  return (key) => {
    const parsed = parseEpisodeKey(key)
    if (!parsed) return 0
    return byKey.get(`${parsed.season}x${parsed.episode}`) || average
  }
}

export function computeStats(
  library: Library,
  history: History,
  series: Record<string, Series>,
  movies: Record<string, Movie>,
  now: Date = new Date(),
): WatchStats {
  const year = String(now.getFullYear())
  const stats: WatchStats = {
    episodes: 0,
    seriesMinutes: 0,
    movies: 0,
    movieMinutes: 0,
    showsWatching: 0,
    showsCompleted: 0,
    thisYear: { episodes: 0, movies: 0 },
    missingMetadata: 0,
  }

  for (const [id, episodes] of Object.entries(history.episodes)) {
    const snapshot = series[id]
    const runtime = snapshot ? runtimeLookup(snapshot) : () => 0
    let any = false
    for (const [key, entry] of Object.entries(episodes)) {
      const count = watchCount(entry)
      if (!count) continue
      any = true
      stats.episodes += count
      stats.seriesMinutes += runtime(key) * count
      if (entry.at?.startsWith(year)) stats.thisYear.episodes += 1
    }
    if (any && !snapshot) stats.missingMetadata += 1
  }

  for (const [id, entry] of Object.entries(history.movies)) {
    const count = watchCount(entry)
    if (!count) continue
    stats.movies += count
    const movie = movies[id]
    if (movie) stats.movieMinutes += (movie.runtime ?? 0) * count
    else stats.missingMetadata += 1
    if (entry.at?.startsWith(year)) stats.thisYear.movies += 1
  }

  for (const entry of Object.values(library.series)) {
    if (entry.removedAt) continue
    if (entry.status === 'watching') stats.showsWatching += 1
    if (entry.status === 'completed') stats.showsCompleted += 1
  }

  stats.seriesMinutes = Math.round(stats.seriesMinutes)
  return stats
}

/** 4000 → { days: 2, hours: 18, minutes: 40 } */
export function splitDuration(minutes: number) {
  return {
    days: Math.floor(minutes / 1440),
    hours: Math.floor((minutes % 1440) / 60),
    minutes: minutes % 60,
  }
}
