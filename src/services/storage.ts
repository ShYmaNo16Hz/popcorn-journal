// The only module that touches the filesystem. Native: Capacitor Filesystem in
// Directory.Data. Web (browser dev): localStorage behind the same interface.
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import type { History, Library } from '../types/userData'
import { emptyHistory, emptyLibrary } from '../types/userData'
import { migrateHistory, migrateLibrary } from './migrations'
import type { UserFileName } from './migrations'

export interface StorageBackend {
  /** File contents, or null if the file doesn't exist. Throws on other errors. */
  read(path: string): Promise<string | null>
  write(path: string, text: string): Promise<void>
  rename(from: string, to: string): Promise<void>
  remove(path: string): Promise<void>
}

export type CacheKind = 'series' | 'movies'

const USER_PATHS: Record<UserFileName, string> = {
  library: 'user/library.json',
  history: 'user/history.json',
}

const PREFS_PATH = 'prefs.json'

const cachePath = (kind: CacheKind, tmdbId: number) =>
  `cache/${kind}/${tmdbId}.json`

export function createStorage(backend: StorageBackend, debounceMs = 1000) {
  // One write chain per path so writes to the same file never overlap
  const chains = new Map<string, Promise<void>>()

  function enqueue(path: string, task: () => Promise<void>): Promise<void> {
    const next = (chains.get(path) ?? Promise.resolve()).then(task, task)
    chains.set(path, next)
    return next
  }

  /** Write to `*.tmp`, then rename over the original. */
  function writeAtomic(path: string, text: string): Promise<void> {
    return enqueue(path, async () => {
      const tmp = `${path}.tmp`
      await backend.write(tmp, text)
      try {
        await backend.rename(tmp, path)
      } catch {
        // Some platforms refuse to rename over an existing file
        await backend.remove(path)
        await backend.rename(tmp, path)
      }
    })
  }

  /** Reads a file, recovering from an interrupted atomic write. */
  async function readRecovering(path: string): Promise<string | null> {
    return (await backend.read(path)) ?? (await backend.read(`${path}.tmp`))
  }

  async function loadUserFile<T>(
    name: UserFileName,
    migrate: (raw: unknown) => T,
    empty: () => T,
  ): Promise<T> {
    const path = USER_PATHS[name]
    const text = await readRecovering(path)
    if (text === null) return empty()

    let raw: unknown
    try {
      raw = JSON.parse(text)
    } catch {
      // Keep the unreadable file aside instead of overwriting it
      const stamp = new Date().toISOString().replace(/[:.]/g, '-')
      await backend.write(
        path.replace(/\.json$/, `.corrupt-${stamp}.json`),
        text,
      )
      console.error(`${path} is not valid JSON; moved aside, starting empty`)
      return empty()
    }
    // Migration errors (e.g. a newer schema) propagate: callers must not save
    return migrate(raw)
  }

  // Debounced user-data saves: ticking a whole season causes one write
  const pending = new Map<UserFileName, () => unknown>()
  const timers = new Map<UserFileName, ReturnType<typeof setTimeout>>()

  function flushFile(name: UserFileName): Promise<void> {
    clearTimeout(timers.get(name))
    timers.delete(name)
    const getData = pending.get(name)
    if (!getData) return chains.get(USER_PATHS[name]) ?? Promise.resolve()
    pending.delete(name)
    return writeAtomic(USER_PATHS[name], JSON.stringify(getData(), null, 2))
  }

  function scheduleSave(name: UserFileName, getData: () => unknown): void {
    pending.set(name, getData)
    clearTimeout(timers.get(name))
    timers.set(
      name,
      setTimeout(() => {
        flushFile(name).catch((error) => console.error(error))
      }, debounceMs),
    )
  }

  return {
    loadLibrary: (): Promise<Library> =>
      loadUserFile('library', migrateLibrary, emptyLibrary),
    loadHistory: (): Promise<History> =>
      loadUserFile('history', migrateHistory, emptyHistory),

    /** Data is serialized when the debounced write runs, so pass the live object. */
    saveLibrary: (library: Library) => scheduleSave('library', () => library),
    saveHistory: (history: History) => scheduleSave('history', () => history),

    /** Writes any pending saves now (e.g. when the app goes to background). */
    async flush(): Promise<void> {
      await Promise.all([flushFile('library'), flushFile('history')])
    },

    async readCache(kind: CacheKind, tmdbId: number): Promise<unknown | null> {
      const text = await readRecovering(cachePath(kind, tmdbId))
      if (text === null) return null
      try {
        return JSON.parse(text)
      } catch {
        return null // cache is re-downloadable
      }
    },

    writeCache(kind: CacheKind, tmdbId: number, data: unknown): Promise<void> {
      return writeAtomic(cachePath(kind, tmdbId), JSON.stringify(data))
    },

    /** Device preferences (not user data: not synced, not in backups). */
    async readPrefs(): Promise<Record<string, unknown>> {
      const text = await readRecovering(PREFS_PATH)
      if (text === null) return {}
      try {
        const prefs: unknown = JSON.parse(text)
        return prefs && typeof prefs === 'object'
          ? (prefs as Record<string, unknown>)
          : {}
      } catch {
        return {}
      }
    },

    writePrefs(prefs: Record<string, unknown>): Promise<void> {
      return writeAtomic(PREFS_PATH, JSON.stringify(prefs))
    },

    /** Copies the current user files to `user/backups/` (e.g. before an import). */
    async snapshotUserFiles(stamp: string): Promise<void> {
      await Promise.all([flushFile('library'), flushFile('history')])
      for (const [name, path] of Object.entries(USER_PATHS)) {
        const text = await readRecovering(path)
        if (text !== null) {
          await backend.write(`user/backups/${stamp}-${name}.json`, text)
        }
      }
    },
  }
}

/**
 * Writes a file for the user to share or save. Native: a temp file in the
 * cache directory, returning its URI. Web: shares or downloads it, returns null.
 */
export async function writeExportFile(
  name: string,
  text: string,
): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({
      path: `exports/${name}`,
      data: text,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    })
    return uri
  }
  // Web: the system share sheet where available (iOS Safari over HTTPS), else a download
  const file = new File([text], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
    } catch (error) {
      // Dismissing the share sheet rejects with AbortError; that's not a failure
      if ((error as DOMException).name !== 'AbortError') throw error
    }
    return null
  }
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
  return null
}

export type Storage = ReturnType<typeof createStorage>

const nativeBackend: StorageBackend = {
  async read(path) {
    // Only "file doesn't exist" means null; a failed read of an existing file
    // throws, so it can never look like empty data. (stat first: the native
    // bridge logs every rejected call, and missing files are common here)
    const exists = await Filesystem.stat({ path, directory: Directory.Data })
      .then(() => true)
      .catch(() => false)
    if (!exists) return null
    const { data } = await Filesystem.readFile({
      path,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    return typeof data === 'string' ? data : await data.text()
  },
  async write(path, text) {
    await Filesystem.writeFile({
      path,
      data: text,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
      recursive: true,
    })
  },
  async rename(from, to) {
    await Filesystem.rename({
      from,
      to,
      directory: Directory.Data,
      toDirectory: Directory.Data,
    })
  },
  async remove(path) {
    await Filesystem.deleteFile({ path, directory: Directory.Data }).catch(
      () => {},
    )
  },
}

const LOCAL_PREFIX = 'popcorn-journal:'

const localStorageBackend: StorageBackend = {
  async read(path) {
    return localStorage.getItem(LOCAL_PREFIX + path)
  },
  async write(path, text) {
    localStorage.setItem(LOCAL_PREFIX + path, text)
  },
  async rename(from, to) {
    const text = localStorage.getItem(LOCAL_PREFIX + from)
    if (text === null) throw new Error(`${from} does not exist`)
    localStorage.setItem(LOCAL_PREFIX + to, text)
    localStorage.removeItem(LOCAL_PREFIX + from)
  },
  async remove(path) {
    localStorage.removeItem(LOCAL_PREFIX + path)
  },
}

// Web (PWA on iPhone): IndexedDB, since localStorage caps at ~5 MB in Safari and
// a full quota would start failing user-data writes. One object store keyed by path.
const IDB_NAME = 'popcorn-journal'
const IDB_STORE = 'files'

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function openIdb(): Promise<IDBDatabase> {
  const open = indexedDB.open(IDB_NAME, 1)
  open.onupgradeneeded = () => open.result.createObjectStore(IDB_STORE)
  return request(open)
}

/** Moves data saved by earlier versions (localStorage backend) into IndexedDB once. */
async function migrateFromLocalStorage(db: IDBDatabase): Promise<IDBDatabase> {
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith(LOCAL_PREFIX),
  )
  if (keys.length === 0) return db
  const tx = db.transaction(IDB_STORE, 'readwrite')
  const store = tx.objectStore(IDB_STORE)
  for (const key of keys) {
    const path = key.slice(LOCAL_PREFIX.length)
    const text = localStorage.getItem(key)
    // Never overwrite something already in IndexedDB
    if (text !== null && (await request(store.getKey(path))) === undefined) {
      store.put(text, path)
    }
  }
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  for (const key of keys) localStorage.removeItem(key)
  return db
}

function createIdbBackend(): StorageBackend {
  const ready = openIdb().then(migrateFromLocalStorage)
  const store = async (mode: IDBTransactionMode) =>
    (await ready).transaction(IDB_STORE, mode).objectStore(IDB_STORE)
  return {
    async read(path) {
      const text = await request((await store('readonly')).get(path))
      return typeof text === 'string' ? text : null
    },
    async write(path, text) {
      await request((await store('readwrite')).put(text, path))
    },
    // One transaction: the rename is atomic
    async rename(from, to) {
      const files = await store('readwrite')
      const text = await request(files.get(from))
      if (typeof text !== 'string') throw new Error(`${from} does not exist`)
      files.put(text, to)
      await request(files.delete(from))
    },
    async remove(path) {
      await request((await store('readwrite')).delete(path))
    },
  }
}

function webBackend(): StorageBackend {
  return typeof indexedDB === 'undefined'
    ? localStorageBackend
    : createIdbBackend()
}

export const storage = createStorage(
  Capacitor.isNativePlatform() ? nativeBackend : webBackend(),
)

// Ask the browser not to evict our data under storage pressure (web only)
if (!Capacitor.isNativePlatform() && typeof navigator !== 'undefined') {
  navigator.storage?.persist?.().catch(() => {})
}

// Don't lose a pending debounced write when the app is backgrounded or closed
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      storage.flush().catch((error) => console.error(error))
    }
  })
}
