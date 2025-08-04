import { describe, expect, it } from 'vitest'

import { createDateFormatter } from './createDateFormatter'

describe('createDateFormatter', () => {
  it('returns shared instance when no args provided', () => {
    const a = createDateFormatter()
    const b = createDateFormatter()
    expect(a).toBe(b)
  })

  it('creates new formatter when options provided', () => {
    const fmt = createDateFormatter('en-US', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
      timeZone: 'UTC',
    })
    const date = new Date('2020-01-02T03:04:05.678Z')
    expect(fmt.format(date)).toBe('01/02/2020, 03:04:05.678')
  })
})
