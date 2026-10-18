<script setup lang="ts">
import {
  IonIcon,
  IonLabel,
  IonPage,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
} from '@ionic/vue'
import { film, search, settings, tv } from 'ionicons/icons'
import { strings } from '../utils/strings'
</script>

<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="series" href="/tabs/series">
          <ion-icon aria-hidden="true" :icon="tv" />
          <ion-label>{{ strings.tabs.series }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="movies" href="/tabs/movies">
          <ion-icon aria-hidden="true" :icon="film" />
          <ion-label>{{ strings.tabs.movies }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="search" href="/tabs/search">
          <ion-icon aria-hidden="true" :icon="search" />
          <ion-label>{{ strings.tabs.search }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="settings" href="/tabs/settings">
          <ion-icon aria-hidden="true" :icon="settings" />
          <ion-label>{{ strings.tabs.settings }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>
