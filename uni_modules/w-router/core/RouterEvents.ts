/**
 * Router Events — manages page-level event callbacks registered during navigation.
 *
 * Events are stored by page ID and automatically cleaned up after invocation.
 * The primary use case is `onBack` events: when `router.back()` passes params,
 * the callee page receives them via its registered `onBack` handler.
 */
import { isUndefined, isFunction } from './guards'
import type { RouteEvents } from './types'

export default class RouterEvents {
  private eventCache = new Map<number, RouteEvents>()

  /**
   * Register event handlers for a page.
   *
   * @param pageId - The target page's unique id.
   * @param events - Map of event name to handler function.
   */
  add(pageId: number, events: RouteEvents): void {
    this.eventCache.set(pageId, events)
  }

  /**
   * Clear event handlers.
   *
   * @param pageId - If provided, clears only that page's handlers.
   *                 If undefined, clears ALL handlers.
   */
  clear(pageId?: number): void {
    if (isUndefined(pageId)) {
      this.eventCache.clear()
    } else {
      this.eventCache.delete(pageId)
    }
  }

  /**
   * Invoke a registered event handler for a page.
   * The handler is automatically cleared after invocation.
   *
   * @param pageId - The target page's unique id.
   * @param key - The event name to invoke (e.g., 'onBack').
   * @param data - Data to pass to the handler.
   */
  invoke(pageId: number, key: string, data: unknown): void {
    if (!pageId) return

    const pageEvent: RouteEvents = this.eventCache.get(pageId) ?? {}
    const fn = pageEvent[key]

    if (isFunction(fn)) {
      fn(data)
    }

    // Clean up after execution
    this.clear(pageId)
  }
}
