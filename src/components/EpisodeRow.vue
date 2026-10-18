<script setup lang="ts">
import { IonBadge, IonButton, IonIcon, IonItem, IonLabel } from '@ionic/vue'
import { checkmarkCircle, ellipseOutline } from 'ionicons/icons'
import { computed } from 'vue'
import type { Episode } from '../types/media'
import { formatDate } from '../utils/date'
import { strings } from '../utils/strings'

const props = defineProps<{
  episode: Episode
  count: number // times watched; 0 = unwatched
  aired: boolean
}>()

const emit = defineEmits<{ toggle: [watched: boolean]; more: [] }>()

const when = computed(() => {
  const date = props.episode.airDate
  if (props.aired) return date ? formatDate(date) : ''
  return `${strings.series.upcoming} · ${date ? formatDate(date) : strings.series.tba}`
})
</script>

<template>
  <ion-item
    :class="{ upcoming: !aired }"
    :button="aired"
    :detail="false"
    @click="aired && emit('more')"
  >
    <ion-button
      slot="start"
      fill="clear"
      class="tick"
      :disabled="!aired"
      :aria-label="
        count > 0
          ? strings.episodeActions.markUnwatched
          : strings.episodeActions.markWatched
      "
      :aria-pressed="count > 0"
      @click.stop="emit('toggle', count === 0)"
    >
      <ion-icon
        slot="icon-only"
        :icon="count > 0 ? checkmarkCircle : ellipseOutline"
        :color="count > 0 ? 'success' : 'medium'"
      />
    </ion-button>
    <ion-label>
      <h3>{{ episode.number }}. {{ episode.title }}</h3>
      <p>{{ when }}</p>
    </ion-label>
    <ion-badge v-if="count > 1" slot="end" color="medium">
      {{ strings.episodeActions.rewatches(count) }}
    </ion-badge>
  </ion-item>
</template>

<style scoped>
.upcoming {
  opacity: 0.55;
}

.tick {
  margin-inline-end: 4px;
  --padding-start: 0;
  --padding-end: 0;
  font-size: 18px;
}
</style>
