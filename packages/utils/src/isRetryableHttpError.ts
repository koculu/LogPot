/**
 * Determines whether an HTTP error (or generic error) should be retried.
 *
 * - Never retry on:
 *   - 2xx (success) responses
 *   - 3xx (redirect) responses
 * - Retry on:
 *   - 408 (Request Timeout)
 *   - 429 (Too Many Requests)
 *   - Any 5xx (server error) responses
 *   - Anyhing without a numeric `status` property
 *
 * @param err - The error to inspect. May be an `Error` with an optional numeric `status` field.
 * @returns `true` if the error is retryable, otherwise `false`.
 *
 * @example
 * ```ts
 * // Retry on 500 server error
 * isRetryableHttpError({ status: 500 })    // → true
 *
 * // Do not retry on 404 Not Found
 * isRetryableHttpError({ status: 404 })    // → false
 *
 * // Retry on network or other non-HTTP errors
 * isRetryableHttpError(new Error('network')) // → true
 * ```
 */
export function isRetryableHttpError(err: unknown): boolean {
  if (!err) return true
  const obj = err as unknown as Record<string, unknown>
  if (obj.status == null) return true
  const status = Number(obj.status)
  if (isNaN(status)) return true

  if (status >= 500 && status < 600) return true
  if (
    status === 408 || // request timeout
    status === 429 // rate limit
  )
    return true
  return false
}
