import { TokenList } from '../src/tokenizer'

describe('tokenization', () => {
  test('recognizes simple identifier', () => {
    const tokens = new TokenList('foo')
    expect(tokens.advance()).toEqual({ type: 'identifier', token: 'foo', start: 0, end: 3 })
  })

  test('recognizes attributes', () => {
    const tokens = new TokenList('@foo')
    expect(tokens.advance()).toEqual({ type: 'attribute', token: '@foo', start: 0, end: 4 })
  })

  test('recognizes opening curly brace', () => {
    const tokens = new TokenList('{')
    expect(tokens.advance()).toEqual({ type: '{', token: '{', start: 0, end: 1 })
  })

  test('recognizes closing curly brace', () => {
    const tokens = new TokenList('}')
    expect(tokens.advance()).toEqual({ type: '}', token: '}', start: 0, end: 1 })
  })

  test('recognizes square braces', () => {
    const tokens = new TokenList('[]')
    expect(tokens.advance()).toEqual({ type: '[]', token: '[]', start: 0, end: 2 })
  })

  test('recognizes question mark', () => {
    const tokens = new TokenList('[]')
    expect(tokens.advance()).toEqual({ type: '[]', token: '[]', start: 0, end: 2 })
  })

  test('ignores spaces', () => {
    const tokens = new TokenList('    foo  ')
    expect(tokens.advance()).toEqual({ type: 'identifier', token: 'foo', start: 4, end: 7 })
  })

  test('ignores newlines', () => {
    const tokens = new TokenList('\n\nfoo')
    expect(tokens.advance()).toEqual({ type: 'identifier', token: 'foo', start: 2, end: 5 })
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
    expect(tokens.advance()).toEqual({ type: 'eof', token: '', start: 3, end: 3 })
  })

  test('throws error on unexpected token', () => {
    const tokens = new TokenList('ß')

    expect(() => tokens.advance()).toThrow('Unexpected token at 0')
  })
})

describe('position manipulation methods', () => {
  test('.advance advances the position', () => {
    const tokens = new TokenList('foo')
    tokens.advance()
    expect(tokens.getPosition()).toBe(1)
  })

  test('.peek returns current token', () => {
    const tokens = new TokenList('foo')
    expect(tokens.peek()).toEqual({ type: 'identifier', token: 'foo', start: 0, end: 3 })
  })

  test('.peek does not advance current position', () => {
    const tokens = new TokenList('foo')
    tokens.peek()
    expect(tokens.getPosition()).toBe(0)
  })

  test('.restorePosition allows to go back to previous token', () => {
    const tokens = new TokenList('foo')
    tokens.advance()
    tokens.restorePosition(0)
    expect(tokens.advance()).toEqual({ type: 'identifier', token: 'foo', start: 0, end: 3 })
  })

  test('.restorePosition throws if trying to go beyond currently computed tokens', () => {
    const tokens = new TokenList('foo')
    expect(() => tokens.restorePosition(9000)).toThrow('Attempt to set position to a not yet computed toke')
  })
})
