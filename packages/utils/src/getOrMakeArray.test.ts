import { describe, expect, it } from 'vitest'

import { getOrMakeArray } from './getOrMakeArray'

describe('getOrMakeArray', () => {
  it('wraps single value', () => {
    expect(getOrMakeArray(5)).toEqual([5])
  })

  it('returns empty array for null or undefined', () => {
    expect(getOrMakeArray(null)).toEqual([])
    expect(getOrMakeArray(undefined)).toEqual([])
  })

  it('returns same array instance', () => {
    const arr = [1, 2]
    expect(getOrMakeArray(arr)).toBe(arr)
  })
})
