# popcorn-journal

Popcorn Journal — a personal, local-first TV show & movie tracker (a TV Time replacement).
Vue 3 + Ionic + Capacitor, metadata from TMDB. Everything is stored on the device.

## Setup

Create `.env.local` with a TMDB v4 read access token:

```
TMDB_API_READ_ACCESS_TOKEN=...
```

```bash
npm install
npm run dev     # browser
npm run test
npm run build
```

See `CLAUDE.md` for architecture, storage rules and Android/iOS build notes.

This product uses the TMDB API but is not endorsed or certified by TMDB.
