import { describe, expect, it } from 'vitest'
import {
  formatRuntime,
  isoToLocalDate,
  localDate,
  localDateToIso,
} from './date'

describe('date utils', () => {
  const now = new Date(2026, 9, 18, 21, 30) // local 18 Oct 2026, 21:30

  it('formats local dates as YYYY-MM-DD', () => {
    expect(localDate(now)).toBe('2026-10-18')
  })

  it('keeps the current time when the picked date is today', () => {
    expect(localDateToIso('2026-10-18', now)).toBe(now.toISOString())
  })

  it('round-trips a past picked date through ISO without shifting days', () => {
    expect(isoToLocalDate(localDateToIso('2026-03-29', now))).toBe('2026-03-29')
  })

  it('formats runtimes', () => {
    expect(formatRuntime(106)).toBe('1h 46m')
    expect(formatRuntime(45)).toBe('45m')
  })
})
