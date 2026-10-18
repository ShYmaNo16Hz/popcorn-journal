// Merging two copies of user data (sync, backup import). Pure functions.
// Rules: union of keys; for the same key the newer timestamp wins
// (history: `updatedAt ?? at`, library: `updatedAt`), which is how tombstones
// propagate. Ties break deterministically so merge(a, b) == merge(b, a).
import type {
  History,
  HistoryEntry,
  Library,
  LibraryEntry,
  UserData,
} from '../../types/userData'

/** JSON with sorted keys, so equal values always serialize the same. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function pick<T>(a: T, b: T, stamp: (entry: T) => string): T {
  const sa = stamp(a)
  const sb = stamp(b)
  if (sa !== sb) return sa > sb ? a : b
  return canonical(a) >= canonical(b) ? a : b
}

function mergeRecords<T>(
  a: Record<string, T>,
  b: Record<string, T>,
  mergeValue: (x: T, y: T) => T,
): Record<string, T> {
  const result: Record<string, T> = {}
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[key]
    const y = b[key]
    result[key] = x === undefined ? y! : y === undefined ? x : mergeValue(x, y)
  }
  return result
}

const historyStamp = (entry: HistoryEntry) => entry.updatedAt ?? entry.at ?? ''
const libraryStamp = (entry: LibraryEntry<string>) => entry.updatedAt

function pickHistory(a: HistoryEntry, b: HistoryEntry): HistoryEntry {
  return pick(a, b, historyStamp)
}

export function mergeHistory(a: History, b: History): History {
  return {
    v: 1,
    episodes: mergeRecords(a.episodes, b.episodes, (x, y) =>
      mergeRecords(x, y, pickHistory),
    ),
    movies: mergeRecords(a.movies, b.movies, pickHistory),
  }
}

export function mergeLibrary(a: Library, b: Library): Library {
  return {
    v: 1,
    series: mergeRecords(a.series, b.series, (x, y) =>
      pick(x, y, libraryStamp),
    ),
    movies: mergeRecords(a.movies, b.movies, (x, y) =>
      pick(x, y, libraryStamp),
    ),
  }
}

export function mergeUserData(a: UserData, b: UserData): UserData {
  return {
    library: mergeLibrary(a.library, b.library),
    history: mergeHistory(a.history, b.history),
  }
}
