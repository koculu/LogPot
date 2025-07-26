import { isPlainObject } from './typeCheck'

/**
 * Recursively merges multiple objects into one plain object.
 *
 * Each provided object is iterated in order. If a key exists in multiple objects:
 * - If both the accumulated result and the new value are plain objects, they are merged recursively.
 * - Otherwise, the new value overwrites the previous one.
 *
 * @param objects - A list of objects (or undefined) to merge.
 * @returns A new object containing all merged keys.
 */
function mergeInternal(
  ...objects: Array<Record<string, unknown> | undefined>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const obj of objects) {
    if (!isPlainObject(obj)) continue
    for (const key of Object.keys(obj)) {
      const src = obj[key]
      const prev = result[key]
      if (isPlainObject(prev) && isPlainObject(src)) {
        result[key] = mergeInternal(prev, src)
      } else {
        result[key] = src
      }
    }
  }

  return result
}

/**
 * Deeply merge a base value `T` with any number of partial or full override objects.
 *
 * This function enforces that the base value is a plain object. It merges nested objects
 * recursively and overwrites non-object values or object/primitive mismatches with later overrides.
 *
 * @typeParam T -  base type
 * @typeParam K - return type
 * @param base - The base object to merge into. Must be a plain object.
 * @param overrides - Partial or full override objects.
 *   Non-object values or undefined entries will simply overwrite or be skipped.
 * @returns The merged result, typed as `K`.
 * @throws If the `base` argument is not a plain object.
 */
export function merge<T, K = T>(base: T, ...overrides: Array<unknown>): K {
  if (!isPlainObject(base)) {
    throw new Error('merge is not possible with ' + String(base))
  }
  const merged = mergeInternal(
    base as Record<string, unknown>,
    ...(overrides as Record<string, unknown>[])
  )
  return merged as K
}
