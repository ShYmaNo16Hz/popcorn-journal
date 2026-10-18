// Calendar dates (`YYYY-MM-DD`, as TMDB air dates) are compared as strings in the
// user's local time zone. Formatting for display lives here too.

/** Today's local date as `YYYY-MM-DD`. */
export function localDate(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** `2026-10-25` → `25 Oct` (adds the year when it isn't the current one). */
export function formatDate(date: string, now: Date = new Date()): string {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number)
  if (!year || !month || !day) return date
  const value = new Date(year, month - 1, day)
  return value.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(year !== now.getFullYear() ? { year: 'numeric' } : {}),
  })
}

/** ISO timestamp → the user's local calendar date `YYYY-MM-DD`. */
export function isoToLocalDate(iso: string): string {
  return localDate(new Date(iso))
}

/**
 * A picked calendar date → ISO timestamp. Today keeps the current time;
 * past dates use local noon so the date doesn't shift across time zones.
 */
export function localDateToIso(date: string, now: Date = new Date()): string {
  if (date === localDate(now)) return now.toISOString()
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year!, month! - 1, day!, 12).toISOString()
}

/** 106 → `1h 46m`. */
export function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}h ${m}m` : `${m}m`
}
