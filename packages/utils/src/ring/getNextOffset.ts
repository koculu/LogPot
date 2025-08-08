import { align4 } from './align4'
import { RingHeader } from './ringHeader'

export const MIN_CHUNK_SIZE = 1000

export function getNextOffset(header: RingHeader, capacity: number) {
  const { offset, len } = header
  const newOffset = align4(offset + len + 8)
  if (newOffset >= capacity - MIN_CHUNK_SIZE) return 0
  return newOffset
}
