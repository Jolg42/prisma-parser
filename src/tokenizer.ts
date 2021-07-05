export type TokenType = 'identifier' | 'attribute' | 'eof' | '{' | '}' | '[]' | '?'

export type Token = {
  type: TokenType
  token: string
  start: number
  end: number
}

type TokenizationRule = {
  type: TokenType
  pattern: RegExp
}

const tokenizationRules: TokenizationRule[] = [
  { type: 'identifier', pattern: /[a-zA-Z][a-zA-Z0-9]*/y },
  { type: 'attribute', pattern: /@[a-zA-Z][a-zA-Z0-9]*/y },
  { type: '{', pattern: /{/y },
  { type: '}', pattern: /}/y },
  { type: '?', pattern: /\?/y },
  { type: '[]', pattern: /\[]/y },
]

const SPACE_REGEX = /[\s\n\r]+/y

type LazyTokenizer = () => Token

function createLazyTokenizer(input: string): () => Token {
  let offset = 0

  const consumeSpace = () => {
    SPACE_REGEX.lastIndex = offset
    const spaceMatch = SPACE_REGEX.exec(input)
    if (spaceMatch) {
      offset += spaceMatch[0].length
    }
  }

  return (): Token => {
    consumeSpace()
    if (offset === input.length) {
      return {
        type: 'eof',
        token: '',
        start: offset,
        end: offset,
      }
    }
    for (const rule of tokenizationRules) {
      rule.pattern.lastIndex = offset
      const match = rule.pattern.exec(input)
      if (!match) {
        continue
      }
      const token = match[0]
      const start = offset
      const end = offset + token.length
      offset = end

      return {
        type: rule.type,
        token,
        start,
        end,
      }
    }

    // TODO: better error messages
    throw new Error(`Unexpected token at ${offset}`)
  }
}

export class TokenList {
  private currentPosition = 0
  private computedTokens: Token[] = []
  private computeNextToken: LazyTokenizer

  constructor(input: string) {
    this.computeNextToken = createLazyTokenizer(input)
  }

  getPosition(): number {
    return this.currentPosition
  }

  restorePosition(position: number): void {
    if (position >= this.computedTokens.length) {
      throw new Error('Attempt to set position to a not yet computed token')
    }

    this.currentPosition = position
  }

  advance(): Token {
    const token = this.peek()
    this.currentPosition++
    return token
  }

  peek(): Token {
    if (this.currentPosition === this.computedTokens.length) {
      this.computedTokens.push(this.computeNextToken())
    }
    return this.computedTokens[this.currentPosition]
  }
}
