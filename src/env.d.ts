/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly TMDB_API_READ_ACCESS_TOKEN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** package.json version, injected by vite.config.ts */
declare const __APP_VERSION__: string
