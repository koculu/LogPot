/**
 * Async-waits until counters[index] not equals to 0 (or timeout).
 * @returns true  — non-zero
 *          false — timed out before that happened
 */

export async function waitForNonZero(
  counters: Int32Array,
  index: number,
  timeout = Infinity
): Promise<boolean> {
  while (true) {
    // 1) If already non-zero, resolve immediately:
    if (Atomics.load(counters, index) !== 0) {
      return true
    }

    // 2) Otherwise, wait while it's zero:
    const { async, value } = Atomics.waitAsync(counters, index, 0, timeout)

    if (!async) {
      // value === "not-equal" means it changed under our feet
      // treat the same as "ok"
      return true
    }

    // value is a Promise<"ok"|"timed-out">
    const status = await value
    if (status === 'timed-out') {
      return false
    }
    // if "ok", loop around to double-check (in case of spurious wake)
  }
}
