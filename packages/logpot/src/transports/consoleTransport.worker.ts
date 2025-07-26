import { LevelDefinition } from '../levels'
import { ConsoleTransport,ConsoleTransportOptions } from './consoleTransport'
import { Transport } from './transport'

Transport.initWorker(
  (options: ConsoleTransportOptions, levelDefinition: LevelDefinition) => {
    const transport = new ConsoleTransport(levelDefinition, options)
    return transport
  }
)
