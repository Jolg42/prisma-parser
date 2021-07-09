import { print, parse } from '../src'
import { loadPrismaFixture } from './util'

test('print(parse(doc)) does not change document if it is properly formatted', async () => {
  const schema = await loadPrismaFixture()
  expect(print(parse(schema))).toBe(schema)
})
