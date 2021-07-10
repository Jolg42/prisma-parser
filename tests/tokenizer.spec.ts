import { TokenList } from '../src/tokenizer'
import { expectParsingError } from './util'

const documentStart = { offset: 0, line: 1, column: 1 }

const firstLinePosition = (offset: number) => ({ offset, line: 1, column: offset + 1 })
describe('tokenization', () => {
  test('recognizes simple identifier', () => {
    const tokens = new TokenList('foo')
    expect(tokens.advance()).toEqual({
      type: 'identifier',
      token: 'foo',
      start: documentStart,
      end: firstLinePosition(3),
    })
  })

  test('recognizes attributes', () => {
    const tokens = new TokenList('@foo')
    expect(tokens.advance()).toEqual({
      type: 'attribute',
      token: '@foo',
      start: documentStart,
      end: firstLinePosition(4),
    })
  })

  test('recognizes strings', () => {
    const tokens = new TokenList('"some string"')
    expect(tokens.advance()).toEqual({
      type: 'string',
      token: '"some string"',
      start: documentStart,
      end: firstLinePosition(13),
    })
  })

  test('allows to escape quotes inside of a string', () => {
    const tokens = new TokenList('"some \\"string"')
    expect(tokens.advance()).toEqual({
      type: 'string',
      token: '"some \\"string"',
      start: documentStart,
      end: firstLinePosition(15),
    })
  })

  test('recognizes opening curly brace', () => {
    const tokens = new TokenList('{')
    expect(tokens.advance()).toEqual({
      type: '{',
      token: '{',
      start: documentStart,
      end: firstLinePosition(1),
    })
  })

  test('recognizes closing curly brace', () => {
    const tokens = new TokenList('}')
    expect(tokens.advance()).toEqual({
      type: '}',
      token: '}',
      start: documentStart,
      end: firstLinePosition(1),
    })
  })

  test('recognizes square braces', () => {
    const tokens = new TokenList('[]')
    expect(tokens.advance()).toEqual({ type: '[]', token: '[]', start: documentStart, end: firstLinePosition(2) })
  })

  test('recognizes question mark', () => {
    const tokens = new TokenList('?')
    expect(tokens.advance()).toEqual({ type: '?', token: '?', start: documentStart, end: firstLinePosition(1) })
  })

  test('recognizes equals sign', () => {
    const tokens = new TokenList('=')
    expect(tokens.advance()).toEqual({
      type: '=',
      token: '=',
      start: documentStart,
      end: firstLinePosition(1),
    })
  })

  test('ignores spaces', () => {
    const tokens = new TokenList('    foo  ')
    expect(tokens.advance()).toEqual({
      type: 'identifier',
      token: 'foo',
      start: firstLinePosition(4),
      end: firstLinePosition(7),
    })
  })

  test('ignores newlines', () => {
    const tokens = new TokenList('\n\nfoo')
    expect(tokens.advance()).toEqual({
      type: 'identifier',
      token: 'foo',
      start: { offset: 2, line: 3, column: 1 },
      end: { offset: 5, line: 3, column: 4 },
    })
  })

  test('consumes multiple tokens', () => {
    const tokens = new TokenList('foo { bar }')
    expect(tokens.advance().token).toBe('foo')
    expect(tokens.advance().token).toBe('{')
    expect(tokens.advance().token).toBe('bar')
    expect(tokens.advance().token).toBe('}')
  })

  test('returns EOF token when stream is finished', () => {
    const tokens = new TokenList('foo')
    tokens.advance()
    expect(tokens.advance()).toEqual({ type: 'eof', token: '', start: firstLinePosition(3), end: firstLinePosition(3) })
  })

  test('throws error on unexpected token', () => {
    const tokens = new TokenList('ß')

    expectParsingError(() => tokens.advance())
  })
})

describe('pointer manipulation methods', () => {
  test('.advance advances the pointer', () => {
    const tokens = new TokenList('foo')
    tokens.advance()
    expect(tokens.getPointer()).toBe(1)
  })

  test('.peek returns current token', () => {
    const tokens = new TokenList('foo')
    expect(tokens.peek()).toEqual({ type: 'identifier', token: 'foo', start: documentStart, end: firstLinePosition(3) })
  })

  test('.peek does not advance pointer', () => {
    const tokens = new TokenList('foo')
    tokens.peek()
    expect(tokens.getPointer()).toBe(0)
  })

  test('.restorePointer allows to go back to previous token', () => {
    const tokens = new TokenList('foo')
    tokens.advance()
    tokens.restorePointer(0)
    expect(tokens.advance()).toEqual({
      type: 'identifier',
      token: 'foo',
      start: documentStart,
      end: firstLinePosition(3),
    })
  })

  test('.restorePointer throws if trying to go beyond currently computed tokens', () => {
    const tokens = new TokenList('foo')
    expect(() => tokens.restorePointer(9000)).toThrow('Attempt to set pointer to a not yet computed toke')
  })
})
