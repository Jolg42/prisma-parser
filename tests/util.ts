import fs from 'fs/promises'
import path from 'path'

export function expectParsingError(fn: () => void): void {
  expect.assertions(1)
  try {
    fn()
  } catch (error) {
    expect(error.toString()).toMatchSnapshot()
  }
}

export async function loadPrismaFixture(): Promise<string> {
  return fs.readFile(path.resolve(__dirname, 'fixtures', 'schema.prisma'), 'utf-8')
}
