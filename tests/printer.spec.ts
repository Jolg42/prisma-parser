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
