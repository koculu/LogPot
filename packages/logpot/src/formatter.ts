import { ArrayFormatterConfig } from '@logpot/printer'
import { DateFormatterConfig } from '@logpot/printer'
import { ObjectFormatterConfig } from '@logpot/printer'
import { print } from '@logpot/printer'
import { createPrinter, Printer } from '@logpot/printer'
import { createDateFormatter } from '@logpot/utils'
import { formatTemplate } from '@logpot/utils'
import { isFunction, isString } from '@logpot/utils'
import { gzipSync } from 'zlib'

import { applyOptions } from './applyOptions'
import { DEFAULT_LEVELS, LevelDefinition, LevelName } from './levels'
import { Log } from './log'
import {
  ConsoleTheme,
  getConsoleTheme,
  getLevelEmoji,
  RequiredConsoleTheme,
} from './transports/consoleTheme'

/**
 * Supported time serialization formats.
 */
export type TimeFormat = 'epoch' | 'iso' | Intl.DateTimeFormatOptions

/**
 * Common options shared across all formatter kinds.
 * @typeParam Levels - Custom log level definitions (name ⇒ priority).
 */
export interface CommonOptions<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> {
  /**
   * Locale(s) for timestamp formatting (e.g., 'en-US', ['de-DE', 'en-US']).
   * Defaults to runtime environment locale.
   */
  locale?: string | string[]

  /**
   * How to format the `time` field:
   * - 'epoch': numeric timestamp
   * - 'iso': ISO 8601 string
   * - Intl.DateTimeFormatOptions: custom formatter options
   */
  timeFormat?: TimeFormat

  /**
   * Map of record field names to output keys. Allows renaming `msg`, `time`, `level`, or other meta fields.
   */
  fieldMap?: Record<string, string>

  /**
   * If true, the formatter output will be GZIP-compressed.
   * Sets `Content-Encoding: gzip` header.
   * @defaultValue false
   */
  gzip?: boolean

  /**
   * If true, merges `meta` properties directly into top-level output instead of nesting under `meta`.
   * @defaultValue false
   */
  mergeMeta?: boolean

  /**
   * How to serialize each record:
   * - 'simple': JSON.stringify(record)
   * - 'pretty': JSON.stringify(record, null, 2)
   * - 'colorize': use the internal printer and apply console color theme
   * - 'printer': use the internal printer for human-readable format
   * - function: custom stringifier
   */
  stringify?:
    | 'simple'
    | 'pretty'
    | 'colorize'
    | 'printer'
    | ((value: unknown) => string)

  /**
   * Printer configuration
   * Used when stringify is 'printer' or 'colorize'
   */
  printer?: {
    /**
     * Partial console color theme to override defaults per level.
     */
    theme?: Partial<ConsoleTheme<Levels>>

    /** Maximum object traversal depth for printing. Default: 5. */
    maxDepth?: number

    /** String used for indentation (e.g. '  '). Default: two spaces. */
    indentString?: string

    /** Quote character for printing strings. Default: '"'. */
    quotes?: string

    /** Overrides for object formatting. */
    objectFormatter?: Partial<ObjectFormatterConfig>

    /** Overrides for array formatting. */
    arrayFormatter?: Partial<ArrayFormatterConfig>

    /** Overrides for date formatting in printed output.*/
    dateFormatter?: Partial<DateFormatterConfig>
  }
}

/**
 * Emit a JSON array of records: `[ {..}, {..} ]`.
 * Inherits all CommonOptions.
 */
export interface JsonArrayOptions<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> extends CommonOptions<Levels> {
  /** Discriminator for JSON array output. */
  kind: 'json-array'
}

/**
 * Emit Newline-Delimited JSON (NDJSON): each record followed by a delimiter.
 * Inherits all CommonOptions.
 */
export interface NdjsonOptions<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> extends CommonOptions<Levels> {
  /** Discriminator for NDJSON output. */
  kind: 'ndjson'

  /**
   * Delimiter between records (defaults to `'\n'`).
   */
  delimiter?: string
}

/**
 * Wrap records in an envelope object: `{ key: [ {..}, {..} ] }`.
 * Inherits all CommonOptions.
 */
export interface EnvelopeOptions<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> extends CommonOptions<Levels> {
  /** Discriminator for envelope output. */
  kind: 'envelope'

  /**
   * Key for the array property in the envelope object. Default: 'events'.
   */
  envelopeKey: string
}

/**
 * Hooks for customizing template-based formatting.
 * Keys are placeholder names or '*' for catch-all.
 */
export type FormatTemplateHooks = Record<
  string | '*',
  (key: string, value: unknown, options: string) => unknown | undefined
>

/**
 * Emit formatted lines based on a template string.
 * Inherits all CommonOptions.
 */
export interface TemplateOptions<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> extends CommonOptions<Levels> {
  /** Discriminator for template-based output. */
  kind: 'template'

  /**
   * Template string with `{placeholders}` for record properties.
   * Supports extensive inline modifiers for padding, truncation, and colors:
   * - Padding: `{field: padstart N}`, `{field: padend N}`, `{field: center N}`
   * - Truncation: `{field: max N}` to limit length with ellipsis
   * - lower: `{field: lower}` to lowercase the string. Locale-aware: 'lowerl'
   * - upper: `{field: upper}` to uppercase the string. Locale-aware: 'upperl'
   * - Coloring / Styling: specify console color names (e.g., 'red', 'blueBright')
   *   or hex codes for foreground (`#rrggbb`) and background (`bg#rrggbb`).
   * - Multiple modifiers can be chained: `{msg: red bg#222 padstart 10}`.
   * - Emojis: `{emoji}` placeholder injects level emoji.
   * - Theme color: `{'custom text':theme level}` applies the log level’s theme color.
   * - `{this}` represents the log object.
   * - `{meta}` represents log meta.
   * - Supports nested fields: `{meta.nested.value}`
   * - Supports array indexes: `{meta.items[2].value}`
   * - Nullish coalescing: `{field ?? 'default'}` to fall back when `field` is `null` or `undefined`.
   * - Logical OR: `{field || fallback}` to substitute when `field` is falsy.
   */
  template?: string

  /**
   * Text to **prepend once** at the start of each group of templated logs.
   *
   * This is emitted **before** your payload.
   * Useful for opening wrappers, protocol preamble,
   * or any custom header/footer framing required by your sink.
   */
  start?: string

  /**
   * Text to **append once** at the end of each group of templated logs.
   *
   * This is emitted **after** your payload.
   * Ideal for closing wrappers, terminators, or separators
   * required by your ingestion API.
   */
  end?: string

  /**
   * Per-level emoji overrides. Keys are level names.
   */
  emojis?: Partial<Record<LevelName<Levels>, string>>

  /**
   * Default values for placeholders when record field is missing.
   */
  defaults?: Record<string, unknown>

  /**
   * Custom hooks invoked per placeholder for fine-grained formatting.
   */
  hooks?: FormatTemplateHooks
}

/**
 * Union of all formatter kinds. Select by `kind` field.
 * Which top-level shape to emit.
 * - "json-array":  `[ {...}, {...} ]`
 * - "ndjson":      `{...}\n{...}`
 * - "envelope":    `{ key: [ {...}, {...} ] }`
 * - "template":    template with braces
 *                  e.g. `{this} {emoji} {time} {meta.category}`
 */
export type FormatterOptions<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> =
  | JsonArrayOptions<Levels>
  | NdjsonOptions<Levels>
  | EnvelopeOptions<Levels>
  | TemplateOptions<Levels>

/**
 * Formats log records into various output shapes (JSON, NDJSON, templates).
 *
 * @typeParam Levels - Custom log level definitions.
 */
export class Formatter<Levels extends Record<string, number> = DEFAULT_LEVELS> {
  /** Formatter configuration options. */
  public options: FormatterOptions<Levels>
  /** HTTP content type for the formatted output. */
  public contentType: string
  /** Additional headers to emit (e.g. gzip encoding). */
  public extraHeaders?: Record<string, string>
  private dateTimeFormat: Intl.DateTimeFormat
  private levelDefinition: LevelDefinition<Levels>
  private consoleTheme: RequiredConsoleTheme<Levels>
  private readonly printer: Printer
  /**
   * @param options - Formatter behavior and output shape.
   * @param levelDefinition - Definitions of log levels and priorities.
   */
  constructor(
    options: FormatterOptions<Levels>,
    levelDefinition: LevelDefinition<Levels>
  ) {
    this.options = options
    this.levelDefinition = levelDefinition
    this.contentType = this.determineContentType()
    if (options.gzip) {
      this.extraHeaders = { 'Content-Encoding': 'gzip' }
    }
    const locale = options.locale
    const timeFormat = options.timeFormat
    if (timeFormat && !isString(timeFormat))
      this.dateTimeFormat = createDateFormatter(locale, timeFormat)
    else this.dateTimeFormat = createDateFormatter(locale)

    this.consoleTheme = getConsoleTheme(
      this.levelDefinition.levels,
      this.options.printer?.theme
    )
    const { objectFormatter, arrayFormatter, dateFormatter } =
      this.options.printer ?? {}
    this.printer = createPrinter(objectFormatter, arrayFormatter, dateFormatter)
  }

  /**
   * Formats a batch of logs into a string or Buffer.
   * Applies gzip compression if configured.
   *
   * @param batch - Array of log records to format.
   * @returns Formatted payload as string or gzipped Buffer.
   */
  public format(batch: Log<Levels>[]): string | Buffer {
    const body = this.buildBody(batch)
    return this.options.gzip ? gzipSync(body) : body
  }

  private buildBody(batch: Log<Levels>[]): string {
    const records = batch.map((log) => this.mapFields(log))
    const kind = this.options.kind
    switch (kind) {
      case 'json-array':
        return this.buildJsonArray(records)
      case 'ndjson':
        return this.buildNdjson(records, this.options)
      case 'envelope':
        return this.buildEnvelope(records, this.options)
      case 'template':
        return this.buildTemplate(records, this.options)
      default:
        throw new Error(`Unsupported kind: ${kind}`)
    }
  }

  private mapFields(log: Log<Levels>): Record<string, unknown> {
    const { fieldMap = {}, mergeMeta } = this.options
    const meta: Record<string, unknown> = {}
    const result: Record<string, unknown> = {}
    const msgKey = 'msg',
      timeKey = 'time',
      levelKey = 'level'
    result[fieldMap[msgKey] || msgKey] = log.msg
    result[fieldMap[levelKey] || levelKey] = this.levelDefinition.getLevelName(
      log.level
    )
    result[fieldMap[timeKey] || timeKey] = this.formatTime(log.time)
    if (!log.meta) return result
    for (const [key, value] of Object.entries(log.meta ?? {})) {
      const mappedKey = fieldMap[key] || key
      meta[mappedKey] = value
    }
    if (mergeMeta) Object.assign(result, meta)
    else result.meta = meta
    return result
  }

  private formatTime(time: number): number | string {
    const fmt = this.options.timeFormat
    if (fmt === 'epoch') return time
    if (fmt === 'iso') return new Date(time).toISOString()
    return this.dateTimeFormat.format(new Date(time))
  }

  private stringify<T>(levelName: LevelName<Levels>, record: T) {
    const { printer, stringify } = this.options
    if (isFunction(stringify)) return stringify(record)
    if (stringify === 'colorize') {
      const colorConfig = this.consoleTheme[levelName]
      const { indentString, maxDepth, quotes } = printer ?? {}
      return print(
        record,
        {
          indentString,
          maxDepth,
          colorConfig,
          quotes,
        },
        this.printer
      )
    }
    if (stringify === 'printer') {
      const { indentString, maxDepth, quotes } = printer ?? {}
      return print(
        record,
        {
          indentString,
          maxDepth,
          quotes,
        },
        this.printer
      )
    }

    return JSON.stringify(
      record,
      undefined,
      stringify === 'pretty' ? 2 : undefined
    )
  }

  private buildJsonArray(records: Record<string, unknown>[]): string {
    return '[' + this.getColoredListOfRecords(records) + ']'
  }

  private getColoredListOfRecords(records: Record<string, unknown>[]) {
    return records
      .map((r) => this.stringify(this.getRecordLevel(r), r))
      .join(',')
  }

  private buildNdjson(
    records: Record<string, unknown>[],
    options: NdjsonOptions<Levels>
  ): string {
    const delim = options.delimiter ?? '\n'
    return (
      records
        .map((r) => this.stringify(this.getRecordLevel(r), r))
        .join(delim) + delim
    )
  }

  private buildEnvelope(
    records: Record<string, unknown>[],
    options: EnvelopeOptions<Levels>
  ): string {
    const key = options.envelopeKey ?? 'events'
    return `{
    "${key}": ${this.getColoredListOfRecords(records)}
}`
  }

  private buildTemplate(
    records: Record<string, unknown>[],
    options: TemplateOptions<Levels>
  ): string {
    const template = options.template ?? '{this}'
    const lines = []
    for (const record of records) {
      const level = this.getRecordLevel(record)
      const theme = this.consoleTheme[level]
      const customEmoji = options.emojis && options.emojis[level]
      const emoji = customEmoji ?? getLevelEmoji(level as string)
      lines.push(
        formatTemplate(
          template,
          record,
          { emoji, ...options.defaults },
          {
            '*': (_, value, opts) => {
              if (!opts || value == undefined) return value
              return applyOptions(value, opts, '', theme)
            },
            level: (_, value, opts) => {
              return applyOptions(value, opts, theme.level, theme)
            },
            time: (_, value, opts) => {
              return applyOptions(value, opts, theme.time, theme)
            },
            msg: (_, value, opts) => {
              if (value == undefined) return value
              return applyOptions(value, opts, theme.msg, theme)
            },
            meta: (_, value, opts) => {
              return options.mergeMeta
                ? applyOptions(this.stringify(level, record), opts, '', theme)
                : applyOptions(value, opts, '', theme)
            },
            ...options.hooks,
          },
          (value) => this.stringify(level, value)
        )
      )
    }
    const { start = '', end = '' } = options
    if (!start && !end) return lines.join('')
    return `${start}${lines.join('')}${end}`
  }

  private determineContentType(): string {
    switch (this.options.kind) {
      case 'json-array':
      case 'envelope':
        return 'application/json'
      case 'ndjson':
      case 'template':
        return 'application/x-ndjson'
      default:
        return 'application/json'
    }
  }

  private getRecordLevel(record: Record<string, unknown>): LevelName<Levels> {
    return record['level'] as LevelName<Levels>
  }
}
