/**
 * Represents the valid log level names for a given Levels map.
 * Constrained to the string keys of the Levels record.
 *
 * @typeParam Levels - Mapping of level names to numeric priorities.
 */
export type LevelName<Levels extends Record<string, number> = DEFAULT_LEVELS> =
  keyof Levels & string

/**
 * Represents the numeric value associated with a log level name.
 *
 * @typeParam Levels - Mapping of level names to numeric priorities.
 */
export type LevelNumber<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> = Levels[LevelName<Levels>]

export function defineLevels<
  Levels extends Record<string, number> = DEFAULT_LEVELS
>(levels: Levels): LevelDefinition<Levels> {
  const levelNames = new Map<number, string>()
  for (const name of Object.keys(levels)) {
    levelNames.set(levels[name], name)
  }

  function getLevelName(levelNumber: LevelNumber<Levels>): LevelName<Levels> {
    const levelName = levelNames.get(levelNumber)
    if (!levelName) throw new Error('Incorrect level number:' + levelNumber)
    return levelName as string
  }

  function getLevelNumber(levelName: LevelName<Levels>): LevelNumber<Levels> {
    const levelNumber = levels[levelName]
    if (levelNumber == null)
      throw new Error('Incorrect level name:' + String(levelName))
    return levelNumber
  }

  function hasLevel(levelNumber: LevelNumber<Levels>) {
    return levelNames.has(levelNumber)
  }

  return {
    levels,
    getLevelName,
    getLevelNumber,
    hasLevel,
  } as const
}

/**
 * Default set of log levels and their numeric priorities.
 * - TRACE: 10
 * - DEBUG: 20
 * - INFO:  30
 * - WARN:  40
 * - ERROR: 50
 * - FATAL: 60
 */
export type DEFAULT_LEVELS = {
  TRACE: 10
  DEBUG: 20
  INFO: 30
  WARN: 40
  ERROR: 50
  FATAL: 60
}

/**
 * Standard definition of the built-in log levels:
 *
 * TRACE → 10
 *
 * DEBUG → 20
 *
 * INFO → 30
 *
 * WARN → 40
 *
 * ERROR → 50
 *
 * FATAL → 60
 *
 * Provides helper methods to convert between names and numbers.
 */
export const STD_LEVEL_DEF = defineLevels({
  TRACE: 10,
  DEBUG: 20,
  INFO: 30,
  WARN: 40,
  ERROR: 50,
  FATAL: 60,
} as const)

/**
 * Encapsulates a mapping between log level names and numeric priorities,
 * along with utility functions to interrogate and convert them.
 *
 * @typeParam Levels - A record type mapping level names (keys) to numeric values.
 *
 * Properties:
 * - `levels`: The raw name→number map.
 * - `getLevelName(levelNumber)`: Look up the name given its numeric value.
 * - `getLevelNumber(levelName)`: Look up the numeric value given its name.
 * - `hasLevel(levelNumber)`: Check if a numeric value corresponds to a defined level.
 */
export type LevelDefinition<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> = {
  readonly levels: Levels
  readonly getLevelName: (levelNumber: LevelNumber<Levels>) => LevelName<Levels>
  readonly getLevelNumber: (levelName: LevelName<Levels>) => LevelNumber<Levels>
  readonly hasLevel: (levelNumber: LevelNumber<Levels>) => boolean
}
