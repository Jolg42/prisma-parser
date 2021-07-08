import { Result, ok, err } from './result'
import { Token, TokenList, TokenType } from './tokenizer'
import { Node, DocumentNode, TypeModifier, Position } from './ast'
import { PrismaParsingError } from './prisma-parsing-error'

export function parse(source: string): DocumentNode {
  return document(new ParserState(source)).unwrap()
}

type ParsingResult<T> = Result<T, PrismaParsingError>
type RuleFunction<ReturnType> = (state: ParserState) => ParsingResult<ReturnType>

class ParserState {
  private tokenList: TokenList
  private source: string

  constructor(source: string) {
    this.source = source
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

  error<T>(message: string, position: Position): ParsingResult<T> {
    return err(new PrismaParsingError(message, this.source, position))
  }
}

const attribute = defineNode(token('attribute'), (token) => ({
  kind: 'Attribute',
  name: token.token,
  location: {
    start: token.start,
    end: token.end,
  },
}))

const identifier = defineNode(token('identifier'), (token) => ({
  kind: 'Identifier',
  identifier: token.token,
  location: {
    start: token.start,
    end: token.end,
  },
}))

const typeModifierToken = defineRule<Token | null>((state) => {
  return (optionalToken(state) as ParsingResult<Token | null>).orElse(() => arrayToken(state)).orElse(() => ok(null))
})

const type = defineNode(
  sequence(changeErrorMessage(identifier, 'Expected field type'), typeModifierToken),
  ([name, modifierToken]) => {
    let modifier: TypeModifier = 'none'
    let end = name.location.end
    if (modifierToken) {
      end = modifierToken.end
      modifier = modifierToken?.type === '[]' ? 'array' : 'optional'
    }

    return {
      kind: 'Type',
      name,
      modifier,
      location: {
        start: name.location.start,
        end,
      },
    }
  },
)

const fieldDefinition = defineNode(
  sequence(changeErrorMessage(identifier, 'Expected field name'), type, zeroOrMore(attribute)),
  ([name, type, attributes]) => {
    const end = attributes.length > 0 ? attributes[attributes.length - 1].location.end : type.location.end
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
  },
)

const modelDefinition = defineNode(
  sequence(
    keyword('model'),
    changeErrorMessage(identifier, 'Expected model name'),
    token('{'),
    takeUntil(fieldDefinition, '}'),
  ),
  ([modelKeyword, name, , [fields, closeBrace]]) => ({
    kind: 'ModelDefinition',
    name,
    fields,
    location: {
      start: modelKeyword.start,
      end: closeBrace.end,
    },
  }),
)

const document = defineNode(takeUntil(modelDefinition, 'eof'), ([definitions, eof]) => ({
  kind: 'Document',
  definitions,
  location: {
    start: definitions[0]?.location.start ?? 0,
    end: eof.end,
  },
}))

function sequence<Elements extends unknown[]>(
  ...ruleFunctions: { [K in keyof Elements]: RuleFunction<Elements[K]> }
): RuleFunction<Elements> {
  return defineRule((state) => {
    let result = ok([] as unknown[])
    for (const rule of ruleFunctions) {
      result = result.flatMap((elements) => {
        return rule(state).map((nextValue) => [...elements, nextValue])
      })
    }

    return result as ParsingResult<Elements>
  })
}

function takeUntil<ReturnType>(
  elementRule: RuleFunction<ReturnType>,
  tokenType: TokenType,
): RuleFunction<[ReturnType[], Token]> {
  return (state) => {
    let result: ParsingResult<ReturnType[]> = ok([])
    while (state.peek().type !== tokenType && !result.isError()) {
      result = result.flatMap((elements) => {
        return elementRule(state).map((newElement) => [...elements, newElement])
      })
    }
    return result.map((values) => [values, state.advance()])
  }
}

function zeroOrMore<ReturnType>(elementRule: RuleFunction<ReturnType>): RuleFunction<ReturnType[]> {
  return (state) => {
    const result: ReturnType[] = []
    let ruleResult = elementRule(state)
    while (ruleResult.isOk()) {
      result.push(ruleResult.unwrap())
      ruleResult = elementRule(state)
    }
    return ok(result)
  }
}

const identiferToken = token('identifier')
const arrayToken = token('[]')
const optionalToken = token('?')

function keyword(keywordName: string): RuleFunction<Token> {
  return defineRule((state) => {
    return identiferToken(state)
      .orElse((error) => state.error(`Expected keyword ${keywordName}`, error.position))
      .flatMap((token) => {
        if (token.token !== keywordName) {
          return state.error(`Expected keyword ${keywordName}`, token.start)
        }
        return ok(token)
      })
  })
}

function token(tokenType: TokenType): RuleFunction<Token> {
  return defineRule<Token>((state) => {
    const token = state.advance()
    if (token.type === tokenType) {
      return ok(token)
    }
    return state.error(`Expected ${tokenType}`, token.start)
  })
}

function defineNode<T, NodeType extends Node>(
  ruleFn: RuleFunction<T>,
  toNodeFn: (result: T) => NodeType,
): RuleFunction<NodeType> {
  return defineRule((state) => {
    return ruleFn(state).map(toNodeFn)
  })
}

function changeErrorMessage<T>(ruleFn: RuleFunction<T>, message: string): RuleFunction<T> {
  return (state) => {
    return ruleFn(state).orElse((error) => state.error(message, error.position))
  }
}

function defineRule<ReturnType>(ruleFn: RuleFunction<ReturnType>): RuleFunction<ReturnType> {
  return (tokenList) => {
    const position = tokenList.getPosition()
    const result = ruleFn(tokenList)
    if (result.isError()) {
      tokenList.restorePosition(position)
    }
    return result
  }
}
