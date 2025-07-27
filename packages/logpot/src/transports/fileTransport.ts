import { AsyncJobQueue } from '@logpot/utils'
import { merge } from '@logpot/utils'
import { RetryOption, withRetry } from '@logpot/utils'
import { buildWriteAsync, WriteAsync } from '@logpot/utils'
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  statSync,
  WriteStream,
} from 'fs'
import path from 'path'
import { finished } from 'stream/promises'

import { DEFAULT_LEVELS, LevelDefinition } from '../levels'
import { Log } from '../log'
import { FileRotator, RotationOptions } from './fileRotator'
import { Transport, TransportOptions } from './transport'

/**
 * Options for the built-in FileTransport.
 * Allows writing logs to a filesystem path with optional rotation,
 * retention and compression.
 */
export interface FileTransportOptions<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> extends TransportOptions<Levels> {
  /**
   * Path to the log file. Nested directories will be created if needed.
   */
  filename: string

  /**
   * File system flags for the write stream (e.g., 'a' or 'w').
   * Default: 'a' (append).
   */
  flags?: string

  /**
   * Permission mode for the log file (e.g., 0o644).
   * Default: 0o644.
   */
  mode?: number

  /**
   * Maximum number of concurrent write tasks.
   * Default: 20.
   */
  concurrency?: number

  /**
   * Optional file rotation settings (maxSize, interval, maxFiles, compress).
   */
  rotate?: RotationOptions

  /**
   * Number of log entries to buffer before triggering a write.
   * Default: 100.
   */
  batchSize?: number

  /**
   * Interval in milliseconds to auto-flush buffered logs.
   * Default: 5000 (5 seconds).
   */
  flushInterval?: number

  /**
   * Configure retry behavior for failed writes.
   */
  retry?: RetryOption
}

const DEFAULTS: FileTransportOptions = {
  filename: 'log.log',
  flags: 'a',
  mode: 0o644,
  concurrency: 20,
  batchSize: 100,
  flushInterval: 5_000,
  rotate: {
    compress: true,
    maxSize: 500_000,
    maxFiles: Infinity,
  },
  formatter: {
    kind: 'ndjson',
    delimiter: '\n',
    stringify: 'simple',
  },
}

/**
 * FileTransport writes log entries to a file, handling batching,
 * rotation, retention, compression, and retries.
 *
 * @typeParam Levels - Mapping of level names to numeric priorities.
 *
 */
export class FileTransport<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> extends Transport<Levels, FileTransportOptions<Levels>> {
  private stream?: WriteStream
  private isOpen = false
  private rotator?: FileRotator
  private currentSize = 0
  private buffer: Log<Levels>[] = []
  private flushTimer?: NodeJS.Timeout
  private isRotating = false
  private isFlushing = false
  private writeAsync: WriteAsync

  /**
   * Constructs a FileTransport with merged default and user options.
   * Initializes the write queue, rotation, and flush timer.
   *
   * @param levelDefinition - Definitions of log levels and priorities.
   * @param opts - User-specified FileTransportOptions.
   */
  constructor(
    levelDefinition: LevelDefinition<Levels>,
    opts: FileTransportOptions<Levels>
  ) {
    super(levelDefinition, merge(DEFAULTS, opts))
    this.writeAsync = buildWriteAsync()
    this.queue = new AsyncJobQueue(this.options.concurrency)
    this.transportName = 'fileTransport'
    if (!this.options.name) this.options.name = this.transportName
    if (opts.rotate) this.rotator = new FileRotator(opts.filename, opts.rotate)
    this.startFlushTimer()
  }

  /**
   * Called by the Transport when a log entry is received.
   * Buffers the entry and triggers flush when batchSize reached.
   *
   * @param log - Single log entry to record.
   */
  protected doLog(log: Log<Levels>): void {
    this.buffer.push(log)
    if (this.buffer.length >= this.options.batchSize!) {
      this.flush()
    }
  }

  /**
   * Starts the periodic flush timer if not already managed by a worker.
   *
   */
  protected startFlushTimer() {
    if (this.hasWorker) return
    this.flushTimer = setInterval(() => {
      if (this.hasWorker) this.stopFlushTimer()
      else this.flush()
    }, this.options.flushInterval)
  }

  /**
   * Stops the periodic flush timer.
   */
  protected stopFlushTimer() {
    if (this.flushTimer) clearInterval(this.flushTimer)
  }

  /**
   * Flushes buffered logs to disk, handling rotation and batching.
   */
  protected flush() {
    if (this.isFlushing) return
    if (this.isRotating) return
    this.isFlushing = true
    try {
      if (!this.isOpen) {
        this.ensureDir(this.options.filename)
        this.openStream()
      }
      const rotator = this.rotator
      const queue = this.queue
      if (!queue) return
      while (this.buffer.length) {
        const batch = this.buffer.splice(0, this.options.batchSize)
        try {
          const body = this.format(batch)
          if (
            this.currentSize != 0 &&
            rotator &&
            rotator.shouldRotate(this.currentSize + body.length)
          ) {
            this.isRotating = true
            queue.drain().then(() => {
              rotator
                .rotate(
                  () => this.closeStream(),
                  () => this.openStream(),
                  (err) => this.handleError({ err, batch })
                )
                .catch((err) => this.handleError({ err, batch }))
                .finally(() => {
                  this.sendBody(body, batch.length)
                  this.currentSize = 0
                  this.isRotating = false
                  this.isFlushing = false
                  this.flush()
                })
            })
            return
          }
          this.sendBody(body, batch.length)
        } catch (err) {
          this.handleError({ err, batch })
        }
      }
    } finally {
      this.isFlushing = false
    }
    return
  }

  private sendBody(body: string, length: number) {
    this.currentSize += body.length
    this.queue?.enqueue(() =>
      this.writeBody(body).finally(() => {
        this.logProcessed += length
      })
    )
  }

  private async writeBody(body: string): Promise<void> {
    return withRetry(
      async () => {
        if (!this.stream) throw new Error('stream is closed.')
        await this.writeAsync(this.stream, body, this.encoding)
      },
      this.options.retry,
      (attempt, err) => {
        this.handleError({
          err,
          attempt,
          data: body,
          retryCount: this.options.retry?.maxRetry ?? 3,
        })
      }
    ).catch((err) => this.handleError({ err, data: body }))
  }

  /**
   * Flushes and waits for all queued writes to complete.
   */
  protected async doFlushAndWait() {
    this.flush()
    await this.queue?.drain()
  }

  /**
   * Closes the transport, stopping timer and closing stream.
   */
  protected async doClose(): Promise<void> {
    this.stopFlushTimer()
    await this.closeStream()
  }

  private openStream() {
    const { filename, flags, mode } = this.options
    this.stream = createWriteStream(filename, { flags, mode })
    try {
      const stat = statSync(filename)
      this.currentSize = stat.size
    } catch {
      this.currentSize = 0
    }
    this.isOpen = true
  }

  private async closeStream() {
    if (!this.stream) return
    const stream = this.stream
    const streamDone = finished(stream)
    stream.end()
    await streamDone
    this.stream = undefined
    this.isOpen = false
  }

  private ensureDir(logPath: string) {
    const dirName = path.dirname(logPath)
    if (!existsSync(dirName)) mkdirSync(dirName, { recursive: true })
  }

  /**
   * Serializes a batch of Log entries using the configured formatter.
   *
   * @param batch - Array of Log records.
   * @returns Formatted string payload.
   */
  protected format(batch: Log<Levels>[]) {
    return this.formatter.format(batch) as string
  }
}
