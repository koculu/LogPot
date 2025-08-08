import { getNextOffset } from './getNextOffset'
import { RingHeader } from './ringHeader'
import { waitForNonZero } from './waitForNonZero'

/**
 * A reader for the lock-free ring buffer backed by a SharedArrayBuffer.
 * Supports sequential, ordered reads of strings until the buffer is closed.
 */
export class RingBufferReader {
  private nextOffset = 0
  /** The underlying shared memory buffer being read. */
  readonly sab: SharedArrayBuffer

  /** The total byte capacity of the shared buffer. */
  readonly capacity: number

  /** Text decoder used to convert UTF-8 bytes back into strings. */
  readonly decoder = new TextDecoder()

  /**
   * Creates a new reader for an existing SharedArrayBuffer ring buffer.
   * @param sab - The SharedArrayBuffer instance from a {@link RingBuffer}.
   */
  constructor(sab: SharedArrayBuffer) {
    this.capacity = sab.byteLength
    this.sab = sab
  }

  /**
   * Reads the next available string from the ring buffer.
   * If the buffer has been closed, it resolves to `null`.
   * On encountering a reset marker, it wraps around and continues reading.
   *
   * @returns A promise resolving to the next string or `null` if end of stream.
   */
  async readNext(): Promise<null | string> {
    const sab = this.sab
    const nextOffset = this.nextOffset
    const header = await this.readHeader(nextOffset)
    if (header == null) return null

    const { len, head } = header
    if (len == -1) return null // end of stream
    if (len == -2) {
      Atomics.sub(head, 0, 1)
      Atomics.notify(head, 0)
      this.nextOffset = 0 // reset the stream
      return await this.readNext()
    }
    const view = new Uint8Array(sab, nextOffset + 8, len)
    const str = this.decoder.decode(view)
    Atomics.sub(head, 0, 1)
    Atomics.notify(head, 0)
    this.nextOffset = getNextOffset(header, this.capacity)
    return str
  }

  private async readHeader(offset: number): Promise<RingHeader | null> {
    const head = new Int32Array(this.sab, offset, 2)
    await waitForNonZero(head, 0)
    const readers = Atomics.load(head, 0)
    const len = Atomics.load(head, 1)
    return {
      offset,
      readers,
      len,
      head,
    }
  }
}
