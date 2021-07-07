import { Token, TokenList, TokenType } from './tokenizer'
import {
  DocumentNode,
  ModelDefinitionNode,
  FieldDefinitionNode,
  IdentifierNode,
  TypeNode,
  AttributeNode,
  TypeModifier,
} from './ast'

export function parse(source: string): DocumentNode {
  return parseDocument(new ParserState(source))
}

type RuleFunction<ReturnType> = (state: ParserState) => ReturnType | null

class ParserState {
  private tokenList: TokenList

  constructor(source: string) {
    this.tokenList = new TokenList(source)
  }

  advance(): Token {
    return this.tokenList.advance()
  }

  peek(): Token {
    return this.tokenList.peek()
  }

  getPosition(): number {
    return this.tokenList.getPosition()
  }

  restorePosition(position: number): void {
    return this.tokenList.restorePosition(position)
  }

  error(message: string): SyntaxError {
    // TODO: better error message
    return new SyntaxError(message)
  }

  zeroOrMore<ReturnType>(elementRule: RuleFunction<ReturnType>): ReturnType[] {
    const result: ReturnType[] = []
    let element: ReturnType | null
    while ((element = elementRule(this))) {
      result.push(element)
    }
    return result
  }

  takeUntil<ReturnType>(
    elementRule: RuleFunction<ReturnType>,
    tokenType: TokenType,
    errorMessage: string,
  ): ReturnType[] {
    const result: ReturnType[] = []
    while (this.peek().type !== tokenType) {
      const element = elementRule(this)
      if (!element) {
        throw this.error(errorMessage)
      }
      result.push(element)
    }
    this.advance() // consume closing token
    return result
  }
}

const parseDocument = (state: ParserState): DocumentNode => {
  const definitions = state.takeUntil(parseModelDefinition, 'eof', 'Expected model definition')

  return {
    kind: 'Document',
    definitions,
    location: {
      start: definitions[0]?.location.start,
      end: definitions[definitions.length - 1]?.location.end,
    },
  }
}

const parseModelDefinition = defineRule<ModelDefinitionNode>((state) => {
  const modelKeyword = state.advance()
  if (modelKeyword.type !== 'identifier' || modelKeyword.token !== 'model') {
    return null
  }
  const name = parseIdentifer(state)
  if (!name) {
    throw state.error('Expected model name')
  }
  const openBrace = state.advance()
  if (openBrace.type !== '{') {
    throw state.error('Expected {')
  }

  const fields = state.zeroOrMore(parseFieldDefinition)
  const closeBrace = state.advance()
  if (closeBrace.type !== '}') {
    throw state.error('Expected } or field definition')
  }

  return {
    kind: 'ModelDefinition',
    name,
    fields,
    location: {
      start: modelKeyword.start,
      end: closeBrace.end,
    },
  }
})

const parseFieldDefinition = defineRule<FieldDefinitionNode>((state) => {
  const name = parseIdentifer(state)
  if (!name) {
    return null
  }
  const type = parseType(state)
  if (!type) {
    throw state.error('Expected field type')
  }
  let end = type.location.end
  const attributes = state.zeroOrMore(parseAttribute)
  if (attributes.length > 0) {
    end = attributes[attributes.length - 1].location.end
  }
  return {
    kind: 'FieldDefinition',
    name,
    type,
    attributes,
    location: {
      start: name.location.start,
      end,
    },
  }
})

const parseType = defineRule<TypeNode>((state) => {
  const name = parseIdentifer(state)
  if (!name) {
    return null
  }
  const start = name.location.start
  let end = name.location.end

  let modifier: TypeModifier = 'none'
  const possibleModifierToken = state.peek()
  if (possibleModifierToken.type === '[]' || possibleModifierToken.type === '?') {
    end = possibleModifierToken.end
    state.advance()
    modifier = possibleModifierToken.type === '[]' ? 'array' : 'optional'
  }
  return {
    kind: 'Type',
    name,
    modifier,
    location: { start, end },
  }
})

const parseAttribute = defineRule<AttributeNode>((state) => {
  const token = state.advance()
  if (token.type === 'attribute') {
    return {
      kind: 'Attribute',
      name: token.token,
      location: {
        start: token.start,
        end: token.end,
      },
    }
  }
  return null
})

const parseIdentifer = defineRule((state): IdentifierNode | null => {
  const token = state.advance()
  if (token.type === 'identifier') {
    return {
      kind: 'Identifier',
      name: token.token,
      location: {
        start: token.start,
        end: token.end,
      },
    }
  }
  return null
})

function defineRule<ReturnType>(ruleFn: RuleFunction<ReturnType>): RuleFunction<ReturnType> {
  return (tokenList) => {
    const position = tokenList.getPosition()
    const result = ruleFn(tokenList)
    if (!result) {
      tokenList.restorePosition(position)
    }
    return result
  }
}
