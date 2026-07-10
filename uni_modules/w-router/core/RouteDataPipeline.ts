/**
 * Route data pipeline — manages cached params passed between pages during navigation.
 *
 * The pipeline stores {from, to, params} contexts keyed by destination URL.
 * This data is retrievable via `router.getPrevRouterDataCache()` in the target page.
 */
import type { RouteDataCacheContext } from './types'

export default class RouteDataPipeline {
  private cache = new Map<string, RouteDataCacheContext>()

  /**
   * Create a cache entry for a navigation.
   *
   * @param ctx - The route data cache context to store.
   */
  create(ctx: RouteDataCacheContext): void {
    this.cache.set(ctx.to, {
      from: ctx.from,
      to: ctx.to,
      params: ctx.params,
      onBack: ctx.onBack,
    })
  }

  /**
   * Retrieve the cached data context for a page route.
   *
   * @param id - The normalized page route URL.
   * @returns The cached context, or undefined if not found.
   */
  get(id: string): RouteDataCacheContext | undefined {
    return this.cache.get(id)
  }

  /**
   * Remove a cached data context.
   *
   * @param id - The normalized page route URL to remove.
   */
  remove(id: string): void {
    this.cache.delete(id)
  }

  /**
   * Check if a cached context exists for a page route.
   *
   * @param id - The normalized page route URL.
   * @returns `true` if the cache contains the entry.
   */
  has(id: string): boolean {
    return this.cache.has(id)
  }

  /**
   * Clear all cached route data contexts.
   * Called when navigating via tab or launch (which close all existing pages).
   */
  clear(): void {
    this.cache.clear()
  }
}
