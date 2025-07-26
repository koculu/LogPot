const green = (s: string) => `\x1b[32m${s}\x1b[0m`

/**
 * Measure and log how long `fn` takes.
 *
 * @param label - A short label (e.g. "cleanDist")
 * @param emoji - An emoji to prefix the log line
 * @param fn - A sync or async function to time
 * @returns Whatever `fn` returns
 */
export async function timeIt<T>(
  label: string,
  emoji: string,
  fn: () => T | Promise<T>
): Promise<T> {
  const start = process.hrtime()
  const result = await Promise.resolve(fn())
  const [sec, nanosec] = process.hrtime(start)

  // Print prefix without newline
  process.stdout.write(`${emoji} ${label}: `)

  // Format ms or s
  let formatted: string
  if (sec === 0) {
    formatted = `${(nanosec / 1e6).toFixed(3)}ms`
  } else {
    const ms = (nanosec / 1e6).toFixed(0).padStart(3, '0')
    formatted = `${sec}.${ms}s`
  }

  console.log(green(formatted))
  return result
}
