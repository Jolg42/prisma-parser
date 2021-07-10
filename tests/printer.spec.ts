import { print } from '../src/printer'

test('prints empty document', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [],
    }),
  ).toMatchSnapshot()
})

test('prints empty model', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [
        {
          kind: 'ModelDefinition',
          name: { kind: 'Identifier', identifier: 'Model' },
          fields: [],
        },
      ],
    }),
  ).toMatchSnapshot()
})

test('prints field', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [
        {
          kind: 'ModelDefinition',
          name: { kind: 'Identifier', identifier: 'Model' },
          fields: [
            {
              kind: 'FieldDefinition',
              name: { kind: 'Identifier', identifier: 'field' },
              type: {
                kind: 'Type',
                name: { kind: 'Identifier', identifier: 'Int' },
                modifier: 'none',
              },
              attributes: [],
            },
          ],
        },
      ],
    }),
  ).toMatchSnapshot()
})

test('prints field with array type', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [
        {
          kind: 'ModelDefinition',
          name: { kind: 'Identifier', identifier: 'Model' },
          fields: [
            {
              kind: 'FieldDefinition',
              name: { kind: 'Identifier', identifier: 'array' },
              type: {
                kind: 'Type',
                name: { kind: 'Identifier', identifier: 'Int' },
                modifier: 'array',
              },
              attributes: [],
            },
          ],
        },
      ],
    }),
  ).toMatchSnapshot()
})

test('prints field with optional type', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [
        {
          kind: 'ModelDefinition',
          name: { kind: 'Identifier', identifier: 'Model' },
          fields: [
            {
              kind: 'FieldDefinition',
              name: { kind: 'Identifier', identifier: 'array' },
              type: {
                kind: 'Type',
                name: { kind: 'Identifier', identifier: 'Int' },
                modifier: 'optional',
              },
              attributes: [],
            },
          ],
        },
      ],
    }),
  ).toMatchSnapshot()
})

test('prints field attribute', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [
        {
          kind: 'ModelDefinition',
          name: { kind: 'Identifier', identifier: 'Model' },
          fields: [
            {
              kind: 'FieldDefinition',
              name: { kind: 'Identifier', identifier: 'id' },
              type: {
                kind: 'Type',
                name: { kind: 'Identifier', identifier: 'Int' },
                modifier: 'none',
              },
              attributes: [
                {
                  kind: 'Attribute',
                  name: '@id',
                },
              ],
            },
          ],
        },
      ],
    }),
  ).toMatchSnapshot()
})

test('prints multiple attributes', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [
        {
          kind: 'ModelDefinition',
          name: { kind: 'Identifier', identifier: 'Model' },
          fields: [
            {
              kind: 'FieldDefinition',
              name: { kind: 'Identifier', identifier: 'field' },
              type: {
                kind: 'Type',
                name: { kind: 'Identifier', identifier: 'Int' },
                modifier: 'none',
              },
              attributes: [
                {
                  kind: 'Attribute',
                  name: '@first',
                },

                {
                  kind: 'Attribute',
                  name: '@second',
                },
              ],
            },
          ],
        },
      ],
    }),
  ).toMatchSnapshot()
})

test('prints multiple fields while aligning the types', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [
        {
          kind: 'ModelDefinition',
          name: { kind: 'Identifier', identifier: 'Model' },
          fields: [
            {
              kind: 'FieldDefinition',
              name: { kind: 'Identifier', identifier: 'short' },
              type: {
                kind: 'Type',
                name: { kind: 'Identifier', identifier: 'Int' },
                modifier: 'none',
              },
              attributes: [],
            },

            {
              kind: 'FieldDefinition',
              name: { kind: 'Identifier', identifier: 'loooong' },
              type: {
                kind: 'Type',
                name: { kind: 'Identifier', identifier: 'String' },
                modifier: 'none',
              },
              attributes: [],
            },
          ],
        },
      ],
    }),
  ).toMatchSnapshot()
})

test('prints empty datasource definition', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [
        {
          kind: 'ConfigDefinition',
          type: 'datasource',
          name: { kind: 'Identifier', identifier: 'db1' },
          options: [],
        },
      ],
    }),
  ).toMatchSnapshot()
})

test('prints empty generator definition', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [
        {
          kind: 'ConfigDefinition',
          type: 'generator',
          name: { kind: 'Identifier', identifier: 'client' },
          options: [],
        },
      ],
    }),
  ).toMatchSnapshot()
})

test('prints boolean true option', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [
        {
          kind: 'ConfigDefinition',
          type: 'datasource',
          name: { kind: 'Identifier', identifier: 'db1' },
          options: [
            {
              kind: 'ConfigOption',
              key: { kind: 'Identifier', identifier: 'option' },
              value: {
                kind: 'BooleanLiteral',
                value: true,
              },
            },
          ],
        },
      ],
    }),
  ).toMatchSnapshot()
})

test('prints boolean false option', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [
        {
          kind: 'ConfigDefinition',
          type: 'datasource',
          name: { kind: 'Identifier', identifier: 'db1' },
          options: [
            {
              kind: 'ConfigOption',
              key: { kind: 'Identifier', identifier: 'option' },
              value: {
                kind: 'BooleanLiteral',
                value: false,
              },
            },
          ],
        },
      ],
    }),
  ).toMatchSnapshot()
})

test('prints string option', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [
        {
          kind: 'ConfigDefinition',
          type: 'generator',
          name: { kind: 'Identifier', identifier: 'client' },
          options: [
            {
              kind: 'ConfigOption',
              key: { kind: 'Identifier', identifier: 'option' },
              value: {
                kind: 'StringLiteral',
                value: 'option value',
              },
            },
          ],
        },
      ],
    }),
  ).toMatchSnapshot()
})

test('correctly escapes quotes in string values', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [
        {
          kind: 'ConfigDefinition',
          type: 'generator',
          name: { kind: 'Identifier', identifier: 'client' },
          options: [
            {
              kind: 'ConfigOption',
              key: { kind: 'Identifier', identifier: 'option' },
              value: {
                kind: 'StringLiteral',
                value: 'option "value"',
              },
            },
          ],
        },
      ],
    }),
  ).toMatchSnapshot()
})

test('prints multiple options', () => {
  expect(
    print({
      kind: 'Document',
      definitions: [
        {
          kind: 'ConfigDefinition',
          type: 'datasource',
          name: { kind: 'Identifier', identifier: 'db1' },
          options: [
            {
              kind: 'ConfigOption',
              key: { kind: 'Identifier', identifier: 'option1' },
              value: {
                kind: 'BooleanLiteral',
                value: false,
              },
            },

            {
              kind: 'ConfigOption',
              key: { kind: 'Identifier', identifier: 'option2' },
              value: {
                kind: 'StringLiteral',
                value: 'some option',
              },
            },
          ],
        },
      ],
    }),
  ).toMatchSnapshot()
})
