/**
 * Utility functions for the w-router library.
 */
import type { RouteRecord } from './types'

/**
 * Get the page instance id.
 *
 * On WeChat Mini Programs, uses `__wxWebviewId__`.
 * On all other platforms, uses the Vue component's `$.uid`.
 *
 * @param pageInstance - Optional page instance. Defaults to the current page.
 * @returns The page id number.
 */
export function getPageId(pageInstance?: RouteRecord): number {
  const currentPage = pageInstance ?? getHistoryPage()
  // #ifdef MP-WEIXIN
  return (currentPage as unknown as Record<string, unknown>).__wxWebviewId__ as number
  // #endif
  // #ifndef MP-WEIXIN
  return currentPage?.$?.uid ?? 0
  // #endif
}

/**
 * Deep clone an object with circular reference support.
 *
 * Handles: plain objects, arrays, Date, RegExp, Map, Set.
 * Uses a WeakMap to track already-cloned objects for cycle detection.
 *
 * @param obj - The object to clone.
 * @param cache - Internal WeakMap for cycle tracking (auto-created).
 * @returns A deep copy of the input.
 */
export function deepClone<T>(obj: T, cache: WeakMap<object, unknown> = new WeakMap()): T {
  if (obj === null || typeof obj !== 'object') return obj

  if (cache.has(obj as object)) return cache.get(obj as object) as T

  let clone: unknown

  if (obj instanceof Date) {
    clone = new Date(obj.getTime())
  } else if (obj instanceof RegExp) {
    clone = new RegExp(obj.source, obj.flags)
  } else if (obj instanceof Map) {
    clone = new Map(
      Array.from(obj, ([key, value]) => [key, deepClone(value, cache)])
    )
  } else if (obj instanceof Set) {
    clone = new Set(Array.from(obj, (value) => deepClone(value, cache)))
  } else if (Array.isArray(obj)) {
    clone = obj.map((value) => deepClone(value, cache))
  } else if (Object.prototype.toString.call(obj) === '[object Object]') {
    const proto = Object.getPrototypeOf(obj) as object
    clone = Object.create(proto)
    cache.set(obj as object, clone)
    for (const [key, value] of Object.entries(obj)) {
      ;(clone as Record<string, unknown>)[key] = deepClone(value, cache)
    }
  } else {
    clone = Object.assign({}, obj)
  }

  cache.set(obj as object, clone)
  return clone as T
}

/**
 * Get a page instance from the navigation history stack.
 *
 * @param back - 0 or negative number. 0 = current page, -1 = previous page, etc. Default 0.
 * @returns The page instance at the specified offset, or undefined if out of bounds.
 */
export function getHistoryPage(back: number = 0): RouteRecord | undefined {
  const pageStack = getCurrentPages()
  const len = pageStack.length
  return pageStack[len - 1 + back]
}

/**
 * Get the full current page stack.
 *
 * @returns Array of all page instances from `getCurrentPages()`.
 */
export function pages(): RouteRecord[] {
  return getCurrentPages()
}

/**
 * @description 获取当前页面路径
 */
export function page(): string {
	const pageStack = getCurrentPages()
	const route = pageStack[pageStack.length - 1]?.route
	// 某些特殊情况下(比如页面进行redirectTo时的一些时机)，pageStack可能为空数组
	return `/${route ? route : ''}`
}

/**
 * @description 对象转url参数
 * @param data - 对象
 * @param isPrefix - 是否自动加上"?"
 * @param arrayFormat - 规则 indices|brackets|repeat|comma
 */
export function queryParams(
	data: Record<string, unknown> = {},
	isPrefix: boolean = true,
	arrayFormat: string = 'brackets'
): string {
	const prefix = isPrefix ? '?' : ''
	const _result: string[] = []
	let format = arrayFormat
	if (['indices', 'brackets', 'repeat', 'comma'].indexOf(format) === -1)
		format = 'brackets'
	for (const key in data) {
		const value = data[key]
		// 去掉为空的参数
		if (['', undefined, null].indexOf(value as string | undefined | null) >= 0) {
			continue
		}
		// 如果值为数组，另行处理
		if (Array.isArray(value)) {
			const arr = value as unknown[]
			// e.g. {ids: [1, 2, 3]}
			switch (format) {
				case 'indices':
					// 结果: ids[0]=1&ids[1]=2&ids[2]=3
					for (let i = 0; i < arr.length; i++) {
						_result.push(`${key}[${i}]=${arr[i]}`)
					}
					break
				case 'brackets':
					// 结果: ids[]=1&ids[]=2&ids[]=3
					arr.forEach((_value) => {
						_result.push(`${key}[]=${_value}`)
					})
					break
				case 'repeat':
					// 结果: ids=1&ids=2&ids=3
					arr.forEach((_value) => {
						_result.push(`${key}=${_value}`)
					})
					break
				case 'comma':
					// 结果: ids=1,2,3
					let commaStr = ''
					arr.forEach((_value) => {
						commaStr += (commaStr ? ',' : '') + _value
					})
					_result.push(`${key}=${commaStr}`)
					break
				default:
					arr.forEach((_value) => {
						_result.push(`${key}[]=${_value}`)
					})
			}
		} else {
			_result.push(`${key}=${value}`)
		}
	}
	return _result.length ? prefix + _result.join('&') : ''
}

/**
 * @description JS对象深度合并
 * @param target 需要拷贝的对象
 * @param source 拷贝的来源对象
 * @returns 深度合并后的对象或者false（入参有不是对象）
 */
export function deepMerge<T extends Record<string, unknown>>(
	target: T | Record<string, unknown> = {},
	source: Record<string, unknown> = {}
): Record<string, unknown> {
	const cloned = deepClone(target) as Record<string, unknown>
	if (
		typeof cloned !== 'object' ||
		cloned === null ||
		typeof source !== 'object' ||
		source === null
	)
		return cloned
	const merged: Record<string, unknown> = Array.isArray(cloned)
		? (cloned as unknown[]).slice() as unknown as Record<string, unknown>
		: Object.assign({}, cloned)
	for (const prop in source) {
		if (!Object.prototype.hasOwnProperty.call(source, prop)) continue
		const sourceValue = source[prop]
		const targetValue = merged[prop]
		if (sourceValue instanceof Date) {
			merged[prop] = new Date(sourceValue)
		} else if (sourceValue instanceof RegExp) {
			merged[prop] = new RegExp(sourceValue)
		} else if (sourceValue instanceof Map) {
			merged[prop] = new Map(sourceValue)
		} else if (sourceValue instanceof Set) {
			merged[prop] = new Set(sourceValue)
		} else if (typeof sourceValue === 'object' && sourceValue !== null) {
			merged[prop] = deepMerge(
				(targetValue as Record<string, unknown>) ?? {},
				sourceValue as Record<string, unknown>
			)
		} else {
			merged[prop] = sourceValue
		}
	}
	return merged
}