<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonList,
  IonPage,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { useIonRouter } from '@ionic/vue'
import type {
  InfiniteScrollCustomEvent,
  SearchbarCustomEvent,
  SegmentCustomEvent,
} from '@ionic/vue'
import MediaRow from '../components/MediaRow.vue'
import { useSearchStore } from '../stores/search'
import type { SearchResult } from '../types/media'
import { strings } from '../utils/strings'

const search = useSearchStore()
const router = useIonRouter()

function subtitle(result: SearchResult): string {
  return [result.year, strings.mediaType[result.type]]
    .filter((part) => part !== null)
    .join(' · ')
}

function open(result: SearchResult) {
  const section = result.type === 'series' ? 'series' : 'movies'
  router.push(`/tabs/search/${section}/${result.tmdbId}`)
}

function onInput(event: SearchbarCustomEvent) {
  search.setQuery(event.detail.value ?? '')
}

async function onInfinite(event: InfiniteScrollCustomEvent) {
  await search.loadMore()
  await event.target.complete()
}

function onTypeChange(event: SegmentCustomEvent) {
  const value = event.detail.value
  if (value === 'series' || value === 'movie') search.setType(value)
}
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ strings.tabs.search }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ strings.tabs.search }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <!-- Not inside the condense header: Android (md mode) hides that header entirely -->
      <div class="controls">
        <ion-searchbar
          :value="search.query"
          :debounce="350"
          :placeholder="strings.search.placeholder"
          @ion-input="onInput"
        />
        <ion-segment :value="search.type" @ion-change="onTypeChange">
          <ion-segment-button value="series">
            {{ strings.tabs.series }}
          </ion-segment-button>
          <ion-segment-button value="movie">
            {{ strings.tabs.movies }}
          </ion-segment-button>
        </ion-segment>
      </div>

      <div v-if="search.status === 'loading'" class="state">
        <ion-spinner />
      </div>
      <div v-else-if="search.status === 'error'" class="state">
        <ion-text color="medium">{{ strings.search.error }}</ion-text>
        <ion-button fill="clear" @click="search.retry()">
          {{ strings.search.retry }}
        </ion-button>
      </div>
      <div v-else-if="search.status === 'idle'" class="state">
        <ion-text color="medium">{{ strings.search.hint }}</ion-text>
      </div>
      <div v-else-if="search.results.length === 0" class="state">
        <ion-text color="medium">{{ strings.search.noResults }}</ion-text>
      </div>
      <ion-list v-else>
        <MediaRow
          v-for="result in search.results"
          :key="`${result.type}-${result.tmdbId}`"
          :type="result.type"
          :title="result.title"
          :poster-path="result.posterPath"
          :subtitle="subtitle(result)"
          button
          @open="open(result)"
        />
      </ion-list>
      <ion-infinite-scroll
        :disabled="!search.hasMore"
        @ion-infinite="onInfinite"
      >
        <ion-infinite-scroll-content />
      </ion-infinite-scroll>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 8px 8px;
}

.controls ion-segment {
  max-width: 320px;
  align-self: center;
}

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px 24px;
  text-align: center;
}
</style>
