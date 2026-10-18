<script setup lang="ts">
import { IonIcon, IonItem, IonLabel, IonThumbnail } from '@ionic/vue'
import { film, tv } from 'ionicons/icons'
import { computed } from 'vue'
import { imageUrl } from '../services/tmdb'
import type { MediaType } from '../types/media'

const props = defineProps<{
  type: MediaType
  title: string
  posterPath: string | null
  subtitle?: string
  note?: string // secondary line, e.g. "Next · 25 Oct"
  button?: boolean
}>()

defineEmits<{ open: [] }>()

const poster = computed(() => imageUrl(props.posterPath, 'w185'))
</script>

<template>
  <ion-item :button="button" :detail="false" @click="button && $emit('open')">
    <ion-thumbnail slot="start" class="poster">
      <img v-if="poster" :src="poster" :alt="title" loading="lazy" />
      <ion-icon
        v-else
        :icon="type === 'series' ? tv : film"
        aria-hidden="true"
      />
    </ion-thumbnail>
    <ion-label>
      <h2>{{ title }}</h2>
      <p v-if="subtitle">{{ subtitle }}</p>
      <p v-if="note" class="note">{{ note }}</p>
    </ion-label>
    <slot name="end" />
  </ion-item>
</template>

<style scoped>
.poster {
  --size: auto;
  width: 48px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  overflow: hidden;
  background: var(--ion-color-step-100, #e6e6e6);
  color: var(--ion-color-medium);
}

.poster img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.note {
  color: var(--ion-color-primary);
}
</style>
