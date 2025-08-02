import { merge } from '@logpot/utils'

import { colorlessConfig } from './colorConfig'
import { defaultPrinter } from './defaultPrinter'
import { PrintContext } from './printContext'
import { Printer } from './printer'
import { PrintOptions } from './printOptions'

/**
 * Formats any JavaScript value into a human-readable string.
 *
 * @param value - The value to format and print.
 * @param options - Optional configuration for depth, indentation, colors, and quotes.
 * @param printer - A custom Printer implementation; falls back to defaultPrinter if not provided.
 * @returns A formatted string representation of the input value.
 */
export function print(
  value: unknown,
  options?: PrintOptions,
  printer?: Printer
): string {
  const mergedColors = merge(colorlessConfig, options?.colorConfig)
  printer = printer ?? defaultPrinter
  const indentString = options?.indentString ?? '  '
  const ctx: PrintContext = {
    seen: new WeakSet(),
    indent: '',
    maxIndent: (options?.maxDepth ?? 5) * indentString.length,
    indentString,
    colorConfig: mergedColors,
    quotes: options?.quotes ?? '"',
    keys: [],
    prefix: '',
  }
  return printer.print(value, ctx)
}
