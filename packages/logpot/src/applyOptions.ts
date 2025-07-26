import { ColorOrColorizer, toColorizer } from '@logpot/printer'
import { centerText } from '@logpot/utils'
import { createParser } from '@logpot/utils'
import { truncate } from '@logpot/utils'

import { DEFAULT_LEVELS, LevelName } from './levels'
import { RequiredConsoleTheme } from './transports/consoleTheme'

const nextNumber = (token: string) => {
  const n = Number(token)
  return Number.isNaN(n) ? undefined : n
}

const optParser = createParser({
  padstart: {
    next: nextNumber,
    default: 20,
  },
  padend: {
    next: nextNumber,
    default: 20,
  },
  center: {
    next: nextNumber,
    default: 20,
  },
  max: {
    next: nextNumber,
    default: 20,
  },
  theme: {
    next: (token: string) => {
      return token
    },
  },
  lower: {},
  upper: {},
  lowerl: {},
  upperl: {},
})

export function applyOptions<
  Levels extends Record<string, number> = DEFAULT_LEVELS
>(
  value: unknown,
  opts: string,
  fallback: ColorOrColorizer,
  theme: RequiredConsoleTheme<Levels>[LevelName<Levels>]
) {
  let str = String(value)
  if (opts) {
    const parsed = optParser(opts)
    type Parsed = typeof parsed
    for (const [key, value] of Object.entries(parsed) as Array<
      [keyof Parsed, Parsed[keyof Parsed]]
    >) {
      switch (key) {
        case 'padend':
          str = str.padEnd(value as number)
          break
        case 'padstart':
          str = str.padStart(value as number)
          break
        case 'center':
          str = centerText(str, value as number)
          break
        case 'max':
          str = truncate(str, value as number)
          break
        case 'theme':
          {
            const themeColor = theme[String(value)]
            if (themeColor) str = toColorizer(themeColor)(str)
          }
          break
        case 'lower':
          str = str.toLowerCase()
          break
        case 'lowerl':
          str = str.toLocaleLowerCase()
          break
        case 'upper':
          str = toUpperExceptAnsiCode(str)
          break
        case 'upperl':
          str = toUpperExceptAnsiCode(str, true)
          break
      }
    }
    opts = parsed.rest
  }
  return toColorizer(opts || fallback)(str)
}

/**
 * Upper-cases the text in `input` but preserves any ANSI color escape sequences.
 */
function toUpperExceptAnsiCode(input: string, locale = false): string {
  // Matches ANSI CSI sequences like "\x1b[31m" or "\u001b[1;32m"
  // eslint-disable-next-line no-control-regex
  const ansiSeq = /\x1b\[[0-9;]*m/
  // Split on ANSI sequences (keeping them in the result array via the capturing parens)
  // eslint-disable-next-line no-control-regex
  const parts = input.split(/(\x1b\[[0-9;]*m)/)
  if (locale)
    return parts
      .map((part) => (ansiSeq.test(part) ? part : part.toLocaleUpperCase()))
      .join('')
  return parts
    .map((part) => (ansiSeq.test(part) ? part : part.toUpperCase()))
    .join('')
}
