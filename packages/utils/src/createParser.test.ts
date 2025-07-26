// parser.test.ts
import { describe, expect,it } from 'vitest'

import { createParser } from './createParser'

describe('createParser (pad + bold + italic)', () => {
  const parser = createParser({
    pad: { next: (v: string) => parseInt(v) || 5 },
    bold: { default: true },
    italic: { default: true },
  })

  it('parses value-token + flag and collects rest tokens', () => {
    expect(parser('red solid pad 5 bold')).toEqual({
      pad: 5,
      bold: true,
      rest: 'red solid',
    })
  })

  it('falls back to default when next() returns falsy', () => {
    expect(parser('pad foo')).toEqual({
      pad: 5,
      rest: '',
    })
  })

  it('only applies default flags when those tokens appear', () => {
    expect(parser('bold italic')).toEqual({
      bold: true,
      italic: true,
      rest: '',
    })
    expect(parser('')).toEqual({ rest: '' })
  })

  it('treats unknown tokens as rest in their original order', () => {
    expect(parser('blue pad 2 unknown foo italic extra')).toEqual({
      pad: 2,
      italic: true,
      rest: 'blue unknown foo extra',
    })
  })

  it('handles repeated options by taking the last occurrence', () => {
    expect(parser('pad 1 pad 2')).toEqual({ pad: 2, rest: '' })
  })
})

describe('parser with next-only option', () => {
  const parser = createParser({
    num: {
      next: (v: string) => {
        const n = Number(v)
        return Number.isNaN(n) ? undefined : n * 2
      },
    },
  })

  it('applies next() and transforms the value', () => {
    expect(parser('num 3 foo')).toEqual({ num: 6, rest: 'foo' })
  })

  it('skips assignment when next() returns undefined', () => {
    expect(parser('num bar baz')).toEqual({ rest: 'bar baz' })
  })
})

describe('parser with both next() and default', () => {
  const parser = createParser({
    size: { next: (v: string) => parseInt(v), default: 10 },
    num: {
      next: (v: string) => {
        const n = Number(v)
        return Number.isNaN(n) ? undefined : n * 2
      },
      default: 33,
    },
  })

  it('uses next() result when it parses to a number', () => {
    expect(parser('size 20 x')).toEqual({ size: 20, rest: 'x' })
  })

  it('set default when next() returns undefined', () => {
    expect(parser('num bar baz')).toEqual({ num: 33, rest: 'bar baz' })
  })
})

describe('parser with an empty option (no next, no default)', () => {
  const parser = createParser({ opt: {} })

  it('consumes the key without assigning or including it in rest', () => {
    expect(parser('opt val other')).toEqual({ opt: null, rest: 'val other' })
  })
})
