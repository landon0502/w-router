# w-router 兼容 uni-app x（uvue）改造方案

> 适用范围：让 w-router（uni-app 类型安全路由插件）在 uni-app x（uvue）工程中可用。
> 相关分支：`feat/uvue-compat`
> 状态：**方案已确定，UTS 实现已落地于该分支，真机/全平台编译验证待做。**

---

## 1. 结论先行

**当前 w-router 无法在 uni-app x 的 App 端运行，需要新增一套 UTS 实现。**

原因链条：
1. uni-app x 的 App 端（Android/iOS/Harmony）**没有 JS 引擎**，业务代码只能用 UTS（`.uts`，编译成 Kotlin/Swift）；Web 与 MP-WEIXIN 端 UTS 会被编译成 JS。即 uni-app x 项目里**能被编译运行的源码必须是 `.uts`**（`main.uts` 只 import `.uvue`/`.uts`，没有任何 `.ts` 引用）。
2. w-router 当前是纯 TS 运行时，且用了一批 UTS 不支持/受限的 JS 特性（`Reflect.deleteProperty`、`WeakMap`、`Function.prototype.bind`、`import.meta.env`、对象索引签名、`void | Promise<void>` 联合返回等）。
3. `package.json` 虽然声明了 `uni-app-x` 平台、readme 也写了 "uni-app x ✅"，但这是**纸面支持**，代码实际跑不起来。

**推荐路线：保留现有 `core/*.ts`（服务 uni-app vue/nvue），新增 `utssdk/` 目录写一套 UTS 实现，通过 uni_modules 约定按项目类型自动解析入口，二者共享公开 API 语义。**

---

## 2. 背景与现状

- w-router 是"基于洋葱模型中间件的 uni-app 类型安全路由增强插件"，核心能力：`to/redirect/tab/launch/back` 五类导航、洋葱中间件拦截、`params`/`data` 页面间传参、`backOpenedPage` 回到已打开页、TabBar 自动识别。
- 当前实现为纯 TS，文件分布：`core/{Router,RouterEvents,RouteDataPipeline,Intercept,router.core,utils,guards,is,types}.ts` + 根目录 `index.ts`。
- uni-app x（uvue）是 DCloud 的"下一代 uni-app"，App 端基于 UTS（Kotlin/Swift）编译到原生。

---

## 3. 差距分析（现状 vs uvue 环境）

> 以下事实已对照本地 HBuilderX 内置 uni-app x 类型定义（`builtin-dts/uniappx`）与官方 hello-uni-app-x 示例工程核实。

### 3.1 页面实例形状不同（直接影响 `getPageId`/`RouteRecord`）

| 维度 | uni-app（vue/nvue） | uni-app x（uvue） |
| --- | --- | --- |
| `getCurrentPages()` 元素 | `{ route, $:{uid}, __wxWebviewId__, getOpenerEventChannel }` | `UniPage`：`route`、`options: UTSJSONObject`、`getPageStyle()`/`setPageStyle()` 等 |
| Vue 实例引用 | `page.$` | `page.$page`（类型上无 `uid` 暴露） |
| 事件通道 | `page.getOpenerEventChannel()` | 类型树里**不存在**（全量 grep 无此 API） |

**直接影响：**
- `getPageId()`（依赖 `page.$?.uid` / `__wxWebviewId__`）在 uvue 下无可用字段。
- `instance.getOpenerEventChannel?.()` 在 uvue 下恒为 `undefined` → `channel?.emit?.(...)` **静默 no-op**。即**非 Tab 页的 `params`/`data` 投递在 uvue 下会悄悄失效**，这是最隐蔽的坑。

### 3.2 uni.* API 差异

| API | uni-app x 表现 |
| --- | --- |
| `uni.navigateTo/redirectTo/reLaunch/switchTab/navigateBack` | ✅ 存在，返回 `Promise<T> \| null`，`success/fail/complete` 回调仍支持 |
| `uni.navigateTo({ events })` | ✅ 选项存在，但类型 `events?: any`，且 `EventChannel = {}` 是空类型，接收侧没有 `getOpenerEventChannel` |
| `uni.addInterceptor` | ✅ 存在（`interceptor.uvue` 示例 + `uni-stat` 插件都在用） |
| `uni.$emit/$on/$off` | ✅ 存在，`$emit(name, ...args: Array<any\|null>)`，`$on` 返回监听器 id（4.31+） |
| `onLoad(options)` | ✅ 拿到 URL query，`OnLoadOptions = { [key: string]: string \| null }`（纯字符串参数） |

**结论：uvue 下应完全放弃 EventChannel，统一走 `uni.$emit/$on` + pipeline 缓存**（即现有 Tab 页的机制），这条通路在 uvue 里是完整支持的。

### 3.3 UTS 语言限制对照（w-router 用到的特性）

| w-router 现状 | UTS 问题 | 改写方向 |
| --- | --- | --- |
| `Reflect.deleteProperty(options,'events'/'intercept')` | 无 `Reflect` | 不再 mutate 入参，构造转发副本 |
| `deepClone` 里的 `WeakMap`/`Object.getPrototypeOf`/`Object.create`/`Object.entries` | 均不支持 | 去掉深拷贝循环检测，改显式浅合并 |
| `deepMerge` 的 `instanceof Map/Set/Date/RegExp`、`Object.assign` | 受限 | 显式字段合并 |
| `dispatch.bind(null, i+1)`、`this.route = this.route.bind(this)` | 无 `bind` | 箭头函数闭包 |
| `import.meta.env.DEV/PRO` | 无 `import.meta.env` | `process.env.NODE_ENV` / 条件编译注入 |
| `NavigationOptions` 的 `[key: string]: unknown` 索引签名 | 强类型对象不支持 | class + `extra?: UTSJSONObject` |
| `RouteEvents` 索引签名 `[key:string]: cb` | 同上 | `Map<string, (data:any)=>void>` |
| `Middleware` 返回 `void \| Promise<void>` 联合 | UTS 不支持联合返回类型 | 拆分为同步/异步两个签名 |
| `for (const key in data)` 遍历对象 | 仅 UTSJSONObject/Map 支持 | `UTSJSONObject.keys()` + `getAny()` |
| `Array.prototype.findLastIndex` | UTS 数组没有 | 已有手写 `findLastIndex`，直接搬 |
| `?./??`、模板字符串、`Map`、`class`、泛型、async/await | ✅ 支持 | 保留 |

### 3.4 条件编译宏（多平台关键）

- uni-app x 项目里有效：`UNI-APP-X`、`APP-ANDROID`、`APP-IOS`、`APP-HARMONY`、`WEB`、`MP-WEIXIN`（见 hello-uni-app-x 的 `pages.json` 条件编译注释）。
- uni-app（非 x）项目里：`APP`/`APP-PLUS`/`APP-VUE`/`APP-NVUE`/`H5`/`MP-WEIXIN` 等。
- **宏按消费项目的类型解析**，因此插件源码里可用 `#ifdef UNI-APP-X` 与 `#ifndef UNI-APP-X` 区分两套行为。

---

## 4. 推荐方案

### 4.1 总体架构：TS / UTS 双实现，入口按项目自动解析

```text
uni_modules/w-router/
├── index.ts                 # 现有 uni-app 入口（vue/nvue，保持不动）
├── core/                    # 现有 TS 实现（保持不动）
│
└── utssdk/                  # ★ 新增：uni-app x（uvue）UTS 实现
    ├── index.uts            #   统一入口：export { Router, 常量, 类型 }
    ├── interface.uts        #   公共类型（等价 core/types.ts 的 UTS 版）
    ├── router.uts           #   Router 类（等价 Router.ts）
    ├── intercept.uts        #   洋葱中间件链（等价 Intercept.ts）
    ├── pipeline.uts         #   RouteDataPipeline（键=route 字符串）
    ├── events.uts           #   RouterEvents（键=route 字符串）
    ├── route-core.uts       #   底层 uni.* 封装（等价 router.core.ts）
    ├── utils.uts            #   getHistoryPage/pages/queryParams/合并
    └── guards.uts           #   类型守卫 + 环境判断
```

关键点：
1. **uni-app x 解析 `@/uni_modules/w-router` 时自动进入 `utssdk/`**（uni_modules 的 UTS 插件约定，hello-uni-app-x 里 `uts-dialogpage`/`uni-stat` 都是这个结构）。uni-app 项目继续走根目录 `index.ts`，**两套代码互不干扰**。
2. w-router 逻辑是纯 `uni.*` 调用 + 纯算法，**没有原生（Kotlin/Swift）代码**，所以**不需要**拆 `utssdk/app-android` + `app-ios` + `web` 多份平台实现——一份 `utssdk/index.uts` 即可全平台通用。
3. 纯函数部分与 TS 版保持同构（近乎逐行翻译），公开 API 语义（方法名、参数、常量 `onRouteParamsEventKey` 等）一致，文档只需一份。

### 4.2 六个关键设计决策

**决策 A：页面唯一标识改用 route 字符串**
- `getPageId()`（依赖 `$`/`__wxWebviewId__`）在 uvue 无可用字段。
- uvue 版用 `getPageKey()`：规范化 route 字符串（`/pages/xxx/xxx`），作为 `RouterEvents` 与 pipeline 的键。
- **平台隔离**：vue 侧保持 `getPageId()`（uid）不变，两套实现互不共享，避免 vue 侧同名多实例行为退化（见 §9.3）。

**决策 B：uvue 下参数/数据投递全部走 `uni.$emit/$on` + pipeline 缓存**
- `params`：保留"拼进 URL query"，uvue 的 `onLoad(options)` 直接能读（字符串参数）。
- `data`：不再走 EventChannel，改为 `uni.$emit(onRouteDataEventKey + "[" + url + "]", data)`；目标页用 `router.getPrevRouterDataCache()`（读 pipeline）或 `uni.$on` 监听。
- `back` 回传：`router.back({ params })` → `navigateBack` success → `routerEvents.invoke(目标route, 'onBack', params)`。

**决策 C：拦截器链适配 UTS**
- `dispatch.bind(null, i+1)` → 箭头函数闭包 `() => dispatch(i+1)`。
- `Middleware` 返回类型：UTS 不支持 `void | Promise<void>` 联合。
  - 主签名 `(context, next) => Promise<void>`；同步中间件用 `use(fn)` 包装为 Promise 版，异步用 `useAsync(fn)`，内部统一归一串行执行。
  - ⚠️ UTS 对"返回 void 的 lambda 赋给返回 Promise 的类型"的具体编译行为需真机验证，这是风险点。

**决策 D：选项对象不再 `Reflect.deleteProperty`**
- 剥离 `events`/`intercept` 改为显式构造转发给 `uni.*` 的选项副本（`withType()`），避免依赖删除属性，也天然隔离自定义字段。

**决策 E：环境判断**
- `import.meta.env.DEV/PRO` 在 uvue 不可用 → 用 `process.env.NODE_ENV` 判断（App 端行为需验证）。

**决策 F：类型体系按 UTS 强类型重写**
- `NavigationOptions`：显式接口 + `params?: any`、`data?: any`、`events?: Map | null`、`extra?: UTSJSONObject`。
- `RouteEvents` → `Map<string, (data:any)=>void>`。
- `params`/`data` 建议 `as UTSJSONObject`，满足 `uni.$emit` 的 `any` 入参。

---

## 5. 逐文件改造对照表

| 现有文件 | utssdk 对应 | 改造要点 |
| --- | --- | --- |
| `core/types.ts` | `interface.uts` | 索引签名→class/UTSJSONObject；`RouteRecord`→uvue 兼容形状；`Middleware`/`AsyncMiddleware` 拆分 |
| `core/Router.ts` | `router.uts` | 键改 route；`Reflect.deleteProperty` 去掉；事件通道分支改 `uni.$emit`；`addInterceptor('navigateBack')` 保留 |
| `core/Intercept.ts` | `intercept.uts` | 闭包替代 `bind`；`use()`/`useAsync()` 双入口 |
| `core/RouteDataPipeline.ts` | `pipeline.uts` | `Map<string, ctx>`，键=route |
| `core/RouterEvents.ts` | `events.uts` | 键 `number`→`string` |
| `core/router.core.ts` | `route-core.uts` | `deepMerge`→显式字段归一化；`queryParams` 用 `UTSJSONObject.keys` 重写；不透传 events |
| `core/utils.ts` | `utils.uts` | 去 WeakMap/原型反射；`getPageId`→`getPageKey` |
| `core/is.ts` | `guards.uts` | `import.meta.env`→`process.env.NODE_ENV` |
| `core/guards.ts` | `guards.uts` | `is` 守卫→`instanceof`/`Array.isArray`；`findLastIndex`/`isEmpty` 直译 |
| `index.ts` | `index.uts` | 导出 `Router`、三个事件常量、工具、类型 |

---

## 6. 消费者侧（uvue 项目）用法

```typescript
// 某 uvue 页面 <script lang="uts">
import { Router } from '@/uni_modules/w-router'
import type { NavigationOptions } from '@/uni_modules/w-router'

const router = new Router({ tabbarPaths: ['/pages/home/home'] as string[] })

router.to({
  url: '/pages/detail/detail',
  params: { id: '123' } as UTSJSONObject,
  data: { token: 'secret' } as UTSJSONObject,
})

// 目标页接收：onShow 中读取 pipeline 缓存
const cache = router.getPrevRouterDataCache()
```

- import 路径不变（`@/uni_modules/w-router`），编译器自动解析到 `utssdk/`。
- **UTS 强类型约束**：对象字面量传参需要 `as UTSJSONObject`（或 `JSON.parse(JSON.stringify(...))`）；`events.onBack` 回调参数显式标类型。
- 接收侧：`onLoad(options)` 读 URL query；`onShow()` 里 `router.getPrevRouterDataCache()` 读 pipeline；推送就 `uni.$on('onRouteData[/pages/xxx]', cb)`。
- 中间件：同步用 `router.interceptor.use(fn)`，异步用 `useAsync(fn)`（`await next()`）。

---

## 7. 验证方案

1. **建一个 uni-app x demo**（可基于本地 `hello-uni-app-x` 或新建工程），把 `utssdk/` 挂进 `uni_modules/w-router`。
2. 逐能力验证：`to/redirect/tab/launch/back`、`params`/`data` 传参、`back` 回传 `onBack`、Tab 页 `uni.$on` 接收、中间件链（同步 + 异步 + 阻止导航）、`backOpenedPage`、`notIntercept`、`addInterceptor('navigateBack')` 的 pipeline 清理。
3. **逐平台编译**：`app-android`（首要，Kotlin）、`app-ios`（Swift）、`web`、`mp-weixin`。
4. 类型层面用 HBuilderX 的 UTS 语法校验（hello-uni-app-x 里大量 `@ts-ignore` + `as` 的写法就是 UTS 编译风格参考）。

---

## 8. 工作量、风险与待确认项

| 事项 | 说明 |
| --- | --- |
| 工作量 | 约 1 个全职 3–5 天：`utssdk` 移植 + demo + 全平台编译。UTS 版与 TS 版同构，纯翻译为主 |
| 风险① | UTS 对 `Middleware` 返回 `Promise<void>` vs 同步 `void` 的兼容行为，需真机验证（决策 C） |
| 风险② | uvue 下 `events.onBack` 依赖 route 字符串键，同名多实例时可能错收（决策 A 的已知局限） |
| 待确认 | `dcloudext.type: "sdk-js"` 在 uni-app x 下是否需要改为 `"uts"`（hello-uni-app-x 插件全是 `"uts"`），需对照 DCloud 插件市场规范 |
| 待确认 | uvue 是否提供稳定 page id（如 `page.pageId`/`$nativePage`），能拿到就替代 route 字符串做键，规避同名多实例问题 |
| 文档 | readme 平台表、changelog、`package.json` 平台声明需同步修正 |

### UTS 语法风险点（编译时重点确认）

| 位置 | 写法 | 风险 |
| --- | --- | --- |
| `interface.uts` | 字符串枚举 `NavigateType` | UTS 字符串枚举语法 |
| `intercept.uts` | `dispatch` 闭包自引用 + 捕获可变 `index` | UTS→Kotlin 闭包捕获 |
| `router.uts` | `this.interceptor.execute(...)` 未 await（fire-and-forget） | UTS 对未处理 Promise 的告警/编译行为 |
| `route-core.uts` | `success: ((result:any)=>void)` 传入 `NavigateToOptions` | 函数参数逆变 |
| `guards.uts` | 正则字面量 + `String.match` | UTS RegExp 支持度 |
| `guards.uts` | `process.env.NODE_ENV` | App 端无 process |

---

## 9. 对常规 uni-app 项目的兼容性影响

### 9.1 零影响机制

**uni-app（vue）和 uni-app x（uvue）是两套独立的编译链，永远不会同时编译同一个工程。**
- uni-app x 项目的 App 端只编译 `.uts`/`.uvue`；uni-app（vue）项目只编译 `.vue`/`.ts`/`.js`。`.uts` 文件放在 vue 项目里，只要不在 import graph 上，就是**惰性文件**，不会被打包、不会被解析。
- 方案里 uvue 逻辑全部隔离在新增的 `utssdk/` 目录，现有 `core/*.ts` 与根目录 `index.ts` **不动**。
- 因此 vue 项目更新插件后，只是 `uni_modules/w-router/` 里多了一个从不被 import 的 `utssdk/` 文件夹，其余一切照旧。

### 9.2 必须守住的四条边界

| # | 边界 | 否则会怎样 |
| --- | --- | --- |
| 1 | **不改 `index.ts` 的导出面**（`Router`、三个事件常量、`getPageId` 等工具、所有类型）原样保留 | 现有 `import { Router } from '@/uni_modules/w-router'` 全部报错 |
| 2 | **不改 `package.json` 的 `dcloudext.type: "sdk-js"`**，`uni_modules.platforms` 也保持不动 | uni-app（vue）插件系统靠此字段识别插件类型，改动会破坏 vue 项目加载/提示 |
| 3 | **不在共享 TS 文件里加任何 `#ifdef UNI-APP-X` 分支**，平台差异全部收进 `utssdk/` | 共享文件的 `#ifdef` 在 vue 编译时按 vue 宏规则裁剪，可能误删/误留代码 |
| 4 | **不改 vue 侧任何运行时行为**，哪怕是等价重构（如 `Reflect.deleteProperty` → 构造副本），TS 侧先保持原样 | 等价重构理论上无感，但"不动"是最低风险，等 uvue 版验证后再回头统一 |

### 9.3 已修正的决策（重要）

上一版方案曾建议"`RouterEvents` 键统一改为 route 字符串"，**这对 vue 项目有行为变更，已撤回**：
- vue 侧现状用 `page.$?.uid`（或微信 `__wxWebviewId__`），是**实例级**唯一标识。
- 若统一改成 route 字符串，出现 `navigateTo` **同一路由压栈两次**时，`back` 回传 `onBack` 可能投递到错误的页面实例——行为退化。
- **修正为平台隔离策略**：vue/nvue 侧保持 `getPageId()`（uid）不动；uvue 侧 `utssdk/` 用 `getPageKey()`（route 字符串）。两套 `RouterEvents` 各自用各自的键，互不共享。

### 9.4 遗留风险与边界

1. **"uni-app x 自动解析 `utssdk/`" 尚未在真实项目验证**——唯一可能返工的点。改造第一步应做"最小探测"：空壳 `utssdk/index.uts` 挂进 hello-uni-app-x，跑一次 app-android 编译，先验证入口解析，再投入全部移植。
2. 新增 `utssdk/` 目录可能被个别项目的 ESLint/CI 全量扫描误报（极低概率）→ lint 配置排除 `uni_modules`。
3. 两套实现会"漂移"（维护成本，非兼容破坏）→ 双端共用行为文档/验收清单；`changelog` 标注改动落在哪一侧。
4. **迁移成本 ≠ 兼容破坏**：对现有 vue 项目零影响；但对想把代码迁到 uni-app x 的项目，接收方写法要变（uvue 无 `getOpenerEventChannel`，改用 `getPrevRouterDataCache()` 或 `uni.$on`），这是新平台的适配成本。

### 9.5 双端回归验证

| 端 | 验证方式 |
| --- | --- |
| 常规 vue/nvue | 现有仓库本身就是 uni-app demo，跑 `H5` + `微信小程序`（条件允许再加 App），确认**零回归**（改动理论上为零，跑一遍是保险） |
| uni-app x | 新工程挂 `utssdk/`，逐能力验证（见 §7），并作为入口解析的探测场 |

---

## 10. 实现状态（分支 `feat/uvue-compat`）

- ✅ `utssdk/` 全部 9 个 UTS 文件已实现并提交（commit `7dffa22`）。
- ✅ `docs/uvue-compat.md`（本文件）+ readme 增补 uni-app x 支持说明。
- ✅ 兼容性边界：未改动 `core/*.ts`、根目录 `index.ts`、`package.json`。
- ⏳ 待做：真机/全平台编译验证（§7）、入口解析最小探测（§9.4）、按编译报错迭代修复（§8 风险点）。

---

## 参考来源

- [uni-app x 官方文档 · 路由 API（navigateTo/EventChannel）](https://uniapp.dcloud.io/api/router.html)
- [uni-app x · getCurrentPages](https://en.uniapp.dcloud.io/uni-app-x/api/getcurrentpages.html)
- [UTS 与 TS 的差异](https://doc.dcloud.net.cn/uni-app-x/uts/uts_diff_ts.html)
- [UTS 介绍（编译器/数据类型）](https://doc.dcloud.net.cn/uni-app-x/uts/)
- [hello-uni-app-x 示例工程](https://github.com/dcloudio/hello-uni-app-x)
- 本地核实：`/Applications/HBuilderX.app/.../builtin-dts/uniappx/`（`UniPage.d.ts`、`page.d.ts`、`uni-route`/`uni-event`/`uni-interceptor` 类型）、`~/Documents/HBuilderProjects/hello-uni-app-x`
