import { describe, expect, it } from 'vitest'

import { AsyncJobQueue } from './asyncJobQueue'

describe('AsyncJobQueue', () => {
  it('runs jobs up to the concurrency limit and resolves on drain', async () => {
    const queue = new AsyncJobQueue(2)
    let current = 0
    let maxRunning = 0
    const results: number[] = []

    for (let i = 0; i < 5; i++) {
      queue.enqueue(async () => {
        current++
        maxRunning = Math.max(maxRunning, current)
        await new Promise((r) => setTimeout(r, 1))
        results.push(i)
        current--
      })
    }

    await queue.drain()
    expect(results.sort()).toEqual([0, 1, 2, 3, 4])
    expect(maxRunning).toBeLessThanOrEqual(2)
  })

  it('drain resolves immediately when queue empty', async () => {
    const queue = new AsyncJobQueue()
    await expect(queue.drain()).resolves.toBeUndefined()
  })
})
