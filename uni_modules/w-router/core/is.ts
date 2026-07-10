/**
 * Type guard and environment-check utilities.
 */
import { isUndefined, isNull, isObject, isFunction } from './guards'

// NOTE: These are app-level imports resolved at build time by the consumer's project.
// The ambient type stubs in declarations/external.d.ts provide compilation types.
// import router from '@/router'
// import { globalConfig } from '@/config/pages'

/**
 * Whether the current environment is development.
 */
export function isDevelopment(): boolean {
  // @ts-ignore — import.meta.env is a Vite-specific global
  return import.meta.env.DEV
}

/**
 * Whether the current environment is production.
 */
export function isProduction(): boolean {
  // @ts-ignore — import.meta.env is a Vite-specific global
  return import.meta.env.PRO
}

/**
 * Checks if a value is `null` or `undefined`.
 */
export function isUndef(value: unknown): value is null | undefined {
  return isUndefined(value) || isNull(value)
}

/**
 * Checks whether a CSS color string represents a fully transparent color.
 *
 * Supports: 'transparent' keyword, rgba/hsla with alpha=0,
 * hex with alpha (#RRGGBBAA, #RGBA), and CSS variables.
 *
 * @param color - The color string to check.
 * @returns `true` if the color is fully transparent.
 */
export function isTransparent(color: string): boolean {
  if (!color) return true

  const colorStr = color.toLowerCase().trim()

  // 1. Check 'transparent' keyword
  if (colorStr === 'transparent') return true

  // 2. Check rgba format
  if (colorStr.startsWith('rgba')) {
    const rgbaMatch = colorStr.match(
      /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/
    )
    if (rgbaMatch) {
      const alpha = rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1
      return alpha === 0
    }
  }

  // 3. Check hsla format
  if (colorStr.startsWith('hsla')) {
    const hslaMatch = colorStr.match(
      /hsla?\(\s*(\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)/
    )
    if (hslaMatch) {
      const alpha = hslaMatch[4] ? parseFloat(hslaMatch[4]) : 1
      return alpha === 0
    }
  }

  // 4. Check HEX with alpha format
  if (colorStr.startsWith('#')) {
    // #RRGGBBAA
    if (colorStr.length === 9) {
      const alphaHex = colorStr.slice(7, 9)
      const alpha = parseInt(alphaHex, 16) / 255
      return alpha === 0
    }
    // #RGBA
    if (colorStr.length === 5) {
      const alphaHex = colorStr.slice(4, 5)
      const alpha = parseInt(alphaHex + alphaHex, 16) / 255
      return alpha === 0
    }
  }

  // 5. CSS variable or other format — assume not transparent
  return false
}

/**
 * Checks whether a page path belongs to a tab-bar page.
 *
 * @param path - The page path to check (with or without leading slash).
 * @returns `true` if the path matches a configured tab-bar page.
 */
// export function isTabBarPath(path: string): boolean {
//   const tabbarPaths = globalConfig.tabBar.list
//   return tabbarPaths.some(
//     (item: { pagePath: string }) =>
//       router.addRootPath(item.pagePath) === router.addRootPath(path)
//   )
// }

/**
 * Checks if a value is a Promise-like object (thenable).
 *
 * @param val - The value to check.
 * @returns `true` if the value has `.then()` and `.catch()` methods.
 */
export function isPromise(val: unknown): val is Promise<unknown> {
  return isObject(val) && isFunction((val as Record<string, unknown>).then) && isFunction((val as Record<string, unknown>).catch)
}

/**
 * Checks whether the current environment is nvue (native Vue via weex).
 *
 * @returns `true` if running in nvue mode.
 */
export function isNvue(): boolean {
  // @ts-ignore — `weex` is a global in nvue environment
  return typeof weex !== 'undefined'
}
