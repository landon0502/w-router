## Why

w-router v1.0.2 新增了 `data` 隐式传参通道，同时 `NavigationContext` 接口从展开字段重构为聚合 `options: NavigationOptions` 模式。当前示例页面、代码注释和 README 文档未完全同步这些变更，存在以下问题：

1. `NavigationContext` 类型注释未反映 `options` 聚合结构
2. `onRouteDataEventKey` 的 JSDoc 注释错误复制了 `onRouteParamsEventKey` 的描述
3. README 中间件示例未适配 `context.options` 新结构
4. README TypeScript 示例中 `Middleware` 用法未展示 `context.options` 访问方式

## What Changes

- 重构 `NavigationContext` 接口：将展开字段（`type`、`delta`、`backOpenedPage`、`success`、`fail`、`complete`）聚合为 `options: NavigationOptions` 字段，保留 `url`、`router`、`from`、`params`、`notIntercept` 为顶层便捷字段
- 更新 `Router.ts` 中 `NavigationContext` 构建逻辑，适配聚合 `options` 模式
- 修正 `onRouteDataEventKey` 的 JSDoc 注释
- 更新 README 中间件示例，适配 `context.options` 结构
- 更新 README TypeScript 示例，展示 `context.options` 用法
- 更新 README API 参考中 `NavigationContext` 的字段说明

## Capabilities

### New Capabilities

（无新增 capability）

### Modified Capabilities

- `NavigationContext` 接口：从展开字段模式重构为聚合 `options: NavigationOptions` 模式（public API 变更，现有中间件需适配）

## Impact

- `uni_modules/w-router/core/types.ts` — `NavigationContext` 接口重构 + JSDoc 注释
- `uni_modules/w-router/core/Router.ts` — `onRouteDataEventKey` JSDoc 注释 + `NavigationContext` 构建逻辑
- `uni_modules/w-router/readme.md` — 中间件示例、TypeScript 示例、API 参考
