import { describe, expect, it } from 'vitest'

import { RingBuffer } from './ringBuffer'
import { RingBufferReader } from './ringBufferReader'

const SMALL_CAPACITY = 2048
const LARGE_CAPACITY = 4096
const READER_COUNT = 1

describe('RingBuffer', () => {
  it('should push and allow reading a single value', async () => {
    const buf = new RingBuffer(LARGE_CAPACITY, READER_COUNT)
    const reader = new RingBufferReader(buf.sab)

    const text = 'hello world'
    expect(buf.push(text)).toBe(true)
    await buf.close()

    expect(await reader.readNext()).toBe(text)
    expect(await reader.readNext()).toBeNull()
  })

  it('should return false when buffer capacity is insufficient', () => {
    const buf = new RingBuffer(SMALL_CAPACITY, READER_COUNT)
    const longString = 'x'.repeat(SMALL_CAPACITY)
    expect(buf.push(longString)).toBe(false)
  })

  it('should throw if push is called after close', async () => {
    const buf = new RingBuffer(LARGE_CAPACITY, READER_COUNT)
    await buf.close()
    expect(() => buf.push('anything')).toThrow('Ring buffer is closed.')
  })

  it('should handle empty string values', async () => {
    const buf = new RingBuffer(LARGE_CAPACITY, READER_COUNT)
    const reader = new RingBufferReader(buf.sab)

    expect(buf.push('')).toBe(true)
    await buf.close()

    expect(await reader.readNext()).toBe('')
    expect(await reader.readNext()).toBeNull()
  })

  it('should handle unicode strings correctly', async () => {
    const buf = new RingBuffer(LARGE_CAPACITY, READER_COUNT)
    const reader = new RingBufferReader(buf.sab)

    const emoji = '👍🐶🌟'
    expect(buf.push(emoji)).toBe(true)
    await buf.close()

    expect(await reader.readNext()).toBe(emoji)
    expect(await reader.readNext()).toBeNull()
  })

  it('should support multiple push and reads in order', async () => {
    const buf = new RingBuffer(LARGE_CAPACITY, READER_COUNT)
    const reader = new RingBufferReader(buf.sab)
    const messages = ['first', 'second', 'third', 'fourth']

    for (const msg of messages) {
      expect(buf.push(msg)).toBe(true)
    }
    for (const msg of messages) {
      expect(await reader.readNext()).toBe(msg)
    }
    await buf.close()
    expect(await reader.readNext()).toBeNull()
  })

  it('should wrap around when reaching end of buffer', async () => {
    // Craft messages to fill end-of-buffer then wrap
    const capacity = SMALL_CAPACITY
    const buf = new RingBuffer(capacity, READER_COUNT)
    const reader = new RingBufferReader(buf.sab)

    // Push small messages until near end
    let i = 0
    while (buf.push(`msg${i}`)) {
      i++
      if (i > 10) break
    }
    // Ensure at least one wrap opportunity
    expect(i).toBeGreaterThan(1)

    await buf.close()

    const results: string[] = []
    let val: string | null
    while ((val = await reader.readNext()) !== null) {
      results.push(val)
    }

    // All pushed messages should be present in order
    const expected = [] as string[]
    for (let j = 0; j < i; j++) expected.push(`msg${j}`)
    expect(results).toEqual(expected)
  })

  it('closing twice should return true on second call', async () => {
    const buf = new RingBuffer(LARGE_CAPACITY, READER_COUNT)
    expect(await buf.close()).toBe(true)
    expect(await buf.close()).toBe(true)
  })
})
