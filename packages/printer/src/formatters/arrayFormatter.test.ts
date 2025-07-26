import { describe, expect, it } from 'vitest'

import { colorlessConfig } from '../colorConfig'
import { createPrinter } from '../createPrinter'
import { PrintContext } from '../printContext'
import { Printer } from '../printer'
import { ArrayFormatter } from './arrayFormatter'
import { ArrayFormatterConfig } from './arrayFormatterConfig'
import { NumberFormatter } from './formatter'

const thePrinter: Printer = createPrinter()

// Helper: create PrintContext with basic coloring and settings
const makeCtx = (
  overrides: Partial<
    Pick<PrintContext, 'indent' | 'maxIndent' | 'indentString'>
  > = {}
): PrintContext => {
  return {
    indent: overrides.indent ?? '',
    maxIndent: overrides.maxIndent ?? 10,
    indentString: overrides.indentString ?? '  ',
    colorConfig: colorlessConfig,
    seen: new WeakSet(),
    quotes: '"',
    prefix: '',
  }
}

describe('ArrayFormatter', () => {
  it('canFormat returns true only for arrays', () => {
    const fmt = new ArrayFormatter()
    expect(fmt.canFormat([1, 2, 3])).toBe(true)
    expect(fmt.canFormat('not array')).toBe(false)
    expect(fmt.canFormat({})).toBe(false)
  })

  it('formats empty array', () => {
    const fmt = new ArrayFormatter()
    const ctx = makeCtx()
    expect(fmt.format([], ctx, thePrinter)).toBe('[]')
  })

  it('formats depth-clipped array', () => {
    const fmt = new ArrayFormatter()
    const ctx = makeCtx({ indent: '  '.repeat(5), maxIndent: 5 })
    expect(fmt.format([1, 2, 3], ctx, thePrinter)).toBe('          […]')
  })

  it('inlines small arrays under length and item count', () => {
    const fmt = new ArrayFormatter()
    const ctx = makeCtx()
    // [1,2] => inline
    expect(fmt.format([1, 2], ctx, thePrinter)).toBe('[1, 2]')
  })

  it('does not inline when exceeding maxInlineItems', () => {
    const fmt = new ArrayFormatter({ maxInlineItems: 2 })
    const ctx = makeCtx()
    const out = fmt.format([1, 2, 3], ctx, thePrinter)
    expect(out.startsWith('[\n')).toBe(true)
  })

  it('does not inline when exceeding maxInlineLength', () => {
    const fmt = new ArrayFormatter({ maxInlineLength: 5 })
    const ctx = makeCtx()
    const out = fmt.format([123, 456], ctx, thePrinter)
    expect(out).toContain('123')
    expect(out).toContain('\n')
  })

  it('multiline respects maxItems and overflow message', () => {
    const fmt = new ArrayFormatter({
      maxItems: 2,
      maxInlineItems: 3,
    })
    const ctx = makeCtx()
    const out = fmt.format([1, 2, 3, 4], ctx, thePrinter)
    // Should include only first 2 items and overflow message
    expect(out).toContain('1')
    expect(out).toContain('2')
    expect(out).not.toContain('3')
    expect(out).toContain('...2 more')
  })

  it('respects trailingComma option', () => {
    const fmt = new ArrayFormatter({
      trailingComma: true,
      maxInlineItems: 10,
    })
    const ctx = makeCtx()
    const out = fmt.format([1, 2, 3, 4], ctx, thePrinter)
    expect(out).toBe('[1, 2, 3, 4]')
  })

  it('applies custom delimiters', () => {
    const fmt = new ArrayFormatter({
      delimiters: { open: '<', close: '>' },
    })
    const ctx = makeCtx()
    expect(fmt.format([1], ctx, thePrinter)).toBe('<1>')
  })

  it('shouldInline predicate works', () => {
    const fmt = new ArrayFormatter({ shouldInline: () => true })
    const ctx = makeCtx()
    const out = fmt.format([1, 2], ctx, thePrinter)
    expect(out).toBe('[1, 2]')
  })

  it('inlines nested arrays respecting nestedInline config', () => {
    const fmt = new ArrayFormatter({
      maxItems: 10,
    })
    const ctx = makeCtx()
    const arr = [[1, 2], 3, 4, 5]
    const out = fmt.format(arr, ctx, new Printer([fmt, new NumberFormatter()]))
    // Expect nested [1,2] to be inline even in multiline
    expect(out).toContain('[1, 2]')
  })

  it('handles sparse arrays', () => {
    const config: Partial<ArrayFormatterConfig> = {
      maxInlineItems: 7,
      maxItems: 30,
    }
    const fmt = new ArrayFormatter(config)
    const ctx = makeCtx()
    const arr = [] as unknown[]
    arr[1555] = 2
    const out = fmt.format(arr, ctx, thePrinter)
    expect(out).toContain('<empty>')
    expect(out).toContain('...1526 more')
  })

  it('formats single-element array inline', () => {
    const fmt = new ArrayFormatter()
    const ctx = makeCtx()
    expect(fmt.format([42], ctx, thePrinter)).toBe('[42]')
  })

  it('respects custom separator for inline', () => {
    const config: Partial<ArrayFormatterConfig> = {
      separatorInline: '; ',
    }
    const fmt = new ArrayFormatter(config)
    const ctx = makeCtx()
    expect(fmt.format([1, 2, 3], ctx, thePrinter)).toBe('[1; 2; 3]')
  })

  it('respects custom separator for multiline', () => {
    const config: Partial<ArrayFormatterConfig> = {
      separator: '',
      maxItems: 4,
      maxInlineItems: 3,
    }
    const fmt = new ArrayFormatter(config)
    const ctx = makeCtx()
    expect(fmt.format([1, 2, 3, 4, 5], ctx, thePrinter)).toBe(`[
  1
  2
  3
  4
  ...1 more
]`)
  })

  it('clips long arrays', () => {
    const fmt = new ArrayFormatter({
      maxItems: 30,
    })
    const ctx = makeCtx()

    function countOccurrences(str: string, value: string) {
      const regExp = new RegExp(value, 'gi')
      return (str.match(regExp) || []).length
    }

    const out = fmt.format(Array(100).fill(0), ctx, thePrinter)
    expect(countOccurrences(out, '0')).toBe(31)
    expect(out).toContain('...70 more')
  })
})
