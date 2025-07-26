---
title: 'Core Types'
sidebar:
  order: 7
---

## Log Levels

### LevelName & LevelNumber

```ts
type LevelName<Levels extends Record<string, number>> = keyof Levels & string
type LevelNumber<Levels extends Record<string, number>> =
  Levels[LevelName<Levels>]
```

- **LevelName**: Union of string keys in `Levels` map.
- **LevelNumber**: Numeric value type associated with a `LevelName` in `Levels`.

### DEFAULT_LEVELS

Default built-in levels and priorities:

```ts
type DEFAULT_LEVELS = {
  TRACE: 10
  DEBUG: 20
  INFO: 30
  WARN: 40
  ERROR: 50
  FATAL: 60
}
```

### STD_LEVEL_DEF

Standard level definition object with utilities:

```ts
const STD_LEVEL_DEF: LevelDefinition<{
  readonly TRACE: 10
  readonly DEBUG: 20
  readonly INFO: 30
  readonly WARN: 40
  readonly ERROR: 50
  readonly FATAL: 60
}>
```

- **levels**: Raw mapping of names → numbers.
- **getLevelName(number)**: Reverse lookup name by priority; throws if absent.
- **getLevelNumber(name)**: Lookup numeric priority by name; throws if absent.
- **hasLevel(number)**: Check if number is defined in map.

---

## Core Log Types

### LogMeta

```ts
type LogMeta = Record<string, unknown>
```

- Arbitrary key/value metadata attached to logs.

### Log

```ts
interface Log<Levels extends Record<string, number> = DEFAULT_LEVELS>
  extends Record<string, unknown> {
  msg: string
  level: LevelNumber<Levels>
  time: number
  meta?: LogMeta | Error
}
```

- **msg**: Resolved message string.
- **level**: Numeric severity (matching `Levels`).
- **time**: Timestamp in milliseconds since epoch.
- **meta** _(optional)_: Additional metadata or an `Error` object.
- **extends Record**: Allows extra custom fields per log entry.

---

## Logger Interfaces

### ILogger

Core methods for emitting, scoping, and managing logs.

```ts
interface ILogger<Meta extends LogMeta, Levels>
```

#### Methods

- **log(level, msg, meta?)**: Emit a log.

  - **level**: `LevelName` or `LevelNumber`.
  - **msg**: Message string, metadata object, or `Error`.
  - **meta** _(optional)_: Extra metadata or `Error`.

- **withMeta<Extra>()**: Compile-time refine logger to expect additional metadata properties.

- **child(context)**: Static context merged into every log’s metadata.

- **withCategory(category)**: Shorthand for `child({ category })`.

- **flush()**: Flush buffered logs; Not recommended in production. Can be used when you need to ensure flush is initiated at certain condition. e.g. debugging

- **close()**: Clean shutdown (flush, terminate workers, release resources); returns a `Promise`.

### Logger (Typed)

```ts
type Logger<Meta, Levels> = ILogger<Meta, Levels> & {
  [K in keyof Levels as Lowercase<K>]: ((meta: Meta | Error) => void) &
    ((msg: string, meta?: Meta | Error) => void)
}
```

- Convenience methods for each level, e.g., `.info()`, `.error()`, `.debug()`.
- Overloads:

  1. `(meta: Meta | Error) => void`
  2. `(msg: string, meta?: Meta | Error) => void`

---

In-process queue for parallel async jobs.

```ts
class AsyncJobQueue {
  constructor(concurrency?: number)
  get length(): number
  enqueue(job: () => Promise<void>): void
  drain(): Promise<void>
}
```

- **concurrency**: Max parallel jobs (minimum 1).
- **length**: Jobs waiting in queue.
- **enqueue**: Add job fn returning a `Promise`; triggers execution.
- **drain**: Wait until queue and in-flight jobs complete.

---

## Logger Creation & Globals

### CreateLoggerOptions

Configuration for root logger and its transports.

```ts
interface CreateLoggerOptions<Levels> {
  logLevel?: number
  levels?: Levels
  runAsWorker?: boolean
  consoleTransport?: ConsoleTransportOptions<Levels>
  fileTransport?: FileTransportOptions<Levels> | FileTransportOptions<Levels>[]
  httpTransport?: HttpTransportOptions<Levels> | HttpTransportOptions<Levels>[]
  transport?: Transport<Levels> | Transport<Levels>[]
  context?: LogMeta
  filter?: (log: Log<Levels>) => boolean
  transformer?: (log: Log<Levels>) => Log<Levels> | null
  errors?: ErrorSerialization
  onError?: (err: TransportError<Levels>) => void
  resolveMessage?: (meta: LogMeta | Error) => string
}
```

### `createLogger()`

```ts
function createLogger<Levels>(
  options?: CreateLoggerOptions<Levels>
): Promise<Logger<LogMeta, Levels>>
```

- Initializes transports, applies settings, and returns ready-to-use `Logger`.

### `hasLogger()`

```ts
function hasLogger(): boolean
```

- Returns `true` if a global logger exists.

### `getLogger()`

```ts
function getLogger<Meta, Levels>(category?: string): Logger<Meta, Levels>
```

- Retrieves the global logger, or a category-scoped child.
- Throws if none initialized.

### `setLogger()`

```ts
function setLogger<Meta, Levels>(
  logger: Logger<Meta, Levels> | ILogger<Meta, Levels>,
  force?: boolean
): void
```

- Installs or replaces the global logger.
- `force = false` (default) prevents override if exists.

### `disableLogger()`

```ts
function disableLogger<Meta, Levels>(force?: boolean): void
```

- Installs a no-op proxy logger; all methods become harmless no-ops.
- `force` controls override semantics.

### `version`

```ts
const version: string
```

- Library version string, e.g. `'1.0.0'`.
