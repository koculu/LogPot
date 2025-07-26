import { isNumberOrBoolean, isString } from '@logpot/utils'

import { Colorizer, toColorizer } from '../consoleColor'
import { PrintContext } from '../printContext'
import { Printer } from '../printer'
import { ArrayFormatterConfig } from './arrayFormatterConfig'
import { IFormatter } from './formatter'
import { getText } from './getText'

/** @internal */
class StringWriter {
  private buffer = ''
  write(chunk: string) {
    this.buffer += chunk
  }
  toString() {
    return this.buffer
  }
}

/**
 * Formats JavaScript arrays to either inline or multiline strings.
 */
export class ArrayFormatter implements IFormatter {
  readonly config: ArrayFormatterConfig

  constructor(config: Partial<ArrayFormatterConfig> = {}) {
    this.config = { ...DEFAULTS, ...config }
  }

  canFormat(value: unknown): boolean {
    return Array.isArray(value)
  }

  format(value: unknown, ctx: PrintContext, printer: Printer): string {
    if (!Array.isArray(value)) return ''
    if (this.isEmpty(value)) return this.formatEmpty(ctx)
    if (this.isClipped(ctx)) return this.formatClipped(ctx)
    return this.shouldInline(value, ctx, printer)
      ? this.formatInline(value, ctx, printer)
      : this.formatMultiline(value, ctx, printer)
  }

  private isEmpty(arr: unknown[]): boolean {
    return arr.length === 0
  }

  private isClipped(ctx: PrintContext): boolean {
    return ctx.indent.length >= ctx.maxIndent
  }

  private formatEmpty(ctx: PrintContext): string {
    const { open, close } = this.config.delimiters
    return getText(ctx, toColorizer(ctx.colorConfig.bracket)(open + close))
  }

  private formatClipped(ctx: PrintContext): string {
    const { open, close } = this.config.delimiters
    return getText(
      ctx,
      toColorizer(ctx.colorConfig.bracket)(open + '…' + close)
    )
  }

  private shouldInline(
    arr: unknown[],
    ctx: PrintContext,
    printer: Printer
  ): boolean {
    if (this.config.shouldInline(arr)) return true
    if (this.config.maxInlineLength <= 0) return false
    if (arr.length > this.config.maxInlineItems) return false
    return this.withinInlineLength(arr, ctx, printer)
  }

  private withinInlineLength(
    arr: unknown[],
    ctx: PrintContext,
    printer: Printer
  ): boolean {
    const {
      maxInlineLength,
      separatorInline: separator,
      delimiters,
      prefix,
    } = this.config
    let len = delimiters.open.length + delimiters.close.length
    for (const item of arr) {
      if (item && !isNumberOrBoolean(item) && !isString(item)) return false
      const str = prefix + printer.print(item, ctx)
      len += visibleLength(str) + separator.length
      if (len > maxInlineLength) return false
    }
    return true
  }

  private formatInline(
    arr: unknown[],
    ctx: PrintContext,
    printer: Printer
  ): string {
    const { open, close } = this.config.delimiters
    const prefix = this.config.prefix
    const indentLen = ctx.indent.length
    const items = arr.map((v) =>
      printer.print(v, { ...ctx, prefix }).substring(indentLen)
    )
    const joined = items.join(
      toColorizer(ctx.colorConfig.comma)(this.config.separatorInline)
    )
    return getText(
      ctx,
      toColorizer(ctx.colorConfig.bracket)(open) +
        joined +
        toColorizer(ctx.colorConfig.bracket)(close)
    )
  }

  private formatMultiline(
    arr: unknown[],
    ctx: PrintContext,
    printer: Printer
  ): string {
    const w = this.getWriter()
    const {
      delimiters: { open, close },
      maxItems,
      trailingComma,
      separator,
      prefix,
      overflowMessage,
    } = this.config
    const bracket = toColorizer(ctx.colorConfig.bracket)
    const comma = ctx.colorConfig.comma

    w.write(bracket(open) + '\n')
    const indentString = ctx.indentString
    const limit = Math.min(arr.length, maxItems)
    for (let i = 0; i < limit; i++) {
      if (!(i in arr)) {
        w.write(getText(ctx, this.config.sparseArrayEmptyElement))
      } else {
        w.write(
          printer.print(arr[i], {
            ...ctx,
            indent: ctx.indent + indentString,
            prefix,
          })
        )
      }
      w.write(
        this.buildSuffix(
          i,
          arr.length,
          limit,
          separator.trim() + '\n',
          toColorizer(comma),
          trailingComma,
          overflowMessage,
          {
            ...ctx,
            indent: ctx.indent + indentString,
            prefix,
          }
        )
      )
    }
    if (close.length > 0) w.write(getText(ctx, bracket(close)))
    return getText(ctx, w.toString())
  }

  private buildSuffix(
    idx: number,
    total: number,
    limit: number,
    lineSep: string,
    comma: Colorizer,
    trailing: boolean,
    overflowMessage: (length: number, remaining: number) => string,
    ctx: PrintContext
  ): string {
    const hideBrackets = this.config.delimiters.open.length === 0
    const newLine = hideBrackets ? '' : '\n'
    const last = idx === limit - 1
    if (!last) return comma(lineSep)
    if (total > limit)
      return (
        comma(lineSep) +
        getText(ctx, overflowMessage(total, total - limit)) +
        newLine
      )
    return trailing ? comma(lineSep) : newLine
  }

  private getWriter(): StringWriter {
    return new StringWriter()
  }
}

/**
 * Count the “visible” length of a string by removing ANSI escape codes first.
 */
function visibleLength(str: string): number {
  // Matches CSI (Control Sequence Introducer) sequences like "\x1b[31m" or "\x1b[1;32m"
  // eslint-disable-next-line no-control-regex
  const ansiPattern = /\x1b\[[0-9;]*m/g
  const clean = str.replace(ansiPattern, '')
  return clean.length
}

const DEFAULTS: ArrayFormatterConfig = {
  maxInlineLength: 40,
  maxInlineItems: 10,
  maxItems: 100,
  trailingComma: false,
  overflowMessage: (_length, remaining) => `...${remaining} more`,
  delimiters: { open: '[', close: ']' },
  separatorInline: ', ',
  separator: ',',
  prefix: '',
  sparseArrayEmptyElement: '<empty>',
  shouldInline: () => false,
}
