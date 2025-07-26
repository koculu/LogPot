export type {
  HttpAuth,
  HttpAuthApiKey,
  HttpAuthBasic,
  HttpAuthBearer,
  HttpAuthNone,
  HttpAuthOAuth2,
} from './auth/auth'
export type { Authenticator } from './auth/authenticator'
export { createAuthenticator } from './auth/createAuthenticator'
export { createLogger, type CreateLoggerOptions } from './createLogger'
export type {
  CommonOptions,
  EnvelopeOptions,
  FormatTemplateHooks,
  FormatterOptions,
  JsonArrayOptions,
  NdjsonOptions,
  TemplateOptions,
  TimeFormat,
} from './formatter'
export { Formatter } from './formatter'
export { disableLogger, getLogger, hasLogger, setLogger } from './getLogger'
export type { LevelDefinition, LevelName, LevelNumber } from './levels'
export type { DEFAULT_LEVELS } from './levels'
export { STD_LEVEL_DEF } from './levels'
export { type Log, type LogMeta } from './log'
export { type ILogger, type Logger } from './logger'
export type { ConsoleTheme, LogPotColorConfig } from './transports/consoleTheme'
export type { ConsoleTransportOptions } from './transports/consoleTransport'
export { ConsoleTransport } from './transports/consoleTransport'
export type { Interval, RotationOptions } from './transports/fileRotator'
export type { FileTransportOptions } from './transports/fileTransport'
export { FileTransport } from './transports/fileTransport'
export type { HttpTransportOptions } from './transports/httpTransport'
export { HttpTransport } from './transports/httpTransport'
export type { TransportOptions } from './transports/transport'
export { Transport, type TransportError } from './transports/transport'
declare const LOGPOT_VERSION: string
export const version = LOGPOT_VERSION
