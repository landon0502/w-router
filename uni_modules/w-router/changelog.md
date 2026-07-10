## 1.0.1（2026-07-10）
修复一些问题
## 1.0.0（2026-06-24）
基于洋葱模型中间件的 uni-app 类型安全路由增强插件，支持路由拦截、页面间传参、TabBar等常用能力
## 1.1.0 (2026-06-24)

### Breaking Changes
- **None.** The public API is fully backward compatible. All method signatures remain identical. Existing JavaScript consumers can continue using the library without changes.

### Added
- Full TypeScript rewrite — all source files converted from `.js` to `.ts`
- Complete type definitions for all public APIs:
  - `NavigateType` enum, `NavigationOptions`, `NavigationContext`
  - `RouteRecord`, `RouteEvents`, `RouteDataCacheContext`
  - `Middleware`, `UniEventChannel`
  - `IRouter`, `PluginOptions`
- Exported type-only barrel from `index.ts` for TypeScript consumers
- `guards.ts` — lightweight type-guard utilities replacing the 3800-line lodash build
- Ambient module declarations for external dependencies (`UvRouter`, `@/router`, `@/config/pages`)
- `tsconfig.json` for IDE support and strict type checking

### Changed
- Extracted lodash utilities into `guards.ts` (6 functions, ~40 lines)
- All public methods now have explicit return types and parameter types
- `Router` class now implements `IRouter` interface for type-safe cross-references

### Fixed
- **`RouteDataPipeline.has()`** now correctly returns `boolean` instead of `undefined` (missing `return` keyword was causing redirect cache cleanup to never execute)
- **`findLastIndex`** now properly implemented in `guards.ts` — the function was missing from the local lodash core build, previously relying on fragile module fallback resolution to `iRainna-lodash`

### Removed
- `js_sdk/lodash.js` — replaced by `js_sdk/guards.ts`

---

## 1.0.0

- Initial release
