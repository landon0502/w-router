/**
 * Ambient type declarations for app-level modules.
 * These modules exist at the consumer project level (e.g., @/router).
 */

declare module '@/router' {
  const router: {
    addRootPath(path: string): string
  }
  export default router
}

declare module '@/config/pages' {
  interface TabBarItem {
    pagePath: string
    text: string
  }

  interface GlobalConfig {
    tabBar: {
      list: TabBarItem[]
    }
  }

  export const globalConfig: GlobalConfig
}
