export type Node =
  | DocumentNode
  | DefinitionNode
  | FieldDefinitionNode
  | TypeNode
  | IdentifierNode
  | AttributeNode
  | ConfigOptionNode
  | ExpressionNode

export type Position = {
  line: number
  column: number
  offset: number
}

export type Location = {
  start: Position
  end: Position
}

export type DocumentNode = {
  kind: 'Document'
  definitions: DefinitionNode[]
  location?: Location
}

export type DefinitionNode = ModelDefinitionNode | ConfigDefinitionNode

export type ConfigDefinitionNode = {
  kind: 'ConfigDefinition'
  type: ConfigType
  name: IdentifierNode
  options: ConfigOptionNode[]
  location?: Location
}

export type ConfigType = 'datasource' | 'generator'

export type ConfigOptionNode = {
  kind: 'ConfigOption'
  key: IdentifierNode
  value: ExpressionNode
  location?: Location
}

export type ExpressionNode = StringLiteralNode | BooleanLiteralNode | FunctionCallNode

export type StringLiteralNode = {
  kind: 'StringLiteral'
  value: string
  location?: Location
}

export type BooleanLiteralNode = {
  kind: 'BooleanLiteral'
  value: boolean
  location?: Location
}

export type FunctionCallNode = {
  kind: 'FunctionCall'
  name: IdentifierNode
  arguments: ExpressionNode[]
  location?: Location
}

export type ModelDefinitionNode = {
  kind: 'ModelDefinition'
  name: IdentifierNode
  fields: FieldDefinitionNode[]
  location?: Location
}

export type FieldDefinitionNode = {
  kind: 'FieldDefinition'
  name: IdentifierNode
  type: TypeNode
  attributes: AttributeNode[]
  location?: Location
}

export type TypeModifier = 'none' | 'array' | 'optional'

export type TypeNode = {
  kind: 'Type'
  name: IdentifierNode
  modifier: TypeModifier
  location?: Location
}

export type IdentifierNode = {
  kind: 'Identifier'
  identifier: string
  location?: Location
}

export type AttributeNode = {
  kind: 'Attribute'
  name: string
  location?: Location
}
