<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonList,
  IonListHeader,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue'
import { computed, watch } from 'vue'
import MediaRow from '../components/MediaRow.vue'
import { useHistoryStore, watchCount } from '../stores/history'
import { useLibraryStore } from '../stores/library'
import { useMetadataStore } from '../stores/metadata'
import { formatDate, isoToLocalDate, stoppedAtLabel } from '../utils/date'
import { strings } from '../utils/strings'

const library = useLibraryStore()
const history = useHistoryStore()
const metadata = useMetadataStore()
const router = useIonRouter()

function ensureAll() {
  for (const id of Object.keys(library.movies)) {
    metadata.ensureMovie(Number(id)).catch((error) => console.error(error))
  }
}
onIonViewWillEnter(ensureAll)
watch(() => Object.keys(library.movies).length, ensureAll)

const rows = computed(() =>
  Object.entries(library.movies).flatMap(([id, entry]) => {
    const movie = metadata.movies[id]
    if (!movie) return []
    const watched = history.movieEntry(Number(id))
    return [{ id, entry, movie, watched, count: watchCount(watched) }]
  }),
)

// Partly watched, most recently updated first
const inProgress = computed(() =>
  rows.value
    .filter((row) => row.count === 0 && row.watched?.stoppedAt)
    .sort((a, b) =>
      (b.watched?.updatedAt ?? '').localeCompare(a.watched?.updatedAt ?? ''),
    ),
)

// Most recently added first
const watchlist = computed(() =>
  rows.value
    .filter((row) => row.count === 0 && !row.watched?.stoppedAt)
    .sort((a, b) => b.entry.addedAt.localeCompare(a.entry.addedAt)),
)

// Most recently watched first
const watched = computed(() =>
  rows.value
    .filter((row) => row.count > 0)
    .sort((a, b) => (b.watched?.at ?? '').localeCompare(a.watched?.at ?? '')),
)

function watchedSubtitle(at: string | null | undefined, count: number) {
  const date = at ? formatDate(isoToLocalDate(at)) : ''
  return strings.movies.watchedSubtitle(date, count)
}

function open(id: string) {
  router.push(`/tabs/movies/${id}`)
}
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ strings.tabs.movies }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ strings.tabs.movies }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <div v-if="rows.length === 0" class="state">
        <ion-text color="medium">{{ strings.movies.empty }}</ion-text>
      </div>

      <ion-list v-if="inProgress.length > 0">
        <ion-list-header>{{ strings.partial.inProgress }}</ion-list-header>
        <MediaRow
          v-for="row in inProgress"
          :key="row.id"
          type="movie"
          :title="row.movie.title"
          :poster-path="row.movie.posterPath"
          :subtitle="row.movie.year ? String(row.movie.year) : undefined"
          :note="stoppedAtLabel(row.watched?.stoppedAt ?? 0, row.movie.runtime)"
          button
          @open="open(row.id)"
        />
      </ion-list>

      <ion-list v-if="watchlist.length > 0">
        <ion-list-header>{{ strings.movies.watchlist }}</ion-list-header>
        <MediaRow
          v-for="row in watchlist"
          :key="row.id"
          type="movie"
          :title="row.movie.title"
          :poster-path="row.movie.posterPath"
          :subtitle="row.movie.year ? String(row.movie.year) : undefined"
          button
          @open="open(row.id)"
        />
      </ion-list>

      <ion-list v-if="watched.length > 0">
        <ion-list-header>{{ strings.movies.watched }}</ion-list-header>
        <MediaRow
          v-for="row in watched"
          :key="row.id"
          type="movie"
          :title="row.movie.title"
          :poster-path="row.movie.posterPath"
          :subtitle="row.movie.year ? String(row.movie.year) : undefined"
          :note="watchedSubtitle(row.watched?.at, row.count)"
          button
          @open="open(row.id)"
        />
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.state {
  display: flex;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
}
</style>
