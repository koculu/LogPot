import { isEmptyPlainObject, isPlainObject } from '@logpot/utils'

import { toColorizer } from '../consoleColor'
import { PrintContext } from '../printContext'
import { Printer } from '../printer'
import { IFormatter } from './formatter'
import { getText } from './getText'
import { ObjectFormatterConfig } from './objectFormatterConfig'

/**
 * Formats plain JavaScript objects into colored, indented strings.
 */
export class ObjectFormatter implements IFormatter {
  private readonly config: ObjectFormatterConfig

  /**
   * @param config - Partial overrides of default formatting options.
   */
  constructor(config: Partial<ObjectFormatterConfig> = {}) {
    this.config = { ...DEFAULTS, ...config }
  }

  get showBrackets() {
    return this.config.showBrackets
  }

  public canFormat(value: unknown): boolean {
    return isPlainObject(value)
  }

  public format(value: unknown, ctx: PrintContext, printer: Printer): string {
    if (ctx.indent.length >= ctx.maxIndent) {
      return getText(ctx, toColorizer(ctx.colorConfig.bracket)('[Object]'))
    }
    const showBrackets = this.showBrackets
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj)
    if (keys.length === 0) {
      return this.emptyBraces(ctx)
    }
    const ordered = this.config.sortKeys(keys, obj)
    const displayed = ordered.slice(0, this.config.maxEntries)
    const baseIndent = ctx.indent
    if (showBrackets) {
      ctx.indent += ctx.indentString
    }
    const orgPrefix = ctx.prefix
    const orgIndent = ctx.indent
    ctx.indent += ' '.repeat(orgPrefix.length)
    ctx.prefix = ''
    const entries = displayed.map((k) => {
      ctx.keys.push(k)
      const entry = getText(ctx, this.formatEntry(k, obj[k], ctx, printer))
      ctx.keys.pop()
      return entry
    })

    const remaining = ordered.length - displayed.length
    if (remaining > 0) {
      entries.push(getText(ctx, this.truncationComment(remaining)))
    }

    const rows = entries.join(this.entrySeparator(ctx))
    ctx.prefix = orgPrefix
    const indentLen = ctx.indent.length
    if (showBrackets) {
      ctx.indent = baseIndent
      return this.wrapWithBraces(rows, ctx)
    }
    ctx.indent = orgIndent
    return getText(ctx, rows.substring(indentLen))
  }

  private emptyBraces(ctx: PrintContext): string {
    return this.config.showBrackets
      ? getText(ctx, toColorizer(ctx.colorConfig.bracket)('{}'))
      : ''
  }

  private formatEntry(
    key: string,
    value: unknown,
    ctx: PrintContext,
    printer: Printer
  ): string {
    const coloredKey = toColorizer(ctx.colorConfig.key)(
      `${ctx.quotes}${key}${ctx.quotes}`
    )

    let indent = ctx.indent
    if (!this.config.showBrackets && isPlainObject(value))
      indent += ctx.indentString
    const objValueCtx = {
      ...ctx,
      indent,
      prefix: '',
    }
    const objValue = printer.print(value, objValueCtx)
    const newLineAfterKey =
      this.config.showBrackets ||
      !isPlainObject(value) ||
      isEmptyPlainObject(value) ||
      ctx.maxIndent <= ctx.indent.length + ctx.indentString.length
        ? ' '
        : '\n' + getText(objValueCtx, '')
    const unindentObjValue = objValue.substring(indent.length)
    return `${coloredKey}${toColorizer(ctx.colorConfig.colon)(
      ':'
    )}${newLineAfterKey}${unindentObjValue}`
  }

  private truncationComment(remaining: number): string {
    return `... and ${remaining} more entries`
  }

  private entrySeparator(ctx: PrintContext): string {
    return this.config.showCommas
      ? `${toColorizer(ctx.colorConfig.comma)(',')}\n`
      : '\n'
  }

  private wrapWithBraces(content: string, ctx: PrintContext): string {
    const open = getText(ctx, toColorizer(ctx.colorConfig.bracket)('{'))
    const prefixLen = ctx.prefix.length
    ctx.prefix = ''
    ctx.indent = ctx.indent + ' '.repeat(prefixLen)
    const close = getText(ctx, toColorizer(ctx.colorConfig.bracket)('}'))
    return [open, content, close].join('\n')
  }
}

const DEFAULTS: ObjectFormatterConfig = {
  showBrackets: true,
  showCommas: true,
  sortKeys: (keys) => keys,
  maxEntries: 100,
}
