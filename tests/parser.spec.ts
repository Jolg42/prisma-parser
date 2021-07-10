import { ConfigDefinitionNode, DefinitionNode, ModelDefinitionNode } from '../src/ast'
import { parse } from '../src/parser'
import { expectParsingError, loadPrismaFixture } from './util'

function expectModelDefinition(definition: DefinitionNode): asserts definition is ModelDefinitionNode {
  expect(definition.kind).toBe('ModelDefinition')
}

function expectConfigDefinition(definition: DefinitionNode): asserts definition is ConfigDefinitionNode {
  expect(definition.kind).toBe('ConfigDefinition')
}

test('parses empty model definition', () => {
  const doc = parse(`model Foo {}`)

  expect(doc.definitions).toMatchObject([
    {
      name: { identifier: 'Foo' },
      fields: [],
    },
  ])
})

test('parses multiple model definitions', () => {
  const doc = parse(`
model Foo {}
model Bar {}
`)

  expect(doc.definitions).toMatchObject([{ name: { identifier: 'Foo' } }, { name: { identifier: 'Bar' } }])
})

test('parses simple field', () => {
  const doc = parse(`
  model Foo {
      id Int
  }`)

  expectModelDefinition(doc.definitions[0])
  expect(doc.definitions[0].fields).toHaveLength(1)
  const field = doc.definitions[0].fields[0]
  expect(field).toMatchObject({
    name: {
      identifier: 'id',
    },
    type: {
      name: {
        identifier: 'Int',
      },
      modifier: 'none',
    },
    attributes: [],
  })
})

test('parses array field', () => {
  const doc = parse(`
  model Foo {
      id Int[]
  }`)

  expectModelDefinition(doc.definitions[0])
  expect(doc.definitions[0].fields[0].type.modifier).toBe('array')
})

test('parses optional field', () => {
  const doc = parse(`
  model Foo {
      id Int?
  }`)

  expectModelDefinition(doc.definitions[0])
  expect(doc.definitions[0].fields[0].type.modifier).toBe('optional')
})

test('parses attribute', () => {
  const doc = parse(`
  model Foo {
      id Int @id
  }`)

  expectModelDefinition(doc.definitions[0])
  expect(doc.definitions[0].fields[0].attributes).toMatchObject([{ kind: 'Attribute', name: '@id', arguments: [] }])
})

test('parses attribute with empty arguments list', () => {
  const doc = parse(`
  model Foo {
      id Int @id()
  }`)

  expectModelDefinition(doc.definitions[0])
  expect(doc.definitions[0].fields[0].attributes).toMatchObject([{ kind: 'Attribute', name: '@id', arguments: [] }])
})

test('parses attribute with one argument', () => {
  const doc = parse(`
  model Foo {
      id Int @id(true)
  }`)

  expectModelDefinition(doc.definitions[0])

  expect(doc.definitions[0].fields[0].attributes).toMatchObject([
    { kind: 'Attribute', name: '@id', arguments: [{ kind: 'BooleanLiteral', value: true }] },
  ])
})

test('parses attribute with several arguments', () => {
  const doc = parse(`
  model Foo {
      id Int @id(true, "foo", func())
  }`)

  expectModelDefinition(doc.definitions[0])

  expect(doc.definitions[0].fields[0].attributes).toMatchObject([
    {
      kind: 'Attribute',
      name: '@id',
      arguments: [
        { kind: 'BooleanLiteral', value: true },
        { kind: 'StringLiteral', value: 'foo' },
        { kind: 'FunctionCall', name: { identifier: 'func' }, arguments: [] },
      ],
    },
  ])
})

test('parses multiple attributes', () => {
  const doc = parse(`
  model Foo {
      id Int @id @more @attributes
  }`)

  expectModelDefinition(doc.definitions[0])
  expect(doc.definitions[0].fields[0].attributes).toMatchObject([
    { name: '@id' },
    { name: '@more' },
    { name: '@attributes' },
  ])
})

test('parses multiple fields', () => {
  const doc = parse(`
  model User {
      id Int @id
      posts Post[]
      name String
      occupation String?
  }`)

  expectModelDefinition(doc.definitions[0])
  expect(doc.definitions[0].fields).toMatchObject([
    { name: { identifier: 'id' } },
    { name: { identifier: 'posts' } },
    { name: { identifier: 'name' } },
    { name: { identifier: 'occupation' } },
  ])
})

test('allows to use "model" as a field name', () => {
  const doc = parse(`
    model Car {
        model String
    }
    `)
  expectModelDefinition(doc.definitions[0])
  expect(doc.definitions[0].fields[0].name.identifier).toBe('model')
})

test('parses empty datasource definition', () => {
  const doc = parse(`
  datasource db1 {
  }
  `)

  expect(doc.definitions).toMatchObject([
    {
      kind: 'ConfigDefinition',
      type: 'datasource',
      name: { identifier: 'db1' },
      options: [],
    },
  ])
})

test('parses empty generator definition', () => {
  const doc = parse(`
  generator client {
  }
  `)

  expect(doc.definitions).toMatchObject([
    {
      kind: 'ConfigDefinition',
      type: 'generator',
      name: { identifier: 'client' },
      options: [],
    },
  ])
})

test('parses config option with true value', () => {
  const doc = parse(`
  datasource db1 {
    option = true
  }
  `)

  expectConfigDefinition(doc.definitions[0])

  expect(doc.definitions[0].options).toMatchObject([
    {
      kind: 'ConfigOption',
      key: { identifier: 'option' },
      value: {
        kind: 'BooleanLiteral',
        value: true,
      },
    },
  ])
})

test('parses config option with false value', () => {
  const doc = parse(`
  datasource db1 {
    option = false
  }
  `)

  expectConfigDefinition(doc.definitions[0])

  expect(doc.definitions[0].options).toMatchObject([
    {
      kind: 'ConfigOption',
      key: { identifier: 'option' },
      value: {
        kind: 'BooleanLiteral',
        value: false,
      },
    },
  ])
})

test('parses config option with string value', () => {
  const doc = parse(`
  datasource db1 {
    option = "some value"
  }
  `)

  expectConfigDefinition(doc.definitions[0])

  expect(doc.definitions[0].options).toMatchObject([
    {
      kind: 'ConfigOption',
      key: { identifier: 'option' },
      value: {
        kind: 'StringLiteral',
        value: 'some value',
      },
    },
  ])
})

test('correctly unescapes the quotes in string literal', () => {
  const doc = parse(`
  generator client {
    option = "some \\"value\\""
  }
  `)

  expectConfigDefinition(doc.definitions[0])

  expect(doc.definitions[0].options).toMatchObject([
    {
      kind: 'ConfigOption',
      key: { identifier: 'option' },
      value: {
        kind: 'StringLiteral',
        value: 'some "value"',
      },
    },
  ])
})

test('parses function calls without arguments', () => {
  const doc = parse(`
  generator client {
    option = func()
  }
  `)

  expectConfigDefinition(doc.definitions[0])

  expect(doc.definitions[0].options).toMatchObject([
    {
      kind: 'ConfigOption',
      key: { identifier: 'option' },
      value: {
        kind: 'FunctionCall',
        name: { identifier: 'func' },
        arguments: [],
      },
    },
  ])
})

test('parses function calls with single argument', () => {
  const doc = parse(`
  generator client {
    option = func("foo")
  }
  `)

  expectConfigDefinition(doc.definitions[0])

  expect(doc.definitions[0].options).toMatchObject([
    {
      kind: 'ConfigOption',
      key: { identifier: 'option' },
      value: {
        kind: 'FunctionCall',
        name: { identifier: 'func' },
        arguments: [
          {
            kind: 'StringLiteral',
            value: 'foo',
          },
        ],
      },
    },
  ])
})

test('parses function calls with multiple arguments', () => {
  const doc = parse(`
  generator client {
    option = func("foo", true)
  }
  `)

  expectConfigDefinition(doc.definitions[0])

  expect(doc.definitions[0].options).toMatchObject([
    {
      kind: 'ConfigOption',
      key: { identifier: 'option' },
      value: {
        kind: 'FunctionCall',
        name: { identifier: 'func' },
        arguments: [
          {
            kind: 'StringLiteral',
            value: 'foo',
          },

          {
            kind: 'BooleanLiteral',
            value: true,
          },
        ],
      },
    },
  ])
})

test('parses nested function calls', () => {
  const doc = parse(`
  generator client {
    option = outer(inner(true))
  }
  `)

  expectConfigDefinition(doc.definitions[0])

  expect(doc.definitions[0].options).toMatchObject([
    {
      kind: 'ConfigOption',
      key: { identifier: 'option' },
      value: {
        kind: 'FunctionCall',
        name: { identifier: 'outer' },
        arguments: [
          {
            kind: 'FunctionCall',
            name: { identifier: 'inner' },
            arguments: [
              {
                kind: 'BooleanLiteral',
                value: true,
              },
            ],
          },
        ],
      },
    },
  ])
})

test('parses multiple options', () => {
  const doc = parse(`
  datasource db1 {
    option1 = true
    option2 = "value"
  }
  `)

  expectConfigDefinition(doc.definitions[0])

  expect(doc.definitions[0].options).toMatchObject([
    {
      kind: 'ConfigOption',
      key: { identifier: 'option1' },
      value: {
        kind: 'BooleanLiteral',
        value: true,
      },
    },

    {
      kind: 'ConfigOption',
      key: { identifier: 'option2' },
      value: {
        kind: 'StringLiteral',
        value: 'value',
      },
    },
  ])
})

test('parses prisma example schema', async () => {
  const schema = await loadPrismaFixture()
  expect(parse(schema)).toMatchSnapshot()
})

describe('errors', () => {
  test('throws error on incomplete document', () => {
    expectParsingError(() =>
      parse(`
      model Foo {
        `),
    )
  })

  test('throws error on incomplete config definition', () => {
    expectParsingError(() =>
      parse(`
      generator client {
        `),
    )
  })

  test('throws error on incomplete field definition', () => {
    expectParsingError(() =>
      parse(`
      model Foo {
          name
      }
        `),
    )
  })

  test('throws error on unexpected token', () => {
    expectParsingError(() =>
      parse(`
      model Foo [
          name Int
      ]
        `),
    )
  })

  test('throws error on missing {', () => {
    expectParsingError(() =>
      parse(`
      model Foo @attr {
        name Int
      }
        `),
    )
  })

  test('throws error on missing model name', () => {
    expectParsingError(() =>
      parse(`
      model {
        name Int
      }
        `),
    )
  })

  test('throws error on missing config value', () => {
    expectParsingError(() =>
      parse(`
      datasource db1 {
        option =
      }
        `),
    )
  })

  test('throws error on incomplete function call', () => {
    expectParsingError(() =>
      parse(`
      datasource db1 {
        option = func(
      }
        `),
    )
  })
})
