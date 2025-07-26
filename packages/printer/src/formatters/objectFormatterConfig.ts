/**
 * Configuration options for ObjectFormatter.
 */
export interface ObjectFormatterConfig {
  /** Include surrounding braces `{ }`. */
  showBrackets: boolean
  /** Include commas between entries. */
  showCommas: boolean
  /** Custom key-sorting function. */
  sortKeys: (keys: string[], obj: Record<string, unknown>) => string[]
  /** Max number of entries to display before truncating. */
  maxEntries: number
}
