import { align4 } from './align4'
import { encodeToArray } from './encodeToArray'
import { getNextOffset } from './getNextOffset'
import { RingHeader } from './ringHeader'
import { waitForZero } from './waitForZero'

/**
 * A fixed-size, lock-free ring buffer implemented on a SharedArrayBuffer,
 * supporting multiple readers and a single writer.
 */
export class RingBuffer {
  private nextOffset = 0
  private tail = 0
  private size = 0

  /** The underlying shared memory buffer. */
  readonly sab: SharedArrayBuffer

  /** Total byte capacity of the ring buffer. */
  readonly capacity: number

  /** Number of concurrent readers expected to consume entries. */
  readonly readerCount: number

  /** Text encoder used to convert strings to UTF-8 bytes. */
  readonly encoder = new TextEncoder()

  /**
   * Creates a new RingBuffer instance.
   * @param capacity - The byte capacity (minimum 2048).
   * @param readerCount - The number of readers that will consume from this buffer.
   */
  constructor(capacity: number, readerCount: number) {
    this.capacity = Math.max(capacity, 2048)
    this.readerCount = readerCount
    this.sab = new SharedArrayBuffer(capacity)
  }

  /**
   * Signals the end of the stream and notifies all readers.
   * Once closed, further calls to {@link push} will throw.
   * @returns A promise resolving to true if successfully closed, false otherwise.
   */
  async close(): Promise<boolean> {
    if (this.nextOffset == -1) return true
    const nextOffset = this.nextOffset
    const header = this.readHeader(nextOffset, false)
    if (!header) return false
    const headPtr = header.head
    await waitForZero(headPtr, 0)
    Atomics.store(headPtr, 1, -1)
    Atomics.store(headPtr, 0, this.readerCount)
    Atomics.notify(headPtr, 0)
    this.nextOffset = -1
    return true
  }

  /**
   * Attempts to write a string into the ring buffer.
   * @param value - The string to enqueue.
   * @returns True if enqueued, false if insufficient space.
   * @throws Error if the buffer has been closed.
   */
  push(value: string): boolean {
    const sab = this.sab
    const nextOffset = this.nextOffset
    if (nextOffset == -1) throw new Error('Ring buffer is closed.')
    const header = this.readHeader(nextOffset, true)
    if (!header) return false
    this.updateTail()
    const available = this.capacity - this.size - 8
    const headPtr = header.head
    header.len = Math.min(
      Math.floor(available),
      this.capacity - header.offset - 8
    )

    // optimistic fast path: 2 bytes for each character.
    if (value.length * 2 > header.len) {
      this.resetHeader(nextOffset, headPtr)
      return false
    }

    const view = new Uint8Array(
      sab,
      header.offset + 8,
      header.len > 0 ? header.len : undefined
    )

    const written = encodeToArray(this.encoder, view, value)
    if (written === -1) {
      this.resetHeader(nextOffset, headPtr)
      return false
    }

    header.len = written
    this.size += align4(header.len + 8)

    const newNextHeader = this.getNextHeader(header, false)
    if (newNextHeader && newNextHeader.offset != header.offset) {
      Atomics.store(newNextHeader.head, 0, 0)
      Atomics.store(newNextHeader.head, 1, 0)
    }

    Atomics.store(headPtr, 1, written)
    Atomics.store(headPtr, 0, this.readerCount)
    Atomics.notify(headPtr, 0)

    this.nextOffset = getNextOffset(header, this.capacity)

    return true
  }

  private resetHeader(
    nextOffset: number,
    headPtr: Int32Array<ArrayBufferLike>
  ) {
    if (nextOffset <= 0) return
    Atomics.store(headPtr, 1, -2) // notify readers to reset nextOffset
    Atomics.store(headPtr, 0, this.readerCount)
    Atomics.notify(headPtr, 0)
    this.size += 8
    this.nextOffset = 0
  }

  private updateTail() {
    let tailHeader = this.readHeader(this.tail, true)
    if (tailHeader == null) return
    while (true) {
      if (tailHeader.len == -2) {
        this.tail = 0
        this.size -= 8
        return
      }
      const nextHeader = this.getNextHeader(tailHeader, false)
      if (nextHeader == null) break
      if (nextHeader.readers != 0) break
      this.size -= align4(tailHeader.len + 8)
      tailHeader = nextHeader
    }
    this.tail = tailHeader.offset
  }

  private readHeader(offset: number, writable: boolean): RingHeader | null {
    const head = new Int32Array(this.sab, offset, 2)
    const readers = Atomics.load(head, 0)
    if (writable && readers != 0) return null
    const len = Atomics.load(head, 1)
    return {
      offset,
      readers,
      len,
      head,
    }
  }

  private getNextHeader(header: RingHeader, writable: boolean) {
    if (header.len <= 0) return null
    return this.readHeader(getNextOffset(header, this.capacity), writable)
  }
}
