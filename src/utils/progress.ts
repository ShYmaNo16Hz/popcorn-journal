// Episode-progress logic (pure). Specials (season 0) never count towards progress.
import type { Episode, Series } from '../types/media'
import type { HistoryEntry } from '../types/userData'

/** Times watched for an entry: 0 when unwatched/tombstoned, else `count ?? 1`. */
export function watchCount(entry: HistoryEntry | undefined): number {
  return entry?.at ? (entry.count ?? 1) : 0
}

/** An episode is aired once its air date is today or earlier (TBA = not aired). */
export function isAired(episode: Episode, today: string): boolean {
  return episode.airDate !== null && episode.airDate <= today
}

/** Regular (non-special) episodes in watch order. */
export function regularEpisodes(series: Series): Episode[] {
  return series.seasons
    .filter((season) => season.number > 0)
    .flatMap((season) => season.episodes)
}

export interface SeriesProgress {
  watched: number // aired regular episodes watched
  aired: number // aired regular episodes
  nextUp: Episode | null // next aired episode to watch
  upcoming: Episode | null // next episode that hasn't aired yet
  caughtUp: boolean // everything aired is watched
}

export function seriesProgress(
  series: Series,
  isWatched: (episode: Episode) => boolean,
  today: string,
): SeriesProgress {
  const episodes = regularEpisodes(series)
  const aired = episodes.filter((episode) => isAired(episode, today))
  const watchedFlags = aired.map(isWatched)
  const watched = watchedFlags.filter(Boolean).length

  // Continue after the furthest watched episode; if that's the last one,
  // fall back to the first gap (an earlier skipped episode).
  const furthest = watchedFlags.lastIndexOf(true)
  const nextUp =
    aired[furthest + 1] ?? aired.find((_, i) => !watchedFlags[i]) ?? null

  const announced = series.nextEpisode
  const upcoming =
    episodes.find((episode) => !isAired(episode, today)) ??
    (announced && !isAired(announced, today) ? announced : null)

  return {
    watched,
    aired: aired.length,
    nextUp,
    upcoming,
    caughtUp: aired.length > 0 && watched === aired.length,
  }
}

/** Aired episodes up to and including `target`, for "watched up to here". */
export function episodesUpTo(
  series: Series,
  target: Episode,
  today: string,
): Episode[] {
  const episodes = target.season === 0 ? [] : regularEpisodes(series)
  const index = episodes.findIndex(
    (episode) =>
      episode.season === target.season && episode.number === target.number,
  )
  if (index === -1) return [target]
  return episodes
    .slice(0, index + 1)
    .filter((episode) => isAired(episode, today))
}
