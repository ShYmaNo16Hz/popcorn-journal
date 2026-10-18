// Underscore prefix: Vercel doesn't deploy this file as a function.
import { describe, expect, it } from 'vitest'
import { upstreamUrl } from './tmdb.ts'

const url = (query: Record<string, string>) =>
  upstreamUrl(new URLSearchParams(query))

describe('TMDB proxy', () => {
  it('forwards the endpoints the app uses with their params', () => {
    expect(
      url({
        path: '/search/tv',
        query: 'Severance',
        page: '2',
        include_adult: 'false',
      }),
    ).toBe(
      'https://api.themoviedb.org/3/search/tv?query=Severance&page=2&include_adult=false',
    )
    expect(url({ path: '/tv/1398' })).toBe(
      'https://api.themoviedb.org/3/tv/1398',
    )
    expect(url({ path: '/tv/1398/season/0' })).toBe(
      'https://api.themoviedb.org/3/tv/1398/season/0',
    )
    expect(url({ path: '/movie/872585' })).toBe(
      'https://api.themoviedb.org/3/movie/872585',
    )
  })

  it('rejects anything else', () => {
    expect(url({})).toBeNull()
    expect(url({ path: '/account' })).toBeNull()
    expect(url({ path: '/tv/1398/account_states' })).toBeNull()
    expect(url({ path: '/tv/abc' })).toBeNull()
    expect(url({ path: '//evil.example.com/x' })).toBeNull()
    expect(url({ path: '/movie/1?api_key=x' })).toBeNull()
  })

  it('drops unknown query params', () => {
    expect(
      url({ path: '/movie/1', api_key: 'x', append_to_response: 'credits' }),
    ).toBe('https://api.themoviedb.org/3/movie/1')
  })
})
