/**
 * w-router Type Definitions
 *
 * All public types for the w-router library.
 * Re-exported from index.ts for TypeScript consumers.
 */

// ============================================================================
// Enums
// ============================================================================

/** Navigation action types passed to the underlying uni-app navigator */
export enum NavigateType {
  /** navigateTo — push a new page onto the stack */
  To = 'to',
  /** redirectTo — replace current page */
  Redirect = 'redirect',
  /** switchTab — switch to a tab bar page */
  Tab = 'tab',
  /** reLaunch — close all pages and open a new one */
  Launch = 'launch',
  /** navigateBack — go back N pages */
  Back = 'back',
}

// ============================================================================
// Page Instance / Route Record
// ============================================================================

/**
 * The event channel returned by getOpenerEventChannel().
 * Available on non-tab-bar navigations for page-to-page communication.
 */
export interface UniEventChannel {
  emit: (eventName: string, ...args: unknown[]) => void
  on?: (eventName: string, callback: (...args: unknown[]) => void) => void
  once?: (eventName: string, callback: (...args: unknown[]) => void) => void
  off?: (eventName: string, callback?: (...args: unknown[]) => void) => void
}

/**
 * Represents a page instance from `getCurrentPages()`.
 *
 * The shape varies across platforms (Vue 2, Vue 3, nvue, mini-program).
 * This interface captures the fields accessed by w-router.
 */
export interface RouteRecord {
  /** Page route path, e.g. "/pages/index/index" */
  route: string
  /** Page component instance (platform-dependent $vm or component id) */
  $: { uid: number }
  /** WeChat Mini Program WebView id (exists only when `MP-WEIXIN`) */
  __wxWebviewId__?: number
  /** Event channel for page-to-page communication (not on tab pages) */
  getOpenerEventChannel?: () => UniEventChannel
}

// ============================================================================
// Route Events
// ============================================================================

/**
 * Event callbacks registered on a navigation.
 * Invoked by the router when back-navigation delivers params via `onBack`,
 * and extensible for custom event names.
 */
export interface RouteEvents {
  /**
   * Called when `router.back()` passes params to this page.
   * The callee page receives back-params through this callback.
   */
  onBack?: (params: unknown) => void
  /** Arbitrary additional event handlers */
  [key: string]: ((data: unknown) => void) | undefined
}

// ============================================================================
// Route Data Cache
// ============================================================================

/** Cache entry stored in RouteDataPipeline for passing params between pages */
export interface RouteDataCacheContext {
  /** Source page route (normalized with leading slash) */
  from: string
  /** Destination page route (normalized with leading slash) */
  to: string
  /** Route params passed from source to destination */
  params?: unknown
  /** Optional onBack callback for back-navigation params delivery */
  onBack?: (params: unknown) => void
}

// ============================================================================
// Middleware / Navigation Guard
// ============================================================================

/**
 * Middleware function signature (onion/koa pattern).
 *
 * @param context — The navigation context with router instance, options, and source page.
 * @param next — Call to proceed to the next interceptor or final navigation handler.
 *               Do NOT call `next()` to block/shadow the navigation.
 */
export type Middleware = (
  context: NavigationContext,
  next: () => void
) => void | Promise<void>

// ============================================================================
// Router Interface (for type-safe cross-references)
// ============================================================================

/**
 * Abstract interface for the Router class.
 * Used to avoid circular type dependencies between types.ts and Router.ts.
 */
export interface IRouter {
  readonly interceptor: unknown
  readonly routerEvents: unknown
  readonly dataPipeline: unknown
  tabbarPaths: string[]
  addRootPath(url: string | undefined): string
  getNavigatorUrl(fullUrl: string | undefined): string
  isTabBarPath(path: string): boolean
  getPrevRouterDataCache(): RouteDataCacheContext | null
  to(options: NavigationOptions): void
  redirect(options: NavigationOptions): void
  tab(options: NavigationOptions): void
  launch(options: NavigationOptions): void
  back(options?: NavigationOptions): void
}

// ============================================================================
// Navigation Options & Context
// ============================================================================

/**
 * Options passed to `router.to()`, `router.redirect()`, `router.tab()`,
 * `router.launch()`, and `router.back()`.
 *
 * All uni-app navigateTo/redirectTo/switchTab/reLaunch/navigateBack options
 * are accepted and forwarded to the underlying API.
 */
export interface NavigationOptions {
  /** Target page URL (absolute path like '/pages/xxx/xxx', may include query) */
  url: string

  /** Route params — passed to the target page via event channel / uni.$emit,
   *  cached in RouteDataPipeline, and retrievable via getPrevRouterDataCache().
   *  Also used by router.back() for back-navigation data delivery via events.onBack. */
  params?: unknown

  /** Page-level event callbacks registered for this navigation */
  events?: RouteEvents

  /**
   * If true and the target page already exists in the page stack,
   * navigate back to it instead of pushing a new instance.
   */
  backOpenedPage?: boolean

  /** Skip all registered interceptors for this single navigation */
  notIntercept?: boolean | (() => boolean)

  /**
   * Custom interceptor executed only for this navigation.
   * Runs before all globally registered interceptors.
   * Call `next()` to proceed, or return without calling to block.
   */
  intercept?: Middleware

  /** Delta for navigateBack (number of pages to go back, default 1) */
  delta?: number

  /** Called when navigation succeeds */
  success?: (result: unknown) => void

  /** Called when navigation fails */
  fail?: (error: unknown) => void

  /** Called when navigation completes (success or fail) */
  complete?: (result: unknown) => void

  /**
   * Animation type (uni-app specific).
   * 'auto' | 'none' | 'slide-in-right' | 'slide-in-left' | 'slide-in-top' |
   * 'slide-in-bottom' | 'fade-in' | 'zoom-out' | 'zoom-fade-out' | 'pop-in'
   */
  animationType?: string

  /** Animation duration in milliseconds */
  animationDuration?: number

  /** Allow arbitrary additional uni-app navigate options */
  [key: string]: unknown
}

/**
 * Internal representation of NavigationOptions after normalization.
 * The Router resolves the URL, applies defaults, and enriches with
 * the router instance and source page before passing to interceptors.
 */
export interface NavigationContext {
  /** Normalized URL (leading slash ensured, query params preserved) */
  url: string
  /** Navigation type */
  type: NavigateType
  /** The router instance */
  router: IRouter
  /** Source page record (undefined if called before any page exists) */
  from: RouteRecord | undefined
  /** Route params */
  params?: unknown
  /** Whether to skip interceptors */
  notIntercept?: boolean
  /** Delta for back navigation */
  delta?: number
  /** Already-opened page behavior flag */
  backOpenedPage?: boolean
  /** Called when navigation succeeds */
  success?: (result: unknown) => void
  /** Called when navigation fails */
  fail?: (error: unknown) => void
  /** Called when navigation completes (success or fail) */
  complete?: (result: unknown) => void
  /** Allow extensibility for forwarded uni-app options */
  [key: string]: unknown
}

// ============================================================================
// Plugin Options
// ============================================================================

/**
 * Options passed when instantiating the Router plugin.
 * Currently minimal; extensible for future features.
 */
export interface PluginOptions {
  /** Optional base URL prefix applied to all routes */
  basePath?: string
  /** Custom route-to-event-name transform function */
  eventNameFormatter?: (eventName: string, url: string) => string
}
