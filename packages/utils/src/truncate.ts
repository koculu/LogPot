/**
 * Truncates the given text to at most `maxLength` characters,
 * adding "…" if the text was longer.
 *
 * @param text - the string to truncate
 * @param maxLength - the maximum allowed length (including the ellipsis)
 * @returns the original text if it's within the limit, otherwise a truncated version ending with "…"
 */
export function truncate(text: string, maxLength: number): string {
  if (maxLength <= 0) return ''
  if (text.length <= maxLength) return text
  if (maxLength <= 3) return '...'.slice(0, maxLength)
  return text.slice(0, maxLength - 3) + '…'
}
