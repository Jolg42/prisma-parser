import { Result, ok, err } from './result'
import { Token, TokenList, TokenType } from './tokenizer'
import { Node, DocumentNode, TypeModifier, Position, ConfigType } from './ast'
import { PrismaParsingError } from './prisma-parsing-error'

export function parse(source: string): DocumentNode {
  return document(new ParserState(source)).unwrap()
}

type ParsingResult<T> = Result<T, PrismaParsingError>
type RuleFunction<ReturnType> = (state: ParserState) => ParsingResult<ReturnType>

type TupleToUnion<TupleType extends unknown[]> = TupleType[number]

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

  getPointer(): number {
    return this.tokenList.getPointer()
  }

  restorePointer(position: number): void {
    return this.tokenList.restorePointer(position)
  }

  error<T>(message: string, position: Position): ParsingResult<T> {
    return err(new PrismaParsingError(message, this.source, position))
  }
}

const attribute = defineNodeRule(token('attribute'), (token) => ({
  kind: 'Attribute',
  name: token.token,
  location: {
    start: token.start,
    end: token.end,
  },
}))

const identifier = defineNodeRule(token('identifier'), (token) => ({
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

const type = defineNodeRule(
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

const fieldDefinition = defineNodeRule(
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

const modelDefinition = defineNodeRule(
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

const stringLiteral = defineNodeRule(token('string'), (token) => {
  const value = token.token.replace(/^"/, '').replace(/"$/, '').replace(/\\"/g, '"')
  return {
    kind: 'StringLiteral',
    value,
    location: {
      start: token.start,
      end: token.end,
    },
  }
})

const booleanLiteral = defineNodeRule(
  choice('Expected boolean value', keyword('true'), keyword('false')),
  (keywordToken) => ({
    kind: 'BooleanLiteral',
    value: keywordToken.token === 'true' ? true : false,

    location: {
      start: keywordToken.start,
      end: keywordToken.end,
    },
  }),
)

const value = choice('Expected value', stringLiteral, booleanLiteral)

const configOption = defineNodeRule(sequence(identifier, token('='), value), ([key, , value]) => ({
  kind: 'ConfigOption',
  key,
  value,
  location: {
    start: key.location.start,
    end: value.location.end,
  },
}))

const configType = choice('Expected generator or datasource keyword', keyword('datasource'), keyword('generator'))

const configDefinition = defineNodeRule(
  sequence(configType, identifier, token('{'), takeUntil(configOption, '}')),
  ([configTypeToken, name, , [options, closingBrace]]) => ({
    kind: 'ConfigDefinition',
    type: configTypeToken.token as ConfigType,
    name,
    options,
    location: {
      start: configTypeToken.start,
      end: closingBrace.end,
    },
  }),
)

const definition = choice('Expected config or model definition', modelDefinition, configDefinition)
const document = defineNodeRule(takeUntil(definition, 'eof'), ([definitions, eof]) => ({
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

function choice<Elements extends unknown[]>(
  defaultError: string,
  ...ruleFunctions: { [K in keyof Elements]: RuleFunction<Elements[K]> }
): RuleFunction<TupleToUnion<Elements>> {
  return defineRule((state) => {
    let result = state.error(defaultError, state.peek().start)
    for (const rule of ruleFunctions) {
      result = result.orElse((previousError) => {
        return rule(state).orElse((nextError) => {
          // report longest partial match as an error of choice operator
          // chances are, that if one alternative matched more tokens that rule was users intention and this error will
          // be more relevant
          const errorToReport = nextError.position.offset > previousError.position.offset ? nextError : previousError
          return err(errorToReport)
        })
      })
    }

    return result as ParsingResult<TupleToUnion<Elements>>
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

function defineNodeRule<T, NodeType extends Node>(
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
    const position = tokenList.getPointer()
    const result = ruleFn(tokenList)
    if (result.isError()) {
      tokenList.restorePointer(position)
    }
    return result
  }
}
