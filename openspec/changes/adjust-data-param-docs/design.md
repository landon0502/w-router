## 实现说明

本次变更包含 `NavigationContext` 接口重构及相关文档/注释同步。

### 1. types.ts — NavigationContext 接口重构

将 `NavigationContext` 从展开字段模式重构为聚合 `options: NavigationOptions` 模式：

- **保留顶层便捷字段**：`url`、`router`、`from`、`params`、`notIntercept`
- **聚合到 `options`**：`type`、`delta`、`backOpenedPage`、`success`、`fail`、`complete`、`data`、`events`、`intercept` 等
- 更新 JSDoc 注释说明聚合结构和便捷字段

这是 public API 变更：现有中间件中使用 `context.type`、`context.delta` 等的代码需改为 `context.options.type`、`context.options.delta`。

### 2. Router.ts — NavigationContext 构建逻辑适配

将 context 构建从展开赋值改为聚合模式：

```typescript
const context: NavigationContext = {
    router: this,
    url,
    options: { ...options, url },
    from: getHistoryPage(0)
}
```

同时修正 `onRouteDataEventKey` 的 JSDoc 注释（原注释错误复制了 `onRouteParamsEventKey` 的描述）。

### 3. readme.md — 文档同步

- 中间件拦截器示例：添加 `context.options` 访问说明
- TypeScript 示例：展示 `NavigationContext` import 和 `context.options` 用法
- API 参考：新增 `NavigationContext` 字段表，说明便捷字段与 `options` 聚合关系
