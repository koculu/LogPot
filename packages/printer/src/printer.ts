import { toColorizer } from './consoleColor'
import { IFormatter } from './formatters/formatter'
import { getText } from './formatters/getText'
import { ObjectFormatter } from './formatters/objectFormatter'
import { PrintContext } from './printContext'

/**
 * Core printer class responsible for delegating value formatting
 * to the first compatible formatter in its registry.
 */
export class Printer {
  private readonly formatters: IFormatter[]

  /**
   * Create a new Printer instance.
   *
   * @param formatters - Array of formatter implementations to register.
   */
  constructor(formatters: IFormatter[]) {
    this.formatters = formatters
  }

  /**
   * Retrieves the ObjectFormatter instance from the registered formatters.
   * Useful for customizing object-specific formatting behavior.
   */
  get objectFormatter() {
    return this.formatters.filter((f) => f instanceof ObjectFormatter)[0]
  }

  /**
   * Prints a value by finding the first formatter that can handle it.
   *
   * @param value - The value to be formatted.
   * @param ctx - Context carrying state like indentation and color config.
   * @returns The formatted string output.
   */
  public print(value: unknown, ctx: PrintContext): string {
    for (const formatter of this.formatters) {
      if (formatter.canFormat(value, ctx)) {
        return formatter.format(value, ctx, this)
      }
    }
    return getText(ctx, toColorizer(ctx.colorConfig.default)(String(value)))
  }
}
