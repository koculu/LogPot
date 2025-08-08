export function encodeToArray(
  encoder: TextEncoder,
  target: Uint8Array,
  str: string
): number {
  const { read, written } = encoder.encodeInto(str, target)
  if (read < str.length) return -1
  return written
}
