import { ArrayFormatter } from './formatters/arrayFormatter'
import {
  BooleanFormatter,
  CircularFormatter,
  DateFormatter,
  FunctionFormatter,
  NullFormatter,
  NumberFormatter,
  StringFormatter,
  SymbolFormatter,
  UndefinedFormatter,
} from './formatters/formatter'
import { ObjectFormatter } from './formatters/objectFormatter'
import { Printer } from './printer'

/**
 * The default Printer instance, pre-configured with all built-in formatters:
 * Circular, Null, Undefined, Number, Boolean, String, Symbol, Function,
 * Date, Array, and Object formatters.
 */

export const defaultPrinter = new Printer([
  new CircularFormatter(),
  new NullFormatter(),
  new UndefinedFormatter(),
  new NumberFormatter(),
  new BooleanFormatter(),
  new StringFormatter(),
  new SymbolFormatter(),
  new FunctionFormatter(),
  new DateFormatter(),
  new ArrayFormatter(),
  new ObjectFormatter(),
])
