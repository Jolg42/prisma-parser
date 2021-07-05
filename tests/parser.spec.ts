import { parse } from '../src/parser'

test('parses empty model definition', () => {
  const doc = parse(`model Foo {}`)

  expect(doc).toMatchSnapshot()
})

test('parses multiple model definitions', () => {
  const doc = parse(`
model Foo {}
model Bar {}
`)

  expect(doc).toMatchSnapshot()
})

test('parses simple field', () => {
  const doc = parse(`
  model Foo {
      id Int
  }`)

  expect(doc).toMatchSnapshot()
})

test('parses array field', () => {
  const doc = parse(`
  model Foo {
      id Int[]
  }`)

  expect(doc).toMatchSnapshot()
})

test('parses optional field', () => {
  const doc = parse(`
  model Foo {
      id Int?
  }`)

  expect(doc).toMatchSnapshot()
})

test('parses attribute', () => {
  const doc = parse(`
  model Foo {
      id Int @id
  }`)

  expect(doc).toMatchSnapshot()
})

test('parses multiple attributes', () => {
  const doc = parse(`
  model Foo {
      id Int @id @more @attributes
  }`)

  expect(doc).toMatchSnapshot()
})

test('parses multiple fields', () => {
  const doc = parse(`
  model User {
      id Int @id
      posts Post[]
      name String
      occupation String?
  }`)

  expect(doc).toMatchSnapshot()
})

test('allows to use "model" as a field name', () => {
  const doc = parse(`
    model Car {
        model String
    }
    `)
  expect(doc).toMatchSnapshot()
})

describe('errors', () => {
  test('throws error on incomplete document', () => {
    expect(() =>
      parse(`
      model Foo {
        `),
    ).toThrow('Expected } or field definition')
  })

  test('throws error on incomplete field definition', () => {
    expect(() =>
      parse(`
      model Foo {
          name
      }
        `),
    ).toThrow('Expected field type')
  })

  test('throws error on unexpected token', () => {
    expect(() =>
      parse(`
      model Foo [
          name Int
      ]
        `),
    ).toThrow('Unexpected token')
  })

  test('throws error on missing {', () => {
    expect(() =>
      parse(`
      model Foo @attr {
        name Int
      }
        `),
    ).toThrow('Expected {')
  })

  test('throws error on missing model name', () => {
    expect(() =>
      parse(`
      model {
        name Int
      }
        `),
    ).toThrow('Expected model name')
  })
})
