/**
 * w-router — Type-safe uni-app router with middleware support.
 *
 * Provides navigation methods (to, redirect, tab, launch, back) with
 * onion-style interceptor middleware, params/data passing between pages,
 * and back-to-opened-page optimization.
 */
import RouterIntercept from './Intercept'
import UvRouter from './router.core'
import { isNull, isUndefined, findLastIndex, isEmpty, isFunction } from './guards'
import { getPageId, getHistoryPage, pages } from './utils'
import { isUndef } from './is'
import RouteDataPipeline from './RouteDataPipeline'
import RouterEvents from './RouterEvents'
import type {
  NavigateType,
  NavigationOptions,
  NavigationContext,
  RouteRecord,
  RouteEvents,
  UniEventChannel,
  RouteDataCacheContext,
  IRouter,
} from './types'

/** Event key for route params received via event channel / uni.$emit */
export const onRouteParamsEventKey = 'onRouteParams'

/**
 * Event key for back-navigation params.
 * The callee page receives back-params by registering an `onBack` event handler.
 */
export const onRouteParamsOnBackEvtKey = 'onBack'

/**
 * Internal type for the options passed into handleRouterDataCache.
 */
interface DataCacheOptions {
  navUrl: string
  params?: unknown
  type?: string
  delta?: number
  backOpenedPage?: boolean
}

const uvRoute = new UvRouter().route

export default class Router implements IRouter {
  /** Middleware interceptor engine */
  readonly interceptor = new RouterIntercept()

  /** Page-level event bus */
  readonly routerEvents = new RouterEvents()

  /** Route data pipeline for passing data between pages */
  readonly dataPipeline = new RouteDataPipeline()

  /**
   * Tab bar page paths.
   * Populate with the `pagePath` values from `pages.json` → `tabBar.list`.
   *
   * @example
   * ```typescript
   * const router = new Router()
   * router.tabbarPaths = ['/pages/home/index', '/pages/mine/index']
   * ```
   */
  tabbarPaths: string[]

  constructor() {
    this.tabbarPaths = []

    // Register a global navigateBack interceptor to clean up
    // the data pipeline when pages are popped from the stack
    uni.addInterceptor('navigateBack', {
      invoke: () => {
        const prevPage = getHistoryPage(0)
        if (prevPage) {
          this.dataPipeline.remove(this.addRootPath(prevPage.route))
        }
      },
    })
  }

  // ==========================================================================
  // URL Helpers
  // ==========================================================================

  /**
   * Ensure a URL has a leading "/", otherwise uni-app navigation will fail.
   *
   * @param url - The page path (may or may not have leading slash).
   * @returns The path with a leading slash guaranteed, or empty string if input is undefined.
   */
  addRootPath(url: string | undefined): string {
    if (isUndef(url)) return ''
    return url[0] === '/' ? url : `/${url}`
  }

  /**
   * Extract the path portion of a URL, stripping query parameters.
   *
   * @param fullUrl - The full URL potentially with query string.
   * @returns The path without query parameters, or empty string if undefined.
   */
  getNavigatorUrl(fullUrl: string | undefined): string {
    if (isUndef(fullUrl)) return ''
    return fullUrl.split('?')[0]
  }

  /**
   * Check whether a page path belongs to a tab-bar page.
   *
   * Normalizes both the input path and the configured `tabbarPaths`
   * entries with a leading slash before comparing.
   *
   * @param path - The page path to check (with or without leading slash).
   * @returns `true` if the path matches a configured tab-bar page.
   */
  isTabBarPath(path: string): boolean {
    return this.tabbarPaths.some(
      (item: string) => this.addRootPath(item) === this.addRootPath(path)
    )
  }

  /**
   * Format a uni.$emit event name for route-specific events.
   * Used for tab-bar pages which don't have an opener event channel.
   *
   * @param eventName - The base event name (e.g., 'onRouteParams').
   * @param url - The normalized route URL.
   * @returns The scoped event name string.
   */
  getUniEventNameByRouterUrl = (eventName: string, url: string): string => {
    return `${eventName}[${this.addRootPath(url)}]`
  }

  // ==========================================================================
  // Event Channel Handling
  // ==========================================================================

  /**
   * Emit route params/data to the destination page.
   *
   * For tab-bar pages (no opener channel), uses `uni.$emit`.
   * For normal pages, uses the opener event channel.
   */
  onRouteChannelHandler({ url, params }: {
    url?: string
    params?: unknown
  }): void {
    const instance = getHistoryPage(0)
    if (!instance) return

    const channel: UniEventChannel | undefined = instance.getOpenerEventChannel?.()

    // Emit params
    if (!isUndefined(params) && !isNull(params)) {
      if (url && this.isTabBarPath(url)) {
        uni.$emit(this.getUniEventNameByRouterUrl(onRouteParamsEventKey, url), params)
      } else {
        channel?.emit?.(onRouteParamsEventKey, params)
      }
    }

  }

  /**
   * Execute the actual navigation.
   * First handles event channel emission, then delegates to uvRoute.
   */
  routeHandler(options: Record<string, unknown>): void {
    this.onRouteChannelHandler(options as {
      url?: string
      params?: unknown
    })
    uvRoute(options)
  }

  // ==========================================================================
  // Event Registration
  // ==========================================================================

  /**
   * Register page-level event handlers for a navigation.
   * The `events` key is removed from options before forwarding to the navigator.
   */
  addRouterParamsEvent(options: Record<string, unknown>): void {
    const events = options.events as RouteEvents | undefined
    Reflect.deleteProperty(options, 'events')

    if (isEmpty(events)) {
      return
    }

    this.routerEvents.add(getPageId(), events as RouteEvents)
  }

  // ==========================================================================
  // Data Pipeline Management
  // ==========================================================================

  /**
   * Manage the route data cache lifecycle based on navigation type.
   *
   * - `tab` / `launch`: Clear all cached data (all pages are closed).
   * - `redirect`: Remove current page's cached data.
   * - `back`: Remove cached data for the pages being popped.
   * - `to`: Create a new cache entry unless the page is already open (backOpenedPage).
   */
  handleRouterDataCache({ navUrl, params, type, delta = 0, backOpenedPage }: DataCacheOptions): void {
    // Tab and launch close all pages — clear all cached data
    if (['tab', 'launch'].includes(type ?? '')) {
      this.dataPipeline.clear()
    }

    const from = getHistoryPage(0)

    // Redirect: remove the current page's cache since it's being replaced
    if (type === 'redirect' && this.dataPipeline.has(this.addRootPath(from?.route))) {
      this.dataPipeline.remove(this.addRootPath(from?.route))
    }

    // Back: remove cache for pages being popped from the stack
    if (type === 'back') {
      const removeCacheIds = pages()
        .slice(-delta)
        .map((item: RouteRecord) => this.addRootPath(item.route))

      removeCacheIds.forEach((id: string) => {
        this.dataPipeline.remove(id)
      })
    }

    // Forward navigation (not back): create cache entry for the destination
    if (type !== 'back') {
      const historyStack = pages()
      const index = findLastIndex(
        historyStack,
        ({ route }: RouteRecord) => this.addRootPath(route) === navUrl
      )

      // If the page is already open and backOpenedPage is set, don't create new cache
      if (backOpenedPage && index > -1) {
        return
      }

      // Register the destination page's data cache context
      this.dataPipeline.create({
        from: this.addRootPath(from?.route),
        to: navUrl,
        params,
      })
    }
  }

  // ==========================================================================
  // Main Route Method
  // ==========================================================================

  /**
   * Core routing method. All other navigation methods delegate to this.
   *
   * Flow:
   * 1. Normalize the URL
   * 2. Manage the data pipeline cache
   * 3. Check backOpenedPage optimization
   * 4. Run through the interceptor chain
   * 5. Execute the navigation via routeHandler
   *
   * @param options - Navigation options.
   * @returns `this` for chaining.
   */
  route(options: NavigationOptions): this {
    // Normalize the URL (ensure leading slash, strip query for matching)
    const url = this.addRootPath(this.getNavigatorUrl(options.url))

    this.handleRouterDataCache({ ...options, navUrl: url })

    // backOpenedPage optimization: if the target page is already in the stack,
    // navigate back to it instead of pushing a new instance
    if (options.backOpenedPage) {
      const historyStack = pages()
      const len = historyStack.length
      const index = findLastIndex(
        historyStack,
        ({ route }: RouteRecord) => this.addRootPath(route) === url
      )

      // If the page is already open, navigate back to it
      if (index > -1 && len > 1) {
        const delta = len - index - 1
        if (delta > 0) {
          this.back({
            ...options,
            delta,
          })
          return this
        }
      }
    }

    // Extract custom interceptor before building context
    const customIntercept = options.intercept
    Reflect.deleteProperty(options as Record<string, unknown>, 'intercept')

    // Resolve notIntercept (support both boolean and function forms)
    const resolvedNotIntercept: boolean = isFunction(options.notIntercept)
      ? (options.notIntercept as () => boolean)()
      : (options.notIntercept as boolean | undefined) ?? false

    // Build the navigation context for interceptors
    const context: NavigationContext = {
      router: this,
      from: getHistoryPage(0),
      url,
      type: (options as Record<string, unknown>).type as NavigateType,
      notIntercept: resolvedNotIntercept,
      delta: options.delta,
      backOpenedPage: options.backOpenedPage,
      params: options.params,
      success: options.success,
      fail: options.fail,
      complete: options.complete,
    }

    // Run through the interceptor chain
    this.interceptor.execute({
      context,
      notIntercept: resolvedNotIntercept,
      // Per-navigation custom interceptor (runs before global ones)
      customIntercept,
      // The final handler — execute the actual navigation
      finalHandler: () => {
        this.routeHandler(options as unknown as Record<string, unknown>)
      },
    })

    return this
  }

  // ==========================================================================
  // Cache Retrieval
  // ==========================================================================

  /**
   * Get the cached route data for the current page.
   *
   * Call this in the destination page to retrieve params/data passed
   * from the source page via `router.to()` / `router.redirect()` etc.
   *
   * @returns The cached data context, or null if none exists.
   */
  getPrevRouterDataCache(): RouteDataCacheContext | null {
    const currentPage = getHistoryPage()
    if (!currentPage) return null
    return this.dataPipeline.get(this.addRootPath(currentPage.route)) ?? null
  }

  // ==========================================================================
  // Navigation Convenience Methods
  // ==========================================================================

  /**
   * Navigate to a page (push onto the stack).
   *
   * ```typescript
   * router.to({ url: '/pages/detail/index', params: { id: 1 } })
   * ```
   *
   * @param options - Navigation options.
   */
  to(options: NavigationOptions): void {
    this.addRouterParamsEvent(options as unknown as Record<string, unknown>)
    this.route({ ...options, type: 'to' } as NavigationOptions)
  }

  /**
   * Redirect to a page (replace current page).
   *
   * ```typescript
   * router.redirect({ url: '/pages/login/index' })
   * ```
   *
   * @param options - Navigation options.
   */
  redirect(options: NavigationOptions): void {
    this.addRouterParamsEvent(options as unknown as Record<string, unknown>)
    this.route({ ...options, type: 'redirect' } as NavigationOptions)
  }

  /**
   * Switch to a tab-bar page.
   *
   * ```typescript
   * router.tab({ url: '/pages/home/index' })
   * ```
   *
   * @param options - Navigation options.
   */
  tab(options: NavigationOptions): void {
    this.route({ ...options, type: 'tab' } as NavigationOptions)
  }

  /**
   * Close all pages and open a new one.
   *
   * ```typescript
   * router.launch({ url: '/pages/index/index' })
   * ```
   *
   * @param options - Navigation options.
   */
  launch(options: NavigationOptions): void {
    this.route({ ...options, type: 'launch' } as NavigationOptions)
  }

  /**
   * Navigate back by N pages.
   *
   * On back navigation, interceptors are skipped (`notIntercept: true`).
   * If `params` are provided, they're delivered to the target page's
   * `onBack` event handler.
   *
   * ```typescript
   * router.back()                          // go back 1 page
   * router.back({ delta: 2 })              // go back 2 pages
   * router.back({ params: { updated: true } }) // pass data back
   * ```
   *
   * @param options - Navigation options (delta defaults to 1).
   */
  back(options: NavigationOptions = {} as NavigationOptions): void {
    const delta = options?.delta ?? 1
    const backPage = getHistoryPage(-delta)

    this.routeHandler({
      notIntercept: true,
      ...options,
      type: 'back',
      success: () => {
        options?.success?.(undefined)

        if (options.params && backPage) {
          this.routerEvents.invoke(
            getPageId(backPage),
            onRouteParamsOnBackEvtKey,
            options.params
          )
        }
      },
    })
  }
}
