import { isString } from './typeCheck'

/**
 * Plain-object representation of an Error or thrown value.
 * Includes structured details, avoiding circular references.
 */
export interface SerializedError {
  /** The error’s constructor name or type. */
  type: string

  /** The main error message. */
  message: string

  /** Optional stack trace string (if `stack` option enabled). */
  stack?: string

  /**
   * Serialized cause of this error (if `cause` option enabled).
   * May be another SerializedError or any raw value.
   */
  cause?: SerializedError | unknown

  /**
   * For AggregateError: array of child errors (if `aggregated` option enabled).
   */
  errors?: SerializedError[] // for AggregateError

  /**
   * Any additional enumerable properties from the original Error.
   * Allows capturing custom fields.
   */
  [key: string]: unknown
}

/**
 * Options controlling how errors are converted into SerializedError.
 */
export interface ErrorSerialization {
  /**
   * Maximum recursion depth when traversing nested causes or aggregates.
   */
  maxDepth?: number

  /** Include the `error.cause` property in serialization. */
  cause?: boolean

  /** Include `AggregateError.errors` array serialization. */
  aggregated?: boolean

  /** Include the `error.stack` string in the output. */
  stack?: boolean
  /**
   * Hook invoked after serializing each error node.
   * Allows post-processing or filtering of the SerializedError.
   *
   * @param err - The freshly built SerializedError.
   * @param depth - Current recursion depth (0 = root).
   * @returns Possibly modified SerializedError.
   */
  hook?: (err: SerializedError, depth: number) => SerializedError
}

// Type guard to check if an object is a proper Error
function isErrorObject(
  value: unknown
): value is Error & Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    isString((value as { message: unknown }).message)
  )
}

function serializeErrorInternal(
  error: unknown,
  options: Required<ErrorSerialization>,
  depth: number,
  seen = new Set<unknown>()
): SerializedError {
  const { maxDepth, cause, aggregated, stack, hook } = options
  if (depth > maxDepth || seen.has(error)) {
    return {
      type: 'Error',
      message: '[Truncated]',
    }
  }
  seen.add(error)
  if (isErrorObject(error)) {
    const result: SerializedError = {
      type: error.name ?? 'Error',
      message: error.message ?? '',
    }

    if (stack && typeof error.stack === 'string') {
      result.stack = error.stack
    }

    // Copy custom enumerable properties
    for (const key of Object.keys(error)) {
      if (
        key !== 'name' &&
        key !== 'message' &&
        key !== 'stack' &&
        key !== 'cause'
      ) {
        result[key] = (error as Record<string, unknown>)[key]
      }
    }

    // Handle `cause`
    if (cause && 'cause' in error) {
      const cause = (error as { cause: unknown }).cause
      result.cause = isErrorObject(cause)
        ? serializeErrorInternal(cause, options, depth + 1, seen)
        : cause
    }

    // Handle AggregateError.errors
    if (
      aggregated &&
      error instanceof AggregateError &&
      Array.isArray(error.errors)
    ) {
      result.errors = error.errors.map((err) =>
        isErrorObject(err)
          ? serializeErrorInternal(err, options, depth + 1, seen)
          : { type: typeof err, message: String(err) }
      )
    }
    return hook(result, depth)
  }

  // Non-error thrown value
  return {
    type: typeof error,
    message: String(error),
  }
}
const MARKER = Symbol('serialized')

/**
 * Type-guard to detect whether a value has been serialized into a `SerializedError`
 * by `serializeError`. Internally marks serialized errors with a hidden symbol.
 *
 * @param error - The value to test.
 * @returns `true` if `error` is a `SerializedError` produced by `serializeError`; otherwise `false`.
 *
 * @example
 * const original = new Error('oops');
 * const serialized = serializeError(original);
 *
 * console.log(isSerializedError(original));   // → false
 * console.log(isSerializedError(serialized)); // → true
 *
 * @example
 * ```ts
 * // Plain objects without the internal marker return false
 * console.log(isSerializedError({ type: 'Error', message: 'oops' })); // → false
 * ```
 */
export function isSerializedError(error: unknown) {
  if (error != null && Object.hasOwn(error, MARKER)) return true
  return false
}

/**
 * Serialize any thrown value into a plain object (`SerializedError`).
 *
 * If the input has already been marked as serialized (via internal marker),
 * it is returned directly. Otherwise, it traverses `cause`, `AggregateError`,
 * and custom properties per options.
 *
 * @param error - The value to serialize (Error, AggregateError, or any thrown).
 * @param options - Configuration for recursion, inclusion of cause/stack, etc.
 * @returns The structured, plain-object representation of the error.
 *
 * @example
 * ```ts
 * // Simple Error
 * const simple = new Error('oops');
 * console.log(serializeError(simple));
 *
 * // Error with cause
 * const root = new Error('root');
 * const child = new Error('child', { cause: root });
 * console.log(serializeError(child, { cause: true }));
 *
 * @example
 * // AggregateError example
 * const agg = new AggregateError([
 *   new Error('a'),
 *   new Error('b')
 * ], 'multiple');
 * console.log(
 *   serializeError(agg, {
 *     aggregated: true,
 *     stack: false
 *   })
 * );
 * ```
 */
export function serializeError(
  error: unknown,
  options: ErrorSerialization = {}
): SerializedError {
  if (error != null && Object.hasOwn(error, MARKER)) {
    return error as SerializedError
  }
  const {
    maxDepth = 10,
    cause = true,
    aggregated = true,
    stack = true,
    hook = (v) => v,
  } = options
  const err = serializeErrorInternal(
    error,
    { maxDepth, cause, aggregated, stack, hook },
    0,
    new Set()
  )

  Object.defineProperty(err, MARKER, {
    value: true,
    writable: false,
    enumerable: false,
    configurable: false,
  })
  return serializeError(err, options)
}
