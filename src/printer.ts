import {
  DocumentNode,
  FieldDefinitionNode,
  Node,
  TypeNode,
  AttributeNode,
  DefinitionNode,
  ModelDefinitionNode,
  ConfigDefinitionNode,
  ConfigOptionNode,
  ValueNode,
  BooleanLiteralNode,
  StringLiteralNode,
} from './ast'
import { assertNever } from './util'

const TAB_SIZE = 2

type PrintFunction<NodeType extends Node> = (node: NodeType, printerState: PrinterState) => void

function padBy(paddingSize: number, str: string): string {
  return str.padStart(str.length + paddingSize)
}

class PrinterState {
  private indentationLevel = 0
  private lines: string[] = []
  private currentLine = ''

  indent(): this {
    this.indentationLevel++
    return this
  }

  unindent(): this {
    if (this.indentationLevel === 0) {
      throw new Error('Can not unindent beyond 0')
    }
    this.indentationLevel--
    return this
  }

  write(string: string): this {
    this.currentLine += string
    return this
  }

  writeAligned(string: string, offsetFromStartOfTheLine: number): this {
    const paddingSize = Math.max(offsetFromStartOfTheLine - this.currentLine.length, 0)
    this.write(padBy(paddingSize, string))
    return this
  }

  newLine(): this {
    this.lines.push(padBy(this.indentationLevel * TAB_SIZE, this.currentLine))
    this.currentLine = ''
    return this
  }

  writeNewlineSeparated<NodeType extends Node>(nodes: NodeType[], printNode: PrintFunction<NodeType>): this {
    if (nodes.length === 0) {
      return this
    }
    printNode(nodes[0], this)
    for (let i = 1; i < nodes.length; i++) {
      this.newLine()
      printNode(nodes[i], this)
    }
    return this
  }

  getText(): string {
    if (this.currentLine) {
      this.newLine()
    }
    return this.lines.join('\n')
  }
}

export function print(document: DocumentNode): string {
  const printerState = new PrinterState()
  printDocument(document, printerState)
  return printerState.getText()
}

function printDocument(document: DocumentNode, printerState: PrinterState): void {
  printerState.writeNewlineSeparated(document.definitions, printDefinition)
  printerState.newLine()
}

function printDefinition(definition: DefinitionNode, printerState: PrinterState): void {
  switch (definition.kind) {
    case 'ModelDefinition':
      printModelDefinition(definition, printerState)
      break
    case 'ConfigDefinition':
      printConfigDefinition(definition, printerState)
      break
    default:
      assertNever(definition, 'Unexpected definition type')
  }
}

function printModelDefinition(definition: ModelDefinitionNode, printerState: PrinterState): void {
  const typeOffset = getTypeAlignmentOffset(definition.fields)
  printerState
    .write('model ')
    .write(definition.name.identifier)
    .write(' {')
    .newLine()
    .indent()
    .writeNewlineSeparated(definition.fields, (field) => {
      printField(field, typeOffset, printerState)
    })
    .newLine()
    .unindent()
    .write('}')
    .newLine()
}

function getTypeAlignmentOffset(fields: FieldDefinitionNode[]): number {
  const longestFieldName = Math.max(...fields.map((field) => field.name.identifier.length))
  return longestFieldName + 2 // minimum ident is 2 spaces from field name
}

function printField(field: FieldDefinitionNode, typeOffset: number, printerState: PrinterState): void {
  printerState.write(field.name.identifier).write('  ')
  printType(field.type, typeOffset, printerState)

  for (const attribute of field.attributes) {
    printerState.write(' ')
    printAttribute(attribute, printerState)
  }
}

function printType(type: TypeNode, typeOffset: number, printerState: PrinterState): void {
  printerState.writeAligned(type.name.identifier, typeOffset)
  if (type.modifier === 'array') {
    printerState.write('[]')
  } else if (type.modifier === 'optional') {
    printerState.write('?')
  }
}

function printAttribute(attribute: AttributeNode, printerState: PrinterState): void {
  printerState.write(attribute.name)
}

function printConfigDefinition(definition: ConfigDefinitionNode, printerState: PrinterState): void {
  printerState
    .write(definition.type)
    .write(' ')
    .write(definition.name.identifier)
    .write(' {')
    .newLine()
    .indent()
    .writeNewlineSeparated(definition.options, printConfigOption)
    .newLine()
    .unindent()
    .write('}')
    .newLine()
}

function printConfigOption(option: ConfigOptionNode, printerState: PrinterState): void {
  printerState.write(option.key.identifier).write(' = ')
  printValue(option.value, printerState)
}

function printValue(value: ValueNode, printerState: PrinterState): void {
  switch (value.kind) {
    case 'BooleanLiteral':
      printBooleanLiteral(value, printerState)
      break
    case 'StringLiteral':
      printStringLiteral(value, printerState)
      break
    default:
      assertNever(value, 'Unexpected value kind')
  }
}

function printBooleanLiteral(literal: BooleanLiteralNode, printerState: PrinterState): void {
  printerState.write(String(literal.value))
}

function printStringLiteral(literal: StringLiteralNode, printerState: PrinterState): void {
  printerState.write('"').write(literal.value.replace(/"/g, '\\"')).write('"')
}
