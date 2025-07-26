---
title: 'Transports'
sidebar:
  order: 5
---

LogPot uses **Transports** to manage the delivery of log entries to various sinks (console, files, HTTP endpoints, etc.). Transports derive from a common abstract base class and share a consistent set of behaviors and configuration options.

---

## Common Concepts

### `Transport` (Abstract Base Class)

All transports extend the abstract `Transport<Levels, Options>`:

```ts
abstract class Transport<Levels extends Record<string, number>, Options extends TransportOptions<Levels>> {
  protected options: Options;
  protected formatter: Formatter<Levels>;
  protected levelDefinition: LevelDefinition<Levels>;
  private isClosing: boolean;
  private isClosed: boolean;
  private queue?: AsyncJobQueue;
  private worker?: Worker;

  constructor(levelDefinition: LevelDefinition<Levels>, options?: Options) { … }

  /** Public API: enqueue or process a single log record. */
  log(log: Log<Levels>): void { … }

  /** Flush pending logs and wait for completion. */
  flushAndWait(isClosing?: boolean): Promise<boolean | undefined> { … }

  /** Gracefully close: flush, terminate worker, release resources. */
  close(): Promise<void> { … }

  // Must be implemented by subclasses:
  protected abstract doLog(log: Log<Levels>): void;
  protected abstract flush(): void;
  protected abstract doFlushAndWait(): Promise<void>;
  protected abstract doClose(): Promise<void>;

  // Worker‑thread support, error handling, stats, etc.
}
```

### Shared Options (`TransportOptions<Levels>`)

| Option                 | Type                             | Default              | Description                                                    |
| ---------------------- | -------------------------------- | -------------------- | -------------------------------------------------------------- |
| `name`                 | `string`                         | class name           | Human‑readable transport name.                                 |
| `runAsWorker`          | `boolean`                        | `false`              | Offload processing into a `worker_threads` Worker.             |
| `logLevel`             | `number`                         | `0` (TRACE)          | Minimum numeric severity to accept; lower entries are dropped. |
| `levels`               | `LevelName<Levels>[]`            | _all defined levels_ | Whitelist of level names to include.                           |
| `categories`           | `Set<string>`                    | _no filtering_       | Only logs whose `meta.category` matches are emitted.           |
| `filter`               | `(log)=>boolean`                 | _none_               | Custom predicate to drop or accept logs before formatting.     |
| `encoding`             | `BufferEncoding`                 | `'utf8'`             | Character encoding for raw writes.                             |
| `formatter`            | `FormatterOptions<Levels>`       | _printer default_    | How to format batches into strings or Buffers.                 |
| `transformer`          | `(log)=>Log\|null`               | _none_               | Map or drop logs right before transport.                       |
| `onError`              | `(TransportError<Levels>)=>void` | _none_               | Callback when delivery or flush fails.                         |
| `context`              | `Record<string, unknown>`        | `{}`                 | Static metadata merged into each log entry.                    |
| **Worker settings**    |                                  |                      |                                                                |
| `worker?.url`          | `URL`                            | internal script URL  | Override URL for worker script.                                |
| `worker?.custom`       | `()=>Worker`                     | _none_               | Factory function to instantiate a worker.                      |
| `worker?.readyTimeout` | `number (ms)`                    | `30000`              | Timeout waiting for worker “ready” handshake.                  |
| `worker?.closeTimeout` | `number (ms)`                    | `60000`              | Timeout waiting for worker “closed” handshake.                 |

### Error Model: `TransportError<Levels>`

When anything goes wrong (I/O failure, HTTP error, serialization, etc.), transports wrap details in a `TransportError`:

```ts
interface TransportError<Levels> {
  err: SerializedError // fully‑serialized Error or thrown value
  data?: unknown // raw payload sent or written
  log?: Log<Levels> // the single log entry that triggered failure
  batch?: Log<Levels>[] // batch that was being processed
  attempt?: number // current retry attempt
  retryCount?: number // max configured retries
  transport?: string // transport name
}
```

- **Serialization** uses `ErrorSerialization` options (stack, cause, aggregated, depth).
- **`onError`** callback is invoked with this object for custom error handling or alerting.

---

## Built‑In Transports

### `ConsoleTransport`

Writes logs to **stdout** (or stderr) via `console.log()` or `process.stdout.write()`.

```ts
class ConsoleTransport<Levels> extends Transport<Levels, ConsoleTransportOptions<Levels>> {
  constructor(levelDef, options?) { … }

  protected doLog(log: Log<Levels>): void { … }
  protected flush(): void { /* no buffering by default */ }
  protected async doFlushAndWait(): Promise<void> { /* immediate */ }
  protected async doClose(): Promise<void> { /* nothing to close */ }

  /** Renders a single record or batch via its `Formatter`. */
  protected format(log: Log<Levels>): string | Buffer { … }
}
```

#### Options (`ConsoleTransportOptions<Levels>`)

| Option        | Type      | Default | Description                                 |
| ------------- | --------- | ------- | ------------------------------------------- |
| `useJobQueue` | `boolean` | `false` | Enqueue writes via `AsyncJobQueue`          |
| `concurrency` | `number`  | `20`    | Max parallel writes when `useJobQueue=true` |

#### Workflow

1. **Log** → checks `logLevel` / filters → `format()` → writes to `stdout`.
2. **Flush** / **Close** are no‑ops (or immediate).

---

### `FileTransport`

Appends logs to a filesystem path, with batching, rotation, retention, and retry.

```ts
class FileTransport<Levels> extends Transport<Levels, FileTransportOptions<Levels>> {
  constructor(levelDef, opts) { … }

  protected doLog(log: Log<Levels>): void { queue & batch }
  protected startFlushTimer(): boolean { … }
  protected stopFlushTimer(): void { … }
  protected flush(): void { /* write buffered batch */ }
  protected async doFlushAndWait(): Promise<void> { /* wait until flush completes */ }
  protected async doClose(): Promise<void> { /* flush & close streams */ }
  protected format(batch: Log<Levels>[]): string { JSON or printer output }
}
```

#### Options (`FileTransportOptions<Levels>`)

| Option          | Type              | Default    | Description                                                    |
| --------------- | ----------------- | ---------- | -------------------------------------------------------------- |
| `filename`      | `string`          | _required_ | Path to log file.                                              |
| `flags`         | `string`          | `'a'`      | File open flags (`'a'` append, `'w'` write).                   |
| `mode`          | `number`          | `0o644`    | File permission bits.                                          |
| `concurrency`   | `number`          | `20`       | Max parallel I/O tasks.                                        |
| `batchSize`     | `number`          | `100`      | Entries buffered per write.                                    |
| `flushInterval` | `number (ms)`     | `5000`     | Auto‑flush timer interval.                                     |
| `rotate`        | `RotationOptions` | _none_     | `{ interval, maxSize, maxFiles, compress }`                    |
| `retry`         | `RetryOption`     | `{…}`      | Retries on write failures: `maxRetry`, `baseDelay`, `maxDelay` |

#### Rotation & Retention

- **Interval**: daily/hourly rollovers.
- **Max size**: rotate when file exceeds threshold.
- **Compression**: optional gzip old files.
- **Max files**: trim oldest.

---

### `HttpTransport`

Batches logs and sends via HTTP (`fetch` or `http.request`) to remote services.

```ts
class HttpTransport<Levels> extends Transport<Levels, HttpTransportOptions<Levels>> {
  constructor(levelDef, opts) { … }

  protected doLog(log: Log<Levels>): void { buffer.push(log); }
  protected startFlushTimer(): boolean { … }
  protected stopFlushTimer(): void { … }
  protected flush(): void { this.sendBatch(buffered) }
  protected async doFlushAndWait(): Promise<void> { /* await in‑flight requests */ }
  protected async doClose(): Promise<void> { /* flush & wait */ }
  protected async sendBatch(batch: Log<Levels>[]): Promise<void> { /* HTTP call */ }
  protected format(batch: Log<Levels>): string|Buffer { JSON or NDJSON }
}
```

#### Options (`HttpTransportOptions<Levels>`)

| Option          | Type                    | Default                                  | Description                                                  |
| --------------- | ----------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| `url`           | `string`                | _required_                               | Endpoint URL.                                                |
| `method`        | `'POST'` \| `'PUT'`     | `'POST'`                                 | HTTP verb.                                                   |
| `headers`       | `Record<string,string>` | `{ 'Content-Type': 'application/json' }` | Custom headers.                                              |
| `batchSize`     | `number`                | `100`                                    | Logs per HTTP payload.                                       |
| `flushInterval` | `number (ms)`           | `5000`                                   | Timer to auto‑send partial batches.                          |
| `concurrency`   | `number`                | `10`                                     | Parallel HTTP requests.                                      |
| `retry`         | `RetryOption`           | `{…}`                                    | Retry/backoff on network or 5xx errors.                      |
| `auth`          | `HttpAuth`              | `{ type: 'none' }`                       | HTTP authentication: basic, bearer, apiKey, oauth2, or none. |

### HttpAuth Types

```ts
type HttpAuth =
  | { type: 'none' }
  | { type: 'basic'; username: string; password: string }
  | { type: 'bearer'; token: string }
  | { type: 'apiKey'; in: 'header' | 'query'; name: string; value: string }
  | {
      type: 'oauth2'
      tokenUrl: string
      clientId: string
      clientSecret: string
      scope?: string
      retry?: RetryOption
    }
```

---

## Creating Custom Transports

You can extend `Transport<Levels, YourOptions>` to ship logs anywhere. Databases, message queues, third‑party SDKs, etc.

### Define Options Interface

```ts
import {
  Transport,
  DEFAULT_LEVELS,
  RetryOption,
  TransportOptions,
} from 'logpot'
interface MyCustomTransportOptions<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> extends TransportOptions<Levels> {
  /** Your custom settings… */
  connectionString: string
  retry?: RetryOption
}
```

### Subclass & Implement Core Methods

```ts
import { Transport, TransportError } from 'logpot'

export class MyCustomTransport<
  Levels extends Record<string, number> = DEFAULT_LEVELS
> extends Transport<Levels, MyCustomTransportOptions<Levels>> {
  constructor(
    levelDef: LevelDefinition<Levels>,
    options: MyCustomTransportOptions<Levels>
  ) {
    super(levelDef, options)
    this.transportName = 'fileTransport'
    if (!this.options.name) this.options.name = this.transportName
    // e.g. initialize DB client or SDK
    this.connect()
  }

  protected doLog(log: Log<Levels>): void {
    // Called for each log entry.
    // You can batch or send immediately:
    this.sendToRemote(log).catch((err) => this.handleError({ err, log }))
  }

  protected flush(): void {
    // Initiate flush and return.
  }

  protected async doFlushAndWait(): Promise<void> {
    this.flush()
    // Wait until flush is completed.
  }

  protected async doClose(): Promise<void> {
    // Clean up resources (close connections).
    await this.disconnect()
  }

  private async sendToRemote(log: Log<Levels>): Promise<void> {
    // transform & serialize via `this.formatter.format([log])`
    const payload = this.formatter.format([log])
    // send via your client…
  }
}
```

### Run Custom Transport as a Worker Thread

If you want to run your transport as a worker, you can create a worker for your transport:

```ts
import { MyCustomTransport } from './myCustomTransport'
import { Transport, LevelDefinition } from './logpot'

Transport.initWorker(
  (options: MyCustomTransportOptions, levelDefinition: LevelDefinition) => {
    const transport = new MyCustomTransport(levelDefinition, options)
    return transport
  }
)

// When user enables `runAsWorker: true`, LogPot spawns a Worker
// and invokes your `initWorker` callback to configure the worker-side logic.
```

### Registering Your Transport

When creating a logger:

```ts
import { createLogger, STD_LEVEL_DEF } from 'logpot'
import { MyCustomTransport } from './myCustomTransport'

await createLogger({
  transport: new MyCustomTransport(STD_LEVEL_DEF, {
    name: 'MyDB',
    logLevel: STD_LEVEL_DEF.getLevelNumber('INFO'),
    connectionString: 'postgres://…',
    retry: { maxRetry: 3, baseDelay: 200 },
  }),
})
```

- **Mix & Match:** You can supply an array of transports.
- **Global Logger:** `setLogger(...)` to override or `getLogger()` to retrieve.

---

## Best Practices

- **Batching:** Buffer logs for high‑throughput sinks; flush on interval or size.
- **Backpressure:** Honor `concurrency` and `retry` options to avoid overload.
- **Error Handling:** Provide `onError` callback or subclass `handleError` to surface failures.
- **Worker Threads:** Offload heavy I/O or CPU‑bound formatting to avoid blocking your main application.
- **Context & Filtering:** Use `context`, `filter`, and `transformer` to enrich, drop, or redact logs early.

---

## Summary

Transports in LogPot provide a flexible, consistent API for routing logs. Whether to console, files, HTTP services, or entirely custom systems. By extending the abstract base, you benefit from built‑in formatting, error serialization, retry/backoff, and worker‑thread support, allowing you to focus on the unique delivery logic of your target sink.
