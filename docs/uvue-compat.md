# w-router 兼容 uni-app x（uvue）改造设计

> 分支：`feat/uvue-compat`
> 状态：实现完成，**待 uni-app x 真机/全平台编译验证**

## 1. 背景

uni-app x 的 App 端（Android/iOS/Harmony）没有 JS 引擎，业务代码必须用 UTS（`.uts`，编译为 Kotlin/Swift）。w-router 原实现是纯 TS，且依赖 `Reflect.deleteProperty`、`WeakMap`、`Function.prototype.bind`、`import.meta.env`、对象索引签名等 UTS 不支持的 JS 特性，无法在 uni-app x 运行。

## 2. 方案：双实现 + `utssdk/` 目录

保留现有 `core/*.ts`（服务 uni-app vue/nvue），新增 `utssdk/` 目录作为 uni-app x 的 UTS 实现。两者通过 uni_modules 约定按项目类型自动解析入口，互不干扰。

```text
uni_modules/w-router/
├── index.ts            # uni-app（vue/nvue）入口（未改动）
├── core/               # vue/nvue 实现（未改动）
└── utssdk/             # ★ uni-app x（uvue）UTS 实现（本分支新增）
    ├── index.uts
    ├── interface.uts
    ├── guards.uts
    ├── utils.uts
    ├── pipeline.uts
    ├── events.uts
    ├── intercept.uts
    ├── route-core.uts
    └── router.uts
```

对应关系：

| vue 实现 | utssdk 实现 | 核心差异 |
| --- | --- | --- |
| `core/types.ts` | `interface.uts` | 索引签名 → Map / UTSJSONObject |
| `core/guards.ts` + `core/is.ts` | `guards.uts` | `is` → instanceof；`import.meta.env` → `process.env.NODE_ENV` |
| `core/utils.ts` | `utils.uts` | 删除 WeakMap/原型反射；页面标识改用 route 字符串 |
| `core/RouteDataPipeline.ts` | `pipeline.uts` | 键 = route 字符串 |
| `core/RouterEvents.ts` | `events.uts` | 键 = route 字符串 |
| `core/Intercept.ts` | `intercept.uts` | `bind` → 闭包；同步/异步中间件拆分 |
| `core/router.core.ts` | `route-core.uts` | deepMerge → 显式字段归一化；不透传 events |
| `core/Router.ts` | `router.uts` | EventChannel → `uni.$emit` + pipeline |

## 3. 关键设计决策

1. **页面事件标识统一为 route 字符串**（`getPageKey`）。uvue 页面实例（`UniPage`）没有 `$:{uid}`/`__wxWebviewId__`。
   - 已知局限：同一 route 在栈中多实例时，`onBack` 可能定位到最后一个匹配实例。
   - vue 侧保持 `getPageId()`（uid）不变，两套实现互不共享。

2. **uvue 下传参/数据投递统一走 `uni.$emit` 作用域事件 + pipeline 缓存**。
   uni-app x 没有 `page.getOpenerEventChannel`，EventChannel 类型为空（`EventChannel = {}`），vue 版的 event channel 分支在 uvue 会静默失效，故整体改用 Tab 页已有的 `uni.$emit` 机制。

3. **同步/异步中间件拆分**：UTS 不支持 `void | Promise<void>` 联合返回。
   - `use(fn)`：同步中间件，`next: () => void`。
   - `useAsync(fn)`：异步中间件，`next: () => Promise<void>`，需 `await next()` / `return next()` 保持洋葱顺序。
   - 内部统一归一为 `AsyncMiddleware` 串行执行。

4. **不再 mutate 入参**：`Reflect.deleteProperty(options, 'events'/'intercept')` 改为 `withType()` 显式构造副本；`openPage` 只透传 `uni.*` 支持的字段，天然隔离自定义字段。

5. **deepMerge/deepClone 不移植**：`route-core.toRouteConfig` 用显式字段归一化替代（弱化 params 数组的 arrayFormat 多样性，数组以逗号连接）。

## 4. uvue 版与 vue 版 API 差异

| 维度 | vue 版 | uvue 版 |
| --- | --- | --- |
| 页面事件标识 | `getPageId()` | `getPageKey()`（route 字符串） |
| 中间件注册 | `use()` 单一入口 | `use()`（同步）+ `useAsync()`（异步） |
| `notIntercept` | `boolean \| (() => boolean)` | 仅 `boolean` |
| 对象传参 | 普通对象 | `as UTSJSONObject` |
| `events` | 对象 `{ onBack, [k]: cb }` | `Map<string, (data:any)=>void>` |
| 环境判断 | `import.meta.env` | `process.env.NODE_ENV`（App 端需验证） |
| 页面间投递 | EventChannel / `uni.$emit` | 统一 `uni.$emit` + pipeline |

## 5. 待验证清单（真机/全平台编译）

- [ ] `utssdk/index.uts` 作为 uni-app x 项目解析 `@/uni_modules/w-router` 的入口是否生效
- [ ] App-Android（Kotlin）编译通过
- [ ] App-iOS（Swift）编译通过
- [ ] Web / MP-WEIXIN 编译通过
- [ ] `to/redirect/tab/launch/back` 五类导航
- [ ] `params` URL 传参 + `getPrevRouterDataCache()` 读取
- [ ] `data` 隐式传参（`uni.$on` 接收 + pipeline 读取）
- [ ] `back({ params })` + `events.onBack` 回传
- [ ] 中间件链：同步 `use`、异步 `useAsync`、阻止导航、`notIntercept`、单次 `intercept`
- [ ] `backOpenedPage`
- [ ] `uni.addInterceptor('navigateBack', ...)` 的 pipeline 清理
- [ ] Tab 页 `uni.$on` 监听作用域事件
- [ ] 同名路由多实例时 `onBack` 定位（记录预期行为）

## 6. UTS 语法风险点（编译时重点确认）

| 位置 | 写法 | 风险 |
| --- | --- | --- |
| `interface.uts` | 字符串枚举 `NavigateType` | UTS 字符串枚举语法 |
| `intercept.uts` | `dispatch` 闭包自引用 + 捕获可变 `index` | UTS→Kotlin 闭包捕获 |
| `router.uts` | `this.interceptor.execute(...)` 未 await（fire-and-forget） | UTS 对未处理 Promise 的告警/编译行为 |
| `route-core.uts` | `success: ((result:any)=>void)` 传入 `NavigateToOptions` | 函数参数逆变 |
| `guards.uts` | 正则字面量 + `String.match` | UTS RegExp 支持度 |
| `guards.uts` | `process.env.NODE_ENV` | App 端无 process |

## 7. 兼容性边界（对 uni-app vue/nvue 项目）

- 未改动 `core/*.ts`、根目录 `index.ts`、`package.json`（含 `dcloudext.type: "sdk-js"`）。
- `utssdk/` 仅在 uni-app x 项目中被编译，vue 项目编译时惰性存在，不影响打包。
- 消费者 import 路径不变：`@/uni_modules/w-router`。
