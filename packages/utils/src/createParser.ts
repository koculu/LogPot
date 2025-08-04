/**
 * Represents an option configuration for a single token.
 *
 * @typeParam V - The type of the parsed value for this option.
 *
 */
export type Option<V> = {
  /** Optional function to parse the token immediately following the key. */
  next?: (token: string) => V
  /** ptional default value to assign when the key is present without a parsable next token. */
  default?: V
}

/**
 * Configuration object mapping token keys to their parsing options.
 *
 * @example
 * ```ts
 * const config: ParserConfig = {
 *   size: { next: v => parseInt(v), default: 10 },
 *   verbose: { default: true }
 * }
 * ```
 */
export type ParserConfig = Record<string, Option<unknown>>

/**
 * The result of parsing a string with a given ParserConfig.
 *
 * Includes an optional value for each key in the config (if parsed or defaulted),
 * along with any unrecognized tokens joined into a single `rest` string.
 *
 * @typeParam C - The ParserConfig used for parsing.
 */
export type ParseResult<C extends ParserConfig> = {
  [K in keyof C]?: C[K] extends Option<infer V> ? V : never
} & {
  /** Space-separated unrecognized tokens. */
  rest: string
}

/**
 * Creates a parser function based on a given configuration of token options.
 *
 * The returned parser will:
 * 1. Trim and split the input string by whitespace into tokens.
 * 2. For each token that matches a key in the config:
 *    - If a `next` parser is provided, consume the following token and parse it.
 *      - If parsing yields a non-null value, assign it to the result.
 *      - Otherwise, roll back and optionally apply `default`.
 *    - If no `next` parser, but `default` is provided,
 *      assign the default value.
 * 3. Collect all tokens not matching any config key into `rest`, preserving order.
 *
 * @typeParam C - The shape of the parser configuration.
 * @param config - Mapping of token keys to Option definitions.
 * @returns A function that parses a string
 *          according to the provided config and returns a structured result.
 *
 * @example
 * ```ts
 * const parse = createParser({
 *   width: { next: t => parseInt(t) || 100 },
 *   bold: { default: true }
 * })
 * const result = parse('foo width 200 bar bold')
 * // result: { width: 200, bold: true, rest: 'foo bar' }
 * ```
 */
export function createParser<C extends ParserConfig>(config: C) {
  return (opts: string): ParseResult<C> => {
    const tokens = opts.toLowerCase().trim().split(/\s+/)

    const raw = {} as ParseResult<C>
    const restTokens: string[] = []
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i] as keyof C & string
      const option = config[token]
      if (option == null) {
        restTokens.push(token)
        continue
      }
      if (!option.next && option.default == null)
        raw[token] = null as ParseResult<C>[typeof token]
      if (option.next) {
        const nextToken = tokens[++i] ?? ''
        const parsed = option.next?.(nextToken)
        if (parsed == null) --i // step back to treat nextToken as normal
        else {
          raw[token] = parsed as ParseResult<C>[typeof token]
          continue
        }
      }
      if (option.default != null) {
        raw[token] = option.default as ParseResult<C>[typeof token]
      }
    }
    raw.rest = restTokens.join(' ')
    return raw as ParseResult<C>
  }
}
