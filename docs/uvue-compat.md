# w-router 兼容 uni-app x（uvue）改造方案

> 适用范围：让 w-router（uni-app 类型安全路由插件）在 uni-app x（uvue）工程中真正可运行。
> 相关分支：`feat/uvue-compat`
> 状态：**方案定稿，待评审，未开始编码**。
> 前情：`7dffa22` 曾提交一版 `utssdk/` UTS 实现、`d68999a` 提交旧版方案文档，二者已在工作区删除（未提交删除）。本文档为基于当前 `core/*.ts` 代码重写的定稿方案，结论与旧版大体一致，但补全了仓库现状、评审决策点与验证前置条件。

---

## 1. 结论先行

**当前 w-router 无法在 uni-app x 的 App 端运行，必须新增一套 UTS 实现。**

原因链条：
1. uni-app x 的 App 端（Android/iOS/Harmony）**没有 JS 引擎**，业务代码只能用 UTS（`.uts`，编译成 Kotlin/Swift）；Web 与 MP-WEIXIN 端 UTS 会被编译成 JS。即 uni-app x 项目里**能被编译运行的源码必须是 `.uts`**（`main.uts` 只 import `.uvue`/`.uts`，没有任何 `.ts` 引用）。
2. w-router 当前是纯 TS 运行时，且用了一批 UTS 不支持/受限的 JS 特性（`Reflect.deleteProperty`、`WeakMap`、`Function.prototype.bind`、`import.meta.env`、对象索引签名、`void | Promise<void>` 联合返回等），见 §3.3。
3. `package.json` 声明了 `uni-app-x ^4.0`、readme 也写了 "uni-app x ✅" 并引用 `utssdk/`，但**当前仓库里没有 utssdk 代码**——声明与实现不一致，是"纸面支持"。

**推荐路线：保留现有 `core/*.ts`（服务 uni-app vue/nvue，零影响），新增 `utssdk/` 目录写一套 UTS 实现**，通过 uni_modules 约定按项目类型自动解析入口，二者共享公开 API 语义。这是 hello-uni-app-x 生态插件（`uts-dialogpage`、`uni-stat`）的标准结构。

---

## 2. 背景与现状

- w-router 是"基于洋葱模型中间件的 uni-app 类型安全路由增强插件"，核心能力：`to/redirect/tab/launch/back` 五类导航、洋葱中间件拦截、`params`/`data` 页面间传参、`backOpenedPage` 回到已打开页、TabBar 自动识别。
- 当前实现为纯 TS，文件分布：`core/{Router,RouterEvents,RouteDataPipeline,Intercept,router.core,utils,guards,is,types}.ts` + 根目录 `index.ts`。
- uni-app x（uvue）是 DCloud 的"下一代 uni-app"，App 端基于 UTS（Kotlin/Swift）编译到原生。
- 仓库现状不一致点（本次改造需一并修正）：
  - `package.json` `engines` 声明 `uni-app-x ^4.0`，`uni_modules.platforms` 列出 `uni-app-x` 各平台，但无对应实现。
  - `readme.md` §平台兼容性 与 §uni-app x（uvue）支持 引用了 `utssdk/` 目录，当前不存在。

---

## 3. 差距分析（现状 vs uvue 环境）

> 本节事实已对照本地 HBuilderX 内置 uni-app x 类型定义（`builtin-dts/uniappx`）与官方 hello-uni-app-x 示例工程核实；其中标注"需验证"的项，在 demo 阶段二次确认。

### 3.1 页面实例形状不同（直接影响 `getPageId`/`RouteRecord`）

| 维度 | uni-app（vue/nvue） | uni-app x（uvue） |
| --- | --- | --- |
| `getCurrentPages()` 元素 | `{ route, $:{uid}, __wxWebviewId__, getOpenerEventChannel }` | `UniPage`：`route`、`options: UTSJSONObject`、`getPageStyle()`/`setPageStyle()` 等 |
| Vue 实例引用 | `page.$` | `page.$page`（类型上无 `uid` 暴露） |
| 事件通道 | `page.getOpenerEventChannel()` | 类型树里**不存在**（全量 grep 无此 API） |

**直接影响：**
- `getPageId()`（`core/utils.ts` 依赖 `page.$?.uid` / `__wxWebviewId__`）在 uvue 下无可用字段。
- `instance.getOpenerEventChannel?.()` 在 uvue 下恒为 `undefined` → `channel?.emit?.(...)` **静默 no-op**。即**非 Tab 页的 `params`/`data` 投递在 uvue 下会悄悄失效**，这是最隐蔽的坑。

### 3.2 uni.* API 差异

| API | uni-app x 表现 |
| --- | --- |
| `uni.navigateTo/redirectTo/reLaunch/switchTab/navigateBack` | ✅ 存在，返回 `Promise<T> \| null`，`success/fail/complete` 回调仍支持 |
| `uni.navigateTo({ events })` | ✅ 选项存在，但类型 `events?: any`，且 `EventChannel = {}` 是空类型，接收侧没有 `getOpenerEventChannel` |
| `uni.addInterceptor` | ✅ 存在（`interceptor.uvue` 示例 + `uni-stat` 插件都在用） |
| `uni.$emit/$on/$off` | ✅ 存在，`$emit(name, ...args: Array<any\|null>)`，`$on` 返回监听器 id |
| `onLoad(options)` | ✅ 拿到 URL query，`OnLoadOptions = { [key: string]: string \| null }`（纯字符串参数） |

**结论：uvue 下应完全放弃 EventChannel，统一走 `uni.$emit/$on` + pipeline 缓存**（即现有 Tab 页的机制），这条通路在 uvue 里是完整支持的。

### 3.3 UTS 语言限制对照（w-router 用到的特性）

| w-router 现状 | UTS 问题 | 改写方向 |
| --- | --- | --- |
| `Reflect.deleteProperty(options,'events'/'intercept')`（`core/Router.ts`） | 无 `Reflect` | 不再 mutate 入参，构造转发副本 |
| `deepClone` 里的 `WeakMap`/`Object.getPrototypeOf`/`Object.create`/`Object.entries`（`core/utils.ts`） | 均不支持 | 去掉深拷贝循环检测，改显式浅合并 |
| `deepMerge` 的 `instanceof Map/Set/Date/RegExp`、`Object.assign`（`core/utils.ts`） | 受限 | 显式字段合并 |
| `dispatch.bind(null, i+1)`、`this.route = this.route.bind(this)`（`core/Intercept.ts`、`core/router.core.ts`） | 无 `bind` | 箭头函数闭包 |
| `import.meta.env.DEV/PRO`（`core/is.ts`） | 无 `import.meta.env` | `process.env.NODE_ENV` / 条件编译注入 |
| `NavigationOptions` 的 `[key: string]: unknown` 索引签名（`core/types.ts`） | 强类型对象不支持 | class + `extra?: UTSJSONObject` |
| `RouteEvents` 索引签名 `[key:string]: cb`（`core/types.ts`） | 同上 | `Map<string, (data:any)=>void>` |
| `Middleware` 返回 `void \| Promise<void>` 联合（`core/Intercept.ts`） | UTS 不支持联合返回类型 | 拆分为同步/异步两个签名 |
| `for (const key in data)` 遍历对象（`core/utils.ts` queryParams） | 仅 UTSJSONObject/Map 支持 | `UTSJSONObject.keys()` + `getAny()` |
| `Array.prototype.findLastIndex` | UTS 数组没有 | 已有手写 `findLastIndex`，直接搬 |
| `Object.keys` 遍历（`core/guards.ts` isEmpty） | 受限 | 数组/显式遍历 |
| `?./??`、模板字符串、`Map`、`class`、泛型、async/await | ✅ 支持 | 保留 |

### 3.4 条件编译宏（多平台关键）

- uni-app x 项目里有效：`UNI-APP-X`、`APP-ANDROID`、`APP-IOS`、`APP-HARMONY`、`WEB`、`MP-WEIXIN`（见 hello-uni-app-x 的 `pages.json` 条件编译注释）。
- uni-app（非 x）项目里：`APP`/`APP-PLUS`/`APP-VUE`/`APP-NVUE`/`H5`/`MP-WEIXIN` 等。
- **宏按消费项目的类型解析**，因此插件源码里可用 `#ifdef UNI-APP-X` 与 `#ifndef UNI-APP-X` 区分两套行为。

### 3.5 可复用的地基（UTS 版直接站上去的部分）

`getCurrentPages()` 的路由字符串、`uni.navigateTo/redirectTo/switchTab/reLaunch/navigateBack`、`uni.addInterceptor`、`uni.$emit/$on`、`onLoad(options)` 读 URL query——**在 uvue 下均完整支持**。UTS 版不是从零写，是"平移 + 改写 §3.3 里那批受限写法"。

---

## 4. 技术路线选型

| | 路线 A：双实现（TS core + UTS utssdk） | 路线 B：单套 `.uts` + 条件编译 |
| --- | --- | --- |
| 对老项目影响 | 零（`core/*.ts` 完全不动） | uni-app 老项目也要走 `.uts`（需 HBuilderX 4.x+，老编译器不支持） |
| 维护成本 | 两套，约 2× | 一套，但 `#ifdef UNI-APP-X` 分支块多 |
| 入口解析 | uni_modules 自动解析 `utssdk/` | 同一份 `.uts` 按消费项目类型解析宏 |
| 生态惯例 | hello-uni-app-x 插件都是这个结构 | 少见 |
| 与已有提交的关系 | 可直接复用 `7dffa22` 那版 | 需推倒重写 core |
| 主要风险 | 两套语义需保持一致 | 老项目编译兼容性、类型体验降级 |

**推荐路线 A。** 理由：对现有 uni-app 用户零风险，符合插件生态惯例，且 git 历史已有半成品可复用。

---

## 5. 目标结构

```text
uni_modules/w-router/
├── index.ts                 # 现有 uni-app 入口（vue/nvue，保持不动）
├── core/                    # 现有 TS 实现（保持不动）
│
└── utssdk/                  # ★ 新增：uni-app x（uvue）UTS 实现
    ├── index.uts            #   统一入口：export { Router, 常量, 类型 }
    ├── interface.uts        #   公共类型（等价 core/types.ts 的 UTS 版）
    ├── router.uts           #   Router 类（等价 core/Router.ts）
    ├── intercept.uts        #   洋葱中间件链（等价 core/Intercept.ts）
    ├── pipeline.uts         #   RouteDataPipeline（键=route 字符串）
    ├── events.uts           #   RouterEvents（键=route 字符串）
    ├── route-core.uts       #   底层 uni.* 封装（等价 core/router.core.ts）
    ├── utils.uts            #   getHistoryPage/pages/queryParams/合并
    └── guards.uts           #   类型守卫 + 环境判断
```

关键点：
1. **uni-app x 解析 `@/uni_modules/w-router` 时自动进入 `utssdk/`**（uni_modules 的 UTS 插件约定）。uni-app 项目继续走根目录 `index.ts`，**两套代码互不干扰**。
2. w-router 逻辑是纯 `uni.*` 调用 + 纯算法，**没有原生（Kotlin/Swift）代码**，所以**不需要**拆 `utssdk/app-android` + `app-ios` + `web` 多份平台实现——一份 `utssdk/index.uts` 即可全平台通用。
3. 纯函数部分与 TS 版保持同构（近乎逐行翻译），公开 API 语义（方法名、参数、常量 `onRouteParamsEventKey` 等）一致，文档只需一份。

---

## 6. 六个关键设计决策

**决策 A：页面唯一标识改用 route 字符串**
- `getPageId()`（依赖 `$`/`__wxWebviewId__`）在 uvue 无可用字段。
- uvue 版用 `getPageKey()`：规范化 route 字符串（`/pages/xxx/xxx`），作为 `RouterEvents` 与 pipeline 的键。
- **平台隔离**：vue 侧保持 `getPageId()`（uid）不变，两套实现互不共享，避免 vue 侧同名多实例行为退化。

**决策 B：uvue 下参数/数据投递全部走 `uni.$emit/$on` + pipeline 缓存**
- `params`：保留"拼进 URL query"，uvue 的 `onLoad(options)` 直接能读（字符串参数）。
- `data`：不再走 EventChannel，改为 `uni.$emit(onRouteDataEventKey + "[" + url + "]", data)`；目标页用 `router.getPrevRouterDataCache()`（读 pipeline）或 `uni.$on` 监听。
- `back` 回传：`router.back({ params })` → `navigateBack` success → `routerEvents.invoke(目标route, 'onBack', params)`。

**决策 C：拦截器链适配 UTS**
- `dispatch.bind(null, i+1)` → 箭头函数闭包 `() => dispatch(i+1)`。
- `Middleware` 返回类型：UTS 不支持 `void | Promise<void>` 联合。
  - 主签名 `(context, next) => Promise<void>`；同步中间件用 `use(fn)` 包装为 Promise 版，异步用 `useAsync(fn)`，内部统一归一串行执行。
  - ⚠️ **UTS 对"返回 void 的 lambda 赋给返回 Promise 的类型"的具体编译行为需真机验证，这是 top-1 风险点。**

**决策 D：选项对象不再 `Reflect.deleteProperty`**
- 剥离 `events`/`intercept` 改为显式构造转发给 `uni.*` 的选项副本，避免依赖删除属性，也天然隔离自定义字段。

**决策 E：环境判断**
- `import.meta.env.DEV/PRO` 在 uvue 不可用 → 用 `process.env.NODE_ENV` 判断（App 端行为需验证）。

**决策 F：类型体系按 UTS 强类型重写**
- `NavigationOptions`：显式接口 + `params?: any`、`data?: any`、`events?: Map | null`、`extra?: UTSJSONObject`。
- `RouteEvents` → `Map<string, (data:any)=>void>`。
- `params`/`data` 建议 `as UTSJSONObject`，满足 `uni.$emit` 的 `any` 入参。

---

## 7. 逐文件改造对照表

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

## 8. 消费者侧（uvue 项目）用法

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

## 9. 验证方案

1. **建一个 uni-app x demo**（可基于本地 `hello-uni-app-x` 或新建工程），把 `utssdk/` 挂进 `uni_modules/w-router`。
2. 逐能力验证：`to/redirect/tab/launch/back`、`params`/`data` 传参、`back` 回传 `onBack`、Tab 页 `uni.$on` 接收、中间件链（同步 + 异步 + 阻止导航）、`backOpenedPage`、`notIntercept`、`addInterceptor('navigateBack')` 的 pipeline 清理。
3. **逐平台编译**：`app-android`（首要，Kotlin）、`app-ios`（Swift）、`web`、`mp-weixin`。
4. 类型层面用 HBuilderX 的 UTS 语法校验（hello-uni-app-x 里大量 `@ts-ignore` + `as` 的写法就是 UTS 编译风格参考）。

---

## 10. 工作量、风险与待确认项

| 事项 | 说明 |
| --- | --- |
| 工作量 | 复用 `7dffa22` 旧实现精修约 2–3 天；从零写约 3–5 天。UTS 版与 TS 版同构，纯翻译为主 |
| 风险① | UTS 对 `Middleware` 返回 `Promise<void>` vs 同步 `void` 的兼容行为，需真机验证（决策 C） |
| 风险② | uvue 下 `events.onBack` 依赖 route 字符串键，同名多实例时可能错收（决策 A 的已知局限） |
| 待确认 | `dcloudext.type: "sdk-js"` 在 uni-app x 下是否需要改为 `"uts"`（hello-uni-app-x 插件全是 `"uts"`），需对照 DCloud 插件市场规范 |
| 待确认 | uvue 是否提供稳定 page id（如 `page.pageId`/`$nativePage`），能拿到就替代 route 字符串做键，规避同名多实例问题 |
| 收尾 | readme 平台表、changelog、`package.json` 平台声明需与实现同步修正（当前声明超前于实现） |

---

## 11. 评审决策点（评审通过后进入编码）

以下需在编码前确认：

1. **路线确认**：是否采纳路线 A（双实现）？若否，评估 §4 路线 B。
2. **旧实现处理**：是否从 `7dffa22` 恢复 `utssdk/` 精修，还是从零重写？（推荐恢复精修）
3. **`dcloudext.type`**：是否需要 `"sdk-js"` → `"uts"`（对照插件市场规范后确认）。
4. **page id 替代方案**：能否拿到 uvue 稳定 page id（决策 A 的局限是否可解除）。
5. **demo 前置**：是否有现成 uni-app x 工程可用来做 §9 的验证（无则需先建）。
