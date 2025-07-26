import { isString } from '@logpot/utils'
import * as tty from 'tty'

const {
  env = {},
  argv = [],
  platform = '',
} = typeof process === 'undefined' ? {} : process

const isDisabled = 'NO_COLOR' in env || argv.includes('--no-color')
const isForced = 'FORCE_COLOR' in env || argv.includes('--color')
const isWindows = platform === 'win32'
const isDumbTerminal = env.TERM === 'dumb'

const isCompatibleTerminal =
  tty && tty.isatty && tty.isatty(1) && env.TERM && !isDumbTerminal

const isCI =
  'CI' in env &&
  ('GITHUB_ACTIONS' in env || 'GITLAB_CI' in env || 'CIRCLECI' in env)

export const isColorSupported =
  !isDisabled &&
  (isForced || (isWindows && !isDumbTerminal) || isCompatibleTerminal || isCI)

/**
 * Function that applies styling or transformation to console text.
 *
 * @param text - The input string to colorize.
 * @returns The styled string, typically including ANSI escape codes.
 */

export type Colorizer = (text: string) => string

/**
 * A value that can specify how to colorize console text.
 *
 * - As a `string`: one or more space-separated style tokens:
 *
 *   - Text modifiers: “bold”, “underline”, “italic”, “dim”, “inverse”, “blink”, “strikethrough”, etc.
 *
 *   - Foreground colors: “red”, “greenbright”, “gray”, etc.
 *
 *   - Background colors: “bgblue”, “bg#00ff00”, “bgff0000”, etc.
 *
 *   - Hex codes: “#rrggbb” (e.g. “#ff00ff”) for true-color support.
 *
 *   - Chains of these can be combined: `"bold underline red bg#222"`.
 *
 * - As a `Colorizer` function: a custom text-transformer that wraps or styles its input.
 *
 * @see https://tenray.io/logpot/formatting#available-ansi-style-tokens
 */
export type ColorOrColorizer = string | Colorizer

function wrapAnsi(open: string, close: string, replace?: string): Colorizer {
  if (!isColorSupported) return (text) => text
  const openCode = `\x1b[${open}m`
  const closeCode = `\x1b[${close}m`
  const replaceCode = replace || openCode

  return (text: string) => {
    if (!text) return text
    const idx = text.indexOf(closeCode, openCode.length + 1)
    const safe =
      idx < 0
        ? openCode + text + closeCode
        : openCode + replaceClose(idx, text, closeCode, replaceCode) + closeCode
    return safe
  }
}

function replaceClose(
  index: number,
  string: string,
  close: string,
  replace: string
): string {
  const head = string.substring(0, index) + replace
  const tail = string.substring(index + close.length)
  const next = tail.indexOf(close)
  return head + (next < 0 ? tail : replaceClose(next, tail, close, replace))
}

// https://nodejs.org/docs/latest/api/util.html#modifiers
const styles: Record<string, Colorizer> = {
  reset: wrapAnsi('0', '0'),
  bold: wrapAnsi('1', '22', '\x1b[22m\x1b[1m'),
  dim: wrapAnsi('2', '22', '\x1b[22m\x1b[2m'),
  italic: wrapAnsi('3', '23'),
  underline: wrapAnsi('4', '24'),
  inverse: wrapAnsi('7', '27'),
  hidden: wrapAnsi('8', '28'),
  strikethrough: wrapAnsi('9', '29'),
  blink: wrapAnsi('5', '25'),
  doubleunderline: wrapAnsi('21', '24'),
  framed: wrapAnsi('51', '54'),
  overlined: wrapAnsi('53', '55'),
  faint: wrapAnsi('2', '22', '\x1b[22m\x1b[2m'), // alias for dim
  conceal: wrapAnsi('8', '28'), // alias for hidden
  crossedout: wrapAnsi('9', '29'), // alias for strikethrough
  swapcolors: wrapAnsi('7', '27'), // alias for inverse
}

// https://nodejs.org/docs/latest/api/util.html#foreground-colors
const fgColors: Record<string, Colorizer> = {
  black: wrapAnsi('30', '39'),
  red: wrapAnsi('31', '39'),
  green: wrapAnsi('32', '39'),
  yellow: wrapAnsi('33', '39'),
  blue: wrapAnsi('34', '39'),
  magenta: wrapAnsi('35', '39'),
  cyan: wrapAnsi('36', '39'),
  white: wrapAnsi('37', '39'),
  gray: wrapAnsi('90', '39'),
  grey: wrapAnsi('90', '39'), // alias for gray
  blackbright: wrapAnsi('90', '39'), // alias for gray
  redbright: wrapAnsi('91', '39'),
  greenbright: wrapAnsi('92', '39'),
  yellowbright: wrapAnsi('93', '39'),
  bluebright: wrapAnsi('94', '39'),
  magentabright: wrapAnsi('95', '39'),
  cyanbright: wrapAnsi('96', '39'),
  whitebright: wrapAnsi('97', '39'),
}

// https://nodejs.org/docs/latest/api/util.html#background-colors
const bgColors: Record<string, Colorizer> = {
  bgblack: wrapAnsi('40', '49'),
  bgred: wrapAnsi('41', '49'),
  bggreen: wrapAnsi('42', '49'),
  bgyellow: wrapAnsi('43', '49'),
  bgblue: wrapAnsi('44', '49'),
  bgmagenta: wrapAnsi('45', '49'),
  bgcyan: wrapAnsi('46', '49'),
  bgwhite: wrapAnsi('47', '49'),
  bggray: wrapAnsi('100', '49'),
  bggrey: wrapAnsi('100', '49'), // alias for bggray
  bgblackbright: wrapAnsi('100', '49'), // alias for bggray
  bgredbright: wrapAnsi('101', '49'),
  bggreenbright: wrapAnsi('102', '49'),
  bgyellowbright: wrapAnsi('103', '49'),
  bgbluebright: wrapAnsi('104', '49'),
  bgmagentabright: wrapAnsi('105', '49'),
  bgcyanbright: wrapAnsi('106', '49'),
  bgwhitebright: wrapAnsi('107', '49'),
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, '').toLowerCase()

  if (/^[0-9a-f]{3}$/.test(clean)) {
    // 3-digit shorthand: #abc → #aabbcc
    const [r, g, b] = clean.split('')
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)]
  }

  if (/^[0-9a-f]{6}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ]
  }

  throw new Error(`Invalid hex color: ${hex}`)
}

function rgb(r: number, g: number, b: number): Colorizer {
  return wrapAnsi(`38;2;${r};${g};${b}`, '39')
}

function bgRgb(r: number, g: number, b: number): Colorizer {
  return wrapAnsi(`48;2;${r};${g};${b}`, '49')
}

function hex(hex: string): Colorizer {
  const [r, g, b] = hexToRgb(hex)
  return rgb(r, g, b)
}

function bgHex(hex: string): Colorizer {
  const [r, g, b] = hexToRgb(hex)
  return bgRgb(r, g, b)
}

/**
 * Normalize any `ColorOrColorizer` into a `Colorizer` function.
 *
 * Behavior:
 * 1. If `input` is already a function, return it unchanged.
 * 2. If `input` is a non-empty string:
 *    - Trim and split by whitespace into tokens.
 *    - For each token:
 *      - If it matches a built-in `styles` modifier, use that ANSI wrapper. *
 *      - Else if it matches `fgColors`, apply the corresponding foreground ANSI code.
 *      - Else if it matches `bgColors`, apply the corresponding background ANSI code.
 *      - Else if it starts with “#” (3- or 6-digit hex), convert to RGB and wrap.
 *      - Else if it starts with “bg#”, treat as a background hex code.
 *      - Unknown tokens are ignored.
 *    - Compose all matched Colorizers in sequence.
 * 3. If no valid tokens are found (or string is empty), return an identity function.
 * 4. All wrappers no-op if `isColorSupported` is false (e.g. NO_COLOR or dumb terminal).
 *
 * @param input - A color/style specification string or a Colorizer function.
 * @returns A Colorizer that applies the requested ANSI styles to its input text.
 *  *
 * @example
 * // Simple named color
 * const red = toColorizer('red');
 * console.log(red('This text is red'));
 *
 * @example
 * // Multiple styles chained: bold, underline, yellow text on blue background
 * const fancy = toColorizer('bold underline yellow bgBlue');
 * console.log(fancy('Chained styles!'));
 *
 * @example
 * // Hex colors
 * const tealBg = toColorizer('bg#008080');
 * console.log(tealBg('Teal background'));
 *
 * @example
 * ```ts
 * // Passing through an existing Colorizer
 * const green = (str: string) => `\u001b[32m${str}\u001b[39m`;
 * const same = toColorizer(green);
 * console.log(same('Already green'));
 * ```
 */
export function toColorizer(input: ColorOrColorizer): Colorizer {
  if (!isString(input)) return input
  input = input.trim()
  if (input === '') return (val) => val

  // Space-separated style chaining: "bold underline red bg#222"
  const parts = input.split(/\s+/)
  const chain = parts
    .map((part) => {
      const lower = part.toLowerCase()
      if (lower in styles) return styles[lower]
      if (lower in fgColors) return fgColors[lower]
      if (lower in bgColors) return bgColors[lower]
      if (lower.startsWith('bg#')) return bgHex(lower.slice(3))
      if (lower.startsWith('#')) return hex(lower)
      return null
    })
    .filter((fn): fn is Colorizer => typeof fn === 'function')

  if (!chain.length) return (text) => text
  return (text: string) =>
    !text ? text : chain.reduce((out, fn) => fn(out), text)
}
