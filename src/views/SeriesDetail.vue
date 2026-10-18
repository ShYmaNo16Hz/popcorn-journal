<script setup lang="ts">
import {
  actionSheetController,
  IonAccordion,
  IonAccordionGroup,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import type { RefresherCustomEvent, SelectCustomEvent } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import CountStepper from '../components/CountStepper.vue'
import EpisodeRow from '../components/EpisodeRow.vue'
import { imageUrl } from '../services/tmdb'
import { useHistoryStore, watchCount } from '../stores/history'
import { useLibraryStore } from '../stores/library'
import { useMetadataStore } from '../stores/metadata'
import type { Episode, Season } from '../types/media'
import type { SeriesStatus } from '../types/userData'
import { confirmRemove } from '../utils/confirmRemove'
import { formatDate, localDate } from '../utils/date'
import { episodesUpTo, isAired, seriesProgress } from '../utils/progress'
import { strings } from '../utils/strings'

const props = defineProps<{ id: string }>()

const library = useLibraryStore()
const history = useHistoryStore()
const metadata = useMetadataStore()

const tmdbId = computed(() => Number(props.id))
const series = computed(() => metadata.series[props.id] ?? null)
const entry = computed(() => library.seriesEntry(tmdbId.value))
const today = localDate()

const STATUSES: SeriesStatus[] = [
  'watching',
  'planned',
  'paused',
  'completed',
  'dropped',
]

const loading = ref(false)
const failed = ref(false)
const openSeasons = ref<string[]>([])

async function load(force = false): Promise<void> {
  loading.value = true
  failed.value = false
  try {
    await metadata.ensureSeries(tmdbId.value, { force })
  } catch (error) {
    console.error(error)
    failed.value = !series.value
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await load()
  // Open the season you're in the middle of
  const focus = progress.value?.nextUp ?? progress.value?.upcoming
  if (focus) openSeasons.value = [String(focus.season)]
})

async function onRefresh(event: RefresherCustomEvent) {
  await load(true)
  await event.target.complete()
}

const count = (episode: Episode) =>
  watchCount(history.episodeEntry(tmdbId.value, episode))

const progress = computed(() =>
  series.value
    ? seriesProgress(series.value, (episode) => count(episode) > 0, today)
    : null,
)

// Regular seasons first, specials last
const seasons = computed<Season[]>(() => {
  const all = series.value?.seasons ?? []
  return [
    ...all.filter((season) => season.number > 0),
    ...all.filter((season) => season.number === 0),
  ]
})

function seasonStats(season: Season) {
  const aired = season.episodes.filter((episode) => isAired(episode, today))
  const watched = aired.filter((episode) => count(episode) > 0).length
  return { aired, watched }
}

const statusLabel = computed(() => {
  const status = series.value?.status ?? ''
  return strings.seriesStatus[status] ?? status
})
const statusColor = computed(() =>
  series.value?.status === 'Ended' || series.value?.status === 'Canceled'
    ? 'medium'
    : 'success',
)

const nextLine = computed(() => {
  const p = progress.value
  if (!p) return ''
  if (p.nextUp) {
    return `${strings.series.upNext}: ${strings.series.episodeLabel(p.nextUp.season, p.nextUp.number)} · ${p.nextUp.title}`
  }
  if (p.upcoming) {
    const date = p.upcoming.airDate
      ? formatDate(p.upcoming.airDate)
      : strings.series.tba
    return `${strings.series.next}: ${strings.series.episodeLabel(p.upcoming.season, p.upcoming.number)} · ${date}`
  }
  return p.caughtUp ? strings.series.caughtUp : ''
})

function setEpisodes(episodes: Episode[], watched: boolean) {
  history.setEpisodesWatched(tmdbId.value, episodes, watched)
}

function onStatusChange(event: SelectCustomEvent<SeriesStatus>) {
  library.setSeriesStatus(tmdbId.value, event.detail.value)
}

async function openEpisodeActions(episode: Episode) {
  const current = count(episode)
  const a = strings.episodeActions
  const buttons = [
    ...(current === 0
      ? [{ text: a.markWatched, handler: () => setEpisodes([episode], true) }]
      : [
          {
            text: a.addRewatch,
            handler: () =>
              history.setEpisodeWatchCount(tmdbId.value, episode, current + 1),
          },
        ]),
    ...(current > 1
      ? [
          {
            text: a.removeRewatch,
            handler: () =>
              history.setEpisodeWatchCount(tmdbId.value, episode, current - 1),
          },
        ]
      : []),
    {
      text: a.upToHere,
      handler: () =>
        series.value &&
        setEpisodes(episodesUpTo(series.value, episode, today), true),
    },
    ...(current > 0
      ? [
          {
            text: a.markUnwatched,
            role: 'destructive',
            handler: () => setEpisodes([episode], false),
          },
        ]
      : []),
    { text: a.cancel, role: 'cancel' },
  ]
  const sheet = await actionSheetController.create({
    header: `${strings.series.episodeLabel(episode.season, episode.number)} · ${episode.title}`,
    buttons,
  })
  await sheet.present()
}

async function onRemove() {
  if (await confirmRemove(strings.series.remove)) {
    library.removeSeries(tmdbId.value)
  }
}
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/series" />
        </ion-buttons>
        <ion-title>{{ series?.title }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ion-refresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div v-if="!series && loading" class="state"><ion-spinner /></div>
      <div v-else-if="!series && failed" class="state">
        <ion-text color="medium">{{ strings.series.loadError }}</ion-text>
        <ion-button fill="clear" @click="load()">{{
          strings.series.retry
        }}</ion-button>
      </div>

      <template v-else-if="series">
        <div class="hero">
          <img
            v-if="series.posterPath"
            class="hero-poster"
            :src="imageUrl(series.posterPath, 'w500') ?? ''"
            :alt="series.title"
          />
          <div class="hero-text">
            <h1>{{ series.title }}</h1>
            <p class="meta">
              <span v-if="series.year">{{ series.year }}</span>
              <ion-badge :color="statusColor">{{ statusLabel }}</ion-badge>
            </p>
            <template v-if="entry && progress">
              <ion-progress-bar
                :value="progress.aired ? progress.watched / progress.aired : 0"
                color="success"
              />
              <p class="progress-text">
                {{ strings.series.progress(progress.watched, progress.aired) }}
              </p>
            </template>
          </div>
        </div>

        <div class="ion-padding-horizontal">
          <ion-button
            v-if="!entry"
            expand="block"
            @click="library.addSeries(tmdbId)"
          >
            {{ strings.series.add }}
          </ion-button>
          <p v-else-if="nextLine" class="next-line">{{ nextLine }}</p>
        </div>

        <ion-list v-if="entry" :inset="true">
          <ion-item>
            <ion-select
              :label="strings.series.status"
              :value="entry.status"
              interface="action-sheet"
              @ion-change="onStatusChange"
            >
              <ion-select-option
                v-for="status in STATUSES"
                :key="status"
                :value="status"
              >
                {{ strings.libraryStatus[status] }}
              </ion-select-option>
            </ion-select>
          </ion-item>
          <ion-item>
            <ion-label>{{ strings.series.watchedTimes }}</ion-label>
            <CountStepper
              slot="end"
              :value="entry.watchCount ?? 0"
              @change="library.setSeriesWatchCount(tmdbId, $event)"
            />
          </ion-item>
          <ion-item button :detail="false" @click="onRemove">
            <ion-label color="danger">{{ strings.series.remove }}</ion-label>
          </ion-item>
        </ion-list>

        <p v-if="series.overview" class="overview ion-padding-horizontal">
          {{ series.overview }}
        </p>

        <ion-accordion-group v-model="openSeasons" :multiple="true">
          <ion-accordion
            v-for="season in seasons"
            :key="season.number"
            :value="String(season.number)"
          >
            <ion-item slot="header">
              <ion-label>{{
                season.number === 0 ? strings.series.specials : season.name
              }}</ion-label>
              <ion-note slot="end">
                {{
                  seasonStats(season).aired.length === 0
                    ? strings.series.upcoming
                    : strings.series.progress(
                        seasonStats(season).watched,
                        seasonStats(season).aired.length,
                      )
                }}
              </ion-note>
            </ion-item>
            <div slot="content">
              <ion-button
                v-if="seasonStats(season).aired.length > 0"
                fill="clear"
                size="small"
                class="season-action"
                @click="
                  setEpisodes(
                    seasonStats(season).aired,
                    seasonStats(season).watched <
                      seasonStats(season).aired.length,
                  )
                "
              >
                {{
                  seasonStats(season).watched < seasonStats(season).aired.length
                    ? strings.series.seasonWatched
                    : strings.series.seasonUnwatched
                }}
              </ion-button>
              <ion-list>
                <EpisodeRow
                  v-for="episode in season.episodes"
                  :key="episode.number"
                  :episode="episode"
                  :count="count(episode)"
                  :aired="isAired(episode, today)"
                  @toggle="setEpisodes([episode], $event)"
                  @more="openEpisodeActions(episode)"
                />
              </ion-list>
            </div>
          </ion-accordion>
        </ion-accordion-group>
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
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  color: var(--ion-color-medium);
}

.progress-text {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--ion-color-medium);
  font-variant-numeric: tabular-nums;
}

.next-line {
  margin: 0;
  color: var(--ion-color-primary);
  font-weight: 500;
}

.overview {
  color: var(--ion-color-medium);
  font-size: 14px;
  line-height: 1.4;
}

.season-action {
  margin-inline-start: 8px;
}
</style>
