/**
 * Checks whether a value is a string primitive or a String object.
 *
 * @param value - The value to test.
 * @returns `true` if `value` is a string or an instance of String, otherwise `false`.
 */
export const isString = (value: unknown): value is string =>
  typeof value === 'string' || value instanceof String

/**
 * Determines if an unknown value represents an AbortError.
 *
 * @param err - The value to inspect.
 * @returns `true` if `err` is an object with a `name` property equal to "AbortError".
 */
export function isAbortError(err: unknown): boolean {
  const obj = err as Record<string, unknown>
  return (
    obj != null && typeof obj.name === 'string' && obj.name === 'AbortError'
  )
}

/**
 * Checks whether a value is a function.
 *
 * @param func - The value to test.
 * @returns `true` if `func` is of type "function", otherwise `false`.
 */
export function isFunction(
  func: unknown
): func is (...args: unknown[]) => unknown {
  return typeof func === 'function'
}

/**
 * Determines if a value is a plain object (i.e., an object literal or created via `Object.create(null)`).
 *
 * @param value - The value to inspect.
 * @returns `true` if `value` is a non-null object whose prototype is `Object.prototype` or `null`.
 */
export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/**
 * Checks if a value is either a number primitive or a boolean primitive.
 *
 * @param value - The value to test.
 * @returns `true` if `value` is a number or a boolean, otherwise `false`.
 */
export function isNumberOrBoolean(value: unknown): value is number | boolean {
  return typeof value === 'number' || typeof value === 'boolean'
}

/**
 * Determines if a value is a plain object with no own enumerable properties.
 *
 * @param value - The value to inspect.
 * @returns `true` if `value` is an object literal or `Object.create(null)` and has no keys, otherwise `false`.
 */
export function isEmptyPlainObject(
  value: unknown
): value is Record<string, never> {
  if (!isPlainObject(value)) return false
  for (const _ in value) {
    return false
  }
  return true
}

/**
 * Checks whether a value is an instance of the built-in Error class.
 *
 * @param o - The value to test.
 * @returns `true` if `o` is an `Error`, otherwise `false`.
 */
export function isError(o: unknown): o is Error {
  return o instanceof Error
}
