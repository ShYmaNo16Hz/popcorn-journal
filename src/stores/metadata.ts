// In-memory view of the metadata cache (series/movie snapshots).
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  isSeriesStale,
  readCachedMovie,
  readCachedSeries,
  refreshMovie,
  refreshSeries,
} from '../services/cache'
import type { Movie, Series } from '../types/media'

export const useMetadataStore = defineStore('metadata', () => {
  const series = ref<Record<string, Series>>({})
  const movies = ref<Record<string, Movie>>({})
  const inflight = new Map<string, Promise<unknown>>()

  function dedupe<T>(key: string, task: () => Promise<T>): Promise<T> {
    const running = inflight.get(key) as Promise<T> | undefined
    if (running) return running
    const promise = task().finally(() => inflight.delete(key))
    inflight.set(key, promise)
    return promise
  }

  /**
   * Returns the cached snapshot right away (refreshing it in the background
   * when stale); waits for TMDB only when nothing is cached or `force` is set.
   */
  async function ensureSeries(
    tmdbId: number,
    { force = false } = {},
  ): Promise<Series> {
    const id = String(tmdbId)
    if (!series.value[id]) {
      const cached = await readCachedSeries(tmdbId)
      if (cached && !series.value[id]) series.value[id] = cached
    }
    const current = series.value[id]
    if (current && !force && !isSeriesStale(current, new Date())) return current

    const refresh = dedupe(`series:${id}`, async () => {
      const fresh = await refreshSeries(tmdbId)
      series.value[id] = fresh
      return fresh
    })
    if (current && !force) {
      refresh.catch((error) => console.error(error)) // offline: keep the stale copy
      return current
    }
    return refresh
  }

  async function ensureMovie(
    tmdbId: number,
    { force = false } = {},
  ): Promise<Movie> {
    const id = String(tmdbId)
    if (!movies.value[id]) {
      const cached = await readCachedMovie(tmdbId)
      if (cached && !movies.value[id]) movies.value[id] = cached
    }
    const current = movies.value[id]
    if (current && !force) return current

    return dedupe(`movie:${id}`, async () => {
      const fresh = await refreshMovie(tmdbId)
      movies.value[id] = fresh
      return fresh
    })
  }

  return { series, movies, ensureSeries, ensureMovie }
})
