// Metadata cache: TMDB snapshots in Directory.Data/cache/. Safe to delete,
// re-fetched when missing. Not synced.
import type { Movie, Series } from '../types/media'
import { localDate } from '../utils/date'
import { storage } from './storage'
import { getMovie, getSeries } from './tmdb'

const DAY_MS = 24 * 60 * 60 * 1000
const SERIES_MAX_AGE_MS = 7 * DAY_MS
const FINAL_STATUSES = new Set(['Ended', 'Canceled'])

/**
 * Ended/Canceled shows never auto-refresh. Others refresh after 7 days, or
 * (at most daily) once their announced next episode's air date has passed.
 */
export function isSeriesStale(series: Series, now: Date): boolean {
  if (FINAL_STATUSES.has(series.status)) return false
  const fetchedAt = Date.parse(series.fetchedAt)
  if (Number.isNaN(fetchedAt)) return true
  const age = now.getTime() - fetchedAt
  if (age > SERIES_MAX_AGE_MS) return true
  const nextAirDate = series.nextEpisode?.airDate
  return !!nextAirDate && nextAirDate < localDate(now) && age > DAY_MS
}

function isSeries(value: unknown): value is Series {
  const v = value as Partial<Series> | null
  return typeof v?.tmdbId === 'number' && Array.isArray(v.seasons)
}

function isMovie(value: unknown): value is Movie {
  const v = value as Partial<Movie> | null
  return typeof v?.tmdbId === 'number' && typeof v.title === 'string'
}

/** Cached snapshot only — no network. */
export async function readCachedSeries(tmdbId: number): Promise<Series | null> {
  const cached = await storage.readCache('series', tmdbId)
  if (!isSeries(cached)) return null
  return { ...cached, nextEpisode: cached.nextEpisode ?? null }
}

/** Fetches from TMDB and updates the cache. */
export async function refreshSeries(tmdbId: number): Promise<Series> {
  const fresh = await getSeries(tmdbId)
  await storage.writeCache('series', tmdbId, fresh)
  return fresh
}

/** Cached snapshot only — no network. Movies never auto-refresh. */
export async function readCachedMovie(tmdbId: number): Promise<Movie | null> {
  const cached = await storage.readCache('movies', tmdbId)
  return isMovie(cached) ? cached : null
}

/** Fetches from TMDB and updates the cache. */
export async function refreshMovie(tmdbId: number): Promise<Movie> {
  const fresh = await getMovie(tmdbId)
  await storage.writeCache('movies', tmdbId, fresh)
  return fresh
}
