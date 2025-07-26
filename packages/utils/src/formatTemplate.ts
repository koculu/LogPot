// 1) Depth index and decrement map (as before)
type Depth = 5 | 4 | 3 | 2 | 1 | 0
type Prev = { 5: 4; 4: 3; 3: 2; 2: 1; 1: 0; 0: never }

// 2) Path<T,D> now special-cases D=0
type Path<T, D extends Depth = 5> =
  // Once we've hit 0, we allow "K" | "K.<anything>"
  D extends 0
    ? T extends object
      ? {
          [K in Extract<keyof T, string>]: K | `${K}.${string}`
        }[Extract<keyof T, string>]
      : never
    : // Otherwise recurse at D>0 as before
    [D] extends [never]
    ? never
    : T extends object
    ? {
        [K in Extract<keyof T, string>]:
          | K
          | (T[K] extends object ? `${K}.${Path<T[K], Prev[D]>}` : never)
      }[Extract<keyof T, string>]
    : never

type Combined<
  T extends Record<string, unknown>,
  K extends Record<string, unknown> = T
> = {
  [P in keyof T | keyof K]: P extends keyof T
    ? T[P]
    : P extends keyof K
    ? K[P]
    : never
}

type SpecificHooks<
  T extends Record<string, unknown>,
  K extends Record<string, unknown> = T
> = {
  [P in Path<Combined<T, K>>]?: (
    key: string,
    value: unknown,
    options: string
  ) => unknown | undefined
}

type FallbackHooks<SK extends string> = {
  [P in Exclude<string, SK> | '*']?: (
    key: P,
    value: unknown,
    options: string
  ) => unknown | undefined
}

export type TemplateHooks<
  T extends Record<string, unknown>,
  K extends Record<string, unknown> = T
> = SpecificHooks<T, K> & FallbackHooks<Path<Combined<T, K>>>

function tryGetValue<
  T extends Record<string, unknown> = Record<string, unknown>
>(data: T, parts: string[], stringify: (value: unknown) => unknown) {
  let hasKey = true
  let obj: unknown = data
  let arrayIndex: number | undefined = undefined
  let nextIsArrayIndex = false
  for (const part of parts) {
    if (obj == undefined) break
    const p = part.trim()
    if (p === '.' || p === ']' || p === '' || p === 'this') continue
    if (p === '[') {
      nextIsArrayIndex = true
      continue
    }

    if (nextIsArrayIndex) {
      arrayIndex = Number.parseInt(p)
      nextIsArrayIndex = false
      if (Array.isArray(obj) && arrayIndex != undefined) {
        obj = obj[arrayIndex]
        hasKey = true
        continue
      }
    }

    if (obj instanceof Map) {
      hasKey = obj.has(p)
      obj = obj.get(p)
      continue
    }
    if (obj == null || typeof obj !== 'object') {
      obj = undefined
      hasKey = false
      break
    }
    hasKey = p in obj
    obj = (obj as Record<string, unknown>)[p]
  }

  if (obj != null && typeof obj === 'object') {
    obj = stringify(obj)
  }
  return { value: obj, hasKey }
}

/**
 * Formats a template string by replacing `{…}` placeholders with values from
 * the provided data object, supports nested paths, arrays, Maps, fallbacks,
 * defaults, and custom hooks with inline options.
 *
 * Placeholder syntaxes:
 * - `{key}` or `{nested.key.path}`
 *    Resolves `key` (or dot-notation path) in `data`, then in `defaults`.
 *
 * - `{key[index]}`
 *    Supports array indexing via `[number]` on any path segment.
 *
 * - `{mapKey}` when `data.mapKey` is a Map
 *    Resolves via `Map.has(key)` and `Map.get(key)`.
 *
 * - `{key ?? fallback}` or `{key || fallback}`
 *    If the primary lookup yields `undefined` or `null` (or for `||`, also `false`,`0`,`''`),
 *    resolves `fallback` instead (first in `data`, then `defaults`).
 *
 * - `{key:options}` or `{nested.key:options}`
 *    Anything after the first `:` is passed as the `options` string to your hook.
 *
 * Generic type parameters:
 * @typeParam T - Type of the main data object (keys and nested structures).
 * @typeParam K - Type of the defaults object (should mirror or extend `T`).
 *
 * @param template - A string containing `{…}` tokens to be replaced.
 *
 * @param data - Primary lookup source. Can contain nested objects, arrays, or Maps.
 *
 * @param defaults - Secondary lookup source for missing or undefined keys in `data`.
 *
 * @param hooks -
 *   Optional map of hook functions:
 *   - **Specific hooks**: properties named exactly by any valid path
 *     (e.g. `"user.name"`, `"items[2].price"`), signature:
 *       `(key: string, value: unknown, options: string) => any`
 *   - **Fallback hook**: the `'*'` key, invoked when no specific hook matches.
 *   Hooks receive:
 *   1. The resolved `key` string (after default-resolution),
 *   2. The raw or defaulted `value`,
 *   3. The parsed `options` string.
 *   If a hook returns non-`null`/`undefined`, that value is used as the replacement.
 *
 *  @param stringify - The objects are serialized using the stringify callback.
 *
 * @returns
 *   The formatted result where each placeholder is replaced by:
 *   - The hook return value (if provided and non-null),
 *   - Otherwise `String(value)` of the resolved data/default,
 *   - Or left verbatim as `{…}` if no key was found.
 *
 * @example
 * ```ts
 * const tpl = "User: {user.name}, 2nd Tag: {tags[1] ?? 'n/a'}, Color: {theme:red}";
 * const data = {
 *   user: { name: "Alice" },
 *   tags: ["admin", "editor"],
 *   theme: "blue"
 * };
 * const defaults = {};
 * const hooks = {
 *   "theme": (_k, v, opts) => opts === "red" ? "FF0000" : v
 * };
 *
 * formatTemplate(tpl, data, defaults, hooks);
 * // → "User: Alice, 2nd Tag: editor, Color: FF0000"
 * ```
 */
export function formatTemplate<
  T extends Record<string, unknown> = Record<string, unknown>,
  K extends Record<string, unknown> = T
>(
  template: string,
  data: T,
  defaults: Partial<K> = {},
  hooks: TemplateHooks<T, K> = {},
  stringify: (value: unknown) => unknown = (value) => JSON.stringify(value)
): string {
  return template.replace(/\{([^}]+)\}/g, (placeholder, path: string) => {
    let value: unknown = undefined,
      hasKey = false
    path = path.trim()
    if (path === '') return placeholder
    const colonIdx = path.indexOf(':')
    let options = ''
    if (colonIdx !== -1) {
      options = path.slice(colonIdx + 1).trim()
      path = path.slice(0, colonIdx).trim()
    }

    let primaryKey = path
    let fallbackKey: string | undefined
    let op: '??' | '||' | '' = ''
    const defaultMatch = path.match(/^(.*?)\s*(\?\?|\|\|)\s*(.+)$/)
    if (defaultMatch) {
      primaryKey = defaultMatch[1].trim()
      op = defaultMatch[2].trim() as '??' | '||'
      fallbackKey = defaultMatch[3].trim()
    }
    function resolve(path: string | undefined) {
      if (path == undefined) return placeholder
      const first = path[0]
      const last = path[path.length - 1]
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
        hasKey = true
        value = path.slice(1, -1)
      } else {
        const parts = path.split(/([.[\]])/)
        const fromData = tryGetValue(data, parts, stringify)
        value = fromData.value
        hasKey = fromData.hasKey
        if (!hasKey) {
          const fromDefaults = tryGetValue(defaults, parts, stringify)
          value = fromDefaults.value
          hasKey = fromDefaults.hasKey
        }
      }

      const keyFn = (
        hooks as Record<
          string,
          (path: string, value: unknown, options: string) => void
        >
      )[path]
      if (keyFn) {
        const hooked = keyFn(path, value, options)
        if (hooked != null) {
          hasKey = true
          return String(hooked)
        }
      }
      const globalFn = (
        hooks as Record<
          string,
          (path: string, value: unknown, options: string) => void
        >
      )['*']
      if (globalFn) {
        const hooked = globalFn(path, value, options)
        if (hooked != null) {
          hasKey = true
          return String(hooked)
        }
      }
      if (value == undefined) return value
      return hasKey ? String(value) : undefined
    }

    const first = resolve(primaryKey)
    const second = op && fallbackKey ? resolve(fallbackKey) : placeholder
    if (op == '??') return first ?? second ?? placeholder
    if (op == '||') return (first || second) ?? placeholder

    return hasKey ? String(first) : placeholder
  })
}
