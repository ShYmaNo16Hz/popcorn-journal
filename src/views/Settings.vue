<script setup lang="ts">
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToggle,
  IonToolbar,
  toastController,
} from '@ionic/vue'
import type { ToggleCustomEvent } from '@ionic/vue'
import {
  cloudDownloadOutline,
  notificationsOutline,
  shareOutline,
  statsChartOutline,
} from 'ionicons/icons'
import { ref } from 'vue'
import appIcon from '../assets/app-icon.png'
import { BackupError } from '../services/backup'
import { useBackupStore } from '../stores/backup'
import { useRemindersStore } from '../stores/reminders'
import { strings } from '../utils/strings'

const backup = useBackupStore()
const reminders = useRemindersStore()
const appVersion = __APP_VERSION__
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref<'export' | 'import' | null>(null)

async function toast(message: string, color?: 'danger') {
  const t = await toastController.create({
    message,
    color,
    duration: 3500,
    position: 'top',
  })
  await t.present()
}

async function onExport() {
  busy.value = 'export'
  try {
    await backup.exportData()
  } catch (error) {
    console.error(error)
    await toast(strings.settings.exportFailed, 'danger')
  } finally {
    busy.value = null
  }
}

async function onRemindersToggle(event: ToggleCustomEvent) {
  const on = event.detail.checked
  if (!(await reminders.setEnabled(on))) {
    event.target.checked = false
    await toast(strings.reminders.denied, 'danger')
  }
}

async function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // allow picking the same file again
  if (!file) return
  busy.value = 'import'
  try {
    const summary = await backup.importData(await file.text())
    await toast(strings.settings.imported(summary))
  } catch (error) {
    console.error(error)
    const detail = error instanceof BackupError ? ` ${error.message}` : ''
    await toast(strings.settings.importFailed + detail, 'danger')
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>{{ strings.tabs.settings }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" color="light">
      <ion-header collapse="condense">
        <ion-toolbar color="light">
          <ion-title size="large">{{ strings.tabs.settings }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-list :inset="true">
        <ion-item router-link="/tabs/settings/stats" :detail="true">
          <ion-icon slot="start" :icon="statsChartOutline" color="primary" />
          <ion-label>{{ strings.settings.stats }}</ion-label>
        </ion-item>
      </ion-list>

      <ion-list :inset="true">
        <ion-item>
          <ion-icon slot="start" :icon="notificationsOutline" color="primary" />
          <ion-toggle
            :checked="reminders.enabled"
            :disabled="!reminders.supported"
            @ion-change="onRemindersToggle"
          >
            {{ strings.reminders.title }}
          </ion-toggle>
        </ion-item>
      </ion-list>
      <ion-note class="footer">{{
        reminders.supported
          ? strings.reminders.footer
          : strings.reminders.unsupported
      }}</ion-note>

      <ion-list :inset="true">
        <ion-list-header>{{ strings.settings.backup }}</ion-list-header>
        <ion-item
          button
          :detail="false"
          :disabled="busy !== null"
          @click="onExport"
        >
          <ion-icon slot="start" :icon="shareOutline" color="primary" />
          <ion-label>{{ strings.settings.export }}</ion-label>
          <ion-spinner v-if="busy === 'export'" slot="end" />
        </ion-item>
        <ion-item
          button
          :detail="false"
          :disabled="busy !== null"
          @click="fileInput?.click()"
        >
          <ion-icon slot="start" :icon="cloudDownloadOutline" color="primary" />
          <ion-label>{{ strings.settings.import }}</ion-label>
          <ion-spinner v-if="busy === 'import'" slot="end" />
        </ion-item>
      </ion-list>
      <ion-note class="footer">{{ strings.settings.backupFooter }}</ion-note>
      <input
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        hidden
        @change="onFilePicked"
      />

      <ion-list :inset="true">
        <ion-item router-link="/tabs/settings/about" :detail="true">
          <img slot="start" class="app-icon" :src="appIcon" alt="" />
          <ion-label>{{ strings.settings.aboutHelp }}</ion-label>
          <ion-note slot="end">{{
            strings.settings.version(appVersion)
          }}</ion-note>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.app-icon {
  width: 30px;
  height: 30px;
  border-radius: 7px;
}

.footer {
  display: block;
  padding: 0 32px;
  font-size: 13px;
  line-height: 1.4;
}
</style>
