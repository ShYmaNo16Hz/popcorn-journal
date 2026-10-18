// The only module that talks to TMDB. Responses are mapped to our own types here.
import type {
  Episode,
  Movie,
  SearchResult,
  SearchResultsPage,
  Series,
} from '../types/media'
import type {
  TmdbEpisode,
  TmdbMovieDetails,
  TmdbMovieSearchResult,
  TmdbPaged,
  TmdbSeasonDetails,
  TmdbTvDetails,
  TmdbTvSearchResult,
} from '../types/tmdb'

const BASE_URL = 'https://api.themoviedb.org/3'
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p'

export type ImageSize = 'w185' | 'w500'

export class TmdbError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'TmdbError'
    this.status = status
  }
}

export function imageUrl(path: string | null, size: ImageSize): string | null {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null
}

async function get<T>(
  path: string,
  params: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<T> {
  const token = import.meta.env.TMDB_API_READ_ACCESS_TOKEN
  if (!token) {
    throw new Error('TMDB_API_READ_ACCESS_TOKEN is missing from .env.local')
  }

  const url = `${BASE_URL}${path}?${new URLSearchParams(params)}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    signal,
  })
  if (!response.ok) {
    throw new TmdbError(response.status, `TMDB ${path} → ${response.status}`)
  }
  return (await response.json()) as T
}

function parseYear(date: string | undefined): number | null {
  const year = Number.parseInt(date?.slice(0, 4) ?? '', 10)
  return Number.isNaN(year) ? null : year
}

export function mapTvSearchResult(raw: TmdbTvSearchResult): SearchResult {
  return {
    tmdbId: raw.id,
    type: 'series',
    title: raw.name,
    year: parseYear(raw.first_air_date),
    posterPath: raw.poster_path,
    overview: raw.overview,
  }
}

export function mapMovieSearchResult(raw: TmdbMovieSearchResult): SearchResult {
  return {
    tmdbId: raw.id,
    type: 'movie',
    title: raw.title,
    year: parseYear(raw.release_date),
    posterPath: raw.poster_path,
    overview: raw.overview,
  }
}

function mapPage<T>(
  data: TmdbPaged<T>,
  map: (raw: T) => SearchResult,
): SearchResultsPage {
  return {
    results: data.results.map(map),
    page: data.page,
    totalPages: data.total_pages,
  }
}

export async function searchSeries(
  query: string,
  page = 1,
  signal?: AbortSignal,
): Promise<SearchResultsPage> {
  const data = await get<TmdbPaged<TmdbTvSearchResult>>(
    '/search/tv',
    { query, page: String(page), include_adult: 'false' },
    signal,
  )
  return mapPage(data, mapTvSearchResult)
}

export async function searchMovies(
  query: string,
  page = 1,
  signal?: AbortSignal,
): Promise<SearchResultsPage> {
  const data = await get<TmdbPaged<TmdbMovieSearchResult>>(
    '/search/movie',
    { query, page: String(page), include_adult: 'false' },
    signal,
  )
  return mapPage(data, mapMovieSearchResult)
}

function mapEpisode(episode: TmdbEpisode): Episode {
  return {
    season: episode.season_number,
    number: episode.episode_number,
    title: episode.name,
    airDate: episode.air_date || null,
    runtime: episode.runtime,
  }
}

export function mapSeries(
  details: TmdbTvDetails,
  seasons: TmdbSeasonDetails[],
  fetchedAt: string,
): Series {
  return {
    tmdbId: details.id,
    title: details.name,
    posterPath: details.poster_path,
    overview: details.overview,
    year: parseYear(details.first_air_date),
    status: details.status,
    seasons: seasons
      .map((season) => ({
        number: season.season_number,
        name: season.name,
        episodes: season.episodes
          .map(mapEpisode)
          .sort((a, b) => a.number - b.number),
      }))
      .sort((a, b) => a.number - b.number),
    nextEpisode: details.next_episode_to_air
      ? mapEpisode(details.next_episode_to_air)
      : null,
    fetchedAt,
  }
}

export function mapMovie(details: TmdbMovieDetails, fetchedAt: string): Movie {
  return {
    tmdbId: details.id,
    title: details.title,
    posterPath: details.poster_path,
    overview: details.overview,
    year: parseYear(details.release_date),
    runtime: details.runtime || null,
    fetchedAt,
  }
}

/** Show details plus every season's episodes (one request per season). */
export async function getSeries(tmdbId: number): Promise<Series> {
  const details = await get<TmdbTvDetails>(`/tv/${tmdbId}`)
  const seasons = await Promise.all(
    details.seasons.map((season) =>
      get<TmdbSeasonDetails>(`/tv/${tmdbId}/season/${season.season_number}`),
    ),
  )
  return mapSeries(details, seasons, new Date().toISOString())
}

export async function getMovie(tmdbId: number): Promise<Movie> {
  const details = await get<TmdbMovieDetails>(`/movie/${tmdbId}`)
  return mapMovie(details, new Date().toISOString())
}
