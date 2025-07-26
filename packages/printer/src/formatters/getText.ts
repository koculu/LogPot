import { PrintContext } from '../printContext'

export function getText(ctx: PrintContext, value: string) {
  return ctx.indent + ctx.prefix + String(value)
}
