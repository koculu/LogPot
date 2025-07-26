import { isFunction, isPlainObject } from '@logpot/utils'

type SerializedFunctionOptions = Record<string, unknown>

export function serializeFn<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj

  if (isFunction(obj)) {
    return { __isFunction__: true, source: obj.toString() } as unknown as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeFn(item)) as unknown as T
  }

  if (isPlainObject(obj)) {
    const result: SerializedFunctionOptions = {}
    for (const key of Object.keys(obj)) {
      result[key] = serializeFn(obj[key] as Record<string, unknown>)
    }
    return result as T
  }

  return obj as T
}

export function deserializeFn<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj as T

  if (Array.isArray(obj)) {
    return obj.map((item) => deserializeFn(item)) as unknown as T
  }

  if (isPlainObject(obj)) {
    if ('__isFunction__' in obj && typeof obj.source === 'string') {
      const functionSource = (obj.source as string).trim()
      return new Function(`return (${functionSource})`)() as T
    }

    const result: Record<string, unknown> = {}
    for (const key of Object.keys(obj)) {
      result[key] = deserializeFn(obj[key] as SerializedFunctionOptions)
    }
    return result as T
  }

  return obj as T
}
