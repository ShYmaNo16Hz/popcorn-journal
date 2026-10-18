export type MediaType = 'series' | 'movie'

export interface SearchResult {
  tmdbId: number
  type: MediaType
  title: string
  year: number | null
  posterPath: string | null
  overview: string
}

export interface SearchResultsPage {
  results: SearchResult[]
  page: number
  totalPages: number
}

// Metadata snapshots stored in the cache (re-downloadable from TMDB)

export interface Episode {
  season: number
  number: number
  title: string
  airDate: string | null // YYYY-MM-DD
  runtime: number | null // minutes
}

export interface Season {
  number: number // 0 = specials
  name: string
  episodes: Episode[]
}

export interface Series {
  tmdbId: number
  title: string
  posterPath: string | null
  overview: string
  year: number | null
  status: string // TMDB status: 'Returning Series', 'Ended', 'Canceled', ...
  seasons: Season[]
  nextEpisode: Episode | null // TMDB next_episode_to_air; may also be in seasons
  fetchedAt: string
}

export interface Movie {
  tmdbId: number
  title: string
  posterPath: string | null
  overview: string
  year: number | null
  runtime: number | null // minutes
  fetchedAt: string
}
