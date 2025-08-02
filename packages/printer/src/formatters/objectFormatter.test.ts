import { describe, expect, it } from 'vitest'

import { ColorConfig, colorlessConfig } from '../colorConfig'
import { createPrinter } from '../createPrinter'
import { PrintContext } from '../printContext'
import { Printer } from '../printer'
import { ObjectFormatter } from './objectFormatter'

const thePrinter: Printer = createPrinter()

// Helper to create a PrintContext with basic coloring and settings
const makeCtx = (
  overrides: Partial<
    Pick<PrintContext, 'indent' | 'maxIndent' | 'indentString'> & {
      config?: Partial<ColorConfig>
    }
  > = {}
): PrintContext => {
  return {
    indent: overrides.indent ?? '',
    maxIndent: overrides.maxIndent ?? 10,
    indentString: overrides.indentString ?? '  ',
    colorConfig: colorlessConfig,
    seen: new WeakSet(),
    quotes: '"',
    keys: [],
    prefix: '',
  }
}

describe('ObjectFormatter', () => {
  it('canFormat returns true only for non-null, non-array objects', () => {
    const fmt = new ObjectFormatter({})
    expect(fmt.canFormat({ a: 1 })).toBe(true)
    expect(fmt.canFormat(null)).toBe(false)
    expect(fmt.canFormat([1, 2])).toBe(false)
    expect(fmt.canFormat(123)).toBe(false)
  })

  it('returns bracketed placeholder when depth clipped', () => {
    const fmt = new ObjectFormatter({})
    const ctx = makeCtx({ indent: '  '.repeat(5), maxIndent: 5 })
    expect(fmt.format({ a: 1 }, ctx, thePrinter)).toBe('          [Object]')
  })

  it('formats empty object with braces by default', () => {
    const fmt = new ObjectFormatter({})
    const ctx = makeCtx()
    expect(fmt.format({}, ctx, thePrinter)).toBe('{}')
  })

  it('omits braces for empty object when showBrackets is false', () => {
    const fmt = new ObjectFormatter({ showBrackets: false })
    const ctx = makeCtx()
    expect(fmt.format({}, ctx, thePrinter)).toBe('')
  })

  it('uses custom sortKeys to order entries', () => {
    const reverseSort = (keys: string[]) => [...keys].reverse()
    const fmt = new ObjectFormatter({ sortKeys: reverseSort })
    const ctx = makeCtx()
    const obj = { a: 1, b: 2, c: 3 }
    const out = fmt.format(obj, ctx, thePrinter)
    // Should list c, b, a in that order
    expect(out).toContain('"c": 3')
    expect(out.indexOf('"c":')).toBeLessThan(out.indexOf('"b":'))
    expect(out.indexOf('"b":')).toBeLessThan(out.indexOf('"a":'))
  })

  it('limits entries according to maxEntries and adds truncation comment', () => {
    const fmt = new ObjectFormatter({ maxEntries: 2 })
    const ctx = makeCtx()
    const obj = { x: 1, y: 2, z: 3, w: 4 }
    const out = fmt.format(obj, ctx, thePrinter)
    // Only x and y shown
    expect(out).toContain('"x": 1')
    expect(out).toContain('"y": 2')
    expect(out).not.toContain('"z":')
    // Truncation comment
    expect(out).toContain('... and 2 more entries')
  })

  it('omits commas between entries when showCommas is false', () => {
    const fmt = createPrinter({ showCommas: false })
    const ctx = makeCtx()
    const obj = { a: 1, b: 2 }
    createPrinter({ showCommas: false })
    const out = fmt.print(obj, ctx)
    expect(out).toBe(`{
  "a": 1
  "b": 2
}`)
  })

  it('omits indent of keys when showBrackets is false', () => {
    const fmt = new ObjectFormatter({ showBrackets: false })
    const ctx = makeCtx()
    const obj = { a: 1, b: 2 }
    const out = fmt.format(
      obj,
      {
        ...ctx,
        quotes: '',
      },
      thePrinter
    )
    expect(out).toBe(`a: 1,
b: 2`)
  })

  it('omits brackets when showBrackets is false', () => {
    const fmt = new ObjectFormatter({ showBrackets: false })
    const ctx = makeCtx()
    const obj = { a: 1, b: 2 }
    const out = fmt.format(obj, ctx, thePrinter)
    // Should not start with '{' or end with '}'
    expect(out.startsWith('{')).toBe(false)
    expect(out.endsWith('}')).toBe(false)
    // Entries still present
    expect(out).toContain('"a": 1')
  })

  it('tracks keys in context during formatting', () => {
    const ctx = makeCtx()
    const recorder: string[] = []
    const numberFormatter = {
      canFormat: (value: unknown) => typeof value === 'number',
      format: (value: unknown, ctx: PrintContext) => {
        recorder.push(ctx.keys.join('.'))
        return String(value)
      },
    }
    const printer = new Printer([new ObjectFormatter(), numberFormatter])
    printer.print({ a: { b: 1 }, c: 2 }, ctx)
    expect(recorder).toEqual(['a.b', 'c'])
    expect(ctx.keys).toEqual([])
  })
})
