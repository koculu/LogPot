import { describe, expect, it } from 'vitest'

import { merge } from './merge'

describe('merge', () => {
  it('deeply merges plain objects', () => {
    const result = merge({ a: { x: 1 }, b: 2 }, { a: { y: 3 }, b: 4 })
    expect(result).toEqual({ a: { x: 1, y: 3 }, b: 4 })
  })

  it('throws if base is not plain object', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => merge(5 as any, {})).toThrow()
  })
})
