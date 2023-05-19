export const getLastElement = <T>(array: T[]): T | undefined => {
  return array.slice(-1)[0]
}

export const nonNullable = <T>(value: T): value is NonNullable<T> =>
  value != null

export const asyncSome = async (
  arr: any[],
  predicate: (...arg: any) => Promise<boolean>
) => {
  for (let e of arr) {
    if (await predicate(e)) return true
  }
  return false
}
