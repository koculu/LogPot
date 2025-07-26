import { getOrMakeArray } from '@logpot/utils'
import { merge } from '@logpot/utils'
import { ErrorSerialization } from '@logpot/utils'

import { hasLogger, setLogger } from './getLogger'
import { DEFAULT_LEVELS, STD_LEVEL_DEF } from './levels'
import { Log, LogMeta } from './log'
import { Logger } from './logger'
import { LogPot } from './logPot'
import {
  ConsoleTransport,
  ConsoleTransportOptions,
} from './transports/consoleTransport'
import { FileTransport, FileTransportOptions } from './transports/fileTransport'
import { HttpTransport, HttpTransportOptions } from './transports/httpTransport'
import { Transport, TransportError } from './transports/transport'

/**
 * Options for creating a logger instance.
 * @typeParam Levels - Custom log level definitions mapping names to numeric priorities.
 */
export interface CreateLoggerOptions<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> {
  /**
   * The minimum numeric log level to emit. Logs with levels below this value
   * will be ignored.
   * @defaultValue 0
   */
  logLevel?: number

  /**
   * Custom level definitions mapping level names (e.g., "INFO", "ERROR")
   * to numeric values. Defaults to STD_LEVEL_DEF.levels.
   */
  levels?: Levels

  /**
   * Whether to run each transport in its own worker thread.
   *
   * @defaultValue true
   */
  runAsWorker?: boolean

  /**
   * Configuration for console transports.
   * set undefined to turn off default console transport.
   */
  consoleTransport?: ConsoleTransportOptions<Levels>

  /**
   * Configuration for one or more file transports.
   * Accepts a single options object or an array for multiple destinations.
   */
  fileTransport?: FileTransportOptions<Levels> | FileTransportOptions<Levels>[]

  /**
   * Configuration for one or more HTTP transports.
   * Useful for shipping logs to external services or APIs.
   */
  httpTransport?: HttpTransportOptions<Levels> | HttpTransportOptions<Levels>[]

  /**
   * Custom transports.
   */
  transport?: Transport<Levels> | Transport<Levels>[]

  /**
   * Default metadata to attach to every log entry.
   * Useful for adding application context.
   */
  context?: LogMeta

  /**
   * A predicate function to filter logs before they are emitted.
   * Return false to drop a log. Executed in the main thread.
   */
  filter?: (log: Log<Levels>) => boolean

  /**
   * A transformer function applied to every log before dispatch.
   * Return the original or mutated Log to continue, or null to drop it.
   * Executed in the main thread.
   */
  transformer?: (log: Log<Levels>) => Log<Levels> | null

  /**
   * Serialization options for Error objects, such as maxDepth,
   * whether to include stack traces, causes, and aggregated errors.
   */
  errors?: ErrorSerialization

  /**
   * Callback invoked when any transport emits an error.
   * Provides detailed context in TransportError.
   */
  onError?: (err: TransportError<Levels>) => void

  /**
   * Function to derive a message string from metadata or Error.
   * Useful for customizing how log.msg is resolved when passing objects.
   */
  resolveMessage?: (meta: LogMeta | Error) => string
}

const DEFAULTS: CreateLoggerOptions<DEFAULT_LEVELS> = {
  logLevel: 0,
  runAsWorker: true,
  consoleTransport: {},
}

/**
 * Create and configure a Logger instance with the given options.
 *
 * @typeParam Levels - Custom log level definitions, mapping names (e.g. "INFO") to numeric priorities.
 * @param options - Configuration for the logger and its transports:
 *
 *   - logLevel?: number
 *     Minimum numeric level to emit. Logs below this level will be ignored.
 *     Default: 0.
 *
 *   - levels?: Levels
 *     Custom level definitions. Overrides the built-in STD_LEVEL_DEF.
 *
 *   - runAsWorker?: boolean
 *     Whether to run each transport in its own worker thread.
 *     Default: true.
 *
 *   - consoleTransport?: ConsoleTransportOptions<Levels>
 *     Settings for the built-in ConsoleTransport. Pass `undefined` to disable it.
 *
 *   - fileTransport?: FileTransportOptions<Levels> | FileTransportOptions<Levels>[]
 *     Settings for one or more FileTransport instances.
 *
 *   - httpTransport?: HttpTransportOptions<Levels> | HttpTransportOptions<Levels>[]
 *     Settings for one or more HttpTransport instances.
 *
 *   - transport?: Transport<Levels> | Transport<Levels>[]
 *     One or more custom Transport instances to add.
 *
 *   - context?: LogMeta
 *     Default metadata object to attach to every log entry.
 *
 *   - filter?: `(log: Log<Levels>) => boolean`
 *     Predicate executed in the main thread to drop logs. Return false to skip.
 *
 *   - transformer?: `(log: Log<Levels>) => Log<Levels> | null`
 *     Function applied to every log before dispatch. Return a (possibly mutated)
 *     Log to continue, or null to drop it.
 *
 *   - errors?: ErrorSerialization
 *     Options controlling how Error objects are serialized (stack, cause, depth).
 *
 *   - onError?: `(err: TransportError<Levels>) => void`
 *     Callback invoked for any transport-level error, receiving a TransportError.
 *
 *   - resolveMessage?: `(meta: LogMeta | Error) => string`
 *     Function to derive the `msg` string when logging objects or Errors.
 *
 * @returns A promise resolves to a ready-to-use Logger interface, preconfigured with all transports.
 */
export async function createLogger<
  Levels extends Record<string, number> = DEFAULT_LEVELS
>(options?: CreateLoggerOptions<Levels>): Promise<Logger<LogMeta, Levels>> {
  const levels = options?.levels ?? (STD_LEVEL_DEF.levels as unknown as Levels)

  const opts = merge<
    CreateLoggerOptions<DEFAULT_LEVELS>,
    CreateLoggerOptions<Levels>
  >(DEFAULTS, options)

  const {
    runAsWorker,
    context,
    consoleTransport,
    fileTransport,
    httpTransport,
    transport,
    filter,
    logLevel,
    errors,
    transformer,
    onError = (err) => {
      console.error('Unhandled error in', err.transport, err.err, err.data)
    },
    resolveMessage,
  } = opts

  const logger = new LogPot(levels, context)
  logger.logLevel = logLevel ?? 0
  logger.filter = filter
  logger.transformer = transformer
  logger.resolveMessage = resolveMessage
  logger.errorSerialization = errors
  const levelDefinition = logger.levelDefinition

  if (consoleTransport) {
    consoleTransport.onError = consoleTransport.onError ?? onError
    const transport = new ConsoleTransport<Levels>(
      levelDefinition,
      consoleTransport
    )
    logger.addTransport(transport)
    const rw = consoleTransport.runAsWorker
    if ((rw != false && runAsWorker) || rw) await transport.runAsWorker()
  }

  if (fileTransport) {
    function getFileTransport(f: FileTransportOptions<Levels>) {
      f.onError = f.onError ?? onError
      const transport = new FileTransport<Levels>(levelDefinition, f)
      logger.addTransport(transport)
      const rw = f.runAsWorker
      if ((rw != false && runAsWorker) || rw) return transport.runAsWorker()
    }
    await Promise.all(getOrMakeArray(fileTransport).map(getFileTransport))
  }

  if (httpTransport) {
    function getHttpTransport(h: HttpTransportOptions<Levels>) {
      h.onError = h.onError ?? onError
      const transport = new HttpTransport<Levels>(levelDefinition, h)
      logger.addTransport(transport)
      const rw = h.runAsWorker
      if ((rw != false && runAsWorker) || rw) return transport.runAsWorker()
    }
    await Promise.all(getOrMakeArray(httpTransport).map(getHttpTransport))
  }

  if (transport) {
    function getHttpTransport(t: Transport<Levels>) {
      logger.addTransport(t)
      const rw = t.options.runAsWorker
      if ((rw != false && runAsWorker) || rw) return t.runAsWorker()
    }
    await Promise.all(getOrMakeArray(transport).map(getHttpTransport))
  }

  if (!hasLogger()) setLogger(logger)
  return logger.toLogger()
}
