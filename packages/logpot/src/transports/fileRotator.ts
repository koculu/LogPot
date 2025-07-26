import { withRetry } from '@logpot/utils'
import {
  createReadStream,
  createWriteStream,
  promises as fs,
  renameSync,
  unlinkSync,
} from 'fs'
import { basename, dirname, extname, join } from 'path'
import { finished, pipeline } from 'stream/promises'
import { createGzip } from 'zlib'

/**
 * Defines the supported time-based rotation intervals.
 *
 * - `'daily'`: Rotate once per calendar day (based on UTC date).
 * - `'hourly'`: Rotate once per hour (based on UTC hour).
 */
export type Interval = 'daily' | 'hourly'

/**
 * Configuration options for log file rotation.
 */
export interface RotationOptions {
  /**
   * The maximum size (in bytes) of the log file before rotation occurs.
   * If omitted, size-based rotation is disabled.
   */
  maxSize?: number
  /**
   * The time interval for rotation. If set, a rotation is triggered
   * whenever the time crosses into a new interval boundary
   * (e.g., a new day or hour).
   */
  interval?: Interval
  /**
   * The maximum number of rotated log files to retain.
   * Older files beyond this count will be deleted.
   * If omitted, no pruning is performed.
   */
  maxFiles?: number
  /**
   * Whether to compress rotated log files using gzip.
   * If `true`, rotated files will be saved with a `.gz` extension.
   */
  compress?: boolean
}

const retryErrorCodes = ['ENOENT', 'EBUSY']

/**
 * Manages log file rotation based on size, time intervals, and retention rules.
 *
 * Supports optional gzip compression of rotated files and automatic pruning
 * of old files when exceeding a configured maximum.
 */
export class FileRotator {
  private currentKey: string | null = null
  isRotating = false
  rotationPromise?: Promise<void>

  /**
   * Creates a new `FileRotator` instance.
   *
   * @param filename - The path to the log file to be rotated.
   * @param opts - Configuration options controlling rotation behavior.
   */
  constructor(private filename: string, private opts: RotationOptions) {
    this.currentKey = this.computeKey()
  }

  /**
   * Performs a rotation operation if one is not already in progress.
   *
   * @param closeStream - A function that closes the active writable log stream.
   * @param openStream - A function that reopens the log stream for writing.
   * @param onError - A callback invoked with any errors encountered during rotation.
   *
   * @returns `true` if rotation was performed, `false` if skipped because
   * another rotation was already in progress.
   */
  async rotate(
    closeStream: () => Promise<void>,
    openStream: () => void,
    onError: (err: unknown) => void
  ) {
    if (this.isRotating) {
      await this.rotationPromise
      return false
    }

    let resolve = () => {}
    this.isRotating = true
    this.rotationPromise = new Promise((res) => {
      resolve = res
    })

    try {
      await closeStream()
      return await this.doRotate(onError)
    } finally {
      openStream()
      this.isRotating = false
      this.rotationPromise = undefined
      resolve()
    }
  }

  /**
   * Determines whether rotation is necessary based on current file size
   * and/or the configured time interval.
   *
   * @param currentSize - The current size of the log file in bytes.
   * @returns `true` if rotation should be performed; otherwise `false`.
   */
  shouldRotate(currentSize: number): boolean {
    const { maxSize, interval } = this.opts
    const key = this.computeKey()
    if (interval && key !== this.currentKey) {
      this.currentKey = key
      return true
    }
    if (!maxSize) return false
    return currentSize >= maxSize
  }

  /**
   * Performs the core rotation steps:
   * - Renames the active log file with a timestamp suffix.
   * - Optionally compresses the rotated file using gzip.
   * - Prunes old rotated files based on retention policy.
   *
   * @param onError - Callback invoked for any errors during rotation steps.
   * @returns `true` if rotation succeeded; otherwise `false`.
   */
  private async doRotate(onError: (err: unknown) => void) {
    const { compress, maxFiles } = this.opts
    const filename = this.filename
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const ext = extname(filename)
    const base = basename(filename, ext)
    const dir = dirname(filename)
    const rotated = join(dir, `${base}.${ts}${ext}`)

    try {
      await withRetry(
        () => renameSync(filename, rotated),
        {
          maxRetry: 5,
          baseDelay: 50,
        },
        undefined,
        retryErrorCodes
      )
    } catch (err) {
      onError(new Error('Failed to rename log.', { cause: err }))
      return false
    }
    if (compress && maxFiles != 0) {
      try {
        await this.compress(rotated)
      } catch (err) {
        onError(new Error('Failed to compress log.', { cause: err }))
      }
    }

    if (maxFiles != null) {
      try {
        await this.retention(dir, base, ext, maxFiles)
      } catch (err) {
        onError(new Error('Failed to prune log files.', { cause: err }))
      }
    }
    this.currentKey = this.computeKey()
    return true
  }

  /**
   * Prunes old rotated log files if their count exceeds `maxFiles`.
   * Retains the newest files and deletes the excess.
   *
   * @param dir - Directory containing the log files.
   * @param base - Base name of the log file.
   * @param ext - File extension of the log file.
   * @param maxFiles - The maximum number of rotated files to retain.
   */
  private async retention(
    dir: string,
    base: string,
    ext: string,
    maxFiles: number
  ) {
    const files = await fs.readdir(dir)
    const filename = base + ext
    const prefix = `${base}.`
    const candidates = files
      .filter(
        (f) =>
          f.startsWith(prefix) && (f.endsWith(ext) || f.endsWith(ext + '.gz'))
      )
      .map((f) => join(dir, f))
      .sort()
    const excess = candidates.length - maxFiles
    if (excess > 0) {
      for (let i = 0; i < excess; i++) {
        if (candidates[i].endsWith(filename)) continue
        await fs.unlink(candidates[i]).catch(() => {})
      }
    }
  }

  /**
   * Compresses a rotated log file using gzip and deletes the original file.
   *
   * @param rotated - The path to the rotated log file.
   */
  private async compress(rotated: string) {
    const inp = createReadStream(rotated)
    const outp = createWriteStream(rotated + '.gz')
    const inpDone = finished(inp)
    const outpDone = finished(outp)
    await pipeline(inp, createGzip(), outp)
    await outpDone
    await inpDone
    await withRetry(
      () => unlinkSync(rotated),
      {
        maxRetry: 5,
        baseDelay: 50,
      },
      undefined,
      retryErrorCodes
    )
  }

  /**
   * Computes a key representing the current time bucket for interval-based rotation.
   *
   * @returns A string key (e.g., `'2025-07-21'` for daily, `'2025-07-21T14'` for hourly),
   * or `null` if interval-based rotation is disabled.
   */
  private computeKey(): string | null {
    const { interval } = this.opts
    if (!interval) return null
    const now = new Date().toISOString()
    return interval === 'hourly' ? now.slice(0, 13) : now.slice(0, 10)
  }
}
