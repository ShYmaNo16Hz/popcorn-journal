# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**Popcorn Journal** (bundle ID `com.popcornjournal.app`; repo folder still named moviezzz) — a personal TV show & movie tracker — a local-first replacement for TV Time (shut down July 2026).
**One app install = one user.** No backend, no accounts, no database server.

The app is split into two sections:

- **Series** — follow shows, tick episodes as watched, see progress and what's next
- **Movies** — mark films as watched (with date), keep a watchlist

Core flow:

1. User searches for a title (e.g. "The Sopranos", "The Beekeeper") → online search via the TMDB API
2. Results show posters, year, type (series / movie)
3. When the user adds or ticks a title, we save it locally as JSON:
   - series → metadata snapshot **including all seasons and episodes**
   - movie → metadata snapshot + watched date
4. Everything afterwards works offline from the local files

Primary platform: **iOS**. Android supported as secondary.

## Stack

- **Vue 3** (Composition API, `<script setup>`) + **TypeScript** (strict)
- **Vite**
- **Pinia** for state
- **Ionic Vue** for native-feeling iOS UI (navigation, swipe-back, tabs, lists)
  - with `vue-router` + `@ionic/vue-router` (required for `ion-tabs` / `ion-router-outlet`)
- **Capacitor** for native packaging
  - `@capacitor/filesystem` — local JSON storage
  - `@capacitor/local-notifications` — new episode reminders
  - `@capacitor/share` — export backup file
- **TMDB API v4 read token** as the metadata source
- Native Swift only where unavoidable: iCloud sync plugin, later a WidgetKit widget

Do not add: a backend, a database, SQLite, Firebase, Supabase, or a state library other than Pinia.

## Data source: TMDB

- Base URL: `https://api.themoviedb.org/3`
- Auth: `Authorization: Bearer ${import.meta.env.TMDB_API_READ_ACCESS_TOKEN}` (in `.env.local`, never committed).
  `.env.local` also has `TMDB_API_KEY` (v3); don't use it. Only the read token is exposed, via `envPrefix` in `vite.config.ts`.
- Endpoints used:
  - `GET /search/multi?query=` — unified search (filter `media_type` to `tv` | `movie`)
  - `GET /search/tv`, `GET /search/movie` — section-specific search
  - `GET /tv/{id}` — show details (seasons list, status, next episode)
  - `GET /tv/{id}/season/{n}` — episodes of a season
  - `GET /movie/{id}` — movie details
- Images: `https://image.tmdb.org/t/p/{size}{path}` — use `w185` in lists, `w500` on detail pages
- TMDB attribution is required (logo + notice in Settings/About)
- All TMDB calls go through one module: `src/services/tmdb.ts`. Components never call `fetch` directly.
- Map TMDB responses to our own types immediately; never store raw TMDB payloads.

## Storage architecture

Local files are the **single source of truth**. Cloud is only backup/sync.

Two kinds of files, kept strictly separate:

### 1. User data (precious — must never be lost)

`Directory.Data/user/`

```
library.json   — what the user follows / has watched (series + movies)
history.json   — watched episodes and watched movies, with timestamps
```

```jsonc
// library.json
{
  "v": 1,
  "series": {
    "1398": {
      "status": "watching",
      "addedAt": "2026-10-18T20:00:00Z",
      "updatedAt": "...",
      "watchCount": 2, // times the whole show was watched, set by the user; absent = 0
    },
  },
  "movies": {
    "866398": { "status": "watched", "addedAt": "...", "updatedAt": "..." },
  },
}
```

Series status: `watching | completed | paused | dropped | planned`
Movie status: `watched | planned`

```jsonc
// history.json
{
  "v": 1,
  "episodes": {
    "1398": {
      "S01E01": {
        "at": "2026-10-18T21:00:00Z",
        "updatedAt": "...",
        "count": 2,
      }, // count = rewatches, absent = 1
      "S01E02": { "at": null, "updatedAt": "2026-10-19T10:00:00Z" }, // unticked = tombstone, NOT deleted
    },
  },
  "movies": {
    "866398": { "at": "2026-10-10T22:00:00Z", "updatedAt": "..." }, // at = last watched
  },
}
```

- Every write sets `updatedAt` (a user-picked past `at` must still beat an older tombstone in merges).
- Read counts via `watchCount()` in `stores/history.ts` (tombstone → 0, else `count ?? 1`).
- Ticking an episode adds the show to the library; marking a movie watched/unwatched sets its library status.
- Season 0 = specials: cached and shown, but excluded from progress / "Up next" (`utils/progress.ts`). Episodes airing later (or TBA) are shown dimmed and can't be ticked.
- Show TMDB series status (Ended / Returning…) via the labels in `strings.seriesStatus`.

### 2. Metadata cache (re-downloadable, safe to delete)

`Directory.Data/cache/`

```
series/{tmdbId}.json   — show snapshot: title, poster, status, seasons[], episodes[] (number, title, air date, runtime)
movies/{tmdbId}.json   — movie snapshot: title, poster, year, runtime, overview
```

- Written when the user adds/ticks a title, so the app works fully offline.
- Refresh policy (`isSeriesStale` in `cache.ts`): `Ended`/`Canceled` → never auto-refresh; other series → refresh if older than 7 days, or (at most daily) once the announced `nextEpisode` air date has passed; movies → never.
- Screens read snapshots through `stores/metadata.ts`: cached copy shows instantly, stale ones refresh in the background.
- Cache is excluded from sync. If missing, re-fetch from TMDB.

### Storage rules

- All file access goes through `src/services/storage.ts` (read / write / migrate). Nothing else touches Filesystem.
- Every user-data file has a `"v"` schema version; add migrations in `src/services/migrations.ts` when the shape changes.
- Writes are **debounced (~1s)** so ticking a whole season causes one write, not twenty.
- Write atomically: write to `*.tmp`, then rename over the original.
- Episode keys always use `SxxEyy`, zero-padded to at least 2 digits (`S01E100` is valid). Never sort them as strings; parse to numbers.
- Unticking never deletes a key — it writes a tombstone (`at: null` + `updatedAt`) so sync merges work.
- Removing a title from the library never deletes its key either: it sets `removedAt` (= `updatedAt`); re-adding clears it. Watch history is kept. Read entries via `library.seriesEntry/movieEntry` or `library.series/movies`, which hide removed ones.
- On web (browser dev and the PWA) the backend is IndexedDB (one object store keyed by path; `localStorage` only if IndexedDB is missing), behind the same interface. Data saved by older versions in `localStorage` is migrated once on startup.

## Web / PWA (iPhone without a Mac)

Until there's a Mac for native iOS builds, iPhone uses the web build installed via Safari → Add to Home Screen, hosted on Vercel from the GitHub repo (`ShYmaNo16Hz/popcorn-journal`, push to `main` deploys).

- **TMDB proxy**: `api/tmdb.ts` (Vercel Edge Function) whitelists the app's endpoints/params and adds the token server-side from the Vercel env var `TMDB_PROXY_TOKEN`. Never set `TMDB_API_READ_ACCESS_TOKEN` on Vercel — `envPrefix` would bake it into the client bundle. `tmdb.ts` calls TMDB directly when the build has a token (native, local dev) and `/api/tmdb` otherwise.
- **PWA**: `vite-plugin-pwa` (manifest, precache, auto-update, TMDB posters cached 90 days). The service worker is registered only when `!Capacitor.isNativePlatform()`. iOS needs `public/apple-touch-icon.png` (opaque) for the home-screen icon; re-adding the icon is required after changing it. Service workers need HTTPS (not available on the LAN preview).
- No local notifications on the web; export uses Web Share (`navigator.share` with a file) when available, else a download.
- `vercel.json`: SPA rewrite to `index.html` (except `/api/`), `sw.js` not cached.

## Sync & backup

Behind one interface, `src/services/sync/SyncProvider.ts`:

```ts
interface SyncProvider {
  isAvailable(): Promise<boolean>
  pull(): Promise<UserData | null>
  push(data: UserData): Promise<void>
}
```

- **iOS**: iCloud Drive ubiquity container via a small custom Capacitor plugin in Swift (`ios/App/App/Plugins/ICloudSync`). Do NOT use the iCloud key-value store (1 MB limit).
- **Android**: rely on Android Auto Backup at first (`allowBackup` on, user files included, cache excluded via backup rules). Google Drive `appDataFolder` provider only if real multi-device sync is requested.
- **Both**: manual export/import of a single `.json` backup via the share sheet — the only way to move data between iOS and Android.
  - Format `{ format: "popcorn-journal-backup", exportedAt, library, history }` (`services/backup.ts`); import runs migrations, then **merges** into current data via `merge.ts` (never replaces) after copying current files to `user/backups/pre-import-*`. File picking uses a plain `<input type="file">` (iOS Files picker), no plugin.

### Merge rules (`src/services/sync/merge.ts`, pure functions, unit-tested)

- `history.episodes` / `history.movies`: union of both sides; for the same key, the entry with the newer `updatedAt ?? at` wins (this is how tombstones propagate).
- `library`: per title, newer `updatedAt` wins.
- Merge must be deterministic and idempotent: `merge(a, b) == merge(b, a)` and `merge(a, a) == a`.
  On equal timestamps, break the tie deterministically (e.g. compare the serialized entries) so the merge stays commutative.

## Project structure

```
src/
  views/            # Ionic pages: SeriesTab, MoviesTab, SearchPage, SeriesDetail, MovieDetail, Settings
  components/       # presentational components (PosterCard, EpisodeRow, SeasonProgress...)
  stores/           # Pinia: library.ts, history.ts, metadata.ts (in-memory cache snapshots), search.ts
  services/
    tmdb.ts
    storage.ts
    migrations.ts
    cache.ts
    sync/
  types/            # domain types (Series, Episode, Movie, LibraryEntry, HistoryEntry)
  utils/
```

## App structure (UI)

Bottom tabs (Ionic `ion-tabs`):

1. **Series** — "Up next" (next unwatched episode per show), then the followed list grouped by status
2. **Movies** — watched (by date) and watchlist
3. **Search** — unified search with a Series / Movies segment toggle
4. **Settings** — export/import, sync status, TMDB attribution

Series detail: seasons accordion, tick single episode, long-press / button to tick a whole season or "watched up to here".

## MVP scope (in order)

1. ~~Project scaffold: Vue + Ionic + Capacitor, iOS platform~~ (done)
2. ~~`tmdb.ts` + search page (series & movies)~~ (done)
3. ~~`storage.ts` + Pinia stores + metadata cache~~ (done)
4. ~~Series: add, detail, tick episodes, progress, "Up next"~~ (done)
5. ~~Movies: mark watched with date, watchlist~~ (done)
6. ~~Export / import JSON backup~~ (done)
7. ~~TV Time import~~ (dropped — not worth the complexity)
8. iCloud sync plugin + merge

Also done: Android platform + Auto Backup rules, new-episode reminders, stats page (Settings → Your stats), app icon/splash, TMDB logo.

Later: home screen widget (WidgetKit via App Group), Android Drive sync. No Mac available yet, so anything needing Xcode (iCloud plugin, widget, iOS device testing) waits.

### Reminders (`utils/reminders.ts` pure + `services/notifications.ts` + `stores/reminders.ts`)

- Opt-in toggle in Settings; the on/off preference lives in `prefs.json` via `storage.readPrefs/writePrefs` (device setting, not user data: not synced/backed up).
- Every future episode of `watching` shows (regular seasons + `nextEpisode`) gets a notification at 19:00 local on its air date; soonest 60 only (iOS caps pending at 64). Each sync cancels all pending and reschedules.
- Always pass `isExactNotification: false`: with exact alarms the plugin blocks on Android's "Alarms & reminders" settings screen. `SCHEDULE_EXACT_ALARM` is removed from the manifest on purpose.

### Icons & logo

- Sources in `resources/`: `icon.png` (artwork only, transparent — the app icon), `logo-bg.png` / `logo-no-bg.png` (full logo with "Popcorn Journal" text). Brand background is cream `#FDFAF6`.
- App icon = `icon.png` on cream. iOS `AppIcon` is 1024² **without alpha**; Android has legacy + round mipmaps and an adaptive foreground at 108dp with the art inside the 66dp safe zone; background color in `values/ic_launcher_background.xml`.
- Splash (iOS + Android) = `logo-no-bg.png` centered on cream. Settings → About shows the full logo: `src/assets/logo-light.png` (no bg) in light mode, `logo-dark.png` (cream bg) in dark mode, because the black "Journal" text is invisible on dark.
- Don't put large images in `public/` (copied into the app as-is); keep sources in `resources/` and ship resized copies.
- Regenerating needs `sharp`, which is not a project dependency: install it in a temp folder and render from the sources.

## Conventions

- TypeScript strict; no `any` — type TMDB responses in `src/types/tmdb.ts`
- `erasableSyntaxOnly` is on: no `enum`, `namespace` or constructor parameter properties — use string-literal unions (`'watching' | 'completed' | …`) or `as const` objects
- `verbatimModuleSyntax` is on: type-only imports must use `import type`
- `npm run build` runs `vue-tsc -b` first, so use it as the type-check
- Composition API only, `<script setup lang="ts">`
- Components stay presentational; logic lives in stores/services
- Dates stored as ISO 8601 UTC strings; format only in the UI
- UI text in English for now, kept in `src/utils/strings.ts` so i18n can be added later — no hard-coded strings in templates
- Android renders Ionic in `md` mode, which hides `<ion-header collapse="condense">` completely: put only the large title there, never controls (searchbar, segments). Test UI changes in md too (Android emulator), not only with an iPhone user agent.
- Unit tests (Vitest) required for `merge.ts`, `migrations.ts` and episode-progress logic
- Keep dependencies minimal; ask before adding a new package

## Commands

iOS uses Swift Package Manager (Capacitor 8), not CocoaPods. Development happens on Windows: `npx cap sync ios` works, but `cap open/run ios` need macOS + Xcode.
Vitest is configured in `vite.config.ts` (tests: `src/**/*.test.ts`); `npm run test` exits after one run when non-interactive, so use `npx vitest run <file>` for a single file.

```bash
npm install
npm run dev            # browser dev (localStorage fallback)
npm run build
npm run test           # vitest
npm run format         # prettier (also runs automatically on every file Claude edits, via .claude/settings.json hook)
npx cap sync ios
npx cap open ios       # open in Xcode
npx cap run ios
npx cap sync android
```

Android build on this machine (Android Studio's bundled JDK 25 is too new for Gradle 8.14 — use JDK 21):

```bash
cd android
JAVA_HOME="$USERPROFILE/.jdks/jbr-21.0.11" ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" ./gradlew assembleDebug
adb -s <device> install -r app/build/outputs/apk/debug/app-debug.apk   # adb in $ANDROID_HOME/platform-tools
```

- Devices: emulator `Medium_Phone_API_37.0` and the user's iPlay60 mini Pro tablet over USB — always pass `-s` (two devices are usually attached).
- Debug WebView is inspectable: `adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>`, then connect puppeteer/Chrome DevTools to `localhost:9333`.
- On-device files: `adb shell run-as com.popcornjournal.app ls files/user`. The native bridge logs every rejected Filesystem call (e.g. stat of a missing file) as a console error; those are expected.
