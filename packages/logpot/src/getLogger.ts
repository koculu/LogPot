import { DEFAULT_LEVELS } from './levels'
import { LogMeta } from './log'
import { ILogger, Logger } from './logger'

const DEFAULT: {
  logger?: Logger
} = {}

/**
 * Check whether a global logger instance has already been initialized.
 *
 * @returns `true` if a logger is set; otherwise `false`.
 */
export function hasLogger() {
  return !!DEFAULT.logger
}

/**
 * Retrieve the global logger instance, optionally namespaced by category.
 *
 * @typeParam Meta  - The metadata type for log entries.
 * @typeParam Levels - The custom log levels mapping.
 * @param category - If provided, returns a child logger scoped to this category. Otherwise, returns the root logger.
 * @throws Error if no logger has been initialized.
 * @returns A `Logger<Meta, Levels>` ready to emit logs.
 */
export function getLogger<
  Meta extends LogMeta = LogMeta,
  Levels extends Record<string, number> = DEFAULT_LEVELS
>(category: string = ''): Logger<Meta, Levels> {
  if (!DEFAULT.logger)
    throw new Error(
      'Logger is not initialized. Call setLogger(yourLogger) or disableLogger().'
    )
  const logger = DEFAULT.logger
  if (category) return logger.withCategory(category) as Logger<Meta, Levels>
  return logger as Logger<Meta, Levels>
}

/**
 * Install or replace the global logger instance.
 *
 * @typeParam Meta  - The metadata type for log entries.
 * @typeParam Levels - The custom log levels mapping.
 * @param logger - An object implementing the `Logger` or `ILogger` interface.
 * @param force  - If `false`, prevents reinitialization when a logger already exists. If `true`, will override any existing logger.
 * @throws Error if a logger is already set and `force` is not `true`.
 */
export function setLogger<
  Meta extends LogMeta = LogMeta,
  Levels extends Record<string, number> = DEFAULT_LEVELS
>(
  logger: Logger<Meta, Levels> | ILogger<Meta, Levels>,
  force: boolean = false
) {
  if (!force && !!DEFAULT.logger)
    throw new Error(
      'Can not initialize the logger more than once unless you call setLogger with force = true'
    )
  DEFAULT.logger = logger as Logger
}

/**
 * Disable all logging by installing a no-op logger proxy.
 *
 * @param force - If `false`, prevents disabling when a logger already exists.
 *                If `true`, will override any existing logger.
 *
 * After calling, all logger methods (e.g., `.info()`, `.error()`, `.flush()`)
 * become harmless no-ops.
 */
export function disableLogger(force = false) {
  const noOp = () => {}

  const promiseFn = async () => {}

  const handler: ProxyHandler<object> = {
    get(_, prop: string) {
      switch (prop) {
        case 'flush':
          return promiseFn
        case 'close':
          return promiseFn

        case 'child':
        case 'withMeta':
        case 'withCategory':
          return () => proxy

        default:
          return noOp
      }
    },
  }

  const proxy = new Proxy({}, handler) as Logger

  setLogger(proxy, force)
}
