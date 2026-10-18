import { defineStore } from 'pinia'
import { ref } from 'vue'
import { storage } from '../services/storage'
import type { History, HistoryEntry } from '../types/userData'
import { emptyHistory } from '../types/userData'
import { episodeKey } from '../utils/episodeKey'
import { watchCount } from '../utils/progress'
import { useLibraryStore } from './library'

const now = () => new Date().toISOString()

export interface EpisodeRef {
  season: number
  number: number
}

export { watchCount }

export const useHistoryStore = defineStore('history', () => {
  const history = ref<History>(emptyHistory())
  // Saving is disabled until load succeeds, so a failed load never overwrites the file
  const loaded = ref(false)
  const loadError = ref<unknown>(null)

  async function load(): Promise<void> {
    try {
      history.value = await storage.loadHistory()
      loaded.value = true
    } catch (error) {
      console.error(error)
      loadError.value = error
    }
  }

  function save(): void {
    if (loaded.value) storage.saveHistory(history.value)
  }

  /** Swaps in a whole history (backup import / sync) and saves it. */
  function replace(next: History): void {
    history.value = next
    save()
  }

  // Never deletes keys: unwatching writes a tombstone so sync merges propagate it
  function writeEntry(
    entries: Record<string, HistoryEntry>,
    key: string,
    count: number,
    at: string,
  ): boolean {
    const current = entries[key]
    const value = Math.max(0, Math.floor(count))
    if (watchCount(current) === value) return false
    const updatedAt = now()
    entries[key] =
      value === 0
        ? { at: null, updatedAt }
        : {
            at: current?.at ?? at,
            updatedAt,
            ...(value > 1 ? { count: value } : {}),
          }
    return true
  }

  function seriesEpisodes(tmdbId: number): Record<string, HistoryEntry> {
    const id = String(tmdbId)
    history.value.episodes[id] ??= {}
    return history.value.episodes[id]
  }

  function episodeEntry(
    tmdbId: number,
    episode: EpisodeRef,
  ): HistoryEntry | undefined {
    return history.value.episodes[String(tmdbId)]?.[
      episodeKey(episode.season, episode.number)
    ]
  }

  function isEpisodeWatched(tmdbId: number, episode: EpisodeRef): boolean {
    return watchCount(episodeEntry(tmdbId, episode)) > 0
  }

  /**
   * Ticks/unticks one or many episodes (single episode, whole season,
   * "watched up to here") in a single save.
   */
  function setEpisodesWatched(
    tmdbId: number,
    episodes: EpisodeRef[],
    watched: boolean,
    at = now(),
  ): void {
    const entries = seriesEpisodes(tmdbId)
    let changed = false
    for (const episode of episodes) {
      const key = episodeKey(episode.season, episode.number)
      // Ticking keeps an existing rewatch count
      const count = watched ? Math.max(1, watchCount(entries[key])) : 0
      changed = writeEntry(entries, key, count, at) || changed
    }
    if (!changed) return
    save()
    if (watched) void useLibraryStore().addSeries(tmdbId)
  }

  /** Times an episode was watched; 0 unticks it. */
  function setEpisodeWatchCount(
    tmdbId: number,
    episode: EpisodeRef,
    count: number,
  ): void {
    const key = episodeKey(episode.season, episode.number)
    if (!writeEntry(seriesEpisodes(tmdbId), key, count, now())) return
    save()
    if (count > 0) void useLibraryStore().addSeries(tmdbId)
  }

  function movieEntry(tmdbId: number): HistoryEntry | undefined {
    return history.value.movies[String(tmdbId)]
  }

  /** Marks a movie watched on `at` (ISO date), or unwatched with `null`. */
  function setMovieWatched(tmdbId: number, at: string | null): void {
    const id = String(tmdbId)
    // Changing the date keeps an existing rewatch count
    const count = watchCount(history.value.movies[id])
    const updatedAt = now()
    history.value.movies[id] = at
      ? { at, updatedAt, ...(count > 1 ? { count } : {}) }
      : { at: null, updatedAt }
    save()
    syncMovieStatus(tmdbId, at !== null)
  }

  /** Times a movie was watched; 0 marks it unwatched. */
  function setMovieWatchCount(tmdbId: number, count: number): void {
    if (!writeEntry(history.value.movies, String(tmdbId), count, now())) return
    save()
    syncMovieStatus(tmdbId, count > 0)
  }

  function syncMovieStatus(tmdbId: number, watched: boolean): void {
    const library = useLibraryStore()
    const status = watched ? 'watched' : 'planned'
    if (library.movieEntry(tmdbId)) {
      library.setMovieStatus(tmdbId, status)
    } else if (watched) {
      void library.addMovie(tmdbId, status)
    }
  }

  return {
    history,
    loaded,
    loadError,
    load,
    replace,
    episodeEntry,
    isEpisodeWatched,
    setEpisodesWatched,
    setEpisodeWatchCount,
    movieEntry,
    setMovieWatched,
    setMovieWatchCount,
  }
})
