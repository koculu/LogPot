import { defaultPrinter } from './defaultPrinter'
import { ArrayFormatter } from './formatters/arrayFormatter'
import { ArrayFormatterConfig } from './formatters/arrayFormatterConfig'
import {
  BooleanFormatter,
  CircularFormatter,
  DateFormatter,
  DateFormatterConfig,
  FunctionFormatter,
  NullFormatter,
  NumberFormatter,
  StringFormatter,
  SymbolFormatter,
  UndefinedFormatter,
} from './formatters/formatter'
import { ObjectFormatter } from './formatters/objectFormatter'
import { ObjectFormatterConfig } from './formatters/objectFormatterConfig'
import { Printer } from './printer'

/**
 * Factory function to create a Printer with optional overrides
 * for object, array, and date formatting configurations.
 *
 * @param objectFormatter - Overrides for object formatting.
 * @param arrayFormatter - Overrides for array formatting.
 * @param dateFormatter - Overrides for date formatting.
 * @returns A new Printer instance or the defaultPrinter if no overrides provided.
 */

export function createPrinter(
  objectFormatter?: Partial<ObjectFormatterConfig>,
  arrayFormatter?: Partial<ArrayFormatterConfig>,
  dateFormatter?: Partial<DateFormatterConfig>
) {
  if (!objectFormatter && !arrayFormatter && !dateFormatter)
    return defaultPrinter
  return new Printer([
    new CircularFormatter(),
    new NullFormatter(),
    new UndefinedFormatter(),
    new NumberFormatter(),
    new BooleanFormatter(),
    new StringFormatter(),
    new SymbolFormatter(),
    new FunctionFormatter(),
    new DateFormatter(dateFormatter),
    new ArrayFormatter(arrayFormatter),
    new ObjectFormatter(objectFormatter),
  ])
}
