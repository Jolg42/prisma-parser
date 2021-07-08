import { ok, err, Result } from '../src/result'

describe('ok', () => {
  test('.isOk() is true', () => {
    expect(ok(1).isOk()).toBe(true)
  })

  test('.isError() is false', () => {
    expect(ok(1).isError()).toBe(false)
  })

  test('.unwrap() returns wrapped value', () => {
    expect(ok(1).unwrap()).toBe(1)
  })

  test('.map() returns new result with mapped value', () => {
    expect(
      ok(1)
        .map((value) => value + 1)
        .unwrap(),
    ).toBe(2)
  })

  test('.flatMap() returns result of the mapper function', () => {
    expect(
      ok(1)
        .flatMap((value) => ok(value + 1))
        .unwrap(),
    ).toBe(2)
  })

  test('.flatMap() can change successful result into error', () => {
    expect(
      ok(1)
        .flatMap(() => err(new Error('failure')))
        .isError(),
    ).toBe(true)
  })

  test('.orElse() does not change the value inside', () => {
    expect(
      ok(1)
        .orElse(() => ok(2))
        .unwrap(),
    ).toBe(1)
  })
})

describe('err', () => {
  test('.isOk() is false', () => {
    expect(err(new Error('oops')).isOk()).toBe(false)
  })

  test('.isError() is true', () => {
    expect(err(new Error('oops')).isError()).toBe(true)
  })

  test('.unwrap() throws wrapped error', () => {
    const error = new Error('oops')
    expect(() => {
      err(error).unwrap()
    }).toThrow(error)
  })

  test('.map() does not change the result', () => {
    const error = new Error('oops')
    const result: Result<number, Error> = err(error)

    expect(() => result.map((value) => value + 1).unwrap()).toThrow(error)
  })

  test('.flatMap() does not change the result', () => {
    const error = new Error('oops')
    const result: Result<number, Error> = err(error)

    expect(() => result.flatMap((value) => ok(value + 1)).unwrap()).toThrow(error)
  })

  test('.orElse() can change result to the different error', () => {
    const error = new Error('oops')
    const otherError = new Error('other')
    const result = err(error)

    expect(() => result.orElse(() => err(otherError)).unwrap()).toThrow(otherError)
  })

  test('.orElse() can change result to a success', () => {
    const result: Result<number, Error> = err(new Error('oops'))
    expect(result.orElse(() => ok(1)).unwrap()).toBe(1)
  })
})
