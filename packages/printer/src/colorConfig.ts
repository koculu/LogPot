import { ColorOrColorizer, toColorizer } from './consoleColor'

/**
 * Configuration for ANSI color and style mappings used by the Printer.
 *
 * Each property maps to a `ColorOrColorizer`, which can be a style string
 * or a `Colorizer` function that wraps text in ANSI escape codes.
 *
 * @see https://tenray.io/logpot/formatting#available-ansi-style-tokens
 */
export interface ColorConfig extends Record<string, ColorOrColorizer> {
  /** Color for `null` values. */
  null: ColorOrColorizer
  /** Color for `undefined` values. */
  undefined: ColorOrColorizer
  /** Color for numbers. */
  number: ColorOrColorizer
  /** Color for booleans. */
  boolean: ColorOrColorizer
  /** Color for strings. */
  string: ColorOrColorizer
  /** Color for symbols. */
  symbol: ColorOrColorizer
  /** Color for function representations. */
  function: ColorOrColorizer
  /** Color for Date objects. */
  date: ColorOrColorizer
  /** Color for object keys. */
  key: ColorOrColorizer
  /** Color for circular reference indicators. */
  circular: ColorOrColorizer
  /** Default color for values not matched by other keys. */
  default: ColorOrColorizer
  /** Color for colon separators. */
  colon: ColorOrColorizer
  /** Color for comma separators. */
  comma: ColorOrColorizer
  /** Color for bracket characters (`[`, `]`, `{`, `}`). */
  bracket: ColorOrColorizer
  /** Color for custom or unclassified text. */
  custom: ColorOrColorizer
}

/**
 * Convert a user-supplied color configuration into a set of ready-to-use
 * colorizer functions, so the printer can apply colors without
 * having to re-check types or re-parse strings every time.
 *
 * - If you pass strings like `"red bold"`, they’re parsed once into functions.
 * - If you pass functions directly, they’re used as-is.
 * - Keys without a value are skipped.
 *
 * @param colorConfig - An object whose values are either style strings (e.g. `"cyan underline"`)
 *   or existing Colorizer functions.
 * @returns
 *   A new object where each key maps to a Colorizer function, or `undefined`
 *   if no config was provided.
 *
 * @example
 * ```ts
 * // User gives style strings and a function
 * const userSpec = {
 *   error: 'red bold',
 *   info: 'green',
 * };
 *
 * // normalize() turns both into functions:
 * const norm = normalize(userSpec);
 * console.log(typeof norm.error); // "function"
 * console.log(typeof norm.info);  // "function"
 *
 * // Printer can now do:
 * console.log(norm.error('Oops!')); // bold red text
 * ```
 */
export function normalize(colorConfig?: Partial<ColorConfig>) {
  if (!colorConfig) return
  return Object.keys(colorConfig).reduce((acc, key) => {
    if (colorConfig[key]) acc[key] = toColorizer(colorConfig[key])
    return acc
  }, {} as Partial<ColorConfig>)
}

const none = (s: string) => s

export const colorlessConfig: ColorConfig = {
  null: none,
  undefined: none,
  number: none,
  boolean: none,
  string: none,
  symbol: none,
  function: none,
  date: none,
  key: none,
  circular: none,
  colon: none,
  comma: none,
  bracket: none,
  default: none,
  custom: none,
}
