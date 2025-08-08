/**
 * Aligns `n` up to the nearest multiple of 4.
 *
 * @param n  - A non-negative integer.
 * @returns  The smallest multiple of 4 ≥ n.
 */
export function align4(n: number): number {
  // (n + 3) clears the bottom 2 bits when ANDed with ~3
  return (n + 3) & ~3
}
