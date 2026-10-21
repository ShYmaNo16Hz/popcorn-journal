// Calendar dates (`YYYY-MM-DD`, as TMDB air dates) are compared as strings in the
// user's local time zone. Formatting for display lives here too.
import { strings } from './strings'

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

/** ISO timestamp → its local calendar date formatted, e.g. `25 Oct`. */
export function formatIsoDate(iso: string, now: Date = new Date()): string {
  return formatDate(isoToLocalDate(iso), now)
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

/** 106 → `1h 46m`, 120 → `2h` (`parseMinutes` reads it back). */
export function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

/**
 * User-typed position → minutes: `45`, `45m`, `1:30`, `1h`, `1h30`, `1h 30m`.
 * Null if invalid or 0; `1:5` is rejected (ambiguous), `1h 5m` is fine.
 */
export function parseMinutes(input: string): number | null {
  const text = input.trim().toLowerCase()
  const plain = /^(\d+)\s*(?:m|min)?$/.exec(text)
  const clock =
    /^(\d+):(\d{2})$/.exec(text) ??
    /^(\d+)\s*h\s*(?:(\d{1,2})\s*(?:m|min)?)?$/.exec(text)
  let minutes: number | null = null
  if (plain) minutes = Number(plain[1])
  else if (clock && Number(clock[2] ?? 0) < 60) {
    minutes = Number(clock[1]) * 60 + Number(clock[2] ?? 0)
  }
  return minutes ? minutes : null
}

/** `Stopped at 45m of 2h` */
export function stoppedAtLabel(
  minutes: number,
  runtime: number | null,
): string {
  return strings.partial.stoppedAt(
    formatRuntime(minutes),
    runtime ? formatRuntime(runtime) : null,
  )
}
