import { merge } from '@logpot/utils'
import { isError, isString } from '@logpot/utils'
import { ErrorSerialization, serializeError } from '@logpot/utils'

import {
  DEFAULT_LEVELS,
  defineLevels,
  LevelDefinition,
  LevelName,
  LevelNumber,
} from './levels'
import { Log, LogMeta } from './log'
import { ILogger, Logger } from './logger'
import { Transport, TransportOptions } from './transports/transport'

export class LogPot<
  Meta extends LogMeta = LogMeta,
  Levels extends Record<string, number> = DEFAULT_LEVELS
> implements ILogger<Meta, Levels>
{
  private readonly transports: Array<Transport<Levels>>
  private readonly parent?: LogPot<Meta, Levels>
  private readonly context?: LogMeta
  private readonly levels: Levels

  private readonly getLevelNumber: (
    name: LevelName<Levels>
  ) => LevelNumber<Levels>

  private readonly getLevelName: (
    levelNumber: LevelNumber<Levels>
  ) => LevelName<Levels>

  readonly levelDefinition: LevelDefinition<Levels>

  // Option is valid only for the root level, the logLevel assigned to the children is ignored.
  logLevel = 0

  // Option is valid only for the root level, the filter assigned to the children is ignored.
  filter?: (log: Log<Levels>) => boolean

  // Option is valid only for the root level, the option assigned to the children is ignored.
  errorSerialization?: ErrorSerialization | undefined

  /**
   * If set, gets called on every Log; return null to drop the log,
   * or return a (possibly mutated) Log to continue. Effective only on root level.
   */
  transformer?: (log: Log<Levels>) => Log<Levels> | null

  resolveMessage?: (meta: Meta | Error) => string

  constructor(
    levels: Levels,
    context?: LogMeta,
    parent?: LogPot<Meta, Levels>,
    levelDefinition?: LevelDefinition<Levels>
  ) {
    levelDefinition ??= defineLevels(levels)
    this.levelDefinition = levelDefinition
    this.levels = levelDefinition.levels
    const getLevelNumber = levelDefinition.getLevelNumber
    this.getLevelNumber = getLevelNumber
    this.getLevelName = levelDefinition.getLevelName

    if (parent) {
      this.transports = parent.transports
      this.context = context
      this.parent = parent
    } else {
      this.transports = []
      this.context = context
    }
    const methods = Object.fromEntries(
      Object.keys(levels).map((key) => {
        const methodName = key.toLowerCase()
        const levelNumber = getLevelNumber(key)
        const method = (
          msg: string | Meta | Error,
          meta?: Meta | Meta | Error
        ) => {
          this.log(levelNumber, msg, meta)
        }
        return [methodName, method]
      })
    )
    Object.assign(this, methods)
  }

  log(
    level: LevelName<Levels> | LevelNumber<Levels>,
    msg: string | Meta | Error,
    meta?: Meta | Error
  ): void {
    if (isString(level)) level = this.getLevelNumber(level)
    if (level < this.getRoot().logLevel) return
    const time = Date.now()
    if (isError(msg)) {
      const err = serializeError(msg, this.getRoot().errorSerialization)
      meta = err as unknown as Meta
      msg = err.message
    } else if (!isString(msg)) {
      meta = msg
      msg = this.resolveMessage
        ? this.resolveMessage(meta)
        : String(meta['message'] ?? meta['msg'] ?? meta)
    }
    if (isError(meta))
      meta = serializeError(
        meta,
        this.getRoot().errorSerialization
      ) as unknown as Meta
    if (meta == null) meta = {} as Meta
    this.broadcast(this.makeLog(time, msg, level, meta))
  }

  child<Context extends LogMeta>(context: Context): Logger<Meta, Levels> {
    return new LogPot<Meta, Levels>(
      this.levels,
      context,
      this,
      this.levelDefinition
    ) as Logger<Meta, Levels>
  }

  withMeta<Extra extends LogMeta>(): Logger<Meta & Extra, Levels> {
    return this as Logger<Meta & Extra, Levels>
  }

  withCategory<C extends string>(category: C): Logger<Meta, Levels> {
    return this.child({ category })
  }

  async flush(): Promise<void> {
    await Promise.all(this.transports.map((x) => x.flushAndWait()))
  }

  async close(): Promise<void> {
    await this.flush()
    await Promise.all(this.transports.map((x) => x.close()))
  }

  private broadcast(log: Log<Levels>) {
    if (this.context) {
      if (!log.meta) log.meta = this.context
      else log.meta = merge(log.meta, this.context)
    }
    if (this.parent) {
      this.parent.broadcast(log)
      return
    }
    const filter = this.filter
    if (filter && !filter(log)) return
    if (this.transformer) {
      const transformed = this.transformer(log)
      if (transformed == null) return
      log = transformed
    }

    const workers: Transport<Levels>[] = []
    const main: Transport<Levels>[] = []

    for (const t of this.transports) {
      ;(t.hasWorker ? workers : main).push(t)
    }

    if (workers.length) {
      // serialize once in the main thread
      let raw: string | undefined
      const getRaw = () => {
        if (raw) return raw
        raw = JSON.stringify(log)
        return raw
      }
      for (const transport of workers) {
        if (!this.processTransportOptions(log, transport.options)) continue
        const trFn = transport.options.transformer
        if (trFn) {
          const tlog = trFn(log)
          if (tlog) transport.log(tlog)
          continue
        }
        transport.raw(getRaw())
      }
    }

    for (const transport of main) {
      if (!this.processTransportOptions(log, transport.options)) continue
      const trFn = transport.options.transformer
      if (trFn) {
        const tlog = trFn(log)
        if (tlog) transport.log(tlog)
        continue
      }
      transport.log(log)
    }
  }

  private processTransportOptions(
    log: Log<Levels>,
    opts?: TransportOptions<Levels>
  ) {
    if ((opts?.logLevel ?? 0) > log.level) return false
    if (!opts) return true

    const levelName = this.getLevelName(log.level)
    if (opts.levels && !opts.levels.includes(levelName)) return false
    if (opts.filter && !opts.filter(log)) return false
    if (opts.categories && log.meta) {
      const cat = (log.meta as LogMeta).category
      if (!isString(cat) || !opts.categories.has(cat)) return false
    }
    return true
  }

  private getRoot() {
    let logger = this as LogPot<Meta, Levels>
    while (logger.parent) {
      logger = logger.parent
    }
    return logger
  }

  private makeLog(
    time: number,
    msg: string,
    level: LevelNumber<Levels>,
    meta?: Meta | Error
  ): Log<Levels> {
    return {
      time,
      msg,
      meta,
      level,
    }
  }

  addTransport(transport: Transport<Levels>): this {
    if (this.transports.includes(transport))
      throw new Error('Transport is already added.')
    this.transports.push(transport)
    return this
  }

  removeTransport(transport: Transport<Levels>) {
    const arr = this.transports
    if (arr.includes(transport)) arr.splice(arr.indexOf(transport), 1)
    return transport.close()
  }

  async clear() {
    const promises = this.transports.map((transport) =>
      this.removeTransport(transport)
    )
    this.transports.length = 0
    await Promise.all(promises)
  }

  toLogger(): Logger<Meta, Levels> {
    return this as Logger<Meta, Levels>
  }
}
