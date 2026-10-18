<script setup lang="ts">
import { IonButton, IonIcon } from '@ionic/vue'
import { add, remove } from 'ionicons/icons'

defineProps<{ value: number; min?: number }>()
defineEmits<{ change: [value: number] }>()
</script>

<template>
  <div class="stepper">
    <ion-button
      fill="clear"
      size="small"
      :disabled="value <= (min ?? 0)"
      aria-label="−"
      @click="$emit('change', value - 1)"
    >
      <ion-icon slot="icon-only" :icon="remove" />
    </ion-button>
    <span class="value">{{ value }}</span>
    <ion-button
      fill="clear"
      size="small"
      aria-label="+"
      @click="$emit('change', value + 1)"
    >
      <ion-icon slot="icon-only" :icon="add" />
    </ion-button>
  </div>
</template>

<style scoped>
.stepper {
  display: flex;
  align-items: center;
}

.value {
  min-width: 2ch;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
</style>
