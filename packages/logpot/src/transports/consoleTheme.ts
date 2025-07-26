import { ColorConfig, normalize } from '@logpot/printer'
import { ColorOrColorizer, toColorizer } from '@logpot/printer'
import { merge } from '@logpot/utils'

import { DEFAULT_LEVELS, LevelName } from '../levels'

/**
 * Partial overrides to the base ColorConfig, specific to LogPot console output.
 * - msg: styling for the log message text.
 * - level: styling for the level label (e.g., 'INFO').
 * - time: styling for the timestamp.
 * - emoji: styling for the emoji prefix.
 */
export interface LogPotColorConfig extends Partial<ColorConfig> {
  msg?: ColorOrColorizer
  level?: ColorOrColorizer
  time?: ColorOrColorizer
  emoji?: ColorOrColorizer
}

/**
 * Represents the complete color theme for console logging.
 * Maps each level name (and '*' for defaults) to its LogPotColorConfig.
 *
 * @typeParam Levels - Custom log level definitions.
 */
export type ConsoleTheme<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> = Record<LevelName<Levels> | '*', LogPotColorConfig>

export type RequiredConsoleTheme<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> = Record<LevelName<Levels> | '*', Required<LogPotColorConfig>>

const STD_LEVEL_EMOJIS: Record<string, string> = {
  TRACE: '🔍',
  DEBUG: '🔧',
  INFO: 'ℹ️',
  WARN: '⚠️',
  ERROR: '🛑',
  FATAL: '💥',
} as const

const yellow = toColorizer('yellow')
const none = (s: string) => s
const time = toColorizer('#6fb8d6')
const trace = toColorizer('#7f7f7f')
const debug = toColorizer('#6e6e6e')
const debug2 = toColorizer('#898989')
const info = toColorizer('#349634')
const warn = toColorizer('#d4a017')
const error = toColorizer('#b34747')
const fatal = toColorizer('magenta')

const DEFAULTS: ConsoleTheme = {
  TRACE: {
    msg: trace,
    level: trace,
    bracket: trace,
    colon: trace,
    comma: trace,
    string: trace,
  },
  DEBUG: {
    msg: debug,
    level: debug,
    key: debug,
    string: debug2,
    bracket: debug,
    colon: debug,
    comma: debug,
  },
  INFO: {
    msg: info,
    level: info,
    string: info,
    bracket: info,
    colon: info,
    comma: info,
  },
  WARN: {
    msg: warn,
    level: warn,
    number: error,
    boolean: error,
    string: warn,
    bracket: warn,
    colon: warn,
    comma: warn,
  },
  ERROR: {
    msg: error,
    level: error,
    string: error,
    bracket: error,
    colon: error,
    comma: error,
  },
  FATAL: {
    msg: fatal,
    level: fatal,
    bracket: fatal,
    string: fatal,
    colon: fatal,
    comma: fatal,
  },
  '*': {
    time: time,
    msg: none,
    level: none,
    emoji: none,

    default: none,
    null: none,
    undefined: none,

    number: yellow,
    boolean: yellow,
    string: none,

    symbol: none,
    function: none,
    date: time,
    circular: none,
    key: none,
    colon: none,
    comma: none,
    bracket: none,
    custom: none,
  } satisfies Required<LogPotColorConfig>,
}

export function getLevelEmoji(level: string) {
  const name = STD_LEVEL_EMOJIS[level]
  if (!name) return '🟠'
  return name
}

export function getConsoleTheme<
  Levels extends Record<string, number> = DEFAULT_LEVELS
>(
  levels: Levels,
  theme?: Partial<ConsoleTheme<Levels>>
): RequiredConsoleTheme<Levels> {
  if (theme) {
    // do not modify original theme with flatten normalization
    theme = clone(theme)
    flatten(theme)
  }
  return Object.fromEntries(
    Object.entries(levels).map(([levelName]) => {
      const merged = merge(
        DEFAULTS['*' as LevelName],
        DEFAULTS[levelName as LevelName],
        theme?.['*' as LevelName],
        theme?.[levelName as LevelName]
      )
      return [levelName, merged]
    })
  ) as RequiredConsoleTheme<Levels>
}

function clone<Levels extends Record<string, number> = DEFAULT_LEVELS>(
  theme: Partial<ConsoleTheme<Levels>>
): Partial<ConsoleTheme<Levels>> {
  const result: Partial<ConsoleTheme<Levels>> = {}
  for (const [key, value] of Object.entries(theme)) {
    Object.assign(result, { [key]: { ...value } })
  }
  return result
}

function flatten(theme: Partial<ConsoleTheme>) {
  for (const key of Object.keys(theme) as Array<LevelName>) {
    const config = theme[key]
    if (!config) continue
    theme[key] = normalize(config)
  }
}
