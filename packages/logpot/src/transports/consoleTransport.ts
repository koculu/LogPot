import { merge } from '@logpot/utils'
import { AsyncJobQueue } from '@logpot/utils'
import { buildWriteAsync, WriteAsync } from '@logpot/utils'

import { DEFAULT_LEVELS, LevelDefinition } from '../levels'
import { Log } from '../log'
import { Transport, TransportOptions } from './transport'

/**
 * Options for the built-in ConsoleTransport.
 * Controls behavior such as queuing and concurrency.
 */
export interface ConsoleTransportOptions<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> extends TransportOptions<Levels> {
  /**
   * If true, log writes are enqueued through an AsyncJobQueue.
   * Default: false
   */
  useJobQueue?: boolean

  /**
   * Maximum number of concurrent write tasks when job queue is enabled.
   * Default: 20.
   */
  concurrency?: number
}

const DEFAULTS: ConsoleTransportOptions = {
  useJobQueue: false,
  concurrency: 20,
  formatter: {
    kind: 'template',
    template: `{emoji} {level} {time} {msg}
{meta}

`,
    stringify: 'colorize',
    timeFormat: {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    },
  },
}

/**
 * ConsoleTransport sends log entries to the console (stdout).
 *
 * @typeParam Levels - Type mapping of level names to numeric priorities.
 *
 * Behavior:
 * - Uses the configured Formatter to render each log batch as text.
 * - Optionally offloads writes to a worker thread if `runAsWorker` is enabled.
 */
export class ConsoleTransport<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> extends Transport<Levels, ConsoleTransportOptions<Levels>> {
  private writeAsync: WriteAsync
  constructor(
    levelDefinition: LevelDefinition<Levels>,
    options?: ConsoleTransportOptions<Levels>
  ) {
    super(levelDefinition, merge(DEFAULTS, options))
    this.writeAsync = buildWriteAsync()
    this.queue = new AsyncJobQueue(this.options.concurrency)
    this.transportName = 'consoleTransport'
    if (!this.options.name) this.options.name = this.transportName
  }

  protected doLog(log: Log<Levels>) {
    const line = this.format(log)
    if (this.options.useJobQueue)
      this.queue?.enqueue(() =>
        this.writeAsync(process.stdout, line, this.encoding)
          .catch((err) => this.handleError({ err, log }))
          .finally(() => {
            ++this.logProcessed
          })
      )
    else
      this.writeAsync(process.stdout, line, this.encoding)
        .catch((err) => this.handleError({ err, log }))
        .finally(() => {
          ++this.logProcessed
        })
  }

  protected format(log: Log<Levels>) {
    return this.formatter.format([log])
  }

  protected flush() {}

  protected async doFlushAndWait() {
    await this.queue?.drain()
  }

  protected async doClose(): Promise<void> {}
}
