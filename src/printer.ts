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
  ExpressionNode,
  BooleanLiteralNode,
  StringLiteralNode,
  FunctionCallNode,
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

  writeSeparated<NodeType extends Node>(
    nodes: NodeType[],
    separator: string,
    printNode: PrintFunction<NodeType>,
  ): this {
    if (nodes.length === 0) {
      return this
    }
    printNode(nodes[0], this)
    for (let i = 1; i < nodes.length; i++) {
      if (separator === '\n') {
        this.newLine()
      } else {
        this.write(separator)
      }
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
  printerState.writeSeparated(document.definitions, '\n', printDefinition)
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
    .writeSeparated(definition.fields, '\n', (field) => {
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
    .writeSeparated(definition.options, '\n', printConfigOption)
    .newLine()
    .unindent()
    .write('}')
    .newLine()
}

function printConfigOption(option: ConfigOptionNode, printerState: PrinterState): void {
  printerState.write(option.key.identifier).write(' = ')
  printExpression(option.value, printerState)
}

function printExpression(expression: ExpressionNode, printerState: PrinterState): void {
  switch (expression.kind) {
    case 'BooleanLiteral':
      printBooleanLiteral(expression, printerState)
      break
    case 'StringLiteral':
      printStringLiteral(expression, printerState)
      break
    case 'FunctionCall':
      printFunctionCall(expression, printerState)
      break
    default:
      assertNever(expression, 'Unexpected value kind')
  }
}

function printBooleanLiteral(literal: BooleanLiteralNode, printerState: PrinterState): void {
  printerState.write(String(literal.value))
}

function printStringLiteral(literal: StringLiteralNode, printerState: PrinterState): void {
  printerState.write('"').write(literal.value.replace(/"/g, '\\"')).write('"')
}

function printFunctionCall(call: FunctionCallNode, printerState: PrinterState): void {
  printerState.write(call.name.identifier).write('(').writeSeparated(call.arguments, ', ', printExpression).write(')')
}
