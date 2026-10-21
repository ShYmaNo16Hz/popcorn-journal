import { describe, expect, it } from 'vitest'
import {
  formatRuntime,
  isoToLocalDate,
  localDate,
  localDateToIso,
  parseMinutes,
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
    expect(formatRuntime(120)).toBe('2h')
  })
})

describe('parseMinutes', () => {
  it('reads minutes and h:mm forms', () => {
    expect(parseMinutes('45')).toBe(45)
    expect(parseMinutes(' 45m ')).toBe(45)
    expect(parseMinutes('105')).toBe(105)
    expect(parseMinutes('1:30')).toBe(90)
    expect(parseMinutes('1h30')).toBe(90)
    expect(parseMinutes('1h 05m')).toBe(65)
    expect(parseMinutes('2h')).toBe(120)
    expect(parseMinutes('1h 5m')).toBe(65)
  })

  it('rejects empty, zero and malformed input', () => {
    for (const input of [
      '',
      '0',
      '0:00',
      '1:75',
      '1:5',
      '1:',
      'abc',
      '-5',
      '1.5',
    ]) {
      expect(parseMinutes(input)).toBeNull()
    }
  })

  it('reads back what formatRuntime shows', () => {
    for (const minutes of [45, 60, 65, 125]) {
      expect(parseMinutes(formatRuntime(minutes))).toBe(minutes)
    }
  })
})
