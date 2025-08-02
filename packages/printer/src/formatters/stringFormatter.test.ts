import { describe, expect, it } from 'vitest'

import { colorlessConfig } from '../colorConfig'
import { PrintContext } from '../printContext'
import { StringFormatter } from './formatter'

const makeCtx = (
  overrides: Partial<Pick<PrintContext, 'quotes'>> = {}
): PrintContext => ({
  indent: '',
  maxIndent: 10,
  indentString: '  ',
  colorConfig: colorlessConfig,
  seen: new WeakSet(),
  quotes: overrides.quotes ?? '"',
  keys: [],
  prefix: '',
})

describe('StringFormatter', () => {
  it('escapes double quotes when using double quotes', () => {
    const fmt = new StringFormatter()
    const ctx = makeCtx()
    const value = 'a "quote" b'
    const result = fmt.format(value, ctx)
    const expected = `${ctx.quotes}${value
      .split(ctx.quotes)
      .join(`\\${ctx.quotes}`)}${ctx.quotes}`
    expect(result).toBe(expected)
  })

  it('escapes single quotes when using single quotes', () => {
    const fmt = new StringFormatter()
    const ctx = makeCtx({ quotes: "'" })
    const value = "a 'quote' b"
    const result = fmt.format(value, ctx)
    const expected = `${ctx.quotes}${value
      .split(ctx.quotes)
      .join(`\\${ctx.quotes}`)}${ctx.quotes}`
    expect(result).toBe(expected)
  })

  it('does not escape when quotes are disabled', () => {
    const fmt = new StringFormatter()
    const ctx = makeCtx({ quotes: '' })
    const value = 'a "quote" b'
    const result = fmt.format(value, ctx)
    expect(result).toBe(value)
  })
})
