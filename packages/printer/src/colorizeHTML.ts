import { type ColorOrColorizer, toColorizer } from './consoleColor'

/**
 * Configuration options to customize {@link colorizeHTML}.
 *
 * Every field accepts either a colorizer function or a space separated list
 * of ANSI style tokens that will be converted to a colorizer function using
 * {@link toColorizer}.
 */
export interface ColorizeHTMLConfig {
  /** Color applied to non-tag content. */
  content?: ColorOrColorizer
  /** Color for tag names and their brackets. */
  tag?: ColorOrColorizer
  /** Color for attribute keys. */
  attrKey?: ColorOrColorizer
  /** Color for attribute values. */
  attrValue?: ColorOrColorizer
  /** Color for the equals sign between attribute key and value. */
  attrEq?: ColorOrColorizer
}

/**
 * Colorize an HTML snippet for console output.
 *
 * The function performs a very small amount of parsing using regular
 * expressions and wraps different parts of the HTML string with ANSI
 * colors. It is not a full HTML parser but works well for debugging
 * or visualising small fragments.
 *
 * @param html - raw HTML string to colorize.
 * @param config - optional {@link ColorizeHTMLConfig} to override defaults.
 * @returns the ANSI colored HTML string.
 *
 * @example
 * ```ts
 * import { colorizeHTML } from '@logpot/printer'
 *
 * console.log(colorizeHTML('<div class="greet">Hi</div>'))
 * ```
 */
export function colorizeHTML(
  html: string,
  config: ColorizeHTMLConfig = {},
): string {
  const {
    content: contentOption = '#b40657',
    tag: tagColorOption = '#106767',
    attrKey: attrKeyColorOption = 'cyan',
    attrValue: attrValueColorOption = 'yellow',
    attrEq: attrEqColorOption = 'gray',
  } = config
  const content = toColorizer(contentOption)
  const tagColor = toColorizer(tagColorOption)
  const attrKeyColor = toColorizer(attrKeyColorOption)
  const attrValueColor = toColorizer(attrValueColorOption)
  const attrEqColor = toColorizer(attrEqColorOption)
  return content(
    html
      // Color the opening delimiter, optional slash, and tag name together.
      .replace(/(&lt;|<)(\/?)([!a-zA-Z0-9:-]+)/g, (_, lt, slash, tag) => {
        return tagColor(`${lt}${slash}${tag}`)
      })
      // Attribute key and equals
      .replace(/([a-zA-Z-]+)(=)/g, (_, attr, eq) => {
        return attrKeyColor(attr) + attrEqColor(eq)
      })
      // Attribute values, both single and double quoted
      .replace(/("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/g, (m) => {
        return attrValueColor(m)
      })
      // Closing bracket or self-close
      .replace(/(\/?>)/g, (m) => tagColor(m)),
  )
}
