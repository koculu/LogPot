/**
 * Centers the given text in a field of the given width,
 * padding with spaces on both sides.
 *
 * @param text - the word or phrase to center
 * @param width - the total width of the field (including text)
 * @returns the centered string (or the original text if width ≤ text.length)
 */
export function centerText(text: string, width: number): string {
  const len = text.length
  if (width <= len) {
    return text
  }

  const totalPadding = width - len
  const padLeft = Math.floor(totalPadding / 2)
  return text.padStart(len + padLeft).padEnd(width)
}
