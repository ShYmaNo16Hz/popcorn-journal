import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useMetadataStore } from './metadata'
import { storage } from '../services/storage'
import type {
  Library,
  LibraryEntry,
  LibrarySeriesEntry,
  MovieStatus,
  SeriesStatus,
} from '../types/userData'
import { emptyLibrary } from '../types/userData'

const now = () => new Date().toISOString()

/** Times the whole show was watched; unset counts a completed show as once. */
export function seriesWatchCount(entry: LibrarySeriesEntry): number {
  return entry.watchCount ?? (entry.status === 'completed' ? 1 : 0)
}

// Entries with `removedAt` are tombstones: kept on disk, hidden everywhere else
function active<E extends LibraryEntry<string>>(
  entries: Record<string, E>,
): Record<string, E> {
  return Object.fromEntries(
    Object.entries(entries).filter(([, entry]) => !entry.removedAt),
  )
}

export const useLibraryStore = defineStore('library', () => {
  const library = ref<Library>(emptyLibrary())
  // Saving is disabled until load succeeds, so a failed load never overwrites the file
  const loaded = ref(false)
  const loadError = ref<unknown>(null)

  /** Shows/movies in the library (removed ones excluded). */
  const series = computed(() => active(library.value.series))
  const movies = computed(() => active(library.value.movies))

  async function load(): Promise<void> {
    try {
      library.value = await storage.loadLibrary()
      loaded.value = true
    } catch (error) {
      console.error(error)
      loadError.value = error
    }
  }

  function save(): void {
    if (loaded.value) storage.saveLibrary(library.value)
  }

  /** Swaps in a whole library (backup import / sync) and saves it. */
  function replace(next: Library): void {
    library.value = next
    save()
  }

  function seriesEntry(tmdbId: number): LibrarySeriesEntry | undefined {
    const entry = library.value.series[String(tmdbId)]
    return entry?.removedAt ? undefined : entry
  }

  function movieEntry(tmdbId: number): LibraryEntry<MovieStatus> | undefined {
    const entry = library.value.movies[String(tmdbId)]
    return entry?.removedAt ? undefined : entry
  }

  /** Adds (or re-adds a removed) entry; returns false if it was already there. */
  function upsert<S extends string>(
    entries: Record<string, LibraryEntry<S>>,
    id: string,
    status: S,
  ): boolean {
    const current = entries[id]
    if (current && !current.removedAt) return false
    const at = now()
    // Re-adding keeps fields like watchCount, drops the tombstone
    const { removedAt: _removed, ...rest } = current ?? {}
    entries[id] = { ...rest, status, addedAt: at, updatedAt: at }
    return true
  }

  function remove(entries: Record<string, LibraryEntry<string>>, id: string) {
    const entry = entries[id]
    if (!entry || entry.removedAt) return
    const at = now()
    entry.removedAt = at
    entry.updatedAt = at
    save()
  }

  /** Adds a show (no-op if already in the library) and caches its metadata. */
  async function addSeries(
    tmdbId: number,
    status: SeriesStatus = 'watching',
  ): Promise<void> {
    if (upsert(library.value.series, String(tmdbId), status)) save()
    // Snapshot for offline use; if offline it is fetched the next time it's opened
    await useMetadataStore()
      .ensureSeries(tmdbId)
      .catch((error) => console.error(error))
  }

  function removeSeries(tmdbId: number): void {
    remove(library.value.series, String(tmdbId))
  }

  function setSeriesStatus(tmdbId: number, status: SeriesStatus): void {
    const entry = seriesEntry(tmdbId)
    if (!entry || entry.status === status) return
    entry.status = status
    entry.updatedAt = now()
    save()
  }

  /** How many times the whole show has been watched (0 or more). */
  function setSeriesWatchCount(tmdbId: number, count: number): void {
    const entry = seriesEntry(tmdbId)
    const value = Math.max(0, Math.floor(count))
    if (!entry || seriesWatchCount(entry) === value) return
    entry.watchCount = value
    entry.updatedAt = now()
    save()
  }

  /** Adds a movie (no-op if already in the library) and caches its metadata. */
  async function addMovie(
    tmdbId: number,
    status: MovieStatus = 'planned',
  ): Promise<void> {
    if (upsert(library.value.movies, String(tmdbId), status)) save()
    await useMetadataStore()
      .ensureMovie(tmdbId)
      .catch((error) => console.error(error))
  }

  function removeMovie(tmdbId: number): void {
    remove(library.value.movies, String(tmdbId))
  }

  function setMovieStatus(tmdbId: number, status: MovieStatus): void {
    const entry = movieEntry(tmdbId)
    if (!entry || entry.status === status) return
    entry.status = status
    entry.updatedAt = now()
    save()
  }

  return {
    library,
    series,
    movies,
    loaded,
    loadError,
    load,
    replace,
    seriesEntry,
    movieEntry,
    addSeries,
    removeSeries,
    setSeriesStatus,
    setSeriesWatchCount,
    addMovie,
    removeMovie,
    setMovieStatus,
  }
})
