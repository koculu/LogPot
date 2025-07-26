<p align="center">
  <h1 align="center">@logpot/utils</h1>
</p>

[![npm version](https://img.shields.io/npm/v/@logpot/utils.svg)](https://www.npmjs.com/package/@logpot/utils) [![License: MIT](https://img.shields.io/badge/License-MIT-blue)](https://opensource.org/licenses/MIT) [![Docs](https://img.shields.io/badge/docs-tenray.io%2Flogpot%2Futils-green)](https://tenray.io/logpot/reference/utils)

A collection of general-purpose utilities powering LogPot and any other TypeScript/Node.js projects: error handling, retries, timeouts, templating, parsing, concurrency, and more.

---

## 🔥 Why @logpot/utils?

- **⚠️ Robust Error Handling**

  - `makeAbortError` & `withAbort`: create and enforce abortable operations.
  - `makeError` & `serializeError`: normalize thrown values into `Error` objects or serializable payloads.

- **🔄 Retry & Timeout**

  - `withRetry` (and `RetryAction`): automatic exponential‑backoff retries with jitter.
  - `withTimeout`: race any promise against a manual timer.

- **⏳ Concurrency & Scheduling**

  - `AsyncJobQueue`: in‑process job queue with configurable concurrency and `drain()`.
  - `waitUntil`: poll a condition with backoff, honoring timeout and abort signals.

- **📝 Parsing & Templating**

  - `createParser`: build simple CLI‑style token parsers.
  - `formatTemplate`: fill placeholders in string templates.
  - `createDateFormatter`: Intl‑based date formatter with sensible defaults.

- **🔗 Object & Type Utilities**

  - `merge`: deep‑merge plain objects.
  - `getOrMakeArray`: normalize any value into an array.
  - Type guards: `isString`, `isNumberOrBoolean`, `isPlainObject`, `isError`, `isAbortError`, etc.

- **🔧 Misc Helpers**
  - `truncate`: shorten strings with ellipsis.
  - `centerText`: pad strings to center‑align.
  - `isRetryableHttpError`: decide which HTTP errors should be retried.
  - `buildWriteAsync`: promise‑based writes to Node.js streams.

---

## 🛠️ Quick Start

```bash
npm install @logpot/utils
# or
yarn add @logpot/utils
```

```ts
import {
  withRetry,
  RetryAction,
  withTimeout,
  AsyncJobQueue,
  waitUntil,
  merge,
  truncate,
  makeError,
  serializeError,
} from '@logpot/utils'

// Retry with exponential backoff
await withRetry(
  async () => {
    // your flaky operation
  },
  { maxRetry: 5, baseDelay: 300 }
)

// Abortable operation
await withTimeout(() => fetch(url), 2000)

// Queue tasks
const q = new AsyncJobQueue(3)
q.enqueue(async () => {
  /* job1 */
})
q.enqueue(async () => {
  /* job2 */
})
await q.drain()

// Merge objects
const cfg = merge(defaults, overrides)

// Serialize an Error safely
const payload = serializeError(new Error('Oops'), { stack: true })
```

---

## 📚 Documentation & Community

- **LogPot Main Site:** [https://tenray.io/logpot](https://tenray.io/logpot)
- **Utils API Reference:** [https://tenray.io/logpot/reference/utils](https://tenray.io/logpot/reference/utils)
- **GitHub Repository:** [https://github.com/koculu/logpot/tree/main/packages/utils](https://github.com/koculu/logpot/tree/main/packages/utils)
- **Issues & Discussions:** [https://github.com/koculu/logpot/discussions](https://github.com/koculu/logpot/discussions)

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](https://github.com/koculu/logpot/blob/main/.github/CONTRIBUTING.md) for guidelines.

---

## 📄 License

Distributed under the [MIT License](https://github.com/koculu/logpot?tab=MIT-1-ov-file#readme).
