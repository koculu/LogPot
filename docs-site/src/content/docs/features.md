---
title: 'Features'
sidebar:
  order: 4
---

## What Is a Logger and Why You Need One

Every application needs a recorder. A component that captures “what happened” in a way you can inspect later. In LogPot, that recorder is the **Logger**.

### Why a Structured Logger Beats `console.log`

- **Context → Clarity**
  You don’t just get text; you get typed fields (timestamps, levels, request IDs, user IDs) that search and dashboards can slice and dice.

- **Filters & Transforms → Control**
  Decide up front which messages to drop (e.g. debug chatter) and how to redact or enrich data (e.g. mask PII, attach session info).

- **Transports → Flexibility**
  Send your logs to the console, files, or remote services, with retries, batching, and rotation handled for you.

### Basic Workflow

1. **Initialize**
   Create a logger once at startup, providing global context (service name, region, feature flags).

   ```ts
   const logger = await createLogger({
     context: { service: 'orders', region: 'us-east-1' },
   })
   ```

2. **Log Events**
   Use level-named methods for everyday messages:

   ```ts
   logger.info('Order received', { orderId: 12345 })
   logger.error(new Error('Inventory check failed'))
   ```

3. **Scope & Enrich**
   Derive a **child logger** when you need to inject extra context. Say, per-request or per-feature:

   ```ts
   // inside a request handler:
   const reqLogger = logger.child({ requestId })
   reqLogger.debug('Fetched user profile')
   ```

4. **Shutdown Gracefully**
   Before your process exits, gracefully close to ensure no messages are left in buffers:

   ```ts
   await logger.close()
   ```

Great! Let’s keep this high‑level, use‑case‑driven style. Here’s a first stab at **Section 1.2: Log Levels** as an explanatory guide:

---

## What Are Log Levels and When to Tune Them

Think of **log levels** as the “lenses” you look through to see more-or less-detail in your application’s behavior.

### Why Levels Matter

- **Noise control**
  In production you usually only care about warnings and errors. In development or troubleshooting you want every debug or trace message to diagnose issues.

- **Performance**
  Skipping low‑priority logs (e.g. `TRACE`) saves CPU and I/O, especially when you’re logging to remote endpoints.

- **Signal vs. Noise**
  A clean pipeline makes it easier to hook into alerting or analytics without drowning in chatter.

### Default Levels and Thresholds

LogPot comes with six standard levels:

| Level | Priority | Typical Use                                 |
| ----- | -------- | ------------------------------------------- |
| TRACE | 10       | Extremely fine‑grained; function‑entry/exit |
| DEBUG | 20       | Diagnostic detail; variable dumps           |
| INFO  | 30       | Application milestones; user actions        |
| WARN  | 40       | Recoverable issues; deprecated usage        |
| ERROR | 50       | Failures you need to investigate            |
| FATAL | 60       | Unrecoverable errors; process should halt   |

- By default `logLevel` is (0), so you’ll see all error levels.
- Anything below your threshold is dropped **before** formatting or transport.

### Switching Gears (Examples)

```ts
// Developer mode: get everything
const devLogger = await createLogger()

// Production: only warnings and above
const prodLogger = await createLogger({ logLevel: 40 }) // WARN & up
```

- If you have special needs, **define your own** levels:

  ```ts
  // add a “VERBOSE” slot below DEBUG
  const logger = await createLogger({
    levels: { VERBOSE: 15, DEBUG: 20, INFO: 30, WARN: 40, ERROR: 50 },
  })
  logger.log('VERBOSE', 'Detailed step-by-step info')
  ```

### When to Adjust

- **Local debugging**: lower threshold to `DEBUG` or `TRACE`.
- **Production**: start at `INFO` or `WARN`. Raise if noise is still too high.
- **Critical services**: you might drop `INFO` entirely and only log `WARN+`.

---

## What Are Transports and How to Choose Yours

A **transport** is simply the “sink” where your logs end up. Whether that’s your terminal, a file on disk, or a remote service. By decoupling **how** you write logs from **where** they go, LogPot makes it easy to mix-and-match and evolve your logging strategy.

### Why Transports Matter

- **Separation of concerns**
  Your application just emits structured log objects. Transports handle queuing, formatting, retries, and delivery without cluttering your code.

- **Flexibility**
  Send the same log stream to multiple destinations (e.g. console + file + HTTP) without duplicate calls.

- **Reliability**
  Built‑in buffering, batching, and retry logic mean you won’t lose critical error events even under load or transient network failures.

### Built‑in Transports

| Transport   | When to Use                               | Key Features                                                         |
| ----------- | ----------------------------------------- | -------------------------------------------------------------------- |
| **Console** | Local development, Docker logs, CI output | Colorized, themeable                                                 |
| **File**    | Production servers, long‑term archive     | Rotation (size/time), compression, retention, high‑throughput writes |
| **HTTP**    | Centralized logging, log aggregation SaaS | Batching, retry/backoff, custom headers, concurrency controls        |

```ts
// Example: send to console + file, and push critical errors upstream
const logger = await createLogger({
  consoleTransport: {}, // interactive, colorized local output
  fileTransport: [
    {
      // persisted archive on disk
      filename: '/var/log/app.log',
      rotate: {
        interval: 'daily',
        maxFiles: 14,
        compress: true,
        maxSize: 1_024_000,
      },
    },
  ],
  httpTransport: {
    url: 'https://logs.mycompany.com/ingest',
    batchSize: 200,
    retry: { maxRetry: 3 },
  },
})
```

### Picking the Right Transport

- **ConsoleTransport**
  👉 Great for development or short‑lived processes. You see logs in real time with colors and context.

- **FileTransport**
  👉 Ideal for services that must persist logs locally. Rotate daily or by size to avoid runaway disk usage.

- **HttpTransport**
  👉 When you need centralized visibility: ship only errors, or full audit trails, into your logging platform of choice.

- **Custom Transport**
  👉 Extend `Transport` to plug into Kafka, Redis, or any other sink.

### Worker Mode

For high‑volume or slow I/O, offload transports to worker threads:

```ts
// Offload file I/O, keep console on main thread
createLogger({
  runAsWorker: true
  consoleTransport: { runAsWorker: false },
  fileTransport: [{ filename: 'app.log', runAsWorker: true }],
})
```

This keeps your main event loop snappy while transports handle heavy lifting in parallel.

---

## Formatting: Shaping Your Logs for Humans and Machines

Once your logs are emitted, the **formatter** decides their final appearance and structure before delivery. You pick a “kind” and tweak a handful of options to hit your goals. Whether that’s compact JSON for ELK, newline-delimited streams for Kubernetes, or colorized, emoji‑spiced lines in your terminal.

### Choosing a Formatter Kind

| Kind           | Best For                              | Output Example                                          |
| -------------- | ------------------------------------- | ------------------------------------------------------- |
| **JSON Array** | Batch exports, analytics pipelines    | `[ {…}, {…}, … ]`                                       |
| **NDJSON**     | Streaming into file or HTTP endpoint  | `{"time":…,"level":"INFO"}\n{"time":…,"level":"ERROR"}` |
| **Envelope**   | Protocols requiring a wrapped payload | `{ "events": [ {…}, {…} ] }`                            |
| **Template**   | Human‑readable, styled console output | `2025-07-22 14:05 ℹ️ Server started (port=8080)`        |

### Common Options Across All Kinds

- **Time Format**
  Choose `"epoch"` for millisecond timestamps, `"iso"` for ISO‑8601 strings, or supply a custom `Intl.DateTimeFormat` config.
- **Field Mapping**
  Rename keys (e.g. map `"msg"` → `"message"` or `"time"` → `"timestamp"`).
- **Compression**
  Wrap your output in GZIP when shipping over HTTP or writing archives.
- **Meta Merging**
  Inline all metadata properties at the top level instead of nesting under `meta`.
- **Pretty vs. Compact**
  Toggle between compact JSON (`JSON.stringify`) or a human‑friendly pretty print.

### Template Formatter: Go Beyond JSON

The **template** formatter gives you pixel‑perfect control over every log line. You write a template string with placeholders, then decorate each placeholder with a chain of **format directives** and **style tokens**. Under the hood, LogPot’s `applyOptions` parses these directives left‑to‑right, applies text transformations (padding, truncation, casing, theming), and finally wraps the result in ANSI colors.

```ts
formatter: {
  kind: 'template',
  stringify: 'colorize',
  template:
    '{time} | {pid} | ' +
    '{level:padend 6 bold underline} {emoji} | ' +
    '{msg}\n{meta}',
  emojis: { INFO: 'ℹ️', ERROR: '❌' },
  defaults: { pid: process.pid },
  printer:  {
    theme: { '*': {} } // color overrides...
  }
}
```

#### Placeholder Syntax

```
{ <fieldPath> : <directive1> <arg1?> <directive2> … <style1> <style2> … }
```

- **fieldPath**: any top‑level or nested property (`msg`, `level`, `meta.userId`, etc.).
- **colon (`:`)** separates the path from formatting.
- **directives**: one of the built‑in options below.
- **style tokens**: ANSI modifiers, colors, or hex codes (e.g. `bold`, `red`, `bg#222222`).

#### Built‑in Directives

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

> **Note:** Unrecognized tokens after these directives are treated as style tokens and passed to `toColorizer`. For example, `padend 10 red underline` pads to 10 chars, then styles in red bold underline.

#### Common Style Tokens

- **Modifiers:** `reset`, `bold`, `dim`, `italic`, `underline`, `inverse`, `hidden`, `strikethrough`, `blink`, `doubleunderline`, `framed`, `overlined`, `faint`, `conceal`, `crossedout`, `swapcolors`
- **Foreground:** `black`, `red`, `green`, `yellow`, `blue`, `magenta`, `cyan`, `white`, `gray` (and bright variants, e.g. `redbright`)
- **Background:** `bgblack`, `bgred`, …, `bgwhite` (and bright variants, e.g. `bgredbright`)
- **True‑color:** `#rrggbb` (foreground) or `bg#rrggbb` (background)

#### Example: Level Labels

```ts
formatter: {
  kind: 'template',
  template: '{time} ' +
            '{level:lower padend 6 red} ' +  // lowercase, pad to 6, then red
            '{msg}\n',
}
```

Produces:

```
2025-07-22T14:05:01Z info   User signed in
2025-07-22T14:06:00Z error  Database unreachable
```

Here:

1. `lower` → transforms `INFO` → `info`.
2. `padend 6` → ensures the level label occupies 6 characters.
3. `red` → styles the padded string in red.

By mixing these directives and style tokens, you can craft any layout or visual treatment. Everything from aligned columns to YAML‑style dumps, all within a single template string.

### Quick-Start Configurations

- **Compact Stream (NDJSON)**

  ```ts
  formatter: { kind: 'ndjson', delimiter: '\n' }
  ```

- **Fast HTTP endpoint (JSON Array + GZIP)**

  ```ts
  formatter: { kind: 'json-array', gzip: true, timeFormat: 'iso' }
  ```

- **Developer Console (Template + Color)**

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

### Fine‑Grained Object & Array Control (YAML‑Style)

LogPot gives you full control over how objects and arrays render. Whether you want compact JSON, classic YAML‑style, or custom bullet lists.

```ts
formatter: {
  kind: 'template',
  stringify: 'colorize',
  printer: {
    quotes: '',                // no quotes
    indentString: '  ',        // two‑space indent
    objectFormatter: {
      showBrackets: false,     // drop `{}`
      showCommas: false,       // drop `,`
      maxEntries: Infinity     // show all fields
    },
    arrayFormatter: {
      open: '', close: '',     // no `[` or `]`
      prefix: '- ',            // YAML bullets
      separatorInline: ' ',    // Hide commas inline
      separator: '',           // Hide commas
      maxInlineLength: 0       // always multiline (or you can keep inline)
    }
  }
}
```

**Before (default)**

```json
{ "user": "alice", "permissions": ["read", "write"] }
```

**After (YAML‑style)**

```yaml
user: alice
permissions:
  - read
  - write
```

## Categories & Per‑Transport Filtering

Use **categories** to tag your logs and then control which ones each transport emits.

### Tagging Logs

- **`withCategory(name)`**
  Create a child logger that adds a `category` field to every entry.
- **`getLogger(name)`**
  A shortcut for `rootLogger.withCategory(name)`.

```ts
const authLogger = logger.withCategory('auth')
authLogger.info('User signed in') // category: "auth"

const dbLogger = getLogger('db-read')
dbLogger.debug('Fetched record') // category: "db-read"
```

### Per‑Transport Category Filters

Each transport takes a `categories: string[]` option. Only entries whose `category` exactly matches one of these strings will be emitted. Omit `categories` or set it to an empty array (`[]`) to allow **all** logs.

```ts
const logger = await createLogger({
  consoleTransport: {
    categories: ['auth'], // only emits logs tagged "auth"
  },

  fileTransport: [
    {
      filename: './logs/all.log',
      // no `categories` key = allow all categories
    },
    {
      filename: './logs/db.log',
      categories: ['db-read'], // only emits "db-read" logs
    },
  ],

  httpTransport: {
    url: 'https://logs.example.com',
    // allow all by default
  },
})
```

## Filters & Transformers

LogPot lets you shape your log stream in two stages. **filters** to drop unwanted entries early, and **transformers** to mutate, enrich, or even forward logs before they hit your transports.

---

### Filters

A **filter** is a simple predicate you provide:

```ts
filter: (log) => boolean
```

- Runs **before** any formatting or transport work.
- Return `false` to **drop** a log completely.
- Ideal for static rules like “only production errors” or “no debug‐only entries”:

```ts
// drop any logs tagged { debugOnly: true }
filter: (log) => !log.meta?.debugOnly
```

---

### Transformers

A **transformer** is a function that can **mutate** a log or return `null` to drop it:

```ts
transformer: (log) => Log | null
```

- Runs **after** filtering, but still before transport delivery.
- Use it to:

  - **Redact** or **rename** fields
  - **Augment** entries with extra data (e.g. request IDs)
  - **Branch**: forward logs to an external service, then return the original or a modified copy
  - **Drop** by returning `null`

> **Tip:** You can use a transformer to stream logs to AWS CloudWatch (or any SDK‑based service).
> Just call the SDK asynchronously (fire-and-forget) and then return the log:

```ts
import AWS from 'aws-sdk'
const cw = new AWS.CloudWatchLogs({ region: 'us-east-1' })
let nextToken: string
const logger = getLogger('cloudwatch')
const cloudWatchError = 'Cloudwatch error'
export const forwardToCloudWatch = (log) => {
  if (log.msg === cloudWatchError) return
  cw.putLogEvents({
    logEvents: [{ message: JSON.stringify(log), timestamp: Date.now() }],
    logGroupName: 'my-app',
    logStreamName: 'application',
    sequenceToken: nextToken,
  })
    .promise()
    .then((res) => {
      nextToken = res.nextSequenceToken!
    })
    .catch((err) => logger.error(cloudWatchError, err))
}
```

---

#### Putting It Together

```ts
const logger = await createLogger({
  // only INFO+ in production
  filter: (log) =>
    process.env.NODE_ENV === 'production'
      ? log.level >= STD_LEVEL_DEF.INFO
      : true,

  transformer: (log) => {
    // redact sensitive fields
    if (log.meta?.password) {
      log.meta.password = '[REDACTED]'
    }
    // forward to CloudWatch
    forwardToCloudWatch(log)
    return log
  },
})
```

With filters and transformers you get full control-drop noise early, reshape or enrich entries, and even fan out to external systems, while keeping your core transports focused.

## Error Serialization

When you pass an `Error` object into any LogPot method, it’s automatically converted into a plain‑object form so that your logs stay JSON‑friendly and free of circular references. You get structured error data you can index, search, and filter, without losing stack traces or nested causes.

---

### What Gets Emitted

By default, all fields are included up to 10 depth:

- `type` – the error’s constructor name (e.g. `"TypeError"`)
- `message` – the error message

With options you can opt-out certain fields:

- `stack` – the full `.stack` trace
- `cause` – follow `error.cause` chains
- `errors` – unpack `AggregateError.errors` arrays
- **any other** enumerable props you’ve attached

```ts
interface SerializedError {
  type: string
  message: string
  stack?: string
  cause?: SerializedError | unknown
  errors?: SerializedError[]
  [key: string]: unknown
}
```

---

### Customization Options

Configure how deep and how rich your serialized errors become:

| Option       | Type                | What it does                              |
| ------------ | ------------------- | ----------------------------------------- |
| `maxDepth`   | `number`            | Max levels to recurse into causes/errors. |
| `stack`      | `boolean`           | Include the `.stack` string.              |
| `cause`      | `boolean`           | Include the `.cause` property.            |
| `aggregated` | `boolean`           | Include each entry of `AggregateError`.   |
| `hook`       | `(err, depth) => …` | Post‑process each serialized node.        |

> **Defaults**: `{ maxDepth: 1, stack: false, cause: false, aggregated: false }`

---

### Example

```ts
import { createLogger } from 'logpot'

const logger = await createLogger({
  errors: {
    maxDepth: 3, // dive three levels deep
    stack: true, // include full stack traces
    cause: true, // follow nested causes
    aggregated: true, // unpack any AggregateError
    hook: (err, depth) => {
      // add or edit a custom field
      return err
    },
  },
})

// later…
logger.error(new Error('Database unreachable', { cause: someOtherError }))
```

## Worker Mode

> **Default Behavior:** Every transport runs in its own worker thread out‑of‑the‑box. No extra config needed. You can still override this per‑transport if you need to.

Offloading I/O and formatting to background threads keeps your main event loop free‑flowing even under heavy log throughput.

---

### Benefits

- **Non‑blocking I/O:** File writes, HTTP requests, compression, and JSON formatting all happen off the main thread.
- **Backpressure Protection:** Spikes in log volume queue up in the worker instead of stalling your app.
- **Graceful Lifecycle:** Built‑in handshakes and timeouts ensure orderly startup, draining, and shutdown.

---

### Under the Hood

1. **Handshakes**

   - **`ready`** – worker signals it’s up and running
   - **`drained`** – worker finished flushing its queue
   - **`closed`** – worker shut down cleanly

2. **Queues & Batches**

   - Main thread enqueues entries.
   - Worker dequeues, formats, batches (by size or interval), and delivers them.

3. **Timeouts & Recovery**

   - **`worker.readyTimeout`** – max ms to wait for “ready”
   - **`worker.closeTimeout`** – max ms to wait for “closed”
   - On failure or timeout, the main thread can retry, surface an error via your `onError` callback, or fall back to synchronous delivery.

---

### Overriding the Default

Although workers are enabled by default, you can disable or customize them per transport:

```ts
const logger = await createLogger({
  // Turn OFF worker threads globally:
  runAsWorker: false,

  // Or leave console on main thread but keep others in workers:
  consoleTransport: { runAsWorker: false },
  fileTransport: [{ filename: './app.log', runAsWorker: true, batchSize: 100 }],
  httpTransport: { url: 'https://logs.example.com', runAsWorker: true },
})
```

---

### When to Tweak Worker Settings

- **High‑throughput services** (e.g. real‑time APIs, data pipelines)
- **Slow or rate‑limited sinks** (e.g. remote HTTP endpoints)
- **Ultra‑low latency requirements** (e.g. user‑facing CLI tools)

By default, LogPot keeps your application snappy and resilient. Just configure per‑transport overrides when you need fine‑grained control.
