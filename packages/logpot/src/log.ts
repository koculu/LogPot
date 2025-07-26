import { DEFAULT_LEVELS, LevelNumber } from './levels'

/**
 * Arbitrary metadata object attached to log entries.
 * Can include any application-specific key/value pairs.
 */
export type LogMeta = Record<string, unknown>

/**
 * Represents a single log event.
 *
 * @typeParam Levels - Mapping of level names to numeric priorities.
 */
export interface Log<Levels extends Record<string, number> = DEFAULT_LEVELS>
  extends Record<string, unknown> {
  /** The resolved message string for this log. */
  msg: string
  /** Numeric severity of the log (e.g., 30 for INFO). */
  level: LevelNumber<Levels>
  /** Millisecond-precision epoch timestamp when the log was created. */
  time: number
  /** Optional metadata or serialized Error attached to this log entry. */
  meta?: LogMeta | Error
}
