import { describe, expect, it } from 'vitest'

import { makeAbortError } from './abort'

describe('makeAbortError', () => {
  it('uses default message when no reason provided', () => {
    const err = makeAbortError()
    expect(err.name).toBe('AbortError')
    expect(err.message).toBe('The operation was aborted')
  })

  it('uses string reason as message', () => {
    const err = makeAbortError('stop')
    expect(err.message).toBe('stop')
  })

  it('uses Error message when reason is Error', () => {
    const err = makeAbortError(new Error('oops'))
    expect(err.message).toBe('oops')
  })
})
