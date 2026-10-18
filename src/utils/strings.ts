// All user-facing UI text lives here so i18n can be added later.

/** `1 show`, `2 shows` */
const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`

export const strings = {
  appName: 'Popcorn Journal',
  tabs: {
    series: 'Series',
    movies: 'Movies',
    search: 'Search',
    settings: 'Settings',
  },
  mediaType: {
    series: 'Series',
    movie: 'Movie',
  },
  // TMDB series status → label; unknown statuses fall back to the raw value
  seriesStatus: {
    'Returning Series': 'Returning',
    'In Production': 'In production',
    Planned: 'Planned',
    Pilot: 'Pilot',
    Ended: 'Ended',
    Canceled: 'Canceled',
  } as Record<string, string>,
  libraryStatus: {
    watching: 'Watching',
    planned: 'Plan to watch',
    paused: 'Paused',
    completed: 'Completed',
    dropped: 'Dropped',
  },
  series: {
    upNext: 'Up next',
    empty: 'No shows yet. Find one in Search.',
    caughtUp: 'All caught up',
    next: 'Next',
    tba: 'TBA',
    upcoming: 'Upcoming',
    specials: 'Specials',
    add: 'Add to my shows',
    status: 'Status',
    watchedTimes: 'Times watched',
    progress: (watched: number, aired: number) => `${watched} / ${aired}`,
    seasonWatched: 'Mark season watched',
    seasonUnwatched: 'Mark season unwatched',
    loadError: "Couldn't load this show. Check your connection.",
    retry: 'Try again',
    episodeLabel: (season: number, episode: number) =>
      `S${String(season).padStart(2, '0')} · E${String(episode).padStart(2, '0')}`,
    markNext: 'Mark next episode watched',
    remove: 'Remove from my shows',
  },
  episodeActions: {
    upToHere: 'Watched up to here',
    markWatched: 'Mark watched',
    markUnwatched: 'Mark unwatched',
    addRewatch: 'Watched again (+1)',
    removeRewatch: 'Remove a rewatch (−1)',
    cancel: 'Cancel',
    rewatches: (count: number) => `×${count}`,
  },
  movies: {
    empty: 'No movies yet. Find one in Search.',
    watchlist: 'Watchlist',
    watched: 'Watched',
    addToWatchlist: 'Add to watchlist',
    markWatched: 'Mark watched',
    markUnwatched: 'Mark unwatched',
    onWatchlist: 'On your watchlist',
    watchedOn: 'Watched on',
    watchedTimes: 'Times watched',
    watchedSubtitle: (date: string, count: number) =>
      count > 1 ? `${date} · ×${count}` : date,
    loadError: "Couldn't load this movie. Check your connection.",
    retry: 'Try again',
    done: 'Done',
    remove: 'Remove from my movies',
  },
  removeConfirm: {
    message: 'Your watch history is kept — adding it again restores it.',
    remove: 'Remove',
    cancel: 'Cancel',
  },
  search: {
    placeholder: 'Search titles',
    hint: 'Find a show or a movie to add it to your library.',
    noResults: 'No results',
    error: "Couldn't reach TMDB. Check your connection.",
    retry: 'Try again',
  },
  stats: {
    title: 'Your stats',
    tvTime: 'TV time',
    movieTime: 'Movie time',
    episodes: 'Episodes watched',
    movies: 'Movies watched',
    watching: 'Shows watching',
    completed: 'Shows completed',
    thisYear: (year: number) => `In ${year}`,
    thisYearLine: (episodes: number, movies: number) =>
      `${plural(episodes, 'episode')} · ${plural(movies, 'movie')}`,
    duration: (d: { days: number; hours: number; minutes: number }) =>
      d.days
        ? `${d.days}d ${d.hours}h`
        : d.hours
          ? `${d.hours}h ${d.minutes}m`
          : `${d.minutes}m`,
    note: 'Rewatches count towards totals. "In" counts titles by their last watch date.',
    loading: (count: number) =>
      `Loading runtimes for ${plural(count, 'title')}…`,
  },
  reminders: {
    title: 'New episode reminders',
    footer:
      'Get a notification at 7 pm on the day a new episode of a show you are watching airs.',
    unsupported: 'Reminders are available in the iOS and Android app.',
    denied:
      'Notifications are turned off for Popcorn Journal in system settings.',
    body: (label: string, title: string) => `${label} · ${title} airs today`,
  },
  settings: {
    stats: 'Your stats',
    backup: 'Backup',
    export: 'Export backup',
    import: 'Import backup',
    backupFooter:
      'Export saves all your shows, movies and watch history to one file. Importing merges a backup into your current data — nothing is deleted.',
    imported: (s: { series: number; movies: number; episodes: number }) =>
      `Imported ${plural(s.series, 'show')}, ${plural(s.movies, 'movie')} and ${plural(s.episodes, 'watched episode')}.`,
    exportFailed: "Couldn't export the backup.",
    importFailed: "Couldn't import this file.",
    about: 'About',
    version: (version: string) => `Version ${version}`,
    tmdbNotice:
      'This product uses the TMDB API but is not endorsed or certified by TMDB.',
  },
} as const
