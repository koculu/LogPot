import { LevelDefinition } from '../levels'
import { FileTransport,FileTransportOptions } from './fileTransport'
import { Transport } from './transport'

Transport.initWorker(
  (options: FileTransportOptions, levelDefinition: LevelDefinition) => {
    const transport = new FileTransport(levelDefinition, options)
    return transport
  }
)
