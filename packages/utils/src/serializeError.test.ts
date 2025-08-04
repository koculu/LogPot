import { describe, expect, it } from 'vitest'

import { isSerializedError, serializeError } from './serializeError'

describe('serializeError', () => {
  it('serializes errors with cause', () => {
    const root = new Error('root')
    const err = new Error('child', { cause: root })
    const serialized = serializeError(err, { cause: true })
    expect(serialized).toMatchObject({
      type: 'Error',
      message: 'child',
      cause: { type: 'Error', message: 'root' },
    })
    expect(isSerializedError(serialized)).toBe(true)
  })

  it('handles non-error values', () => {
    expect(serializeError('oops')).toEqual({
      type: 'string',
      message: 'oops',
    })
  })
})
