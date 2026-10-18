// Raw TMDB API response shapes. Only used inside src/services/tmdb.ts;
// everything else works with our own domain types.

export interface TmdbPaged<T> {
  page: number
  results: T[]
  total_pages: number
  total_results: number
}

export interface TmdbTvSearchResult {
  id: number
  name: string
  original_name: string
  overview: string
  poster_path: string | null
  first_air_date?: string // '' or missing when unknown
}

export interface TmdbMovieSearchResult {
  id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  release_date?: string // '' or missing when unknown
}

export interface TmdbTvDetails {
  id: number
  name: string
  overview: string
  poster_path: string | null
  first_air_date?: string
  status: string
  seasons: { season_number: number; name: string; episode_count: number }[]
  next_episode_to_air: TmdbEpisode | null
}

export interface TmdbEpisode {
  season_number: number
  episode_number: number
  name: string
  air_date: string | null
  runtime: number | null
}

export interface TmdbSeasonDetails {
  season_number: number
  name: string
  episodes: TmdbEpisode[]
}

export interface TmdbMovieDetails {
  id: number
  title: string
  overview: string
  poster_path: string | null
  release_date?: string
  runtime: number | null
}
