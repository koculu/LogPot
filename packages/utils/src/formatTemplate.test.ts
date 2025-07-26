/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-object-type */
import { describe, expect,it } from 'vitest'

import { formatTemplate, TemplateHooks } from './formatTemplate'

describe('formatTemplate', () => {
  const tpl = '{level} : {time} - {msg}'
  const data = { level: 'INFO', msg: 'OK' }
  const defaults = { time: '00:00:00' }

  it('replaces placeholders with data values', () => {
    const result = formatTemplate(tpl, data)
    expect(result).toBe('INFO : {time} - OK')
  })

  it('uses defaults when data key is missing', () => {
    const result = formatTemplate(
      tpl,
      { level: 'WARN' },
      { time: '12:34:56', msg: 'Default Msg' }
    )
    expect(result).toBe('WARN : 12:34:56 - Default Msg')
  })

  it('returns placeholder for missing keys without defaults', () => {
    const result = formatTemplate(tpl, {}, {})
    expect(result).toBe('{level} : {time} - {msg}')
  })

  it('applies per-key map hooks', () => {
    const hooks: TemplateHooks<typeof data, typeof defaults> = {
      level: (_key, v) => `<<${v}>>`,
      time: (_key, v) => `[${v}]`,
    }
    const result = formatTemplate(tpl, data, defaults, hooks)
    expect(result).toBe('<<INFO>> : [00:00:00] - OK')
  })

  it('generic catch-all hook function when value presents', () => {
    const hookFn: TemplateHooks<typeof data, typeof defaults> = {
      '*': (k, v) => (k === 'msg' ? (v as string) + '!!!' : String(v)),
    }
    const result = formatTemplate(tpl, data, defaults, hookFn)
    expect(result).toBe('INFO : 00:00:00 - OK!!!')
  })

  it('handles numeric and null values', () => {
    const numTpl = '{count} items'
    const numData = { count: 5 }
    expect(formatTemplate(numTpl, numData)).toBe('5 items')
    expect(formatTemplate(numTpl, {}, { count: null })).toBe('null items')
    expect(formatTemplate(numTpl, {}, { count: undefined })).toBe(
      'undefined items'
    )
  })

  it('ignores extra data keys not in template', () => {
    const extraData = {
      level: 'DEBUG',
      time: '13:00:00',
      msg: 'Hi',
      foo: 'bar',
    }
    expect(formatTemplate(tpl, extraData)).toBe('DEBUG : 13:00:00 - Hi')
  })

  it('handles boolean and zero values correctly', () => {
    const tpl2 = '{flag} - {count}'
    const data2 = { flag: false, count: 0 }
    expect(formatTemplate(tpl2, data2)).toBe('false - 0')
  })

  it('replaces multiple occurrences of the same placeholder', () => {
    const tpl3 = '{word} and {word}'
    const data3 = { word: 'echo' }
    expect(formatTemplate(tpl3, data3)).toBe('echo and echo')
  })

  it('leaves literal braces when no valid placeholder name inside', () => {
    const tpl4 = 'Value: {} and { }'
    expect(formatTemplate(tpl4, {})).toBe('Value: {} and { }')
  })

  it('this keyword represent the root of the object', () => {
    const tpl4 = 'Value: {this} and {this.time}'
    expect(formatTemplate(tpl4, { time: 5 })).toBe('Value: {"time":5} and 5')
  })

  it('handles templates without any placeholders', () => {
    const plain = 'no placeholders here'
    expect(formatTemplate(plain, { foo: 'bar' })).toBe(plain)
  })

  it('applies per-key hook for missing key', () => {
    const tpl5 = '{missing}'
    const hooks: TemplateHooks<{}, {}> = {
      missing: () => 'replaced',
    }
    expect(formatTemplate(tpl5, {}, {}, hooks)).toBe('replaced')
  })

  it('applies generic hook for missing key', () => {
    const tpl6 = '{unknown}'
    const hookFn: TemplateHooks<{}, {}> = { '*': () => 'X' }
    expect(formatTemplate(tpl6, {}, {}, hookFn)).toBe('X')
  })

  it('supports keys with spaces', () => {
    const tpl7 = '{first name} {last name}'
    const data7 = { 'first name': 'John', 'last name': 'Doe' }
    expect(formatTemplate(tpl7, data7)).toBe('John Doe')
  })

  it('replaces simple keys', () => {
    const tpl = 'Hello, {name}!'
    const result = formatTemplate(tpl, { name: 'Alice' })
    expect(result).toBe('Hello, Alice!')
  })

  it('leaves unknown placeholders intact', () => {
    const tpl = 'Missing: {foo}'
    const result = formatTemplate(tpl, {})
    expect(result).toBe('Missing: {foo}')
  })

  it('supports nested dot-paths', () => {
    const tpl = 'User is {user.info.name}'
    const data = { user: { info: { name: 'Bob' } } }
    expect(formatTemplate(tpl, data)).toBe('User is Bob')
  })

  it('falls back to defaults when data missing', () => {
    const tpl = 'Date: {date}'
    const data = {}
    const defaults = { date: '2025-07-04' }
    expect(formatTemplate(tpl, data, defaults)).toBe('Date: 2025-07-04')
  })

  it('supports null-coalesce operator (??)', () => {
    const tpl = '{foo ?? bar}'
    const data = { bar: 'fallback' }
    expect(formatTemplate(tpl, data)).toBe('fallback')
  })

  it('supports || operator as alias for ??', () => {
    const tpl = '{foo || bar}'
    const data = { bar: 'alias' }
    expect(formatTemplate(tpl, data)).toBe('alias')
  })

  it('only falls back on undefined for ??', () => {
    const tpl = '{flag ?? alt}'
    const data1 = { flag: false, alt: 'ok' }
    expect(formatTemplate(tpl, data1)).toBe('false')

    const data2 = { flag: 0, alt: 'ok' }
    expect(formatTemplate(tpl, data2)).toBe('0')
  })

  it('falls back on undefined, 0 or  false for ||', () => {
    const tpl = '{flag || alt}'
    const data1 = { flag: false, alt: 'ok' }
    expect(formatTemplate(tpl, data1)).toBe('false')

    const data2 = { flag: 0, alt: 'ok' }
    expect(formatTemplate(tpl, data2 as any)).toBe('0')
  })

  it('supports array indexing', () => {
    const tpl1 = 'Item: {a.items[1]}'
    const tpl2 = 'Item: {a.items[4]}'
    const data = { a: { items: ['zero', 'one', 'two'] } }
    expect(formatTemplate(tpl1, data)).toBe('Item: one')
    expect(formatTemplate(tpl2, data)).toBe('Item: undefined')
  })

  it('supports nested array indexing', () => {
    const tpl1 = 'Item: {a.items[0][1]}'
    const tpl2 = 'Item: {a.items[0][4]}'
    const data = { a: { items: [['zero', 'one', 'two']] } }
    expect(formatTemplate(tpl1, data)).toBe('Item: one')
    expect(formatTemplate(tpl2, data)).toBe('Item: undefined')
  })

  it('supports Map via dot-notation', () => {
    const m = new Map<string, string>()
    m.set('k', 'v')
    const tpl = 'Map: {m.k}'
    const result = formatTemplate(tpl, { m })
    expect(result).toBe('Map: v')
  })

  it('invokes specific hooks with options', () => {
    const tpl = 'Color: {color:hex}'
    const data = { color: 'blue' }
    const hooks: TemplateHooks<{ color: string }> = {
      color: (_k, v, opts) => (opts === 'hex' ? '#0000FF' : v),
    }
    expect(formatTemplate(tpl, data, {}, hooks)).toBe('Color: #0000FF')
  })

  it('invokes catch-all "*" hook when no specific matches', () => {
    const tpl = '{foo} and {bar}'
    const data = { tee: 'F', ree: 'B' }
    const hooks: TemplateHooks<{ foo: string; bar: string }> = {
      '*': (k, v) => `${k.toUpperCase()}=${v}`,
    }
    expect(formatTemplate(tpl, data, {}, hooks)).toBe(
      'FOO=undefined and BAR=undefined'
    )
  })

  it('honors hook return values over plain values', () => {
    const tpl = 'Hello, {name}'
    const data = { name: 'Alice' }
    const hooks: TemplateHooks<{ name: string }> = {
      name: (_k, _v) => 'Bob',
    }
    expect(formatTemplate(tpl, data, {}, hooks)).toBe('Hello, Bob')
  })

  it('honors global hook values over value', () => {
    const tpl = 'Hello, {name}'
    const data = { name: 'Alice' }
    const hooks: TemplateHooks<{ name: string }> = {
      '*': (_k, _v) => 'Ted',
    }
    expect(formatTemplate(tpl, data, {}, hooks)).toBe('Hello, Ted')
  })

  it('ignore key hook returns undefined', () => {
    const tpl = 'Hello, {name}'
    const data = { name: 'Alice' }
    const hooks: TemplateHooks<{ name: string }> = {
      '*': (_k, _v) => 'Ted',
      name: (_k, _v) => undefined,
    }
    expect(formatTemplate(tpl, data, {}, hooks)).toBe('Hello, Ted')
  })

  it('ignore global hook returns undefined', () => {
    const tpl = 'Hello, {name}'
    const data = { name: 'Alice' }
    const hooks: TemplateHooks<{ name: string }> = {
      '*': (_k, _v) => undefined,
      test: (_k, _v) => 'abc',
    }
    expect(formatTemplate(tpl, data, {}, hooks)).toBe('Hello, Alice')
  })

  it('ignore key hook returns undefined', () => {
    const tpl = 'Hello, {name ?? "abc"}'
    const data = { name: undefined }
    const hooks: TemplateHooks<{ name: string }> = {
      '*': (_k, _v) => undefined,
      name: (_k, _v) => undefined,
    }
    expect(formatTemplate(tpl, data, {}, hooks)).toBe('Hello, abc')
  })

  it('ignore key hook returns empty', () => {
    const tpl = 'Hello, {name || "abc"}'
    const data = { name: '' }
    const hooks: TemplateHooks<{ name: string }> = {
      '*': (_k, _v) => undefined,
      name: (_k, _v) => undefined,
    }
    expect(formatTemplate(tpl, data, {}, hooks)).toBe('Hello, abc')
  })

  it('honor key hook over catch-all', () => {
    const tpl = 'Hello, {name ?? "abc"}'
    const data = { name: undefined }
    const hooks: TemplateHooks<{ name: string }> = {
      '*': (_k, _v) => '123',
      name: (_k, _v) => 456,
    }
    expect(formatTemplate(tpl, data, {}, hooks)).toBe('Hello, 456')
  })

  it('fallback for set null  ', () => {
    const tpl = 'Hello, {name ?? "abc"}'
    const data = { name: null }
    const hooks: TemplateHooks<{ name: string }> = {}
    expect(formatTemplate(tpl, data, {}, hooks)).toBe('Hello, abc')
  })

  it('passes through placeholder if hook returns undefined', () => {
    const tpl = '{missing}'
    const hooks = {
      '*': () => undefined,
    }
    expect(formatTemplate(tpl, {}, {}, hooks)).toBe('{missing}')
  })

  it('supports quoted literal placeholders', () => {
    const tpl = '{ "hello" } and {\'foo.bar\'}'
    // Even if data contains matching keys, quoted literals bypass lookup
    const data = { hello: 'X', 'foo.bar': 'Y' }
    expect(formatTemplate(tpl, data)).toBe('hello and foo.bar')
  })

  it('supports quoted literals with ?? operator', () => {
    // quoted literal as primary key should bypass lookup and ignore fallback
    const tpl1 = '{ "lit" ?? missing }'
    const data1 = { missing: 'foo' }
    expect(formatTemplate(tpl1, data1)).toBe('lit')

    // quoted literal as fallback should be used when primary is missing
    const tpl2 = '{ missing ?? "fb" }'
    expect(formatTemplate(tpl2, {})).toBe('fb')
  })
})
