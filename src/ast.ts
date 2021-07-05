export type Node = DocumentNode | ModelDefinitionNode | FieldDefinitionNode | TypeNode | IdentifierNode | AttributeNode

export type Location = {
  start: number
  end: number
}

export type DocumentNode = {
  kind: 'Document'
  definitions: ModelDefinitionNode[]
  location: Location
}

export type ModelDefinitionNode = {
  kind: 'ModelDefinition'
  name: IdentifierNode
  fields: FieldDefinitionNode[]
  location: Location
}

export type FieldDefinitionNode = {
  kind: 'FieldDefinition'
  name: IdentifierNode
  type: TypeNode
  attributes: AttributeNode[]
  location: Location
}

export type TypeModifier = 'none' | 'array' | 'optional'

export type TypeNode = {
  kind: 'Type'
  name: IdentifierNode
  modifier: TypeModifier
  location: Location
}

export type IdentifierNode = {
  kind: 'Identifier'
  name: string
  location: Location
}

export type AttributeNode = {
  kind: 'Attribute'
  name: string
  location: Location
}
