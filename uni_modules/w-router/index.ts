/**
 * w-router — Type-safe uni-app router with middleware support.
 *
 * @module w-router
 */

// Core classes
export { default as RouterIntercept } from './core/Intercept'
export { default as Router } from './core/Router'
export { default as RouterEvents } from './core/RouterEvents'
export { default as RouteDataPipeline } from './core/RouteDataPipeline'

// Route event constants
export {
  onRouteParamsEventKey,
  onRouteParamsOnBackEvtKey,
} from './core/Router'

// Utility exports
export {
  getPageId,
  deepClone,
  getHistoryPage,
  pages,
} from './core/utils'

export {
  isDevelopment,
  isProduction,
  isUndef,
  isTransparent,
  isPromise,
  isNvue,
} from './core/is'

// Type guard exports
export {
  isNull,
  isUndefined,
  isFunction,
  isObject,
  isEmpty,
  findLastIndex,
} from './core/guards'

// Middleware type
export type { Middleware } from './core/Intercept'

// All public type definitions
export type {
  NavigateType,
  RouteRecord,
  UniEventChannel,
  RouteEvents,
  RouteDataCacheContext,
  NavigationOptions,
  NavigationContext,
  PluginOptions,
  IRouter,
} from './core/types'
