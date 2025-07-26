import { LevelDefinition } from '../levels'
import { HttpTransport,HttpTransportOptions } from './httpTransport'
import { Transport } from './transport'

Transport.initWorker(
  (options: HttpTransportOptions, levelDefinition: LevelDefinition) => {
    const transport = new HttpTransport(levelDefinition, options)
    return transport
  }
)
