import { createRouter, createWebHistory } from '@ionic/vue-router'
import type { RouteRecordRaw } from 'vue-router'
import TabsPage from '../views/TabsPage.vue'

const SeriesDetail = () => import('../views/SeriesDetail.vue')
const MovieDetail = () => import('../views/MovieDetail.vue')

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/tabs/series' },
  {
    path: '/tabs/',
    component: TabsPage,
    children: [
      { path: '', redirect: '/tabs/series' },
      { path: 'series', component: () => import('../views/SeriesTab.vue') },
      { path: 'movies', component: () => import('../views/MoviesTab.vue') },
      { path: 'search', component: () => import('../views/SearchPage.vue') },
      { path: 'settings', component: () => import('../views/Settings.vue') },
      // Detail pages live under each tab so they push onto that tab's stack
      { path: 'series/:id', component: SeriesDetail, props: true },
      { path: 'search/series/:id', component: SeriesDetail, props: true },
      { path: 'movies/:id', component: MovieDetail, props: true },
      { path: 'search/movies/:id', component: MovieDetail, props: true },
      {
        path: 'settings/stats',
        component: () => import('../views/StatsPage.vue'),
      },
    ],
  },
]

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})
