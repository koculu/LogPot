import { ColorConfig } from './colorConfig'

/**
 * Context object passed through the printer to maintain state and configuration
 * across recursive formatting of values.
 */

export interface PrintContext {
  /**
   * Tracks objects that have already been visited to prevent infinite
   * recursion on circular references.
   */
  seen: WeakSet<object>

  /**
   * Current accumulated indent string (combination of repeated `indentString`
   * segments) for nested values.
   */
  indent: string

  /**
   * Maximum allowed indentation level before truncating further nesting.
   */
  maxIndent: number

  /**
   * String used for one level of indentation (e.g. two spaces or `\t`).
   */
  indentString: string

  /**
   * Configuration mapping JavaScript primitive types and punctuation
   * to colorizers or style tokens.
   */
  colorConfig: ColorConfig

  /**
   * Characters to wrap around string values (e.g. `"` or `'`).
   * Set to empty string (`''`) to disable quoting.
   */
  quotes: string

  /**
   * Stack of object keys representing the current traversal path.
   */
  keys: string[]

  /**
   * Prefix inserted before each line when printing multi-line values
   * (useful for nested or list items).
   */
  prefix: string
}
