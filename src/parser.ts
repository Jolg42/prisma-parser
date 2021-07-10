import { Result, ok, err } from './result'
import { Token, TokenList, TokenType } from './tokenizer'
import { DocumentNode, TypeModifier, Position, ConfigType, FunctionCallNode, ExpressionNode } from './ast'
import { PrismaParsingError } from './prisma-parsing-error'

type ParsingResult<T> = Result<T, PrismaParsingError>
type RuleFunction<ReturnType> = (state: ParserState) => ParsingResult<ReturnType>

type TupleToUnion<TupleType extends unknown[]> = TupleType[number]

export function parse(source: string): DocumentNode {
  return document(new ParserState(source)).unwrap()
}

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

const document = mapRuleResult(
  () => takeUntil(definition, 'eof'),
  ([definitions, eof]): DocumentNode => ({
    kind: 'Document' as const,
    definitions,
    location: {
      start: definitions[0]?.location.start ?? 0,
      end: eof.end,
    },
  }),
)

const definition = defineRule(() => choice('Expected config or model definition', modelDefinition, configDefinition))

const modelDefinition = mapRuleResult(
  () =>
    sequence(
      keyword('model'),
      changeErrorMessage(identifier, 'Expected model name'),
      token('{'),
      takeUntil(fieldDefinition, '}'),
    ),
  ([modelKeyword, name, , [fields, closeBrace]]) => ({
    kind: 'ModelDefinition' as const,
    name,
    fields,
    location: {
      start: modelKeyword.start,
      end: closeBrace.end,
    },
  }),
)

const fieldDefinition = mapRuleResult(
  () => sequence(changeErrorMessage(identifier, 'Expected field name'), type, zeroOrMore(attribute)),
  ([name, type, attributes]) => {
    const end = attributes.length > 0 ? attributes[attributes.length - 1].location.end : type.location.end
    return {
      kind: 'FieldDefinition' as const,
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

const type = mapRuleResult(
  () => sequence(changeErrorMessage(identifier, 'Expected field type'), typeModifier),
  ([name, [modifier, modifierToken]]) => {
    return {
      kind: 'Type' as const,
      name,
      modifier,
      location: {
        start: name.location.start,
        end: modifierToken ? modifierToken.end : name.location.end,
      },
    }
  },
)

const typeModifier = mapRuleResult(
  () => optional(choice('Expected type modifier', token('?'), token('[]'))),
  (token): [TypeModifier, Token | null] => {
    if (!token) {
      return ['none', null]
    }
    if (token.token === '?') {
      return ['optional', token]
    }
    return ['array', token]
  },
)

const attribute = mapRuleResult(
  () => sequence(token('attribute'), optional(argumentsList)),
  ([token, argumentsList]) => {
    const [args, endToken] = argumentsList ?? [[], token]
    return {
      kind: 'Attribute' as const,
      name: token.token,
      arguments: args,
      location: {
        start: token.start,
        end: endToken.end,
      },
    }
  },
)

const configDefinition = mapRuleResult(
  () => sequence(configType, identifier, token('{'), takeUntil(configOption, '}')),
  ([configTypeToken, name, , [options, closingBrace]]) => ({
    kind: 'ConfigDefinition' as const,
    type: configTypeToken.token as ConfigType,
    name,
    options,
    location: {
      start: configTypeToken.start,
      end: closingBrace.end,
    },
  }),
)

const configType = defineRule(() =>
  choice('Expected generator or datasource keyword', keyword('datasource'), keyword('generator')),
)

const configOption = mapRuleResult(
  () => sequence(identifier, token('='), expression),
  ([key, , value]) => ({
    kind: 'ConfigOption' as const,
    key,
    value,
    location: {
      start: key.location.start,
      end: value.location.end,
    },
  }),
)

const expression = defineRule(() => choice('Expected expression', functionCall, stringLiteral, booleanLiteral))

const stringLiteral = mapRuleResult(
  () => token('string'),
  (token) => {
    const value = token.token.replace(/^"/, '').replace(/"$/, '').replace(/\\"/g, '"')
    return {
      kind: 'StringLiteral' as const,
      value,
      location: {
        start: token.start,
        end: token.end,
      },
    }
  },
)

const booleanLiteral = mapRuleResult(
  () => choice('Expected boolean value', keyword('true'), keyword('false')),
  (keywordToken) => ({
    kind: 'BooleanLiteral' as const,
    value: keywordToken.token === 'true' ? true : false,

    location: {
      start: keywordToken.start,
      end: keywordToken.end,
    },
  }),
)

const functionCall: RuleFunction<Required<FunctionCallNode>> = mapRuleResult(
  () => sequence(identifier, argumentsList),
  ([name, [args, closeBrace]]) => ({
    kind: 'FunctionCall' as const,
    name,
    arguments: args,
    location: {
      start: name.location.start,
      end: closeBrace.end,
    },
  }),
)

const argumentsList: RuleFunction<[ExpressionNode[], Token]> = mapRuleResult(
  () => sequence(token('('), zeroOrMoreSeparated(expression, token(',')), token(')')),
  ([, args, closingBrace]) => [args, closingBrace],
)

const identifier = mapRuleResult(
  () => token('identifier'),
  (token) => ({
    kind: 'Identifier' as const,
    identifier: token.token,
    location: {
      start: token.start,
      end: token.end,
    },
  }),
)

function sequence<Elements extends unknown[]>(
  ...ruleFunctions: { [K in keyof Elements]: RuleFunction<Elements[K]> }
): RuleFunction<Elements> {
  return defineRule(() => (state) => {
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
  return defineRule(() => (state) => {
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

function optional<ReturnType>(rule: RuleFunction<ReturnType>): RuleFunction<ReturnType | null> {
  return defineRule(() => (state) => {
    return rule(state).orElse(() => ok(null))
  })
}

function takeUntil<ReturnType>(
  elementRule: RuleFunction<ReturnType>,
  tokenType: TokenType,
): RuleFunction<[ReturnType[], Token]> {
  return defineRule(() => (state) => {
    let result: ParsingResult<ReturnType[]> = ok([])
    while (state.peek().type !== tokenType && !result.isError()) {
      result = result.flatMap((elements) => {
        return elementRule(state).map((newElement) => [...elements, newElement])
      })
    }
    return result.map((values) => [values, state.advance()])
  })
}

function zeroOrMore<ReturnType>(elementRule: RuleFunction<ReturnType>): RuleFunction<ReturnType[]> {
  return defineRule(() => (state) => {
    const result: ReturnType[] = []
    let ruleResult = elementRule(state)
    while (ruleResult.isOk()) {
      result.push(ruleResult.unwrap())
      ruleResult = elementRule(state)
    }
    return ok(result)
  })
}

function zeroOrMoreSeparated<ReturnType>(
  elementRule: RuleFunction<ReturnType>,
  separatorRule: RuleFunction<unknown>,
): RuleFunction<ReturnType[]> {
  return defineRule(() => (state) => {
    const result: ReturnType[] = []
    let ruleResult = elementRule(state)
    while (ruleResult.isOk()) {
      result.push(ruleResult.unwrap())
      ruleResult = separatorRule(state).flatMap(() => elementRule(state))
    }
    return ok(result)
  })
}

const keyword = (keywordName: string): RuleFunction<Token> => {
  return defineRule(() => (state) => {
    return identiferToken(state)
      .orElse<Token>((error) => state.error(`Expected keyword ${keywordName}`, error.position))
      .flatMap((token) => {
        if (token.token !== keywordName) {
          return state.error(`Expected keyword ${keywordName}`, token.start)
        }
        return ok(token)
      })
  })
}

const identiferToken = token('identifier')

function token(tokenType: TokenType): RuleFunction<Token> {
  return defineRule(() => (state) => {
    const token = state.advance()
    if (token.type === tokenType) {
      return ok(token)
    }
    return state.error(`Expected ${tokenType}`, token.start)
  })
}

function mapRuleResult<T, U>(ruleFactory: () => RuleFunction<T>, mapper: (result: T) => U): RuleFunction<U> {
  return defineRule(() => {
    const ruleFn = ruleFactory()
    return (state) => ruleFn(state).map(mapper)
  })
}

function changeErrorMessage<T>(ruleFn: RuleFunction<T>, message: string): RuleFunction<T> {
  return (state) => {
    return ruleFn(state).orElse((error) => state.error(message, error.position))
  }
}

function defineRule<ReturnType>(ruleFactory: () => RuleFunction<ReturnType>): RuleFunction<ReturnType> {
  let ruleFn: RuleFunction<ReturnType> | null = null
  return (state) => {
    if (!ruleFn) {
      ruleFn = ruleFactory()
    }
    const position = state.getPointer()
    const result = ruleFn(state)
    if (result.isError()) {
      state.restorePointer(position)
    }
    return result
  }
}
