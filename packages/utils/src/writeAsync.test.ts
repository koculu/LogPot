import { PassThrough } from 'stream'
import { describe, expect, it } from 'vitest'

import { buildWriteAsync } from './writeAsync'

describe('buildWriteAsync', () => {
  it('writes data to a stream', async () => {
    const pt = new PassThrough()
    const writeAsync = buildWriteAsync()
    const chunks: string[] = []
    pt.on('data', (c) => chunks.push(c.toString()))
    await writeAsync(pt, 'hello')
    await writeAsync(pt, 'world')
    expect(chunks.join('')).toBe('helloworld')
  })

  it('waits for drain when backpressure occurs', async () => {
    const pt = new PassThrough({ highWaterMark: 1 })
    pt.resume()
    const writeAsync = buildWriteAsync()
    let drained = false
    pt.on('drain', () => {
      drained = true
    })
    await writeAsync(pt, Buffer.alloc(1024))
    expect(drained).toBe(true)
  })
})
