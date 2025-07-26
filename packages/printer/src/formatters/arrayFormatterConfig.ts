/**
 * Options for controlling how arrays are formatted.
 */
export interface ArrayFormatterConfig {
  /** Max total characters for inline output.
   * @defaultValue 40
   */
  maxInlineLength: number
  /** Max items for inline output.
   * @defaultValue 10
   */
  maxInlineItems: number
  /** Max items to show in multiline output.
   * @defaultValue 100
   */
  maxItems: number
  /** Include a trailing comma in multiline.
   * @defaultValue false
   */
  trailingComma: boolean
  /** Called when items are truncated */
  overflowMessage: (length: number, remaining: number) => string
  /** Custom hook to force inline. */
  shouldInline: (arr: unknown[]) => boolean
  /** Bracket delimiters
   *  @defaultValue '[]' */
  delimiters: { open: string; close: string }
  /** Separator for inline output
   *  @defaultValue ', ' */
  separatorInline: string
  /** Separator for multline output
   *  @defaultValue ',' */
  separator: string
  /** Prefix for array items.
   * Can be used to create YAML formatter.
   * @defaultValue '' */
  prefix: string
  /** String represents empty sparse array entry.
   * @defaultValue '<empty>'*/
  sparseArrayEmptyElement: string
}
