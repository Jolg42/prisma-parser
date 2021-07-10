import { Position } from './ast'
import { PrismaParsingError } from './prisma-parsing-error'

export type TokenType = 'identifier' | 'attribute' | 'string' | 'eof' | '{' | '}' | '(' | ')' | ',' | '[]' | '?' | '='

export type Token = {
  type: TokenType
  token: string
  start: Position
  end: Position
}

type TokenizationRule = {
  type: TokenType
  pattern: RegExp
}

const tokenizationRules: TokenizationRule[] = [
  { type: 'identifier', pattern: /[a-zA-Z][a-zA-Z0-9]*/y },
  { type: 'attribute', pattern: /@[a-zA-Z][a-zA-Z0-9]*/y },
  // eslint is wrong: \" is not an escape sequence, it is supposed to match
  // \ and " characters and \ does not need escaping in this case
  // eslint-disable-next-line no-useless-escape
  { type: 'string', pattern: /"([^"]|\")*"/y },
  { type: '{', pattern: /{/y },
  { type: '}', pattern: /}/y },
  { type: '(', pattern: /\(/y },
  { type: ')', pattern: /\)/y },
  { type: ',', pattern: /,/y },
  { type: '?', pattern: /\?/y },
  { type: '=', pattern: /=/y },
  { type: '[]', pattern: /\[]/y },
]

const SPACE_REGEX = /[\s\n\r]+/y

type LazyTokenizer = () => Token

function createLazyTokenizer(input: string): () => Token {
  let position: Position = {
    offset: 0,
    line: 1,
    column: 1,
  }

  const advancePosition = (byOffset: number): Position => {
    const offset = position.offset + byOffset
    let column = position.column
    let line = position.line
    for (let i = position.offset; i < offset; i++) {
      if (input[i] === '\n') {
        line++
        column = 1
      } else {
        column++
      }
    }

    return {
      offset,
      line,
      column,
    }
  }

  const consumeSpace = () => {
    SPACE_REGEX.lastIndex = position.offset
    const spaceMatch = SPACE_REGEX.exec(input)
    if (spaceMatch) {
      position = advancePosition(spaceMatch[0].length)
    }
  }

  return (): Token => {
    consumeSpace()
    if (position.offset === input.length) {
      return {
        type: 'eof',
        token: '',
        start: position,
        end: position,
      }
    }
    for (const rule of tokenizationRules) {
      rule.pattern.lastIndex = position.offset
      const match = rule.pattern.exec(input)
      if (!match) {
        continue
      }
      const token = match[0]
      const start = position
      const end = advancePosition(token.length)
      position = end

      return {
        type: rule.type,
        token,
        start,
        end,
      }
    }

    throw new PrismaParsingError('Unexpected token', input, position)
  }
}

export class TokenList {
  private currentTokenPointer = 0
  private computedTokens: Token[] = []
  private computeNextToken: LazyTokenizer

  constructor(input: string) {
    this.computeNextToken = createLazyTokenizer(input)
  }

  getPointer(): number {
    return this.currentTokenPointer
  }

  restorePointer(pointer: number): void {
    if (pointer >= this.computedTokens.length) {
      throw new Error('Attempt to set pointer to a not yet computed token')
    }

    this.currentTokenPointer = pointer
  }

  advance(): Token {
    const token = this.peek()
    this.currentTokenPointer++
    return token
  }

  peek(): Token {
    if (this.currentTokenPointer === this.computedTokens.length) {
      this.computedTokens.push(this.computeNextToken())
    }
    return this.computedTokens[this.currentTokenPointer]
  }
}
