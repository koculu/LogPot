import { isFunction } from './typeCheck'

/**
 * Races a promise (or promise-returning function) against a manual timeout.
 * The timer is cleared as soon as the task settles.
 *
 * @typeParam T - Return type
 * @param task - The work to perform: either a Promise or a function that returns a Promise.
 * @param ms - Timeout in milliseconds after which the returned promise rejects.
 * @returns A promise that resolves with the task’s result, or rejects with
 *   an Error(`Timeout after ${ms}ms`) if the timer elapses first.
 *
 * @example
 * ```ts
 * // Race a fetch against a 2-second timeout
 * withTimeout(fetch('/api/data'), 2000)
 *   .then(res => res.json())
 *   .then(data => console.log('Received:', data))
 *   .catch(err => {
 *     if (err.message.startsWith('Timeout')) {
 *       console.error('Request timed out');
 *     } else {
 *       console.error('Fetch error:', err);
 *     }
 *   });
 * ```
 * @example
 * ```ts
 * // Use a function that returns a Promise
 * withTimeout(() => performLongComputation(), 5000)
 *   .then(result => console.log('Result:', result))
 *   .catch(err => console.error(err));
 * ```
 */
export function withTimeout<T>(
  task: Promise<T> | (() => Promise<T>),
  ms: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>

  return new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timeout after ${ms}ms`))
    }, ms)

    const work = isFunction(task) ? task() : task

    work
      .then((value) => {
        clearTimeout(timer)
        resolve(value)
      })
      .catch((err) => {
        clearTimeout(timer)
        reject(err)
      })
  })
}
