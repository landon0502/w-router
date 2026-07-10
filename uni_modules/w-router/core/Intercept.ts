/**
 * Router Interceptor — onion/koa-style middleware engine.
 *
 * Interceptors execute in registration order. Each receives a navigation context
 * and a `next` callback. Calling `next()` passes control to the next interceptor.
 * Not calling `next()` blocks the navigation.
 *
 * Custom per-navigation interceptors (passed via `options.intercept`) are prepended
 * to the chain, executing before any globally registered interceptors.
 */
import { isFunction } from './guards'
import type { NavigationContext, Middleware } from './types'

export type { Middleware }

/**
 * Parameters for the `execute` method.
 */
interface ExecuteParams {
  /** The navigation context passed through the middleware chain */
  context: NavigationContext
  /** The final handler invoked after all interceptors pass */
  finalHandler: (context: NavigationContext) => void
  /** If true, skip all interceptors and call finalHandler directly */
  notIntercept?: boolean
  /** A custom interceptor executed before globally registered ones */
  customIntercept?: Middleware
}

export default class RouterIntercept {
  private interceptors: Middleware[] = []

  /**
   * Register a global interceptor.
   *
   * @param intercept — The middleware function.
   * @returns `this` for chaining.
   * @throws {Error} If `intercept` is not a function.
   */
  use(intercept: Middleware): this {
    if (typeof intercept !== 'function') {
      throw new Error('Middleware must be a function!')
    }
    this.interceptors.push(intercept)
    return this
  }

  /**
   * Execute the interceptor chain.
   *
   * @param params — The execution parameters.
   * @returns A promise that resolves when the chain completes or blocks.
   */
  async execute(params: ExecuteParams): Promise<void> {
    const { context, finalHandler, notIntercept, customIntercept } = params

    // Skip all interceptors if notIntercept is true
    if (notIntercept) {
      return finalHandler(context)
    }

    // Copy the interceptor list and optionally prepend a custom one
    const interceptors = this.interceptors.slice()
    if (isFunction(customIntercept)) {
      interceptors.unshift(customIntercept)
    }

    let index = 0

    // Recursive dispatch through the interceptor chain
    const dispatch = async (i: number): Promise<void> => {
      if (i < index) {
        throw new Error('next() called multiple times')
      }

      index = i

      const fn: Middleware | undefined =
        i === interceptors.length ? finalHandler : interceptors[i]

      if (!fn) return

      // Execute the interceptor, passing context and the next dispatcher
      return fn(context, dispatch.bind(null, i + 1))
    }

    // Start from the first interceptor
    return dispatch(0)
  }
}
