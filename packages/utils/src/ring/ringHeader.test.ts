import { describe, expect, it } from 'vitest'

import { align4 } from './align4'
import { getNextOffset } from './getNextOffset'
import { RingHeader } from './ringHeader'

// Helper to create a fake RingHeader
function makeHeader(offset: number, len: number): RingHeader {
  const sab = new SharedArrayBuffer(8)
  const head = new Int32Array(sab)
  return { offset, len, readers: 0, head }
}

describe('align4', () => {
  it('should align numbers up to nearest multiple of 4', () => {
    expect(align4(0)).toBe(0)
    expect(align4(1)).toBe(4)
    expect(align4(2)).toBe(4)
    expect(align4(3)).toBe(4)
    expect(align4(4)).toBe(4)
    expect(align4(5)).toBe(8)
    expect(align4(7)).toBe(8)
    expect(align4(8)).toBe(8)
    expect(align4(9)).toBe(12)
  })
})

describe('getNextOffset', () => {
  const capacity = 2048

  it('should calculate next offset as aligned offset + len + header', () => {
    const header = makeHeader(0, 10)
    // expected newOffset = align4(0 + 10 + 8) = align4(18) = 20
    const next = getNextOffset(header, capacity)
    expect(next).toBe(20)
  })

  it('should wrap to 0 if next offset is beyond capacity - MIN_CHUNK_SIZE', () => {
    const offset = 1049
    const len = 50
    const header = makeHeader(offset, len)
    const next = getNextOffset(header, capacity)
    expect(next).toBe(0)
  })

  it('should not wrap if next offset just below threshold', () => {
    const offset = 930
    const len = 90
    const headerEq = makeHeader(offset, len)
    expect(getNextOffset(headerEq, capacity)).toBe(1028)

    const offset2 = 1049
    const len2 = 89
    expect(getNextOffset(makeHeader(offset2, len2), capacity)).toBe(0)
  })

  it('should handle zero-length header', () => {
    const header = makeHeader(0, 0)
    const next = getNextOffset(header, capacity)
    expect(next).toBe(8)
  })
})
