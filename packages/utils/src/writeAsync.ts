import { Writable } from 'stream'

/**
 * Represents an asynchronous write function for Node.js writable streams.
 *
 * @param stream - The writable stream to which data should be written.
 * @param chunk - The data to write to the stream. Can be a `Buffer` or a `string`.
 * @param encoding - Optional encoding to use when `chunk` is a string.
 * Defaults to `utf8` if omitted.
 *
 * @returns A promise that resolves when the data has been successfully written
 * to the stream (including handling backpressure), or rejects if an error occurs.
 */
export type WriteAsync = (
  stream: Writable,
  chunk: Buffer | string,
  encoding?: BufferEncoding
) => Promise<void>

/**
 * Creates a `WriteAsync` function that writes data to a Node.js writable stream
 * and properly handles backpressure.
 *
 * When the underlying stream's internal buffer is full, the function waits for
 * the `'drain'` event before resolving the promise, ensuring that subsequent writes
 * do not overwhelm the stream.
 *
 * @returns A `WriteAsync` function that writes chunks to the stream asynchronously.
 *
 * @example
 * ```ts
 * const stream = createWriteStream('output.txt')
 * const writeAsync = buildWriteAsync()
 *
 * await writeAsync(stream, 'Hello, World!')
 * await writeAsync(stream, 'Another line\n', 'utf8')
 * stream.end()
 * ```
 */
export function buildWriteAsync(): WriteAsync {
  let drainPromise: Promise<void> | null = null
  return function (
    stream: Writable,
    chunk: Buffer | string,
    encoding?: BufferEncoding
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const cb = (err?: Error | null) => {
        if (err) return reject(err)
        if (writeOk || !drainPromise) return resolve()
        drainPromise.then(resolve).catch(reject)
      }

      const writeOk = encoding
        ? stream.write(chunk, encoding, cb)
        : stream.write(chunk, cb)
      if (writeOk || drainPromise) return

      drainPromise = new Promise<void>((res) => {
        stream.once('drain', res)
      }).finally(() => {
        drainPromise = null
      })
    })
  }
}
