import { describe, expect, it } from 'vitest'

import { truncate } from './truncate'

describe('truncate', () => {
  it('returns original when within limit', () => {
    expect(truncate('hello', 10)).toBe('hello')
  })

  it('adds ellipsis when exceeding limit', () => {
    expect(truncate('abcdef', 4)).toBe('abc…')
  })

  it('handles small maxLength', () => {
    expect(truncate('abcdef', 1)).toBe('…')
    expect(truncate('abcdef', 0)).toBe('')
  })
})
