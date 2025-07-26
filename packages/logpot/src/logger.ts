import { DEFAULT_LEVELS, LevelName, LevelNumber } from './levels'
import { LogMeta } from './log'

/**
 * Core logging interface defining methods to emit log entries,
 * create scoped or typed child loggers, and manage logger lifecycle.
 *
 * @typeParam Meta   - The shape of metadata attached to each log.
 * @typeParam Levels - Mapping of level names to numeric priorities.
 */
export interface ILogger<
  Meta extends LogMeta = LogMeta,
  Levels extends Record<string, number> = DEFAULT_LEVELS
> {
  /**
   * Emit a log entry.
   *
   * @param level - The log severity, by name or numeric value.
   * @param msg   - The message text, metadata object, or Error to log.
   * @param meta  - Optional metadata or Error object.
   */
  log(
    level: LevelName<Levels> | LevelNumber<Levels>,
    msg: string | Meta | Error,
    meta?: Meta | Error
  ): void

  /**
   * Create a compile-time-refined version of this logger that
   * expects additional metadata properties.
   *
   * Note: This does not add any runtime context-only refines types.
   */
  withMeta<Extra extends LogMeta>(): Logger<Meta & Extra, Levels>

  /**
   * Create a child logger that will automatically include
   * the given context object in every log’s metadata.
   *
   * @param context - Static metadata to merge into each log entry.
   */
  child<Ctx extends LogMeta>(context: Ctx): Logger<Meta, Levels>

  /**
   * Create a child logger scoped to a specific category.
   * Internally attaches `{ category }` to each log’s metadata.
   *
   * @param category - Arbitrary string to classify log entries.
   */
  withCategory<C extends string>(category: C): Logger<Meta, Levels>

  /**
   * Flush any buffered logs through all transports.
   *
   * @returns Resolves once all outstanding logs have been processed.
   */
  flush(): Promise<void>

  /**
   * Gracefully close the logger:
   * flush pending logs, terminate workers, and release resources.
   *
   * @returns Resolves when shutdown is complete.
   */
  close(): Promise<void>
}

/**
 * Combined logger interface with both generic ILogger methods and
 * level-specific convenience methods (e.g., .info(), .error()).
 *
 * The level methods are named by lowering the level names (TRACE → .trace):
 * - Overload 1: (meta: Meta | Error) ⇒ void
 * - Overload 2: (msg: string, meta?: Meta | Error) ⇒ void
 *
 * @typeParam Meta   - Metadata shape for each log entry.
 * @typeParam Levels - Mapping of level names to numeric priorities.
 */
export type Logger<
  Meta extends LogMeta = LogMeta,
  Levels extends Record<string, number> = DEFAULT_LEVELS
> = ILogger<Meta, Levels> & {
  [K in keyof Levels as Lowercase<string & K>]: ((meta: Meta | Error) => void) &
    ((msg: string, meta?: Meta | Error) => void)
}
