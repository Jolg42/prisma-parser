import { parse } from '../src/parser'
import { expectParsingError, loadPrismaFixture } from './util'

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

  expect(doc.definitions[0].fields[0].type.modifier).toBe('array')
})

test('parses optional field', () => {
  const doc = parse(`
  model Foo {
      id Int?
  }`)

  expect(doc.definitions[0].fields[0].type.modifier).toBe('optional')
})

test('parses attribute', () => {
  const doc = parse(`
  model Foo {
      id Int @id
  }`)

  expect(doc.definitions[0].fields[0].attributes).toHaveLength(1)
  const attribute = doc.definitions[0].fields[0].attributes[0]
  expect(attribute.name).toBe('@id')
})

test('parses multiple attributes', () => {
  const doc = parse(`
  model Foo {
      id Int @id @more @attributes
  }`)

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
  expect(doc.definitions[0].fields[0].name.identifier).toBe('model')
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
})
