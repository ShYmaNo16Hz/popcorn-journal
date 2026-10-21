// User data: precious, stored in Directory.Data/user/, synced and backed up.

export type SeriesStatus =
  'watching' | 'completed' | 'paused' | 'dropped' | 'planned'
export type MovieStatus = 'watched' | 'planned'

// Removing a title keeps its key with `removedAt` (a tombstone) so sync merges
// propagate the removal; re-adding clears it. Watch history is kept either way.
export interface LibraryEntry<S> {
  status: S
  addedAt: string
  updatedAt: string
  removedAt?: string
}

export interface LibrarySeriesEntry extends LibraryEntry<SeriesStatus> {
  watchCount?: number // how many times the whole show was watched, set by the user; absent = 0
}

export interface Library {
  v: 1
  series: Record<string, LibrarySeriesEntry> // keyed by TMDB id
  movies: Record<string, LibraryEntry<MovieStatus>>
}

// `at: null` is a tombstone (unticked) — never delete keys, so sync merges work.
// `updatedAt` is when the entry last changed; merge picks the newer `updatedAt ?? at`.
// `count` = times watched (rewatches); absent = 1 when `at` is set, ignored on tombstones.
// `stoppedAt` = minutes into a partly watched, still unwatched title; cleared once it's ticked.
export interface HistoryEntry {
  at: string | null // last watched
  updatedAt?: string
  count?: number
  stoppedAt?: number
}

export interface History {
  v: 1
  episodes: Record<string, Record<string, HistoryEntry>> // tmdbId → SxxEyy → entry
  movies: Record<string, HistoryEntry>
}

export interface UserData {
  library: Library
  history: History
}

export function emptyLibrary(): Library {
  return { v: 1, series: {}, movies: {} }
}

export function emptyHistory(): History {
  return { v: 1, episodes: {}, movies: {} }
}
