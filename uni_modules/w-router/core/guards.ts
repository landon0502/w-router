/**
 * Lightweight type-guard and utility functions.
 *
 * These replace the 3800-line lodash core build previously in lodash.js.
 * Only the 6 functions actually used across the w-router codebase are included.
 */

/**
 * Checks if `value` is `null`.
 */
export function isNull(value: unknown): value is null {
  return value === null
}

/**
 * Checks if `value` is `undefined`.
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined
}

/**
 * Checks if `value` is classified as a `Function` object.
 */
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function'
}

/**
 * Checks if `value` is the language type of `Object`.
 * (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value != null && (typeof value === 'object' || typeof value === 'function')
}

/**
 * Checks if `value` is an empty object, collection, map, or set.
 *
 * Objects are considered empty if they have no own enumerable string keyed properties.
 * Array-like values such as strings, arrays, and arguments objects are considered
 * empty if they have a `length` of `0`. Maps and Sets are considered empty if they
 * have a `size` of `0`.
 */
export function isEmpty(value: unknown): boolean {
  if (value == null) return true

  if (typeof value === 'string' || Array.isArray(value)) {
    return value.length === 0
  }

  if (value instanceof Map || value instanceof Set) {
    return value.size === 0
  }

  if (typeof value === 'object') {
    return Object.keys(value as object).length === 0
  }

  return false
}

/**
 * Iterates over elements of `array` from right to left, returning the index
 * of the first element `predicate` returns truthy for.
 *
 * Returns `-1` if no match is found.
 *
 * Note: This is a polyfill for `Array.prototype.findLastIndex` (ES2023)
 * to maintain compatibility with older JavaScript engines in mini-program environments.
 */
export function findLastIndex<T>(
  array: T[],
  predicate: (value: T, index: number, array: T[]) => boolean
): number {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i], i, array)) {
      return i
    }
  }
  return -1
}
