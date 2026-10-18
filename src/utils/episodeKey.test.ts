import { describe, expect, it } from 'vitest'
import { episodeKey, parseEpisodeKey } from './episodeKey'

describe('episodeKey', () => {
  it('zero-pads to two digits', () => {
    expect(episodeKey(1, 1)).toBe('S01E01')
    expect(episodeKey(0, 3)).toBe('S00E03')
  })

  it('keeps longer numbers intact', () => {
    expect(episodeKey(1, 100)).toBe('S01E100')
    expect(episodeKey(123, 4)).toBe('S123E04')
  })
})

describe('parseEpisodeKey', () => {
  it('round-trips with episodeKey', () => {
    expect(parseEpisodeKey(episodeKey(2, 105))).toEqual({
      season: 2,
      episode: 105,
    })
  })

  it('rejects malformed keys', () => {
    expect(parseEpisodeKey('S1E1')).toBeNull()
    expect(parseEpisodeKey('s01e01')).toBeNull()
    expect(parseEpisodeKey('S01E01x')).toBeNull()
  })
})
