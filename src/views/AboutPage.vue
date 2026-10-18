<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import {
  cloudUploadOutline,
  filmOutline,
  lockClosedOutline,
  phonePortraitOutline,
  searchOutline,
  tvOutline,
} from 'ionicons/icons'
import { computed } from 'vue'
import logoDark from '../assets/logo-dark.png'
import logoLight from '../assets/logo-light.png'
import tmdbLogo from '../assets/tmdb-logo.svg'
import { strings } from '../utils/strings'

const appVersion = __APP_VERSION__
const isWeb = !Capacitor.isNativePlatform()
const s = strings.about.sections

// Web-only advice (Home Screen install, Safari storage) is hidden in the native apps
const sections = computed(() => [
  { icon: searchOutline, ...s.start },
  { icon: tvOutline, ...s.series },
  { icon: filmOutline, ...s.movies },
  {
    icon: lockClosedOutline,
    title: s.data.title,
    items: isWeb ? [...s.data.items, ...s.data.web] : s.data.items,
  },
  { icon: cloudUploadOutline, ...s.backup },
  ...(isWeb ? [{ icon: phonePortraitOutline, ...s.install }] : []),
])
</script>

<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/tabs/settings" />
        </ion-buttons>
        <ion-title>{{ strings.about.title }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" color="light">
      <div class="brand">
        <!-- The transparent logo's black "Journal" disappears on dark backgrounds -->
        <picture>
          <source :srcset="logoDark" media="(prefers-color-scheme: dark)" />
          <img class="logo" :src="logoLight" :alt="strings.appName" />
        </picture>
        <p class="tagline">{{ strings.about.tagline }}</p>
        <p class="version">{{ strings.settings.version(appVersion) }}</p>
      </div>

      <ion-list v-for="section in sections" :key="section.title" :inset="true">
        <ion-list-header>
          <ion-icon :icon="section.icon" color="primary" class="section-icon" />
          {{ section.title }}
        </ion-list-header>
        <ion-item v-for="item in section.items" :key="item" lines="none">
          <ion-label class="ion-text-wrap item-text">{{ item }}</ion-label>
        </ion-item>
      </ion-list>

      <ion-list :inset="true">
        <ion-item lines="none">
          <ion-label class="ion-text-wrap">
            <img class="tmdb-logo" :src="tmdbLogo" alt="TMDB" />
            <p>{{ strings.settings.tmdbNotice }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.brand {
  padding: 24px 16px 8px;
  text-align: center;
}

.logo {
  width: 150px;
  height: 150px;
  border-radius: 24px;
}

.tagline {
  margin: 12px 0 2px;
  font-size: 16px;
}

.version {
  margin: 0;
  font-size: 13px;
  color: var(--ion-color-medium);
}

.section-icon {
  margin-inline-end: 8px;
  font-size: 20px;
}

.item-text {
  font-size: 15px;
  line-height: 1.45;
}

.tmdb-logo {
  display: block;
  height: 14px;
  margin: 4px 0 10px;
}
</style>
