import { describe, expect, it } from 'vitest'

import { centerText } from './centerText'

describe('centerText', () => {
  it('centers within width with spaces', () => {
    expect(centerText('hi', 6)).toBe('  hi  ')
  })

  it('returns original when width smaller than text', () => {
    expect(centerText('hello', 3)).toBe('hello')
  })
})
