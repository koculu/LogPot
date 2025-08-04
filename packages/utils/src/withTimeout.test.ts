import { describe, expect, it } from 'vitest'

import { withTimeout } from './withTimeout'

describe('withTimeout', () => {
  it('resolves before timeout', async () => {
    const result = await withTimeout(
      new Promise((res) => setTimeout(() => res('ok'), 1)),
      50
    )
    expect(result).toBe('ok')
  })

  it('rejects when time exceeds limit', async () => {
    await expect(
      withTimeout(new Promise((res) => setTimeout(res, 50)), 5)
    ).rejects.toThrow('Timeout after 5ms')
  })

  it('works with task function', async () => {
    const result = await withTimeout(() => Promise.resolve(5), 10)
    expect(result).toBe(5)
  })
})
