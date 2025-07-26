import { AsyncJobQueue } from '@logpot/utils'
import { isRetryableHttpError } from '@logpot/utils'
import { merge } from '@logpot/utils'
import { RetryAction, RetryOption, withRetry } from '@logpot/utils'

import { HttpAuth } from '../auth/auth'
import { Authenticator } from '../auth/authenticator'
import { createAuthenticator } from '../auth/createAuthenticator'
import { DEFAULT_LEVELS, LevelDefinition } from '../levels'
import { Log } from '../log'
import { Transport, TransportOptions } from './transport'

/**
 * Define HttpTransport options.
 *
 * Provide settings to configure HTTP endpoint, batching, retry,
 * concurrency, and authentication for log delivery.
 *
 * @typeParam Levels - mapping from level names to numeric priorities.
 */
export interface HttpTransportOptions<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> extends TransportOptions<Levels> {
  /**
   * Target URL where logs will be delivered.
   */
  url: string

  /**
   * Specify HTTP method for sending logs.
   *
   * @defaultValue 'POST'
   */
  method?: 'POST' | 'PUT'

  /**
   * Include custom headers in each request.
   *
   * @defaultValue `{ 'Content-Type': 'application/json' }`
   */
  headers?: Record<string, string>

  /**
   * Number of log entries to batch per HTTP request.
   * @defaultValue 100
   */
  batchSize?: number

  /**
   * Interval in milliseconds to flush pending batches.
   * @defaultValue 5000
   */
  flushInterval?: number

  /**
   * Configure retry behavior for failed HTTP calls.
   */
  retry?: RetryOption

  /**
   * Maximum number of concurrent HTTP requests.
   * @defaultValue 10
   */
  concurrency?: number

  /**
   * Define authentication method for HTTP requests.
   *
   * @defaultValue HttpAuthNone
   */
  auth?: HttpAuth
}

const DEFAULTS: HttpTransportOptions = {
  url: '',
  method: 'POST' as const,
  headers: { 'Content-Type': 'application/json' },
  batchSize: 100,
  flushInterval: 5_000,
  concurrency: 10,
  formatter: {
    kind: 'json-array',
    stringify: 'simple',
  },
  auth: { type: 'none' },
}

/**
 * Transport implementation that sends log records via HTTP.
 * Handles batching, retries, concurrency, and authentication.
 *
 * @typeParam Levels - Log level definitions.
 */
export class HttpTransport<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> extends Transport<Levels, HttpTransportOptions<Levels>> {
  private buffer: Log<Levels>[] = []
  private flushTimer?: NodeJS.Timeout
  private authenticator: Authenticator

  /**
   * Creates an HTTP transport with the given level definitions and options.
   * Initializes the request queue, authentication, and periodic flush.
   *
   * @param levelDefinition - Definitions mapping level names to priorities.
   * @param options - Configuration for HTTP transport behavior.
   */
  constructor(
    levelDefinition: LevelDefinition<Levels>,
    options: HttpTransportOptions<Levels>
  ) {
    super(levelDefinition, merge(DEFAULTS, options))
    this.queue = new AsyncJobQueue(this.options.concurrency)
    this.transportName = 'httpTransport'
    if (!this.options.name) this.options.name = this.transportName
    this.authenticator = createAuthenticator(this.options.auth!)
    this.startFlushTimer()
  }

  /**
   * Buffers a log entry and triggers a flush when batch size is reached.
   *
   * @param log - Log record to add to the batch.
   */
  protected doLog(log: Log<Levels>): void {
    this.buffer.push(log)
    if (this.buffer.length >= this.options.batchSize!) {
      this.flush()
    }
  }

  /**
   * Starts the automatic flush timer if not managed by a worker.
   */
  protected startFlushTimer() {
    if (this.hasWorker) return
    this.flushTimer = setInterval(
      () => this.flush(),
      this.options.flushInterval
    )
  }

  /**
   * Stops the automatic flush timer.
   */
  protected stopFlushTimer() {
    if (this.flushTimer) clearInterval(this.flushTimer)
  }

  /**
   * Flushes buffered logs by enqueuing HTTP send tasks.
   */
  protected flush() {
    const queue = this.queue
    if (!queue) return
    while (this.buffer.length) {
      const batch = this.buffer.splice(0, this.options.batchSize)
      queue.enqueue(() => this.sendBatch(batch))
    }
  }

  /**
   * Sends a batch of logs in a single HTTP request with retry logic.
   *
   * @param batch - Array of log records to send.
   */
  protected async sendBatch(batch: Log<Levels>[]): Promise<void> {
    const body = this.format(batch)
    const url = new URL(this.options.url)
    const init: RequestInit = {
      method: this.options.method,
      headers: {
        'Content-Type': this.formatter.contentType,
        ...(this.formatter.extraHeaders ?? {}),
        ...this.options.headers,
      },
      body,
    }
    await this.authenticator.apply(init, url)
    return withRetry(
      async (signal) => {
        const res = await fetch(url.toString(), { ...init, signal })
        if (!res.ok) {
          const err = new Error(`HTTP ${res.status}`) as Error & {
            status: number
          }
          err.status = res.status
          throw err
        }
      },
      this.options.retry,
      (attempt, err) => {
        this.handleError({
          err,
          attempt,
          batch,
          retryCount: this.options.retry?.maxRetry ?? 3,
        })
        return isRetryableHttpError(err)
          ? RetryAction.CONTINUE
          : RetryAction.STOP
      }
    )
      .catch((err) => this.handleError({ err, batch }))
      .finally(() => {
        // logProcessed is increased regardless of thrown error by design.
        // handleError carries the batch to the consumer of the transport.
        // It is consumer's responsibility to retry or not.
        this.logProcessed += batch.length
      })
  }

  /**
   * Formats a batch of logs into a request body using the configured formatter.
   *
   * @param batch - Array of log records.
   * @returns Serialized payload as string or Buffer.
   */
  protected format(batch: Log<Levels>[]) {
    return this.formatter.format(batch)
  }

  /**
   * Flushes remaining logs and waits for all HTTP requests to complete.
   */
  protected async doFlushAndWait() {
    this.flush()
    await this.queue?.drain()
  }

  /**
   * Cleans up transport by stopping the flush timer.
   */
  protected async doClose(): Promise<void> {
    this.stopFlushTimer()
  }
}
