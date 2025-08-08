import { isAbortError } from './typeCheck'

/**
 * Configuration options for the retry mechanism.
 */
export interface RetryOption {
  /**
   * The maximum number of retry attempts before giving up.
   * Defaults to `3` if not specified.
   */
  maxRetry?: number
  /**
   * The base delay (in milliseconds) for exponential backoff.
   * Defaults to `500` ms if not specified.
   */
  baseDelay?: number
  /**
   * The timeout (in milliseconds) for each operation attempt.
   * If the operation does not complete within this time, it will be aborted.
   * Defaults to `5000` ms (5 seconds). Set to `0` to disable timeout.
   */
  timeout?: number
  /**
   * The maximum delay (in milliseconds) between retry attempts.
   * Defaults to `30000` ms (30 seconds).
   */
  maxDelay?: number
}

const DEFAULTS: Required<RetryOption> = {
  timeout: 5_000,
  maxRetry: 3,
  baseDelay: 500,
  maxDelay: 30_000,
}

/**
 * Represents an action to take after a failed retry attempt.
 */
export enum RetryAction {
  /**
   * Stop retrying and propagate the error immediately.
   */
  STOP,
  /**
   * Continue retrying according to the backoff strategy.
   */
  CONTINUE,
}

/**
 * Executes a synchronous or asynchronous operation with retries and exponential backoff.
 *
 * @typeParam T - The type of the result returned by the operation.
 *
 * @param operation - The synchronous or asynchronous operation to execute. Receives an optional
 * `AbortSignal` that can be used to handle timeouts.
 *
 * @param opt - Optional configuration for retry behavior.
 *
 * @param onError - Optional callback invoked after each failed attempt.
 * Receives the attempt number (starting at `1`) and the error thrown.
 * The callback can return a {@link RetryAction} to control whether
 * retries should continue (`RetryAction.CONTINUE`) or stop (`RetryAction.STOP`).
 * It may also return `void` to continue retrying.
 *
 * @param retryErrorCodes - if provided, any error whose `err.code` is not
 * in this array will not be retried
 *
 * @returns A promise that resolves with the result of the operation if successful.
 * If all retry attempts fail, the promise is rejected with an `Error`
 * whose `cause` is set to the last error encountered.
 *
 * @throws If the operation fails after all retries or
 * if an `AbortError` is thrown during a timeout.
 *
 * @example
 * ```ts
 * // Attempt to fetch data up to 5 times with exponential backoff,
 * // 1s base delay, 10s timeout per attempt, and custom stop logic.
 * async function fetchDataWithRetry() {
 *   return await withRetry(
 *     async (signal) => {
 *       const res = await fetch('https://api.example.com/data', { signal });
 *       if (!res.ok) {
 *         const err = new Error(`HTTP ${res.status}`);
 *         // attach code for retry filtering
 *         (err as any).code = String(res.status);
 *         throw err;
 *       }
 *       return await res.json();
 *     },
 *     {
 *       maxRetry: 5,
 *       baseDelay: 1000,
 *       timeout: 10_000,
 *       maxDelay: 20_000,
 *     },
 *     (attempt, err) => {
 *       console.warn(`Attempt #${attempt} failed:`, err);
 *       // stop retrying on 404 Not Found
 *       if ((err as any).code === '404') {
 *         return RetryAction.STOP;
 *       }
 *     },
 *     // Only retry on server errors (5xx) or timeouts
 *     ['500', '502', '503', '504']
 *   );
 * }
 *
 * fetchDataWithRetry()
 *   .then(data => console.log('Data:', data))
 *   .catch(err => console.error('Final failure:', err));
 * ```
 */
export async function withRetry<T>(
  operation: (signal?: AbortSignal) => Promise<T> | T,
  opt?: RetryOption,
  onError?: (
    attempt: number,
    err: unknown
  ) => Promise<RetryAction | void> | RetryAction | void,
  retryErrorCodes?: string[]
): Promise<T> {
  const reqOpt = { ...DEFAULTS, ...opt }
  if (reqOpt.maxRetry == null || reqOpt.maxRetry < 1) reqOpt.maxRetry = 1
  const { maxRetry, baseDelay, timeout, maxDelay } = reqOpt
  let lastError: unknown
  let attempt = 1
  for (; attempt <= maxRetry; attempt++) {
    const controller = timeout != 0 ? new AbortController() : null
    const signal = controller?.signal
    let timer: ReturnType<typeof setTimeout> | undefined

    if (controller && timeout > 0) {
      timer = setTimeout(() => controller.abort(), timeout)
    }

    try {
      const result = await operation(signal ?? undefined)
      if (timer) clearTimeout(timer)
      return result
    } catch (err) {
      lastError = err
      if (timer) clearTimeout(timer)

      if (isAbortError(err)) throw err

      if (retryErrorCodes && retryErrorCodes.length > 0) {
        const code = (err as { code?: string }).code
        if (!code) break
        if (!retryErrorCodes.includes(code)) break
      }

      if ((await onError?.(attempt, err)) == RetryAction.STOP) break

      if (attempt < maxRetry) {
        const jitter = 0.5 + Math.random() * 0.5
        const rawDelay = baseDelay * 2 ** (attempt - 1) * jitter
        const delay = Math.min(rawDelay, maxDelay)
        await new Promise((res) => setTimeout(res, delay))
      }
    }
  }

  throw new Error(
    `Operation failed after ${Math.min(attempt, maxRetry)} attempts`,
    {
      cause: lastError,
    }
  )
}
