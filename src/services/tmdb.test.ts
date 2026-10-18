import { describe, expect, it } from 'vitest'
import { imageUrl, mapMovieSearchResult, mapTvSearchResult } from './tmdb'

describe('mapTvSearchResult', () => {
  it('maps a TMDB tv result to a SearchResult', () => {
    expect(
      mapTvSearchResult({
        id: 1398,
        name: 'The Sopranos',
        original_name: 'The Sopranos',
        overview: 'New Jersey mob boss…',
        poster_path: '/rTc7ZXdroqjkKivFPvCPX0Ru7uw.jpg',
        first_air_date: '1999-01-10',
      }),
    ).toEqual({
      tmdbId: 1398,
      type: 'series',
      title: 'The Sopranos',
      year: 1999,
      posterPath: '/rTc7ZXdroqjkKivFPvCPX0Ru7uw.jpg',
      overview: 'New Jersey mob boss…',
    })
  })

  it('uses null year when the air date is empty or missing', () => {
    const base = {
      id: 1,
      name: 'X',
      original_name: 'X',
      overview: '',
      poster_path: null,
    }
    expect(mapTvSearchResult({ ...base, first_air_date: '' }).year).toBeNull()
    expect(mapTvSearchResult(base).year).toBeNull()
  })
})

describe('mapMovieSearchResult', () => {
  it('maps a TMDB movie result to a SearchResult', () => {
    const result = mapMovieSearchResult({
      id: 866398,
      title: 'The Beekeeper',
      original_title: 'The Beekeeper',
      overview: '',
      poster_path: null,
      release_date: '2024-01-10',
    })
    expect(result).toMatchObject({
      tmdbId: 866398,
      type: 'movie',
      year: 2024,
      posterPath: null,
    })
  })
})

describe('imageUrl', () => {
  it('builds a sized image URL', () => {
    expect(imageUrl('/a.jpg', 'w185')).toBe(
      'https://image.tmdb.org/t/p/w185/a.jpg',
    )
  })

  it('returns null without a path', () => {
    expect(imageUrl(null, 'w500')).toBeNull()
  })
})
