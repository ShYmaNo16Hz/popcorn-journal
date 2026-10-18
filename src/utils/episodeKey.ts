// Episode keys: `SxxEyy`, zero-padded to at least 2 digits (`S01E100` is valid).
// Never sort keys as strings — parse them.

const KEY_PATTERN = /^S(\d{2,})E(\d{2,})$/

export function episodeKey(season: number, episode: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `S${pad(season)}E${pad(episode)}`
}

export function parseEpisodeKey(
  key: string,
): { season: number; episode: number } | null {
  const match = KEY_PATTERN.exec(key)
  if (!match) return null
  return { season: Number(match[1]), episode: Number(match[2]) }
}
