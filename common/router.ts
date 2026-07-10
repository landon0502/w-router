/**
 * Shared router instance for the w-router demo app.
 *
 * This file demonstrates:
 * - Creating a singleton Router instance
 * - Registering global middleware (auth guard)
 * - Exporting the configured router for use across pages
 */
import {Router} from '@/uni_modules/w-router'
import type { NavigationContext } from '@/uni_modules/w-router'

// ==========================================================================
// Simulated auth state (in a real app, this would be reactive / from a store)
// ==========================================================================
let isLoggedIn = false

export function setLoggedIn(value: boolean): void {
  isLoggedIn = value
}

export function getLoggedIn(): boolean {
  return isLoggedIn
}

// ==========================================================================
// Whitelist: pages that don't require authentication
// ==========================================================================
const WHITELIST: string[] = [
  '/pages/index/index',
  '/pages/login/login',
  '/pages/public/public',
]

function isWhiteListed(url: string): boolean {
  return WHITELIST.some((path) => url.startsWith(path))
}

// ==========================================================================
// Global Auth Guard Middleware
// ==========================================================================
function authGuard(context: NavigationContext, next: () => void): void {
  // Skip if the target page is whitelisted
  if (isWhiteListed(context.url)) {
    return next()
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    console.warn('[authGuard] Not logged in — redirecting to login')
    // The router instance is available on context.router
    // We use uni.navigateTo directly here to avoid re-entering the interceptor chain
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/login/login' })
    return // Block navigation — do NOT call next()
  }

  // User is logged in, proceed
  next()
}

// ==========================================================================
// Create and export the router instance
// ==========================================================================
const router = new Router({
  tabbarPaths:["/pages/index/index", "/pages/home/home"]
})

// Register the auth guard as global middleware
router.interceptor.use(authGuard)

export { router }
export default router
