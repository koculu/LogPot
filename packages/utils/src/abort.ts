/**
 * Create an abort error that matches the spec for an “AbortError”.
 *
 * @param reason  -Optional human-readable reason or Error instance.
 * @returns        An error with name "AbortError"
 */
export function makeAbortError(
  reason?: string | Error
): Error & { name: string } {
  const message =
    reason instanceof Error
      ? reason.message
      : reason != null
      ? String(reason)
      : 'The operation was aborted'

  const err = new Error(message) as Error & { name: string }
  err.name = 'AbortError'
  return err
}
