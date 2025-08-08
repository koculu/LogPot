/**
 * Async-waits until counters[index] === 0 (or timeout).
 * @returns true        — saw zero
 *          false       — timeout expired
 */

export async function waitForZero(
  counters: Int32Array,
  index: number,
  timeout = Infinity
): Promise<boolean> {
  while (true) {
    // 1) If already zero, resolve immediately:
    if (Atomics.load(counters, index) === 0) {
      return true
    }

    // 2) Otherwise, wait while it's equal to the current non-zero value:
    const current = Atomics.load(counters, index)
    const { async, value } = Atomics.waitAsync(
      counters,
      index,
      current,
      timeout
    )

    if (!async) {
      // value === "not-equal" means it changed under our feet;
      // loop around to re-check if it's now zero
      continue
    }

    // value is a Promise<"ok"|"timed-out">
    const status = await value
    if (status === 'timed-out') {
      return false
    }
    // if "ok", loop to re-check (handles spurious wakeups)
  }
}
