## 1.0.8（2026-09-24）
- 修复vite-pages-generator-plugin生成json格式问题，ts重构
- 优化w-router uvue，vue兼容性
- 删除index.ts入口，统一使用uts作为入口
## 1.0.7（2026-09-09）
### Fixed
- 修复 **uni-app x（uvue）兼容**：条件/逻辑运算显式布尔化、`===`→`==`、`undefined` 联合改 `null`、对象字面量类型 `interface`→`type`、去 `Object.keys` 改用 `UTSJSONObject.toMap`、`deepMerge` 改逐字段 overlay、函数名作值改 const 箭头等
- 页面对象改用官方 `UniPage` 建模（修复 `UniNormalPageImpl` cast 崩溃），事件/缓存 key 退化为 route
- 导航参数改经 `RouteDataPipeline` 缓存传递（移除 event channel 二次发射）
- 修复导航缓存先于拦截写入问题：缓存提交移到拦截放行后（uvue 与 TS/vue 同步），守卫阻断不再留下脏缓存
- 统一 `IRouter.back` 与实现签名；清理失效接口与过时注释
## 1.0.6（2026-08-31）
### Added
- 新增 **uni-app x（uvue）兼容**：`uvue/` 目录提供与 TS 实现同构的 UTS 实现，根目录 `index.uts` 按条件编译（`UNI-APP-X`）自动分发——同一 `import` 路径在经典 uni-app 与 uni-app x 工程中分别解析，业务代码零改动
## 1.0.5（2026-08-26）
修复router.back 参数类型问题
## 1.0.4（2026-08-26）
修复 `tabbarPaths` 无法通过构造函数配置的问题
### Added
- `Router` 构造函数支持接收 `PluginOptions`（含 `tabbarPaths`），`new Router({ tabbarPaths })` 生效
- 新增 `router.setTabbarPaths(paths)` 链式 setter，等价于直接赋值 `router.tabbarPaths`
### Fixed
- 修复构造参数被忽略导致 `tabbarPaths` 恒为 `[]` 的问题（此前 `new Router({ tabbarPaths })` 不生效）
## 1.0.3（2026-08-10）
修复一些问题
## 1.0.2（2026-08-10）
添加data传参模式
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
