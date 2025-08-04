import { describe, expect, it } from 'vitest'

import { isRetryableHttpError } from './isRetryableHttpError'

describe('isRetryableHttpError', () => {
  it('retries on 5xx and specific codes', () => {
    expect(isRetryableHttpError({ status: 500 })).toBe(true)
    expect(isRetryableHttpError({ status: 408 })).toBe(true)
    expect(isRetryableHttpError({ status: 429 })).toBe(true)
  })

  it('does not retry on other codes', () => {
    expect(isRetryableHttpError({ status: 404 })).toBe(false)
    expect(isRetryableHttpError({ status: 200 })).toBe(false)
  })

  it('retries when status missing or non-numeric', () => {
    expect(isRetryableHttpError(new Error('net'))).toBe(true)
    expect(isRetryableHttpError({})).toBe(true)
    expect(isRetryableHttpError({ status: 'foo' })).toBe(true)
  })
})
