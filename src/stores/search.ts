import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { searchMovies, searchSeries } from '../services/tmdb'
import type { MediaType, SearchResult } from '../types/media'

export type SearchStatus = 'idle' | 'loading' | 'done' | 'error'

export const useSearchStore = defineStore('search', () => {
  const query = ref('')
  const type = ref<MediaType>('series')
  const results = ref<SearchResult[]>([])
  const status = ref<SearchStatus>('idle')
  const page = ref(0)
  const totalPages = ref(0)
  const hasMore = computed(
    () => status.value === 'done' && page.value < totalPages.value,
  )

  // Only the latest request may write results; older ones get aborted.
  let controller: AbortController | null = null

  async function run(): Promise<void> {
    controller?.abort()
    const q = query.value.trim()
    page.value = 0
    totalPages.value = 0
    if (!q) {
      controller = null
      results.value = []
      status.value = 'idle'
      return
    }

    const current = new AbortController()
    controller = current
    status.value = 'loading'
    try {
      const search = type.value === 'series' ? searchSeries : searchMovies
      const data = await search(q, 1, current.signal)
      results.value = data.results
      page.value = data.page
      totalPages.value = data.totalPages
      status.value = 'done'
    } catch (error) {
      if (current.signal.aborted) return
      console.error(error)
      status.value = 'error'
    }
  }

  /** Appends the next page of results (infinite scroll). */
  async function loadMore(): Promise<void> {
    if (!hasMore.value || !controller) return
    const current = controller
    try {
      const search = type.value === 'series' ? searchSeries : searchMovies
      const data = await search(
        query.value.trim(),
        page.value + 1,
        current.signal,
      )
      if (current !== controller) return // a new search started meanwhile
      // TMDB can repeat a title across pages; keep the first occurrence
      const seen = new Set(results.value.map((r) => r.tmdbId))
      results.value.push(...data.results.filter((r) => !seen.has(r.tmdbId)))
      page.value = data.page
      totalPages.value = data.totalPages
    } catch (error) {
      if (!current.signal.aborted) console.error(error)
    }
  }

  function setQuery(value: string): Promise<void> {
    query.value = value
    return run()
  }

  function setType(value: MediaType): Promise<void> {
    if (value === type.value) return Promise.resolve()
    type.value = value
    results.value = []
    return run()
  }

  return {
    query,
    type,
    results,
    status,
    hasMore,
    setQuery,
    setType,
    loadMore,
    retry: run,
  }
})
