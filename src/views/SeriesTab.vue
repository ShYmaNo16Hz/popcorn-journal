<script setup lang="ts">
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonList,
  IonListHeader,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue'
import { checkmarkCircleOutline } from 'ionicons/icons'
import { computed, watch } from 'vue'
import MediaRow from '../components/MediaRow.vue'
import { useHistoryStore } from '../stores/history'
import { useLibraryStore } from '../stores/library'
import { useMetadataStore } from '../stores/metadata'
import type { Series } from '../types/media'
import type { LibrarySeriesEntry, SeriesStatus } from '../types/userData'
import {
  formatDate,
  formatIsoDate,
  localDate,
  stoppedAtLabel,
} from '../utils/date'
import { parseEpisodeKey } from '../utils/episodeKey'
import { seriesProgress } from '../utils/progress'
import type { SeriesProgress } from '../utils/progress'
import { strings } from '../utils/strings'

const library = useLibraryStore()
const history = useHistoryStore()
const metadata = useMetadataStore()
const router = useIonRouter()

const GROUPS: SeriesStatus[] = [
  'watching',
  'planned',
  'paused',
  'completed',
  'dropped',
]

// Load (and refresh stale) snapshots for everything in the library
function ensureAll() {
  for (const id of Object.keys(library.series)) {
    metadata.ensureSeries(Number(id)).catch((error) => console.error(error))
  }
}
onIonViewWillEnter(ensureAll)
watch(() => Object.keys(library.series).length, ensureAll)

interface Row {
  id: string
  entry: LibrarySeriesEntry
  series: Series
  progress: SeriesProgress
  lastActivity: string
  lastWatched: { key: string; at: string } | null // most recently watched episode
}

const today = localDate()

const rows = computed<Row[]>(() =>
  Object.entries(library.series).flatMap(([id, entry]) => {
    const series = metadata.series[id]
    if (!series) return []
    const tmdbId = Number(id)
    const progress = seriesProgress(
      series,
      (episode) => history.isEpisodeWatched(tmdbId, episode),
      today,
    )
    const episodes = Object.entries(history.history.episodes[id] ?? {})
    const activity = episodes.map(([, e]) => e.updatedAt ?? e.at ?? '')
    let lastWatched: Row['lastWatched'] = null
    for (const [key, e] of episodes) {
      if (e.at && (!lastWatched || e.at > lastWatched.at)) {
        lastWatched = { key, at: e.at }
      }
    }
    const lastActivity = activity.reduce(
      (a, b) => (a > b ? a : b),
      entry.addedAt,
    )
    return [{ id, entry, series, progress, lastActivity, lastWatched }]
  }),
)

// Shows with an episode to watch (most recently active first), then shows
// you're caught up on, by when their next episode airs
const upNext = computed(() => {
  const watching = rows.value.filter((r) => r.entry.status === 'watching')
  const toWatch = watching
    .filter((r) => r.progress.nextUp)
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity))
  const waiting = watching
    .filter((r) => !r.progress.nextUp && r.progress.upcoming)
    .sort((a, b) =>
      (a.progress.upcoming?.airDate ?? '9999').localeCompare(
        b.progress.upcoming?.airDate ?? '9999',
      ),
    )
  return [...toWatch, ...waiting]
})

const groups = computed(() =>
  GROUPS.map((status) => ({
    status,
    rows: rows.value
      .filter((r) => r.entry.status === status)
      .sort((a, b) => a.series.title.localeCompare(b.series.title)),
  })).filter((group) => group.rows.length > 0),
)

function upNextSubtitle(row: Row): string {
  const episode = row.progress.nextUp ?? row.progress.upcoming
  if (!episode) return ''
  return `${strings.series.episodeLabel(episode.season, episode.number)} · ${episode.title}`
}

function upNextNote(row: Row): string {
  const { nextUp, upcoming, watched, aired } = row.progress
  if (nextUp) {
    const counts = strings.series.progress(watched, aired)
    const stopped = history.episodeEntry(Number(row.id), nextUp)?.stoppedAt
    return stopped
      ? `${counts} · ${stoppedAtLabel(stopped, nextUp.runtime)}`
      : counts
  }
  if (!upcoming) return ''
  const date = upcoming.airDate
    ? formatDate(upcoming.airDate)
    : strings.series.tba
  return `${strings.series.next} · ${date}`
}

function groupSubtitle(row: Row): string {
  const status = strings.seriesStatus[row.series.status] ?? row.series.status
  return `${strings.series.progress(row.progress.watched, row.progress.aired)} · ${status}`
}

// Completed: when the last episode was watched; watching: which one and when
function groupNote(row: Row): string | undefined {
  const last = row.lastWatched
  if (!last) return undefined
  const date = formatIsoDate(last.at)
  if (row.entry.status === 'completed') return strings.series.finishedOn(date)
  const parsed = parseEpisodeKey(last.key)
  if (row.entry.status !== 'watching' || !parsed) return undefined
  const episode = strings.series.episodeLabel(parsed.season, parsed.episode)
  return strings.series.lastWatched(episode, date)
}

function open(id: string) {
  router.push(`/tabs/series/${id}`)
}

function markNext(row: Row) {
  if (row.progress.nextUp) {
    history.setEpisodesWatched(Number(row.id), [row.progress.nextUp], true)
  }
}
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ strings.tabs.series }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ strings.tabs.series }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <div v-if="rows.length === 0" class="state">
        <ion-text color="medium">{{ strings.series.empty }}</ion-text>
      </div>

      <ion-list v-if="upNext.length > 0">
        <ion-list-header>{{ strings.series.upNext }}</ion-list-header>
        <MediaRow
          v-for="row in upNext"
          :key="row.id"
          type="series"
          :title="row.series.title"
          :poster-path="row.series.posterPath"
          :subtitle="upNextSubtitle(row)"
          :note="upNextNote(row)"
          button
          @open="open(row.id)"
        >
          <template #end>
            <ion-button
              v-if="row.progress.nextUp"
              slot="end"
              fill="clear"
              :aria-label="strings.series.markNext"
              @click.stop="markNext(row)"
            >
              <ion-icon
                slot="icon-only"
                :icon="checkmarkCircleOutline"
                color="medium"
              />
            </ion-button>
          </template>
        </MediaRow>
      </ion-list>

      <ion-list v-for="group in groups" :key="group.status">
        <ion-list-header>{{
          strings.libraryStatus[group.status]
        }}</ion-list-header>
        <MediaRow
          v-for="row in group.rows"
          :key="row.id"
          type="series"
          :title="row.series.title"
          :poster-path="row.series.posterPath"
          :subtitle="groupSubtitle(row)"
          :note="groupNote(row)"
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
