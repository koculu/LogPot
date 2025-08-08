/**
 * Metadata for a ring buffer entry header.
 */
export interface RingHeader {
  /** Byte offset of this entry's header within the SharedArrayBuffer. */
  offset: number

  /** Number of readers currently processing this entry. */
  readers: number

  /**
   * Length in bytes of the entry's data.
   * Special markers:
   * -1: end-of-stream
   * -2: wrap/reset marker
   */
  len: number

  /**
   * Int32Array view pointing to the two header slots:
   * [0] = readers count, [1] = length field.
   */
  head: Int32Array
}
