<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonDatetime,
  IonDatetimeButton,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import type { DatetimeCustomEvent } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import CountStepper from '../components/CountStepper.vue'
import { imageUrl } from '../services/tmdb'
import { useHistoryStore, watchCount } from '../stores/history'
import { useLibraryStore } from '../stores/library'
import { useMetadataStore } from '../stores/metadata'
import { confirmRemove } from '../utils/confirmRemove'
import {
  formatRuntime,
  isoToLocalDate,
  localDate,
  localDateToIso,
} from '../utils/date'
import { strings } from '../utils/strings'

const props = defineProps<{ id: string }>()

const library = useLibraryStore()
const history = useHistoryStore()
const metadata = useMetadataStore()

const tmdbId = computed(() => Number(props.id))
const movie = computed(() => metadata.movies[props.id] ?? null)
const entry = computed(() => library.movieEntry(tmdbId.value))
const watched = computed(() => history.movieEntry(tmdbId.value))
const count = computed(() => watchCount(watched.value))
// A removed movie keeps its history but shows as not in the library
const isWatched = computed(() => !!entry.value && count.value > 0)
const watchedDate = computed(() =>
  watched.value?.at ? isoToLocalDate(watched.value.at) : localDate(),
)
const pickerId = computed(() => `watched-date-${props.id}`)

const loading = ref(false)
const failed = ref(false)

async function load(): Promise<void> {
  loading.value = true
  failed.value = false
  try {
    await metadata.ensureMovie(tmdbId.value)
  } catch (error) {
    console.error(error)
    failed.value = !movie.value
  } finally {
    loading.value = false
  }
}
onMounted(load)

const meta = computed(() =>
  [
    movie.value?.year,
    movie.value?.runtime ? formatRuntime(movie.value.runtime) : null,
  ]
    .filter(Boolean)
    .join(' · '),
)

function markWatched() {
  history.setMovieWatched(tmdbId.value, new Date().toISOString())
}

function onDateChange(event: DatetimeCustomEvent) {
  const value = event.detail.value
  if (typeof value !== 'string') return
  history.setMovieWatched(tmdbId.value, localDateToIso(value.slice(0, 10)))
}

async function onRemove() {
  if (await confirmRemove(strings.movies.remove)) {
    library.removeMovie(tmdbId.value)
  }
}
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/movies" />
        </ion-buttons>
        <ion-title>{{ movie?.title }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <div v-if="!movie && loading" class="state"><ion-spinner /></div>
      <div v-else-if="!movie && failed" class="state">
        <ion-text color="medium">{{ strings.movies.loadError }}</ion-text>
        <ion-button fill="clear" @click="load()">{{
          strings.movies.retry
        }}</ion-button>
      </div>

      <template v-else-if="movie">
        <div class="hero">
          <img
            v-if="movie.posterPath"
            class="hero-poster"
            :src="imageUrl(movie.posterPath, 'w500') ?? ''"
            :alt="movie.title"
          />
          <div class="hero-text">
            <h1>{{ movie.title }}</h1>
            <p v-if="meta" class="meta">{{ meta }}</p>
            <p v-if="!isWatched && entry" class="state-line">
              {{ strings.movies.onWatchlist }}
            </p>
          </div>
        </div>

        <div v-if="!isWatched" class="actions ion-padding-horizontal">
          <ion-button expand="block" @click="markWatched">
            {{ strings.movies.markWatched }}
          </ion-button>
          <ion-button
            v-if="!entry"
            expand="block"
            fill="outline"
            @click="library.addMovie(tmdbId, 'planned')"
          >
            {{ strings.movies.addToWatchlist }}
          </ion-button>
          <ion-button
            v-else
            expand="block"
            fill="clear"
            color="danger"
            @click="onRemove"
          >
            {{ strings.movies.remove }}
          </ion-button>
        </div>

        <ion-list v-else :inset="true">
          <ion-item>
            <ion-label>{{ strings.movies.watchedOn }}</ion-label>
            <ion-datetime-button slot="end" :datetime="pickerId" />
          </ion-item>
          <ion-item>
            <ion-label>{{ strings.movies.watchedTimes }}</ion-label>
            <CountStepper
              slot="end"
              :value="count"
              :min="1"
              @change="history.setMovieWatchCount(tmdbId, $event)"
            />
          </ion-item>
          <ion-item
            button
            :detail="false"
            @click="history.setMovieWatched(tmdbId, null)"
          >
            <ion-label color="danger">{{
              strings.movies.markUnwatched
            }}</ion-label>
          </ion-item>
          <ion-item button :detail="false" @click="onRemove">
            <ion-label color="danger">{{ strings.movies.remove }}</ion-label>
          </ion-item>
        </ion-list>

        <ion-modal :keep-contents-mounted="true">
          <ion-datetime
            :id="pickerId"
            presentation="date"
            :value="watchedDate"
            :max="localDate()"
            :show-default-buttons="true"
            :done-text="strings.movies.done"
            @ion-change="onDateChange"
          />
        </ion-modal>

        <p v-if="movie.overview" class="overview ion-padding-horizontal">
          {{ movie.overview }}
        </p>
      </template>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 24px;
  text-align: center;
}

.hero {
  display: flex;
  gap: 16px;
  padding: 16px;
}

.hero-poster {
  width: 110px;
  aspect-ratio: 2 / 3;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
}

.hero-text {
  flex: 1;
  min-width: 0;
}

.hero-text h1 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 700;
}

.meta {
  margin: 0 0 12px;
  color: var(--ion-color-medium);
}

.state-line {
  margin: 0;
  color: var(--ion-color-primary);
  font-weight: 500;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.overview {
  color: var(--ion-color-medium);
  font-size: 14px;
  line-height: 1.4;
}
</style>
