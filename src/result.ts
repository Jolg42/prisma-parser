export interface Result<T, Err extends Error> {
  isOk(): boolean
  isError(): boolean

  map<U>(mapper: (value: T) => U): Result<U, Err>
  flatMap<U>(mapper: (value: T) => Result<U, Err>): Result<U, Err>
  orElse(mapper: (error: Err) => Result<T, Err>): Result<T, Err>

  unwrap(): T
}

class ResultOk<T, Err extends Error> implements Result<T, Err> {
  private value: T
  constructor(value: T) {
    this.value = value
  }

  isOk(): boolean {
    return true
  }
  isError(): boolean {
    return false
  }
  map<U>(mapper: (value: T) => U): Result<U, Err> {
    return new ResultOk(mapper(this.value))
  }
  flatMap<U>(mapper: (value: T) => Result<U, Err>): Result<U, Err> {
    return mapper(this.value)
  }

  orElse(): Result<T, Err> {
    return ok(this.value)
  }

  unwrap(): T {
    return this.value
  }
}

class ResultErr<T, Err extends Error> implements Result<T, Err> {
  private error: Err
  constructor(error: Err) {
    this.error = error
  }

  isOk(): boolean {
    return false
  }

  isError(): boolean {
    return true
  }

  map<U>(): Result<U, Err> {
    return new ResultErr(this.error)
  }

  flatMap<U>(): Result<U, Err> {
    return new ResultErr(this.error)
  }

  orElse(mapper: (error: Err) => Result<T, Err>): Result<T, Err> {
    return mapper(this.error)
  }

  unwrap(): T {
    throw this.error
  }
}

export function ok<T, Err extends Error>(value: T): Result<T, Err> {
  return new ResultOk(value)
}

export function err<T, Err extends Error>(error: Err): Result<T, Err> {
  return new ResultErr(error)
}
