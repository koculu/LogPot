const DEFAULTS: Intl.DateTimeFormatOptions = {
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
}

const defaultFormatter = new Intl.DateTimeFormat(undefined, DEFAULTS)

/**
 * Creates an Intl.DateTimeFormat for formatting dates and times.
 *
 * If both `locales` and `options` are omitted, returns a shared
 * default formatter instance.
 *
 * @param locales - BCP 47 language tag(s) to use. Defaults to the host environment's locale.
 * @param options - Formatting options (year, month, day, hour, minute, second, fractionalSecondDigits).
 * @returns A date-time formatter configured with the specified locales and options.
 *
 * @see https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat#parameters
 *
 * @example
 * ```ts
 * // Default formatting (e.g., "2025-07-26 16:32:10.123")
 * const fmt = createDateFormatter();
 * console.log(fmt.format(new Date()));
 *
 * @example
 * // French month and day
 * const fmtFr = createDateFormatter('fr-FR', { month: 'long', day: 'numeric' });
 * console.log(fmtFr.format(new Date())); // e.g., "26 juillet"
 * ```
 */
export function createDateFormatter(
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  if (!locales && !options) return defaultFormatter
  const opts = options ?? DEFAULTS
  return new Intl.DateTimeFormat(locales, opts)
}
