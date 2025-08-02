---
title: 'Formatting'
sidebar:
  order: 6
---

## Color & Styling

Make your console logs pop and stay readable by leveraging ANSI escape codes. LogPot treats styling as just another layer of formatting, so you can mix colors, backgrounds, padding and more without extra ceremony.

### Colorizer & ColorOrColorizer

```ts
type Colorizer = (text: string) => string
type ColorOrColorizer = string | Colorizer
```

- **Colorizer**
  A function that wraps input text in ANSI codes.
- **ColorOrColorizer**
  Either a **space‑separated string** of style tokens _or_ your own transformer.

### colorizeHTML

Colorize HTML strings.

```ts
import { getLogger } from 'logpot'
import { colorizeHTML } from '@logpot/printer'

getLogger().debug(colorizeHTML('<span class="tag">Hi</span>'))
```

Pass a configuration object `{ tag, attrKey, attrValue, attrEq, content }` to
override the default colors.

## Theme Configuration

### ColorConfig & LogPotColorConfig

```ts
interface ColorConfig {
  null: ColorOrColorizer
  undefined: ColorOrColorizer
  number: ColorOrColorizer
  boolean: ColorOrColorizer
  string: ColorOrColorizer
  symbol: ColorOrColorizer
  function: ColorOrColorizer
  date: ColorOrColorizer
  key: ColorOrColorizer
  circular: ColorOrColorizer
  default: ColorOrColorizer
  colon: ColorOrColorizer
  comma: ColorOrColorizer
  bracket: ColorOrColorizer
  custom: ColorOrColorizer
}

interface LogPotColorConfig extends Partial<ColorConfig> {
  msg?: ColorOrColorizer
  level?: ColorOrColorizer
  time?: ColorOrColorizer
  emoji?: ColorOrColorizer
}
```

- **ColorConfig**: Assign colors to JS primitives & punctuation.
- **LogPotColorConfig**: Override specific log elements (msg, level label, time, emoji).

### ConsoleTheme

```ts
type ConsoleTheme<Levels> = Record<LevelName<Levels> | '*', LogPotColorConfig>
```

Map each log level (plus `'*'` fallback) to its styling rules.

---

## Formatter Configuration

Customizing your logs happens in two layers:

1. **CommonOptions** (shared by all kinds)
2. **Kind‑specific options** (JSON Array, NDJSON, Envelope, Template)

### CommonOptions

```ts
interface CommonOptions<Levels> {
  locale?: string | string[]
  timeFormat?: 'epoch' | 'iso' | Intl.DateTimeFormatOptions
  fieldMap?: Record<string, string>
  gzip?: boolean
  mergeMeta?: boolean
  stringify?:
    | 'simple'
    | 'pretty'
    | 'colorize'
    | 'printer'
    | ((value: unknown) => string)
  printer?: {
    theme?: Partial<ConsoleTheme<Levels>>
    maxDepth?: number
    indentString?: string
    quotes?: string
    objectFormatter?: Partial<ObjectFormatterConfig>
    arrayFormatter?: Partial<ArrayFormatterConfig>
    dateFormatter?: Partial<DateFormatterConfig>
  }
}
```

- **locale**: BCP‑47 tag(s) for dates.
- **timeFormat**: `'epoch'`, `'iso'` or custom `Intl` options.
- **fieldMap**: Rename keys (`msg→message`, `time→timestamp`).
- **gzip**: GZIP‑compress output.
- **mergeMeta**: Inline all `meta` props at top level.
- **stringify**:

  - `'simple'` → `JSON.stringify`
  - `'pretty'` → `JSON.stringify(..., null, 2)`
  - `'colorize'` → ANSI‑colored printer
  - `'printer'` → uncolored pretty‑printer
  - custom function

- **printer**: Fine‑tune indentation, quoting and theme overrides.

---

## Formatter Kinds

### JSON Array

Emit one big array:

```ts
formatter: { kind: 'json-array', /* + CommonOptions */ }
```

> **Use for** batch exports or analytics pipelines.

---

### NDJSON

Newline‑delimited JSON:

```ts
formatter: { kind: 'ndjson', delimiter: '\n', /* + CommonOptions */ }
```

> **Use for** streaming into files, pipes, or HTTP endpoints.

---

### Envelope

Wrap your array under a key:

```ts
formatter: { kind: 'envelope', envelopeKey: 'events', /* + CommonOptions */ }
```

> **Use for** protocols or APIs that expect a top‑level object.

---

### Template

Full control over every detail:

```ts
formatter: {
    kind: 'template',
    template: '{time} {level:bold padend 6} {emoji} {msg}\n{meta}',
    emojis: { DEBUG: '🐞', WARN: '⚠️', ERROR: '❌' },
    stringify: 'colorize',
    theme: {
      '*': {
        key: '#6c6c6c',
      },
      DEBUG: {
        msg: 'bg#3f260a #ff44aa doubleunderline',
      },
      INFO: {
        msg: 'bg#3f260a #ff44aa doubleunderline',
      },
    },
  }
```

- **Placeholders**: `{time}`, `{level}`, `{msg}`, `{meta}`, or deep paths `{meta.userId}`
- **Inline modifiers**: `bold`, `underline`, `#ff00ff`, `bg#222`, `padend 20`
- **Expressions**: `{meta.errorCode ?? 'N/A'}`
- **Hooks**: run JS on each placeholder

---

## Fine‑Tuning Output

### DateFormatterConfig

```ts
interface DateFormatterConfig {
  method: 'ISO' | 'epoch' | 'custom'
  locales?: string | string[]
  options?: Intl.DateTimeFormatOptions
}
```

- **ISO** → `new Date().toISOString()`
- **epoch** → milliseconds since UNIX epoch
- **custom** → use `Intl.DateTimeFormat(locales, options)`

---

### ObjectFormatterConfig

```ts
interface ObjectFormatterConfig {
  showBrackets: boolean
  showCommas: boolean
  sortKeys: (keys: string[], obj: Record<string, unknown>) => string[]
  maxEntries: number
}
```

- **showBrackets** / **showCommas**: include `{}` or `,`
- **sortKeys**: custom order function
- **maxEntries**: truncate after N fields

---

### ArrayFormatterConfig

- **maxInlineLength** (default 40): max chars before multiline
- **maxInlineItems** (default 10): max items inline
- **maxItems** (default 100): max entries in multiline
- **trailingComma** (default false)
- **overflowMessage**: `(len, rem) => string` when truncated
- **shouldInline**: custom hook to force inline
- **delimiters**: `{ open, close }`
- **separatorInline** / **separator**
- **prefix**: per‑item prefix (e.g. `'- '` for YAML)
- **sparseArrayEmptyElement** (default `'<empty>'`)

---

### Example: YAML‑Style Formatter

```ts
formatter: {
  kind: 'template',
  stringify: 'colorize',
  printer: {
    quotes: '',
    indentString: '  ',
    objectFormatter: {
      showBrackets: false,
      showCommas: false,
      maxEntries: Infinity,
    },
    arrayFormatter: {
      open: '', close: '',
      prefix: '- ',
      separatorInline: ' ',
      separator: '',
      maxInlineLength: 0,
    },
  }
}
```

```yaml
# Before (JSON)
{ "user": "alice", "permissions": ["read", "write"] }

# After (YAML‑style)
user: alice
permissions:
  - read
  - write
```

---

## Formatter Class

```ts
class Formatter<Levels> {
  constructor(
    options: FormatterOptions<Levels>,
    levelDefinition: LevelDefinition<Levels>
  )

  // Render a batch of logs to string or Buffer
  format(batch: Log<Levels>[]): string | Buffer
}
```

- Chooses JSON / NDJSON / envelope / template based on `kind`
- Applies field mapping, time formatting, coloring, and compression

---

## Available ANSI Style Tokens

Use any of these tokens (aliases shown in parentheses) in your `ColorOrColorizer` strings. You can also supply true‑color hex codes (`#rrggbb`) or background hex (`bg#rrggbb`).

### Modifiers

| Token                          | Effect                     |
| ------------------------------ | -------------------------- |
| `reset`                        | Clear all styles           |
| `bold`                         | Bold text                  |
| `dim` / `faint`                | Faint (reduced intensity)  |
| `italic`                       | Italic text                |
| `underline`                    | Underlined text            |
| `doubleunderline`              | Double‑underlined          |
| `inverse` / `swapcolors`       | Swap foreground/background |
| `hidden` / `conceal`           | Hidden text                |
| `strikethrough` / `crossedout` | Strike through             |
| `blink`                        | Blinking text              |
| `framed`                       | Enclose in a box           |
| `overlined`                    | Overline text              |

### Foreground Colors

| Token                           | Effect              |
| ------------------------------- | ------------------- |
| `black`                         | Black               |
| `red`                           | Red                 |
| `green`                         | Green               |
| `yellow`                        | Yellow              |
| `blue`                          | Blue                |
| `magenta`                       | Magenta             |
| `cyan`                          | Cyan                |
| `white`                         | White               |
| `gray` / `grey` / `blackbright` | Bright black (gray) |
| `redbright`                     | Bright red          |
| `greenbright`                   | Bright green        |
| `yellowbright`                  | Bright yellow       |
| `bluebright`                    | Bright blue         |
| `magentabright`                 | Bright magenta      |
| `cyanbright`                    | Bright cyan         |
| `whitebright`                   | Bright white        |

### Background Colors

| Token                                 | Effect                  |
| ------------------------------------- | ----------------------- |
| `bgblack`                             | Black background        |
| `bgred`                               | Red background          |
| `bggreen`                             | Green background        |
| `bgyellow`                            | Yellow background       |
| `bgblue`                              | Blue background         |
| `bgmagenta`                           | Magenta background      |
| `bgcyan`                              | Cyan background         |
| `bgwhite`                             | White background        |
| `bggray` / `bggrey` / `bgblackbright` | Bright black background |
| `bgredbright`                         | Bright red bg           |
| `bggreenbright`                       | Bright green bg         |
| `bgyellowbright`                      | Bright yellow bg        |
| `bgbluebright`                        | Bright blue bg          |
| `bgmagentabright`                     | Bright magenta bg       |
| `bgcyanbright`                        | Bright cyan bg          |
| `bgwhitebright`                       | Bright white bg         |

## Built‑in Directives

| Directive  | Arg   | Effect                                                              | Default Arg |
| ---------- | ----- | ------------------------------------------------------------------- | ----------- |
| `padstart` | `n`   | Left‑pad the text to width `n`.                                     | `20`        |
| `padend`   | `n`   | Right‑pad the text to width `n`.                                    | `20`        |
| `center`   | `n`   | Center the text in a field of width `n`.                            | `20`        |
| `max`      | `n`   | Truncate text to at most `n` characters (appending `…`).            | `20`        |
| `theme`    | `key` | Lookup `theme[key]` in your `ConsoleTheme` and apply its Colorizer. | –           |
| `lower`    | –     | Convert to **uppercase** (ANSI escapes preserved).                  | –           |
| `lowerl`   | –     | Locale‑aware lowercase (ANSI escapes preserved).                    | –           |
| `upper`    | –     | Convert to **uppercase** (ANSI escapes preserved).                  | –           |
| `upperl`   | –     | Locale‑aware uppercase (ANSI escapes preserved).                    | –           |
