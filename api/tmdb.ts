// Vercel Edge Function: TMDB proxy for the web (PWA) build, so the read token
// never ships to the browser. The token lives only in the Vercel env var
// TMDB_PROXY_TOKEN — never name it TMDB_API_READ_ACCESS_TOKEN there, or Vite
// (envPrefix) would bake it into the client bundle again.
//
// Client calls: /api/tmdb?path=/search/tv&query=...

export const config = { runtime: 'edge' }

const TMDB = 'https://api.themoviedb.org/3'

// Only the endpoints the app uses
const ALLOWED_PATHS = [
  /^\/search\/(tv|movie)$/,
  /^\/tv\/\d+$/,
  /^\/tv\/\d+\/season\/\d+$/,
  /^\/movie\/\d+$/,
]
const ALLOWED_PARAMS = new Set(['query', 'page', 'include_adult', 'language'])

/** TMDB URL for an allowed request, or null. */
export function upstreamUrl(params: URLSearchParams): string | null {
  const path = params.get('path')
  if (!path || !ALLOWED_PATHS.some((pattern) => pattern.test(path))) return null
  const forward = new URLSearchParams()
  for (const [key, value] of params) {
    if (ALLOWED_PARAMS.has(key)) forward.set(key, value)
  }
  const query = forward.toString()
  return `${TMDB}${path}${query ? `?${query}` : ''}`
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }
  const target = upstreamUrl(new URL(request.url).searchParams)
  if (!target) return new Response('Not found', { status: 404 })

  const token = process.env.TMDB_PROXY_TOKEN
  if (!token) return new Response('Proxy not configured', { status: 500 })

  const upstream = await fetch(target, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'Content-Type': 'application/json',
      // Cache good responses at Vercel's edge for an hour
      'Cache-Control': upstream.ok
        ? 'public, max-age=0, s-maxage=3600'
        : 'no-store',
    },
  })
}
