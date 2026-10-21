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
    finishedOn: (date: string) => `Finished on: ${date}`,
    seasonWatched: 'Mark season watched',
    seasonUnwatched: 'Mark season unwatched',
    allWatched: 'Already watched all aired episodes',
    allWatchedConfirm: {
      header: 'Mark the whole show watched?',
      message: (count: number) =>
        `${count} unwatched ${count === 1 ? 'episode' : 'episodes'} will be ticked.`,
      confirm: 'Mark all watched',
      cancel: 'Cancel',
    },
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
    watchedOn: (date: string, count = 1) =>
      count > 1 ? `Rewatched on: ${date}` : `Watched on: ${date}`,
  },
  partial: {
    set: 'Watched partly…',
    change: 'Change where I stopped',
    clear: 'Clear progress',
    inProgress: 'In progress',
    stoppedAt: (at: string, runtime: string | null) =>
      runtime ? `Stopped at ${at} of ${runtime}` : `Stopped at ${at}`,
    partlyWatchedOn: (date: string) => `Partly watched on: ${date}`,
    promptHeader: 'Where did you stop?',
    promptRuntime: (runtime: string) => `Runtime: ${runtime}`,
    placeholder: 'Minutes, e.g. 45 or 1:30',
    save: 'Save',
    cancel: 'Cancel',
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
      count > 1 ? `Rewatched on: ${date} · ×${count}` : `Watched on: ${date}`,
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
  // About & help page: a short user guide
  about: {
    title: 'About & help',
    tagline: 'Your personal TV show & movie journal.',
    sections: {
      start: {
        title: 'Getting started',
        items: [
          'Open Search, pick Series or Movies, and type a title.',
          'Tap a result to open it, then “Add to my shows”, “Mark watched” or “Add to watchlist”.',
        ],
      },
      series: {
        title: 'Tracking shows',
        items: [
          'Tap the circle next to an episode to tick it. Tap the episode itself for more: watched up to here, watched again (+1), mark unwatched.',
          '“Mark season watched” ticks every aired episode of a season at once; “Already watched all aired episodes” does it for the whole show (an ended show is then marked Completed).',
          'The Series tab shows “Up next” for every show you’re watching — tick the next episode right from there.',
          'Episodes that haven’t aired yet are dimmed and show their air date. Specials don’t count towards progress.',
          'On a show’s page you can change its status and set how many times you’ve watched it.',
          'Stopped halfway through an episode? Tap it, choose “Watched partly…” and enter the minute (45 or 1:30). Ticking it later clears the progress.',
        ],
      },
      movies: {
        title: 'Tracking movies',
        items: [
          '“Mark watched” saves today’s date — tap the date to change it.',
          'Use “Times watched” for rewatches. “Add to watchlist” keeps movies you plan to see.',
          '“Watched partly…” remembers where you stopped; those movies show under “In progress”.',
        ],
      },
      data: {
        title: 'Where your data lives',
        items: [
          'Everything you track is stored only on this device. There are no accounts and nothing is uploaded.',
          'Removing a show or movie from your library keeps its watch history — add it again and your progress is back.',
        ],
        web: [
          'Always open the app from its Home Screen icon: it has its own storage, separate from Safari tabs.',
          'Deleting the Home Screen icon, or clearing Safari’s website data, erases your data. Export a backup first.',
        ],
      },
      backup: {
        title: 'Backups',
        items: [
          'Settings → Export backup saves everything to one file. Save it to Files or iCloud Drive, and do it regularly.',
          'Settings → Import backup merges a backup into your current data — nothing is deleted. Use it to move to a new phone or between iPhone and Android.',
        ],
      },
      install: {
        title: 'Install on iPhone',
        items: [
          'In Safari, tap Share → Add to Home Screen.',
          'The app then opens full screen and works offline. Updates install automatically.',
          'New episode reminders are only available in the native app, not in the Home Screen version.',
        ],
      },
    },
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
    aboutHelp: 'About & help',
    version: (version: string) => `Version ${version}`,
    tmdbNotice:
      'This product uses the TMDB API but is not endorsed or certified by TMDB.',
  },
} as const
