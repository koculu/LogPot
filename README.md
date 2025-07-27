## ![LogPot](https://raw.githubusercontent.com/koculu/LogPot/main/docs-site/src/assets/logpot-logo.svg)

[![npm version](https://img.shields.io/npm/v/logpot.svg)](https://www.npmjs.com/package/logpot) ![License: MIT](https://img.shields.io/badge/License-MIT-blue) [![Docs](https://img.shields.io/badge/docs-tenray.io%2Flogpot-green)](https://tenray.io/logpot)

A modern logging library for TypeScript with custom levels, worker-thread offloading, fully customizable templates, and built-in transports featuring file rotation, retention, batching, compression, HTTP authentication (OAuth2, Basic, ...) and more.

## 🔥 Why LogPot?

- **✅ Type‑Safe & Structured**  
  Every entry is a plain object (`msg`, `level`, `time`, `meta`), giving you compile‑time guarantees and smooth downstream processing.

- **🔌 Pluggable Transports**  
  Console, File (rotation, batching, retries), HTTP (OAuth2, Bearer, API‑Key) or roll your own by extending `Transport`.

- **🎨 Rich Formatting**  
  JSON‑array, NDJSON, envelope or fully‑templated text: padding, truncation, colors, emojis, custom hooks.

- **🐞 Robust Error Serialization**  
  Turn `Error`, nested `cause` chains, and `AggregateError` into safe, circular‑free JSON with optional stacks & hooks.

- **⚙️ Fine‑Grained Control**  
  Filters, transformers, custom level maps, categories, gzip, merge‑meta—everything you need to tailor your pipeline.

- **🧵 Worker‑Thread Offloading**  
  Push heavy I/O and formatting to background threads so your main loop stays rock‑solid.

---

## 🛠️ Quick Start

```bash
npm install logpot
# or
yarn add logpot
```

```ts
import { createLogger, getLogger } from 'logpot'

// 1️⃣ Initialize
await createLogger()

// 2️⃣ Use it
const logger = getLogger()
logger.info('Server started', { port: 8080 })
logger.error(new Error('Database connection failed'))

// 3️⃣ Graceful shutdown
await logger.close()
```

---

## 📚 Documentation & Community

- **Site & Guides:** [https://tenray.io/logpot](https://tenray.io/logpot)
- **API Reference:** [https://tenray.io/logpot/reference](https://tenray.io/logpot/reference)
- **GitHub:** [https://github.com/koculu/logpot](https://github.com/koculu/logpot)
- **Discussions & Support:** [https://github.com/koculu/logpot/discussions](https://github.com/koculu/logpot/discussions)

---

## 💖 Sponsorship

Funding open-source helps us maintain and improve LogPot.
If you find LogPot valuable, please consider sponsoring its development:

- **GitHub Sponsors**:  
  <https://github.com/sponsors/koculu>

Your support keeps the library up‑to‑date, secure, and feature‑rich for everyone!

---

## 🤝 Contributing

We welcome issues, PRs, and feature requests!
Please see [CONTRIBUTING.md](https://github.com/koculu/logpot/blob/main/.github/CONTRIBUTING.md) for guidelines.

---

## 📄 License

Released under the [MIT License](https://github.com/koculu/logpot?tab=MIT-1-ov-file#readme).
