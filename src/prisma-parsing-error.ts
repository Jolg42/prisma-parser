import { createCodeFrame } from 'simple-code-frame'
import { Position } from './ast'

export class PrismaParsingError extends SyntaxError {
  position: Position
  source: string

  constructor(message: string, source: string, position: Position) {
    super(message)
    this.name = 'PrismaParsingError'
    this.source = source
    this.position = position
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, PrismaParsingError)
    }
  }

  toString(): string {
    // our line and column numbers are line-based, simple-code-frame ones are 0-based
    const frame = createCodeFrame(this.source, this.position.line - 1, this.position.column - 1, { colors: false })
    return `${this.name}: ${this.message}\n\n${frame}`
  }
}
