/* eslint-disable @typescript-eslint/no-explicit-any */
import * as writeAsyncMod from '@logpot/utils'
import crypto from 'crypto'
import EventEmitter from 'events'
import { promises as fsPromises } from 'fs'
import fs from 'fs'
import path from 'path'
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { STD_LEVEL_DEF } from '../levels'
import type { Log } from '../log'
import { FileRotator } from './fileRotator'
import { FileTransport } from './fileTransport'
import { TransportError } from './transport'

const BASE_TMP = path.join(__dirname, 'tmp')

const sampleLog: Log = {
  msg: 'hello world',
  level: 30,
  time: Date.now(),
  meta: { foo: 'bar' },
}

let testDir: string

async function cleanup() {
  // remove the entire BASE_TMP after all tests
  await fsPromises.rm(BASE_TMP, { recursive: true, force: true })
}

beforeEach(async () => {
  // unique temp dir for each test
  testDir = path.join(BASE_TMP, crypto.randomUUID())
  await fsPromises.mkdir(testDir, { recursive: true })
})

afterEach(async () => {
  try {
    await fsPromises.rm(testDir, { recursive: true, force: true })
  } catch {
    // ignore
  }
})

afterAll(async () => {
  await cleanup()
})

describe('FileTransport basic logging', () => {
  it('writes a single log ', async () => {
    const logfile = path.join(testDir, 'out.log')
    let transportError: TransportError | undefined
    const t = new FileTransport(STD_LEVEL_DEF, {
      filename: logfile,
      formatter: {
        kind: 'ndjson',
        timeFormat: 'epoch',
      },
      onError: (err) => {
        transportError = err
      },
    })
    t.log(sampleLog)
    await t.flushAndWait()

    const content = await fsPromises.readFile(logfile, 'utf8')
    const lines = content
      .trim()
      .split('\n')
      .map((x) => JSON.parse(x))
    expect(lines).toHaveLength(1)
    expect(lines[0]).toEqual({ ...sampleLog, level: 'INFO' })

    await t.close()
    t.log(sampleLog)
    expect(transportError).toBeDefined()
    expect(transportError?.err.message).toMatch(/closed/)
    expect(transportError?.log).toEqual(sampleLog)
  })

  it('writes multiple logs', async () => {
    const logfile = path.join(testDir, 'queue.log')
    const t = new FileTransport(STD_LEVEL_DEF, {
      filename: logfile,
      formatter: {
        kind: 'ndjson',
        timeFormat: 'epoch',
      },
    })
    t.log(sampleLog)
    t.log({ msg: 'second', level: 20, time: Date.now() })
    await t.flushAndWait()

    const content = await fsPromises.readFile(logfile, 'utf8')
    const lines = content.trim().split('\n')
    expect(lines).toHaveLength(2)
    const parsed = lines.map((x) => JSON.parse(x))
    expect(parsed[0]).toEqual({ ...sampleLog, level: 'INFO' })
    expect(parsed[1]).toMatchObject({ msg: 'second', level: 'DEBUG' })

    await t.close()
  })

  it('auto-creates nested directories', async () => {
    const nested = path.join(testDir, 'a/b/c/log.txt')
    const t = new FileTransport(STD_LEVEL_DEF, {
      filename: nested,
      formatter: {
        kind: 'ndjson',
        timeFormat: 'epoch',
      },
    })
    t.log(sampleLog)
    await t.flushAndWait()

    expect(fs.existsSync(path.dirname(nested))).toBe(true)
    const content = await fsPromises.readFile(nested, 'utf8')
    expect(JSON.parse(content)).toEqual({ ...sampleLog, level: 'INFO' })
    await t.close()
  })
})

describe('FileTransport formatting & options', () => {
  it('format() returns JSON string', () => {
    const logfile = path.join(testDir, 'fmt.log')
    const t = new FileTransport(STD_LEVEL_DEF, {
      filename: logfile,
      formatter: {
        kind: 'ndjson',
        timeFormat: 'epoch',
        stringify: 'simple',
      },
    })
    expect((t as any).format([sampleLog])).toBe(
      JSON.stringify({ ...sampleLog, level: 'INFO' }) + '\n'
    )
  })

  it('respects custom encoding', async () => {
    const logfile = path.join(testDir, 'enc.log')
    const t = new FileTransport(STD_LEVEL_DEF, {
      filename: logfile,
      encoding: 'utf16le',
      formatter: {
        kind: 'ndjson',
        timeFormat: 'epoch',
      },
    })
    t.log(sampleLog)
    await t.flushAndWait()

    const buf = await fsPromises.readFile(logfile)
    const asText = buf.toString('utf16le').trim()
    expect(JSON.parse(asText)).toEqual({ ...sampleLog, level: 'INFO' })
    await t.close()
  })
})

describe('FileTransport lifecycle', () => {
  it('getWorkerUrl includes fileTransport', () => {
    const logfile = path.join(testDir, 'life.log')
    const t = new FileTransport(STD_LEVEL_DEF, { filename: logfile }) as any
    const url = t.getWorkerUrl().href
    expect(typeof url).toBe('string')
    expect(url).toContain('fileTransport')
  })

  it('close() flushes and closes the stream', async () => {
    const logfile = path.join(testDir, 'close.log')
    let transportError: TransportError | undefined
    const t = new FileTransport(STD_LEVEL_DEF, {
      filename: logfile,
      onError: (err) => {
        transportError = err
      },
    })
    t.log(sampleLog)
    await t.close()
    t.log(sampleLog)
    expect(transportError?.err.message).toBe(
      'Transport is closed and cannot process new log request.'
    )
  })

  it('close() without any logs creates a file', async () => {
    const logfile = path.join(testDir, 'none.log')
    const t = new FileTransport(STD_LEVEL_DEF, { filename: logfile })
    await t.close()
    expect(fs.existsSync(logfile)).toBe(true)
  })

  it('fileTransportOptions getter returns correct merged options', () => {
    const opts = {
      filename: path.join(testDir, 'opt.log'),
      encoding: 'utf16le' as BufferEncoding,
      worker: { closeTimeout: 123 },
      flags: 'w',
    }
    const t = new FileTransport(STD_LEVEL_DEF, opts) as any
    const fo = t.options
    expect(fo.filename).toBe(opts.filename)
    expect(fo.encoding).toBe('utf16le')
    expect(fo.worker?.closeTimeout).toBe(123)
    expect(fo.flags).toBe('w')
  })

  it('throws when logging while closing', async () => {
    const logfile = path.join(testDir, 'closeNow.log')
    let transportError: TransportError | undefined
    const t = new FileTransport(STD_LEVEL_DEF, {
      filename: logfile,
      onError: (err) => {
        transportError = err
      },
    })
    const closePromise = t.close()
    t.log(sampleLog)
    expect(transportError?.err.message).toBe(
      'Transport is closing and cannot process new log request.'
    )
    await closePromise
  })
})

describe('FileTransport flags behavior', () => {
  it('respects flags "w" for truncate then appends with default', async () => {
    const logfile = path.join(testDir, 'flags.log')
    const t1 = new FileTransport(STD_LEVEL_DEF, {
      filename: logfile,
      flags: 'w',
      formatter: {
        kind: 'ndjson',
        timeFormat: 'epoch',
      },
    })
    t1.log(sampleLog)
    await t1.flushAndWait()
    await t1.close()

    const t2 = new FileTransport(STD_LEVEL_DEF, {
      filename: logfile,
      formatter: {
        kind: 'ndjson',
        timeFormat: 'epoch',
      },
    }) // defaults to 'a'
    const second: Log = { msg: 'second', level: 20, time: Date.now() }
    t2.log(second)
    await t2.flushAndWait()
    await t2.close()

    const parsed = (await fsPromises.readFile(logfile, 'utf8'))
      .trim()
      .split('\n')
      .map((x) => JSON.parse(x))
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toEqual({ ...sampleLog, level: 'INFO' })
    expect(parsed[1]).toEqual({ ...second, level: 'DEBUG' })
  })
})

describe('FileTransport rotation hook', () => {
  it('invokes rotator.rotate when configured', async () => {
    const logfile = path.join(testDir, 'rotate.log')
    const spy = vi.spyOn(FileRotator.prototype, 'rotate')

    const t = new FileTransport(STD_LEVEL_DEF, {
      filename: logfile,
      batchSize: 1,
      rotate: { maxSize: 1 },
    })
    t.log(sampleLog)
    t.log(sampleLog)
    await t.flushAndWait()

    expect(spy).toBeCalledTimes(1)
    spy.mockRestore()
    await t.close()
  })
})

// 1) Compression of rotated files
describe('FileTransport rotation + compression', () => {
  it('creates a .gz after rotation and removes the uncompressed rotated file', async () => {
    const logfile = path.join(testDir, 'comp.log')
    const t = new FileTransport(STD_LEVEL_DEF, {
      filename: logfile,
      batchSize: 1,
      rotate: { maxSize: 1, compress: true },
    })

    // first write (no rotate)
    t.log(sampleLog)
    await t.flushAndWait()
    // second write triggers rotate
    t.log(sampleLog)
    await t.flushAndWait()
    await t.close()

    const files = await fsPromises.readdir(testDir)
    const gz = files.find((f) => f.endsWith('.gz'))
    expect(gz).toBeDefined()
    // no uncompressed rotated file starting with base name + '.'
    const uncompressed = files.filter(
      (f) => f.startsWith('comp.') && f.endsWith('.log')
    ).length
    expect(uncompressed).toBe(1)
    // the live log file should still exist with the second entry
    const live = await fsPromises.readFile(logfile, 'utf8')
    expect(live.trim().split('\n')).toHaveLength(1)
  })
})

// 2) Retention (maxFiles) pruning
describe('FileTransport rotation + retention', () => {
  it('keeps only the newest maxFiles rotated logs', async () => {
    const logfile = path.join(testDir, 'ret.log')
    const t = new FileTransport(STD_LEVEL_DEF, {
      filename: logfile,
      rotate: { maxSize: 1, maxFiles: 1, compress: true },
    })

    // 1st write: no rotate
    t.log(sampleLog)
    await t.flushAndWait()
    // 2nd write: rotates first entry → one rotated
    t.log(sampleLog)
    await t.flushAndWait()
    // 3rd write: rotates second entry → two rotated, but maxFiles=1 so prune one
    t.log(sampleLog)
    await t.flushAndWait()
    await t.close()

    const files = await fsPromises.readdir(testDir)
    const rotated = files.filter(
      (f) => f.startsWith('ret.') && f.endsWith('.gz')
    )
    expect(rotated).toHaveLength(1)
  })
})

// 3) Interval-based rotation
describe('FileRotator interval rotation', () => {
  it('rotates when the time-based key changes', async () => {
    const filename = path.join(testDir, 'int.log')
    const rot = new FileRotator(filename, { interval: 'daily' })

    // stub computeKey to simulate same-day then next-day
    const originalCurrentKey = (rot as any).currentKey
    vi.spyOn(rot as any, 'computeKey')
      .mockReturnValueOnce(originalCurrentKey)
      .mockReturnValueOnce('SOME_NEW_KEY')
    // stub the low-level rotate steps
    vi.spyOn(rot as any, 'compress').mockResolvedValue(undefined)
    vi.spyOn(rot as any, 'retention').mockResolvedValue(undefined)

    const first = rot.shouldRotate(0)
    expect(first).toBe(false)

    const second = rot.shouldRotate(0)
    expect(second).toBe(true)
  })
})

// 4) Error handling in writes
describe('FileTransport write errors', () => {
  it('always decrements activeTasks even if writeAsync rejects', async () => {
    const logfile = path.join(testDir, 'err.log')
    const spy = vi
      .spyOn(writeAsyncMod, 'buildWriteAsync')
      .mockReturnValue(() => {
        throw new Error('boom')
      })

    const t = new FileTransport(STD_LEVEL_DEF, {
      filename: logfile,
      batchSize: 1,
      retry: { maxRetry: 1 },
      onError: () => {},
    })

    t.log(sampleLog)
    await t.flushAndWait()
    expect((t as any).queue.length).toBe(0)
    spy.mockRestore()
    await t.close()
  })
})

// 5) Custom file modes
describe('FileTransport file mode ', () => {
  it('retains custom mode in its options', () => {
    const customMode = 0o600
    const logfile = path.join(testDir, 'mode.log')
    const t = new FileTransport(STD_LEVEL_DEF, {
      filename: logfile,
      mode: customMode,
    }) as any
    const fo = t.options
    expect(fo.mode).toBe(customMode)
  })
})

// 6) Worker-thread mode
describe('FileTransport worker-thread integration', () => {
  it('runAsWorker posts options and waits for ready', async () => {
    // fake Worker
    class FakeWorker extends EventEmitter {
      postMessage() {
        setImmediate(() => this.emit('message', 'ready'))
      }
      terminate() {
        return Promise.resolve()
      }
    }
    const opts = { filename: path.join(testDir, 'wt.log') }
    const t = new FileTransport(STD_LEVEL_DEF, opts)
    // override the private createWorker
    ;(t as any).createWorker = () => new FakeWorker()
    await t.runAsWorker()
    expect((t as any).worker).toBeInstanceOf(FakeWorker)
  })

  it('runAsWorker stops flush timer', async () => {
    class FakeWorker extends EventEmitter {
      postMessage() {
        setImmediate(() => this.emit('message', 'ready'))
      }
      terminate() {
        return Promise.resolve()
      }
    }
    const t = new FileTransport(STD_LEVEL_DEF, {
      filename: path.join(testDir, 'timer.log'),
    }) as any
    const originalTimer = t.flushTimer
    expect(originalTimer).toBeDefined()
    t.createWorker = () => new FakeWorker()
    await t.runAsWorker()
    expect(t.flushTimer).toBeUndefined()
  })

  it('close() sends close, waits for closed, then terminates', async () => {
    class FakeWorker extends EventEmitter {
      terminated = false
      postMessage(msg: any) {
        if (msg === 'close') setImmediate(() => this.emit('message', 'closed'))
      }
      terminate() {
        this.terminated = true
        return Promise.resolve()
      }
    }
    const t = new FileTransport(STD_LEVEL_DEF, {
      filename: path.join(testDir, 'wt2.log'),
    })
    const fake = new FakeWorker()
    ;(t as any).worker = fake as any
    const termSpy = vi.spyOn(fake, 'terminate')

    await t.close()
    expect(termSpy).toHaveBeenCalled()
    expect((t as any).isClosed).toBe(true)
  })
})
