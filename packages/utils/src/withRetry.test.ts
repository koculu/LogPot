import { describe, expect, it, vi } from 'vitest'

import { RetryAction, withRetry } from './withRetry'

describe('withRetry', () => {
  it('retries until operation succeeds', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail1'))
      .mockRejectedValueOnce(new Error('fail2'))
      .mockResolvedValue('ok')
    const result = await withRetry(operation, {
      maxRetry: 5,
      baseDelay: 0,
      timeout: 0,
      maxDelay: 0,
    })
    expect(result).toBe('ok')
    expect(operation).toHaveBeenCalledTimes(3)
  })

  it('stops when onError returns STOP', async () => {
    const err = new Error('fail')
    const operation = vi.fn().mockRejectedValue(err)
    await expect(
      withRetry(
        operation,
        { maxRetry: 5, baseDelay: 0, timeout: 0, maxDelay: 0 },
        () => RetryAction.STOP
      )
    ).rejects.toBeInstanceOf(Error)
    expect(operation).toHaveBeenCalledTimes(1)
  })

  it('respects retryErrorCodes', async () => {
    const err: Error & { code?: string } = new Error('bad')
    err.code = 'X'
    const operation = vi.fn().mockRejectedValue(err)
    await expect(
      withRetry(
        operation,
        { maxRetry: 3, baseDelay: 0, timeout: 0, maxDelay: 0 },
        undefined,
        ['Y']
      )
    ).rejects.toStrictEqual(
      new Error('Operation failed after 1 attempts', { cause: err })
    )
    expect(operation).toHaveBeenCalledTimes(1)
  })
})
