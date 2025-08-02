export function escapeQuotes(str: string, quotes: string) {
  if (!quotes) return str
  if (quotes == '"') return JSON.stringify(str)
  str = str.split(quotes).join('\\' + quotes)
  return `${quotes}${str}${quotes}`
}
