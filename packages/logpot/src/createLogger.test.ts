/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from 'util'
import { describe, expect,it } from 'vitest'

import { createLogger } from './createLogger'
import { STD_LEVEL_DEF } from './levels'
import { Log } from './log'
import { ConsoleTransport } from './transports/consoleTransport'

function spyConsole() {
  const logs: string[] = []
  const log = (...args: any[]) => {
    logs.push(format(...args))
  }
  const pop = () => logs.pop()
  return {
    pop,
    log,
  }
}
const spy = spyConsole()

class CustomConsoleTransport extends ConsoleTransport {
  protected override doLog(log: Log) {
    const line = this.format(log)
    spy.log(line)
    ++this.logProcessed
  }
}

describe('createLogger ', {}, async () => {
  it('format 1', async () => {
    const logger = await createLogger({
      runAsWorker: false,
      consoleTransport: undefined,
      transport: new CustomConsoleTransport(STD_LEVEL_DEF, {
        formatter: {
          kind: 'template',
          stringify: 'printer',
          template: '{meta}',
          printer: {
            arrayFormatter: {
              prefix: '- ',
            },
          },
        },
      }),
    })
    logger.info({
      test: 123,
      a: [1, 2, 3, 4, 5],
      b: [1, 2, 3, 4, 5, 6, 7, 8],
      c: {
        a: 1,
        b: 2,
        c: {
          d: 3,
          e: 4,
          f: [1, 2, 3, 4, 5, 6, 7, 8],
          gabc: [
            { a: 1 },
            { a: 2 },
            { a: 3 },
            { a: 4 },
            { a: 5 },
            { a: 6 },
            { a: 7 },
            { a: 8 },
          ],
        },
      },
    })
    expect(spy.pop()).toBe(`{
  "test": 123,
  "a": [- 1, - 2, - 3, - 4, - 5],
  "b": [
    - 1,
    - 2,
    - 3,
    - 4,
    - 5,
    - 6,
    - 7,
    - 8
  ],
  "c": {
    "a": 1,
    "b": 2,
    "c": {
      "d": 3,
      "e": 4,
      "f": [
        - 1,
        - 2,
        - 3,
        - 4,
        - 5,
        - 6,
        - 7,
        - 8
      ],
      "gabc": [
        - {
            "a": 1
          },
        - {
            "a": 2
          },
        - {
            "a": 3
          },
        - {
            "a": 4
          },
        - {
            "a": 5
          },
        - {
            "a": 6
          },
        - {
            "a": 7
          },
        - {
            "a": 8
          }
      ]
    }
  }
}`)
  })

  it('format 2', async () => {
    const logger = await createLogger({
      runAsWorker: false,
      consoleTransport: undefined,
      transport: new CustomConsoleTransport(STD_LEVEL_DEF, {
        formatter: {
          kind: 'template',
          stringify: 'printer',
          template: '{meta}',
          printer: {
            quotes: '',
            objectFormatter: { showBrackets: false, showCommas: false },
            arrayFormatter: {
              delimiters: { open: '', close: '' },
              separator: '',
              prefix: '- ',
              maxInlineItems: 7,
            },
          },
        },
      }),
    })
    logger.info({
      test: 123,
      a: [1, 2, 3, 4, 5],
      b: [1, 2, 3, 4, 5, 6, 7, 8],
      c: {
        a: 1,
        b: 2,
        c: {
          d: 3,
          e: 4,
          f: [1, 2, 3, 4, 5, 6, 7, 8],
          gabc: [
            { a: 1, b: 3 },
            { a: 2, b: 4 },
            { a: 3 },
            { a: 4 },
            { a: 5 },
            { a: 6 },
            { a: 7 },
            { a: 8 },
          ],
        },
      },
    })
    expect(spy.pop()).toBe(`test: 123
a: - 1, - 2, - 3, - 4, - 5
b: 
  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
c:
  a: 1
  b: 2
  c:
    d: 3
    e: 4
    f: 
      - 1
      - 2
      - 3
      - 4
      - 5
      - 6
      - 7
      - 8
    gabc: 
      - a: 1
        b: 3
      - a: 2
        b: 4
      - a: 3
      - a: 4
      - a: 5
      - a: 6
      - a: 7
      - a: 8`)
  })
})
