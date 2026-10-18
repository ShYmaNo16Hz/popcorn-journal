import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Library } from '../types/userData'
import { createStorage } from './storage'
import type { StorageBackend } from './storage'

function memoryBackend() {
  const files = new Map<string, string>()
  const writes: string[] = []
  const backend: StorageBackend = {
    async read(path) {
      return files.get(path) ?? null
    },
    async write(path, text) {
      writes.push(path)
      files.set(path, text)
    },
    async rename(from, to) {
      const text = files.get(from)
      if (text === undefined) throw new Error(`${from} missing`)
      files.set(to, text)
      files.delete(from)
    },
    async remove(path) {
      files.delete(path)
    },
  }
  return { backend, files, writes }
}

const library = (): Library => ({ v: 1, series: {}, movies: {} })

describe('storage', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('debounces saves into a single atomic write of the latest data', async () => {
    const { backend, files, writes } = memoryBackend()
    const storage = createStorage(backend, 1000)
    const data = library()

    for (let i = 0; i < 20; i++) {
      data.series[String(i)] = {
        status: 'watching',
        addedAt: '',
        updatedAt: '',
      }
      storage.saveLibrary(data)
    }
    expect(writes).toEqual([])

    await vi.advanceTimersByTimeAsync(1000)
    expect(writes).toEqual(['user/library.json.tmp'])
    expect(files.has('user/library.json.tmp')).toBe(false)
    const saved = JSON.parse(files.get('user/library.json')!) as Library
    expect(Object.keys(saved.series)).toHaveLength(20)
  })

  it('flush writes pending data immediately', async () => {
    const { backend, files } = memoryBackend()
    const storage = createStorage(backend, 1000)
    storage.saveHistory({ v: 1, episodes: {}, movies: {} })
    await storage.flush()
    expect(files.has('user/history.json')).toBe(true)
  })

  it('renames over an existing file even if the backend refuses to overwrite', async () => {
    const { backend, files } = memoryBackend()
    const rename = backend.rename
    backend.rename = async (from, to) => {
      if (files.has(to)) throw new Error('destination exists')
      await rename(from, to)
    }
    const storage = createStorage(backend, 0)
    files.set('user/library.json', JSON.stringify(library()))

    const data = library()
    data.movies['1'] = { status: 'planned', addedAt: '', updatedAt: '' }
    storage.saveLibrary(data)
    await storage.flush()
    expect(JSON.parse(files.get('user/library.json')!)).toEqual(data)
  })

  it('returns empty data when no file exists', async () => {
    const storage = createStorage(memoryBackend().backend)
    expect(await storage.loadLibrary()).toEqual(library())
  })

  it('recovers from an interrupted write via the .tmp file', async () => {
    const { backend, files } = memoryBackend()
    const data = library()
    data.series['1398'] = { status: 'watching', addedAt: 'a', updatedAt: 'b' }
    files.set('user/library.json.tmp', JSON.stringify(data))
    expect(await createStorage(backend).loadLibrary()).toEqual(data)
  })

  it('moves a corrupt file aside instead of losing it', async () => {
    const { backend, files } = memoryBackend()
    files.set('user/library.json', '{not json')
    expect(await createStorage(backend).loadLibrary()).toEqual(library())
    const backups = [...files.keys()].filter((p) => p.includes('.corrupt-'))
    expect(backups).toHaveLength(1)
    expect(files.get(backups[0]!)).toBe('{not json')
  })

  it('refuses to load a file from a newer schema version', async () => {
    const { backend, files } = memoryBackend()
    files.set('user/history.json', JSON.stringify({ v: 99 }))
    await expect(createStorage(backend).loadHistory()).rejects.toThrow('newer')
  })

  it('snapshots the current user files before an import', async () => {
    const { backend, files } = memoryBackend()
    files.set('user/library.json', '{"v":1}')
    files.set('user/history.json', '{"v":1,"x":1}')
    await createStorage(backend).snapshotUserFiles('pre-import-1')
    expect(files.get('user/backups/pre-import-1-library.json')).toBe('{"v":1}')
    expect(files.get('user/backups/pre-import-1-history.json')).toBe(
      '{"v":1,"x":1}',
    )
  })
})
