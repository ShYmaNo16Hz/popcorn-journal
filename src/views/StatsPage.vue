<script setup lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { computed } from 'vue'
import { useHistoryStore } from '../stores/history'
import { useLibraryStore } from '../stores/library'
import { useMetadataStore } from '../stores/metadata'
import { computeStats, splitDuration } from '../utils/stats'
import { strings } from '../utils/strings'

const library = useLibraryStore()
const history = useHistoryStore()
const metadata = useMetadataStore()

// Runtimes come from cached snapshots; load any that aren't in memory yet
onIonViewWillEnter(() => {
  for (const id of Object.keys(history.history.episodes)) {
    metadata.ensureSeries(Number(id)).catch((error) => console.error(error))
  }
  for (const [id, entry] of Object.entries(history.history.movies)) {
    if (entry.at) {
      metadata.ensureMovie(Number(id)).catch((error) => console.error(error))
    }
  }
})

const now = new Date()
const stats = computed(() =>
  computeStats(
    library.library,
    history.history,
    metadata.series,
    metadata.movies,
    now,
  ),
)

const tiles = computed(() => [
  {
    label: strings.stats.tvTime,
    value: strings.stats.duration(splitDuration(stats.value.seriesMinutes)),
  },
  {
    label: strings.stats.movieTime,
    value: strings.stats.duration(splitDuration(stats.value.movieMinutes)),
  },
  { label: strings.stats.episodes, value: String(stats.value.episodes) },
  { label: strings.stats.movies, value: String(stats.value.movies) },
  { label: strings.stats.watching, value: String(stats.value.showsWatching) },
  {
    label: strings.stats.completed,
    value: String(stats.value.showsCompleted),
  },
])
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/settings" />
        </ion-buttons>
        <ion-title>{{ strings.stats.title }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" color="light">
      <div class="grid">
        <div v-for="tile in tiles" :key="tile.label" class="tile">
          <div class="value">{{ tile.value }}</div>
          <div class="label">{{ tile.label }}</div>
        </div>
        <div class="tile wide">
          <div class="label">
            {{ strings.stats.thisYear(now.getFullYear()) }}
          </div>
          <div class="value small">
            {{
              strings.stats.thisYearLine(
                stats.thisYear.episodes,
                stats.thisYear.movies,
              )
            }}
          </div>
        </div>
      </div>
      <ion-note class="footer">
        <template v-if="stats.missingMetadata">
          {{ strings.stats.loading(stats.missingMetadata) }}<br />
        </template>
        {{ strings.stats.note }}
      </ion-note>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px;
}

.tile {
  background: var(--ion-item-background, var(--ion-background-color, #fff));
  border-radius: 12px;
  padding: 16px;
}

.tile.wide {
  grid-column: span 2;
}

.value {
  font-size: 26px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.value.small {
  font-size: 18px;
  margin-top: 4px;
}

.label {
  margin-top: 4px;
  font-size: 13px;
  color: var(--ion-color-medium);
}

.footer {
  display: block;
  padding: 0 20px 24px;
  font-size: 13px;
  line-height: 1.4;
}
</style>
