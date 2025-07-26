import { createDateFormatter } from '@logpot/utils'
import { isString } from '@logpot/utils'

import { toColorizer } from '../consoleColor'
import { PrintContext } from '../printContext'
import { Printer } from '../printer'
import { getText } from './getText'

// A common interface for all formatters.
export interface IFormatter {
  canFormat(value: unknown, ctx: PrintContext): boolean
  format(value: unknown, ctx: PrintContext, printer: Printer): string
}

// Formatter for primitive types (number, boolean, string, symbol, function, date).
export abstract class PrimitiveFormatter implements IFormatter {
  abstract canFormat(value: unknown): boolean
  abstract format(value: unknown, ctx: PrintContext): string
}

export class NumberFormatter extends PrimitiveFormatter {
  canFormat(value: unknown) {
    return typeof value === 'number'
  }
  format(value: unknown, ctx: PrintContext) {
    return getText(ctx, toColorizer(ctx.colorConfig.number)(String(value)))
  }
}

export class BooleanFormatter extends PrimitiveFormatter {
  canFormat(value: unknown) {
    return typeof value === 'boolean'
  }
  format(value: unknown, ctx: PrintContext) {
    return getText(ctx, toColorizer(ctx.colorConfig.boolean)(String(value)))
  }
}

export class StringFormatter extends PrimitiveFormatter {
  canFormat(value: unknown) {
    return isString(value)
  }
  format(value: unknown, ctx: PrintContext) {
    return getText(
      ctx,
      toColorizer(ctx.colorConfig.string)(`${ctx.quotes}${value}${ctx.quotes}`)
    )
  }
}

export class SymbolFormatter extends PrimitiveFormatter {
  canFormat(value: unknown) {
    return typeof value === 'symbol'
  }
  format(value: unknown, ctx: PrintContext) {
    return getText(ctx, toColorizer(ctx.colorConfig.symbol)(String(value)))
  }
}

export class FunctionFormatter extends PrimitiveFormatter {
  canFormat(value: unknown) {
    return typeof value === 'function'
  }
  format(value: unknown, ctx: PrintContext) {
    const fn = value as () => void
    const name = fn.name ? `: ${fn.name}` : ''
    return getText(
      ctx,
      toColorizer(ctx.colorConfig.function)(`[Function${name}]`)
    )
  }
}

/**
 * Configuration options for formatting `Date` objects.
 *
 * @example
 * ```ts
 * // 1. ISO format
 * const cfgIso: DateFormatterConfig = { method: 'ISO' };
 * console.log(cfgIso.method); // "ISO"
 * ```
 *
 * @example
 * ```ts
 * // 2. Epoch timestamp
 * const cfgEpoch: DateFormatterConfig = { method: 'epoch' };
 * console.log(cfgEpoch.method); // "epoch"
 * ```
 *
 * @example
 * ```ts
 * // 3. Custom locale formatting: verbose French date
 * const cfgCustom: DateFormatterConfig = {
 *   method: 'custom',
 *   locales: 'fr-FR',
 *   options: { year: 'numeric', month: 'long', day: 'numeric' }
 * };
 * const formatter = createDateFormatter(cfgCustom.locales, cfgCustom.options);
 * console.log(formatter.format(new Date())); // e.g., "26 juillet 2025"
 * ```
 */
export interface DateFormatterConfig {
  /**
   *  The formatting method to apply:
   *   - `'ISO'`   → Returns the result of `date.toISOString()`.
   *   - `'epoch'` → Returns the numeric timestamp (milliseconds since Unix epoch).
   *   - `'custom'`→ Uses `Intl.DateTimeFormat` with the specified `locales` and `options`.
   */
  method: 'ISO' | 'epoch' | 'custom'
  /**
   * BCP 47 language tag(s) for locale-sensitive formatting when `method` is `'custom'`.
   * Defaults to the host environment’s locale.
   */
  locales?: string | string[]
  /**
   *   Formatting options (e.g., `year`, `month`, `day`, `hour`, etc.) for `Intl.DateTimeFormat`
   *   when `method === 'custom'`.
   *   @see https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat#parameters
   */
  options?: Intl.DateTimeFormatOptions
}

export class DateFormatter extends PrimitiveFormatter {
  readonly dateFormat: Intl.DateTimeFormat
  readonly method: 'ISO' | 'epoch' | 'custom'
  constructor(config?: Partial<DateFormatterConfig>) {
    super()
    const { locales, options, method = 'custom' } = config ?? {}
    this.method = method
    this.dateFormat = createDateFormatter(locales, options)
  }
  canFormat(value: unknown) {
    return value instanceof Date
  }
  format(value: unknown, ctx: PrintContext) {
    const date = value as Date
    let str = ''
    const colorizer = toColorizer(ctx.colorConfig.date)
    switch (this.method) {
      case 'custom':
        str = this.dateFormat.format(date)
        break
      case 'ISO':
        str = date.toISOString()
        break
      case 'epoch':
        return colorizer(date.getTime().toString())
    }
    return getText(ctx, colorizer(`${ctx.quotes}${str}${ctx.quotes}`))
  }
}

// Formatter for detected circular references.
export class CircularFormatter implements IFormatter {
  canFormat(value: unknown, ctx: PrintContext) {
    return typeof value === 'object' && value !== null && ctx.seen.has(value)
  }
  format(_: unknown, ctx: PrintContext) {
    return getText(ctx, toColorizer(ctx.colorConfig.circular)('[Circular]'))
  }
}

// Formatter for null.
export class NullFormatter implements IFormatter {
  canFormat(value: unknown) {
    return value === null
  }
  format(_: unknown, ctx: PrintContext) {
    return getText(ctx, toColorizer(ctx.colorConfig.null)('null'))
  }
}

// Formatter for undefined.
export class UndefinedFormatter implements IFormatter {
  canFormat(value: unknown) {
    return value === undefined
  }
  format(_: unknown, ctx: PrintContext) {
    return getText(ctx, toColorizer(ctx.colorConfig.undefined)('undefined'))
  }
}
