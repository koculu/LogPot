import { setTimeout as delay } from 'timers/promises'
import { isPromise } from 'util/types'

import { makeAbortError } from './abort'

/**
 * Settings for how long and how often to retry.
 */
export interface WaitUntilOptions {
  /** Initial wait interval in milliseconds before retrying. @defaultValue 50 */
  initialInterval?: number
  /** Maximum wait interval in milliseconds between retries. @defaultValue 30000 */
  maxInterval?: number
  /** Overall timeout in milliseconds. If reached, an AbortError is thrown. */
  timeout?: number
  /** Optional signal; if aborted, waiting stops and an AbortError is thrown. */
  signal?: AbortSignal
}
/**
 * Repeatedly evaluates a synchronous or asynchronous condition function
 * until it returns a truthy value, using exponential backoff between retries.
 *
 * Supports an overall timeout and optional AbortSignal for cancellation.
 *
 * @typeParam T - Return value
 * @param condition - A function that returns a truthy value or a Promise resolving to truthy.
 *   `waitUntil` resolves with that truthy value.
 * @param options - Settings for how long and how often to retry.
 * @returns Resolves with the first truthy result from `condition`.
 * @throws If the provided `signal` is aborted, or the `timeout` elapses.
 *
 * @example
 * ```ts
 * // Wait for a DOM element to appear (up to 5 seconds)
 * const btn = await waitUntil(
 *   () => document.querySelector<HTMLButtonElement>('#submit'),
 *   { timeout: 5000 }
 * )
 * btn.click()
 * ```
 * @example
 * ```ts
 * // Poll an API until it reports readiness
 * const readyData = await waitUntil(
 *   async () => {
 *     const resp = await fetch('/api/status')
 *     const json = await resp.json()
 *     return json.ready ? json : null
 *   },
 *   { initialInterval: 100, maxInterval: 2000, timeout: 15000 }
 * )
 * console.log('Service is ready:', readyData)
 * ```
 */
export async function waitUntil<T>(
  condition: () => T | Promise<T>,
  {
    initialInterval = 50,
    maxInterval = 30_000,
    timeout,
    signal,
  }: WaitUntilOptions = {}
): Promise<T> {
  const firstCheck = condition()
  if (isPromise(firstCheck)) {
    const res = await firstCheck
    if (res) return res
  } else if (firstCheck) return firstCheck

  const start = Date.now()
  let interval = initialInterval

  while (true) {
    if (signal?.aborted) throw makeAbortError(signal.reason)
    if (timeout != null && Date.now() - start >= timeout) {
      throw makeAbortError(`Timed out after ${timeout}ms`)
    }

    // Wait with built-in signal support
    try {
      await delay(interval, undefined, { signal })
    } catch (err) {
      // normalize the abort error
      if (signal?.aborted) throw makeAbortError(signal.reason)
      throw err
    }

    const result = await condition()
    if (result) return result

    // increase for next iteration
    interval = Math.min(interval * 2, maxInterval)
  }
}
