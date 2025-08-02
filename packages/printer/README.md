<p align="center">
  <h1 align="center">@logpot/printer</h1>
</p>

[![npm version](https://img.shields.io/npm/v/@logpot/printer.svg)](https://www.npmjs.com/package/@logpot/printer) [![License: MIT](https://img.shields.io/badge/License-MIT-blue)](https://github.com/koculu/logpot?tab=MIT-1-ov-file#readme) [![Docs](https://img.shields.io/badge/docs-tenray.io%2Flogpot%2Fprint-green)](https://tenray.io/logpot/reference/printer/src)

A flexible value formatter for LogPot: serialize JavaScript values into human‑readable strings with configurable depth, indentation, colors, and custom formatters.

---

## 🔥 Why @logpot/printer?

- **🔍 Deep Inspection**
  Safely traverse nested structures to a configurable depth, avoiding infinite recursion on circular references.

- **🎨 Colorized Output**
  Override terminal color schemes or disable colors entirely, with built‑in support for custom color configurations.

- **🛠️ Pluggable Formatters**
  Extend or replace built‑in formatters (null, undefined, numbers, strings, symbols, functions, dates, arrays, objects, and more) via a simple `Printer` API.

- **⚙️ Custom Printers**
  Create tailored Printer instances with `createPrinter`, supplying overrides for object, array, or date formatting behavior.

- **📏 Indentation & Quotes**
  Control the indent string, maximum depth, and quote characters for string values.

---

## 🛠️ Quick Start

```bash
npm install @logpot/printer
# or
yarn add @logpot/printer
```

```ts
import { print, defaultPrinter, createPrinter } from '@logpot/printer'

// Simple usage
console.log(print({ user: 'alice', age: 30 }))

// Custom Printer with modified options
const custom = createPrinter(
  {
    showBrackets: false,
    showCommas: false,
  },
  {
    /* arrayFormatter */
  },
  {
    /* dateFormatter */
  }
)
console.log(
    print(
        { user: 'alice', age: 30 },
        {
            maxDepth: 5
            indentString: '  '
            colorConfig: { number: 'red underline', colon: 'yellow' },
            quotes: '"'},
        custom))
```

### Colorize HTML snippets

```ts
import { colorizeHTML } from '@logpot/printer'

const html = '<div class="greet" data-id="1">Hello</div>'
console.log(colorizeHTML(html))
```

Override default colors by passing config:

```ts
colorizeHTML(html, { tag: 'green', attrKey: 'magenta' })
```

---

## 📚 Documentation & Community

- **LogPot Main Site:** [https://tenray.io/logpot](https://tenray.io/logpot)
- **Printer API Reference:** [https://tenray.io/logpot/reference/printer](https://tenray.io/logpot/reference/printer/src)
- **GitHub Repository:** [https://github.com/koculu/logpot/tree/main/packages/printer](https://github.com/koculu/logpot/tree/main/packages/printer)
- **Issues & Discussions:** [https://github.com/koculu/logpot/discussions](https://github.com/koculu/logpot/discussions)

---

## 🤝 Contributing

Contributions are welcome! Please read our [CONTRIBUTING.md](https://github.com/koculu/logpot/blob/main/.github/CONTRIBUTING.md) for guidelines.

---

## 📄 License

Distributed under the [MIT License](https://github.com/koculu/logpot?tab=MIT-1-ov-file#readme).
