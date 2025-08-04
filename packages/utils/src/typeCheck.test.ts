import { describe, expect, it } from 'vitest'

import { makeAbortError } from './abort'
import {
  isAbortError,
  isEmptyPlainObject,
  isError,
  isFunction,
  isNumberOrBoolean,
  isPlainObject,
  isString,
} from './typeCheck'

describe('typeCheck utilities', () => {
  it('detects strings', () => {
    expect(isString('a')).toBe(true)
    expect(isString(1)).toBe(false)
  })

  it('detects AbortError', () => {
    const err = makeAbortError('reason')
    expect(isAbortError(err)).toBe(true)
    expect(isAbortError(new Error('x'))).toBe(false)
  })

  it('detects functions', () => {
    expect(isFunction(() => {})).toBe(true)
    expect(isFunction(123)).toBe(false)
  })

  it('checks plain objects', () => {
    expect(isPlainObject({})).toBe(true)
    expect(isPlainObject(Object.create(null))).toBe(true)
    expect(isPlainObject([])).toBe(false)
  })

  it('detects numbers or booleans', () => {
    expect(isNumberOrBoolean(1)).toBe(true)
    expect(isNumberOrBoolean(false)).toBe(true)
    expect(isNumberOrBoolean('1')).toBe(false)
  })

  it('checks empty plain objects', () => {
    expect(isEmptyPlainObject({})).toBe(true)
    expect(isEmptyPlainObject({ a: 1 })).toBe(false)
    expect(isEmptyPlainObject([])).toBe(false)
  })

  it('detects Error instances', () => {
    expect(isError(new Error('x'))).toBe(true)
    expect(isError({})).toBe(false)
  })
})
