import { ColorConfig } from './colorConfig'

/**
 * Configuration options for the print function.
 *
 */

export interface PrintOptions {
  /**
   * The maximum depth to traverse nested structures. Prevents infinite recursion.
   * @defaultValue 5
   */
  maxDepth?: number

  /**
   * The string used for each indentation level.
   * @defaultValue '  ' (two spaces)
   */
  indentString?: string

  /**
   * Partial color configuration to override default console colors.
   */
  colorConfig?: Partial<ColorConfig>

  /**
   * The quotation character to wrap around string values.
   * @defaultValue '"'
   */
  quotes?: string
}
