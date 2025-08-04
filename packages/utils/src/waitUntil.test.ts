import { describe, expect, it } from 'vitest'

import { waitUntil } from './waitUntil'

describe('waitUntil', () => {
  it('resolves when condition becomes truthy', async () => {
    let count = 0
    const result = await waitUntil(
      () => (++count >= 3 ? 'done' : null),
      { initialInterval: 1, maxInterval: 2 }
    )
    expect(result).toBe('done')
  })

  it('rejects on timeout', async () => {
    await expect(
      waitUntil(() => false, { timeout: 5, initialInterval: 1, maxInterval: 2 })
    ).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('honors abort signal', async () => {
    const controller = new AbortController()
    setTimeout(() => controller.abort('stop'), 1)
    await expect(
      waitUntil(() => false, { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
