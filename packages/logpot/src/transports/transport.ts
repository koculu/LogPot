import { AsyncJobQueue } from '@logpot/utils'
import { merge } from '@logpot/utils'
import { SerializedError, serializeError } from '@logpot/utils'
import { isString } from '@logpot/utils'
import { waitUntil } from '@logpot/utils'
import { withTimeout } from '@logpot/utils'
import { fileURLToPath } from 'url'
import { parentPort, Worker } from 'worker_threads'

import { Formatter, FormatterOptions } from '../formatter'
import {
  DEFAULT_LEVELS,
  defineLevels,
  LevelDefinition,
  LevelName,
} from '../levels'
import { Log } from '../log'
import { deserializeFn, serializeFn } from '../serializeFn'

/**
 * Options for configuring a Transport which handles log delivery.
 * @typeParam Levels - Custom log level definitions.
 */
export interface TransportOptions<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> {
  /**
   * Human-readable name for this transport. Defaults to the transport class name.
   */
  name?: string

  /**
   * Whether to offload log processing to a worker thread.
   */
  runAsWorker?: boolean

  /**
   * Minimum numeric severity to accept. Logs below this level are dropped.
   */
  logLevel?: number

  /**
   * Explicit set of level names to include. If provided, only logs whose level
   * name appears in this array will be emitted.
   */
  levels?: LevelName<Levels>[]

  /**
   * Set of categories to include. If provided, only logs whose meta.category
   * matches one of these entries will be emitted.
   */
  categories?: Set<string>

  /**
   * Predicate to filter individual logs. Return false to drop the log.
   * Executed in the main thread.
   */
  filter?: (log: Log<Levels>) => boolean

  /**
   * Encoding for raw message writes (e.g., 'utf8', 'utf16le').
   */
  encoding?: BufferEncoding

  /**
   * Worker-specific settings when runAsWorker is true:
   * - closeTimeout: ms to wait for worker to exit before aborting.
   * - readyTimeout: ms to wait for worker to signal ready.
   * - url: override URL of worker script.
   * - custom: factory function to create a Worker instance.
   */
  worker?: {
    /** Timeout (ms) for the worker.close handshake. Default: 60000. */
    closeTimeout?: number

    /** Timeout (ms) for the worker ready handshake. Default: 30000. */
    readyTimeout?: number

    /** Override the script URL for the worker. */
    url?: URL

    /** Custom factory for instantiating the worker. */
    custom?: () => Worker
  }

  /**
   * Formatter configuration describing output shape, serialization, and content type.
   */
  formatter?: FormatterOptions<Levels>

  /**
   * Function to transform or drop logs.
   * Return a new modified Log to proceed, or null to skip.
   * Do not modify original log object to prevent side-effects.
   */
  transformer?: (log: Log<Levels>) => Log<Levels> | null

  /**
   * Handler invoked on any transport-level error. Receives a TransportError
   * with details about the failure context.
   */
  onError?: (err: TransportError<Levels>) => void

  /**
   * Additional context for each log specific to the transport.
   * Context object is deep-merged to the log objects.
   * (e.g fields required by sink.)
   */
  context?: Record<string, unknown>
}

const DEFAULTS: TransportOptions = {
  logLevel: 0,
  worker: {
    closeTimeout: 60_000,
    readyTimeout: 30_000,
  },
  formatter: {
    kind: 'ndjson',
    delimiter: '\n',
    stringify: 'simple',
  },
}

/**
 * Encapsulates error details when a transport operation fails.
 * @typeParam Levels - Custom log level definitions used in the transport.
 */
export interface TransportError<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> {
  /**
   * The serialized error object, including message, stack, and nested causes.
   */
  err: SerializedError

  /**
   * Optional raw data associated with the failure, e.g., request payload or write body.
   */
  data?: unknown

  /**
   * The single log entry that triggered the error, if applicable.
   */
  log?: Log<Levels>

  /**
   * The batch of log entries sent or processed when the error occurred.
   */
  batch?: Log<Levels>[]

  /**
   * The current retry attempt count when the error was thrown.
   */
  attempt?: number

  /**
   * Maximum number of retry attempts configured for the transport.
   */
  retryCount?: number

  /**
   * The name of the transport instance that raised this error.
   */
  transport?: string
}

/**
 * Abstract base for all log transports handling delivery of log entries.
 *
 * @typeParam Levels - Mapping of level names to numeric priorities.
 * @typeParam Options - TransportOptions specific to this transport type.
 *
 */
export abstract class Transport<
  Levels extends Record<string, number> = DEFAULT_LEVELS,
  Options extends TransportOptions<Levels> = TransportOptions<Levels>
> {
  private isClosing = false

  private isClosed = false

  private logRequests = 0

  private worker?: Worker

  options: Options

  protected logProcessed = 0

  protected queue?: AsyncJobQueue

  protected levelDefinition: LevelDefinition<Levels>

  protected transportName: string

  get hasWorker() {
    return this.worker
  }

  protected get encoding() {
    return this.options.encoding
  }

  protected abstract doLog(log: Log<Levels>): void

  protected abstract doFlushAndWait(): Promise<void>

  protected abstract doClose(): Promise<void>

  protected abstract flush(): void

  protected formatter: Formatter<Levels>

  constructor(
    levelDefinition: LevelDefinition<Levels>,
    options?: TransportOptions
  ) {
    this.transportName = 'transport'
    this.options = merge(DEFAULTS, options)
    this.levelDefinition = levelDefinition
    this.formatter = new Formatter<Levels>(
      this.options.formatter!,
      this.levelDefinition
    )
    this.listenParent()
  }

  raw(data: string) {
    if (!this.worker) {
      throw new Error('Not supported in main thread')
    }
    try {
      this.logRequests++
      this.checkTransportState()
      this.worker.postMessage(data)
    } catch (err) {
      this.logProcessed++
      this.handleError({ err, log: JSON.parse(data) })
    }
    return
  }

  log(log: Log<Levels>): void {
    try {
      this.logRequests++
      this.checkTransportState()
      if (this.worker) {
        this.worker.postMessage(log)
        return
      }
      const context = this.options.context
      if (context) log = merge(log, context)
      this.doLog(log)
    } catch (err) {
      this.logProcessed++
      this.handleError({ err, log })
    }
  }

  private checkTransportState() {
    if (this.isClosed)
      throw new Error('Transport is closed and cannot process new log request.')
    if (this.isClosing)
      throw new Error(
        'Transport is closing and cannot process new log request.'
      )
  }

  async flushAndWait() {
    const logRequests = this.logRequests
    if (this.worker) {
      await this.drainWorker()
      return this.logProcessed >= logRequests
    }
    return await waitUntil(async () => {
      await this.doFlushAndWait()
      return this.logProcessed >= logRequests
    })
  }

  private listenParent() {
    if (!parentPort) return
    parentPort.on('message', (log: Log<Levels> | string) => {
      try {
        if (isString(log)) {
          if (log.startsWith('{')) {
            this.log(JSON.parse(log))
            return
          }
          if (log === 'drain')
            this.flushAndWait()
              .catch((err) => console.log(err))
              .then(() => parentPort!.postMessage('drained'))
          else if (log === 'close') {
            this.close()
              .catch((err) => console.log(err))
              .then(() => parentPort!.postMessage('closed'))
          }
          return
        }
        this.log(log)
      } catch (err) {
        if (isString(log)) this.handleError({ err, data: log })
        else this.handleError({ err, log })
      }
    })
  }

  protected handleError(
    err: Omit<TransportError<Levels>, 'err'> & { err: unknown }
  ) {
    const transportError: TransportError<Levels> = merge(err, {
      err: serializeError(err.err),
      transport: this.options.name,
    })
    if (parentPort) {
      parentPort!.postMessage(`WORKER_ERROR:${JSON.stringify(transportError)}`)
    } else {
      if (this.options.onError) {
        this.options.onError(transportError)
      } else {
        console.error(`${this.options.name} error:`, transportError)
      }
    }
  }

  async close(): Promise<void> {
    this.isClosing = true
    if (this.worker) {
      await this.closeWorker()
      this.isClosed = true
      return
    }
    await this.flushAndWait()
    await this.doClose()
    this.assertStats()
    this.isClosed = true
  }

  /**
   * Send a command ('drain' or 'close') to the worker
   * and wait for the matching reply ('drained' or 'closed'),
   * or send any command and wait for ready message,
   * while filtering out any WORKER_ERROR:… messages.
   */
  private async workerHandshake<T>(
    command: 'drain' | 'close' | T,
    expectedReply: string
  ): Promise<void> {
    const worker = this.worker
    if (!worker) return
    const prefix = 'WORKER_ERROR:'
    const handshake = new Promise<void>((resolve, reject) => {
      const onMessage = (msg: unknown) => {
        if (typeof msg === 'string' && msg.startsWith(prefix)) {
          // we swallow here because createWorker already logs it
          return
        }
        if (msg === expectedReply) {
          cleanup()
          return resolve()
        }
        cleanup()
        return reject(
          new Error(`Expected '${expectedReply}' but got ${String(msg)}`)
        )
      }

      const onError = (err: Error) => {
        cleanup()
        return reject(err)
      }
      const onExit = (code: number) => {
        cleanup()
        return reject(new Error(`Worker exited early with code ${code}`))
      }

      function cleanup() {
        if (!worker) return
        worker.off('message', onMessage)
        worker.off('error', onError)
        worker.off('exit', onExit)
      }

      worker.on('message', onMessage)
      worker.once('error', onError)
      worker.once('exit', onExit)

      worker.postMessage(command)
    })

    await withTimeout(handshake, this.options.worker?.closeTimeout ?? 0)
  }

  protected async drainWorker(): Promise<void> {
    await this.workerHandshake('drain', 'drained')
  }

  private async closeWorker(): Promise<void> {
    await this.workerHandshake('close', 'closed')
    await this.worker!.terminate()
    this.worker = undefined
  }

  static initWorker<T>(
    onInit: (options: T, levelDefinition: LevelDefinition) => void
  ) {
    if (!parentPort) return
    parentPort.once(
      'message',
      (initOpts: { options: T; levels: Record<string, number> }) => {
        const levelDefinition = defineLevels(
          initOpts.levels
        ) as unknown as LevelDefinition

        onInit(deserializeFn(initOpts.options), levelDefinition)
        parentPort!.postMessage('ready')
      }
    )
  }

  protected getWorkerUrl(): URL {
    const transportName = this.transportName
    if (import.meta.url.endsWith('/transport.ts'))
      return new URL(`./${transportName}.worker.ts`, import.meta.url)

    const url = this.options.worker?.url
    if (url) return url
    return new URL(`./transports/${transportName}.worker.js`, import.meta.url)
  }

  private async createWorker() {
    const custom = this.options.worker?.custom
    if (custom) return custom()
    const url = this.getWorkerUrl()
    const filename = fileURLToPath(this.getWorkerUrl())
    if (!filename.endsWith('.ts')) {
      return new Worker(url)
    }
    const esbuild = await import('esbuild')
    const bundle = esbuild.buildSync({
      entryPoints: [filename],
      external: ['esbuild'],
      bundle: true,
      format: 'esm',
      target: 'esnext',
      platform: 'node',
      write: false,
    })
    const code = bundle.outputFiles[0].text
    return new Worker(code, { eval: true })
  }

  async runAsWorker() {
    if (this.worker) return
    this.worker = await this.createWorker()

    this.worker.on('message', (msg) => {
      if (typeof msg === 'string' && msg.startsWith('WORKER_ERROR:')) {
        const transportError = JSON.parse(
          msg.slice('WORKER_ERROR:'.length)
        ) as TransportError<Levels>
        this.handleError(transportError)
      }
    })

    await this.workerHandshake(
      serializeFn({
        options: {
          ...this.options,
          filter: undefined,
          transformer: undefined,
          onError: undefined,
          worker: undefined,
        },
        levels: this.levelDefinition.levels,
      }),
      'ready'
    )
  }

  private assertStats() {
    if (this.worker) return
    if (
      this.logProcessed != this.logRequests ||
      (this.queue && this.queue.length > 0)
    ) {
      this.handleError({
        err: new Error(
          `The stats gathered on close indicates a problem on ${this.options.name}.`
        ),
        data: {
          transport: this.options.name,
          logProcessed: this.logProcessed,
          logRequests: this.logRequests,
          queue: this.queue?.length,
          isWorker: !!this.worker,
        },
      })
    }
  }
}
