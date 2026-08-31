# w-router · 路由增强

基于洋葱模型中间件的 uni-app 类型安全路由增强插件。

## 功能特点

- 🧅 **洋葱模型中间件** — 支持全局拦截器和单次导航拦截器，轻松实现鉴权守卫、日志埋点等
- 🔀 **多种导航方式** — `to` / `redirect` / `tab` / `launch` / `back` 全覆盖
- 📦 **页面间传参** — 统一的 `params` 机制 + 隐式 `data` 通道，支持正向传递和 `back` 回传
- 🏷️ **TabBar 自动识别** — 配置 `tabbarPaths` 后自动区分 TabBar 页面通信方式
- 🔙 **回到已打开页面** — `backOpenedPage` 避免重复压入同一页面
- 🛡️ **完整 TypeScript 支持** — 严格模式、零 `any`、完整类型导出

## 平台兼容性

| 平台 | 支持情况 |
| --- | --- |
| Vue 2 | ✅ |
| Vue 3 | ✅ |
| H5 (Web) | ✅ |
| App (Android / iOS / Harmony) | ✅ |
| 微信小程序 | ✅ |
| 支付宝小程序 | ✅ |
| 字节跳动小程序 | ✅ |
| 百度小程序 | ✅ |
| 快手小程序 | ✅ |
| QQ 小程序 | ✅ |
| nvue | ✅ |
| uni-app x | ✅ |

## 安装

本插件遵循 uni_modules 规范。将 `uni_modules/w-router/` 目录复制到 uni-app 项目的 `uni_modules/` 文件夹即可。

## 快速开始

```typescript
import { Router } from '@/uni_modules/w-router'

const router = new Router()

// 基础导航
router.to({ url: '/pages/xxx/xxx' })          // 跳转到新页面（压入页面栈）
router.back()                                   // 返回上一页（delta 默认为 1）
router.back({ delta: 2 })                       // 返回上两页
router.redirect({ url: '/pages/xxx/xxx' })      // 替换当前页面
router.tab({ url: '/pages/xxx/xxx' })           // 切换到 TabBar 页面
router.launch({ url: '/pages/xxx/xxx' })        // 关闭所有页面，打开新页面
```

## 路由参数 (`params`)

`params` 是页面间传递数据的**统一机制**，支持所有导航类型——
`to`、`redirect`、`tab`、`launch` 以及 `back`。

> **注意：** `params` 会被拼接到目标页面的 URL query 参数中，因此会暴露在地址栏上。
> 如果需要传递**不希望在 URL 上展示**的数据，请使用下方的 `data` 通道。

```typescript
// 向目标页面传递参数（适用于 to、tab、redirect、launch）
router.to({ url: '/pages/xxx/xxx', params: { id: 1, name: 'hello' } })
// 实际跳转 URL: /pages/xxx/xxx?id=1&name=hello

// 在目标页面通过 getPrevRouterDataCache() 获取参数
const cache = router.getPrevRouterDataCache()
console.log(cache?.params) // { id: 1, name: 'hello' }

// 也可以通过 onLoad 的 query 参数获取
onLoad((options) => {
  // ... 访问路由 query 参数
})

// 通过 router.back() 回传参数
router.back({ params: { updated: true } })

// 通过 events.onBack 接收返回参数
router.to({
  url: '/pages/xxx/xxx',
  events: {
    onBack(params) {
      console.log('收到返回参数:', params)
    }
  }
})
```

## 隐式数据通道 (`data`)

`data` 是与 `params` 并行的**隐式传参通道**，适用于传递不希望在 URL 上暴露的数据。
与 `params` 的核心区别：

| 维度 | `params` | `data` |
| --- | --- | --- |
| URL 展示 | ✅ 会拼接到 URL query 上 | ❌ 不会出现在 URL 中 |
| event channel 事件 | `onRouteParams` | `onRouteData` |
| uni.$emit 事件 (Tab 页) | `onRouteParams[/path]` | `onRouteData[/path]` |
| 缓存获取 | `getPrevRouterDataCache()?.params` | `getPrevRouterDataCache()?.data` |
| back 回传 | ✅ 通过 `events.onBack` 回调 | ❌ 不支持 back 回传 |

### 基本用法

```typescript
// 传递 data（不会出现在 URL 上）
router.to({
  url: '/pages/detail/detail',
  params: { id: 1 },                    // 会展示在 URL: /pages/detail/detail?id=1
  data: { secretKey: 'abc123' }         // 不会出现在 URL 中
})

// 在目标页面获取 data
const cache = router.getPrevRouterDataCache()
console.log(cache?.params) // { id: 1 }
console.log(cache?.data)   // { secretKey: 'abc123' }
```

### Tab 页面接收 data

Tab 页面没有 opener event channel，需要通过 `uni.$on` 监听事件：

```typescript
import { onRouteDataEventKey } from '@/uni_modules/w-router'

onMounted(() => {
  // 方式1: 通过 pipeline 缓存获取
  const cache = router.getPrevRouterDataCache()
  if (cache) {
    console.log(cache.data) // 获取 data
  }

  // 方式2: 通过 uni.$on 监听 data 事件
  const dataEventName = `${onRouteDataEventKey}[/pages/home/home]`
  uni.$on(dataEventName, (data: unknown) => {
    console.log('收到 data:', data)
  })
})
```

### 典型场景

```typescript
// 场景：跳转详情页，id 需要展示在 URL 上，但 token 等敏感信息不应暴露
router.to({
  url: '/pages/detail/detail',
  params: { id: 123 },                  // URL: /pages/detail/detail?id=123
  data: { authToken: 'xxx', from: 'share-link' }  // 隐式传递，不出现在 URL
})

// 场景：Tab 页面切换时传递内部状态
router.tab({
  url: '/pages/home/home',
  data: { refreshNeeded: true, lastVisit: Date.now() }
})
```

## 中间件 / 拦截器

注册全局拦截器，每次导航时都会执行：

```typescript
import { Router } from '@/uni_modules/w-router'
import type { NavigationContext } from '@/uni_modules/w-router'

const router = new Router()

// 鉴权守卫示例
function authGuard(context: NavigationContext, next: () => void) {
  // 白名单页面直接放行
  if (isWhiteListed(context.url)) {
    return next()
  }

  // 通过 context.options 访问完整导航选项
  // context.options.type — 导航类型（to/redirect/tab/launch/back）
  // context.options.data — 隐式数据
  // context.options.delta — 返回层数
  // context.params — 便捷访问，等同于 context.options.params

  // 未登录则跳转到登录页，阻止本次导航
  if (!isLoggedIn()) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/login/index' })
    return
  }

  next()
}

router.interceptor.use(authGuard)

export default router
```

### 单次导航拦截器

```typescript
router.to({
  url: '/pages/marketing/index',
  params: { layoutConfigId: linkValue },
  // 仅对本次导航生效的自定义拦截器
  async intercept(_context, next) {
    const res = await fetchEnableMarketingPage({ pageidlist: [linkValue] })
    if (res.data?.includes?.(linkValue)) {
      next()
    } else {
      uni.showToast({ title: '页面不可用！', icon: 'error' })
    }
  }
})
```

### 跳过拦截器

```typescript
// 跳过所有拦截器，直接导航
router.to({
  url: '/pages/public/index',
  notIntercept: true
})

// 也可以通过函数动态决定
router.to({
  url: '/pages/xxx/xxx',
  notIntercept: () => someCondition
})
```

## 回到已打开的页面

```typescript
// 如果目标页面已在页面栈中，则后退到该页面，而不是新开一个实例
router.to({
  url: '/pages/xxx/xxx',
  backOpenedPage: true
})
```

## 配合 vite-pages-generator-plugin 动态生成 pages.json

如果你的项目基于 Vue CLI（或 Vite），推荐使用vite-pages-generator-plugin插件来自动生成 `pages.json`，避免手动维护页面路由配置。

### 配置（Vue CLI / Vite）

在 `vite.config.ts`（或 `vue.config.js`）中引入插件：

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import PagesGenerator from '@/uni_modules/w-router/vite-pages-generator-plugin'

export default defineConfig(({ mode }) => ({
  plugins: [
    uni(),
    PagesGenerator({
      // 运行模式，用于按模式区分配置文件和输出路径
      mode,
      // 页面映射配置文件路径，相对于项目根目录
      // 该文件需导出 pageMap（页面数组）和 globalConfig（全局配置）
      // 也支持按模式区分：mapPath: { development: '...', production: '...' }
      mapPath: 'src/config/pages.js',
      // pages.json 输出路径，默认 'src/pages.json'
      // 同样支持按模式区分：outputPath: { development: '...', production: '...' }
      outputPath: 'src/pages.json',
    }),
  ],
}))
```

#### 映射配置文件格式

`mapPath` 指向的配置文件需导出 `pageMap` 和 `globalConfig`：

```javascript
// src/config/pages.js

// 页面列表，每个元素对应 pages.json 中的一项
export const pageMap = [
  {
    path: 'pages/index/index',
    style: {
      navigationBarTitleText: '首页',
      navigationStyle: 'custom'
    }
  },
  {
    path: 'pages/detail/detail',
    style: { navigationBarTitleText: '详情' }
  },
  // 支持条件编译，值为 uni-app 条件编译表达式
  {
    path: 'pages/marketing/marketing',
    style: { navigationBarTitleText: '营销' },
    condition: 'H5'
  }
]

// 全局配置，将原样写入 pages.json（globalStyle、tabBar 等）
export const globalConfig = {
  globalStyle: {
    navigationBarTextStyle: 'black',
    navigationBarTitleText: 'uni-app',
    navigationBarBackgroundColor: '#F8F8F8',
    backgroundColor: '#F8F8F8'
  },
  tabBar: {
    list: [
      { pagePath: 'pages/index/index', text: '首页' }
    ]
  }
}
```

> **提示：** 修改映射配置文件后，插件会在 watch 模式下自动检测变更并重新生成 `pages.json`。

对于 Vue CLI 项目，在 `vue.config.js` 中使用 `configureWebpack` 或 chain 方式配置即可，插件同时兼容 Vite 和 Webpack。

### 配置 tabbarPaths

`tabbarPaths` 用于标识 TabBar 页面，驱动 Tab 页的 `uni.$emit` 通信分支。
支持三种配置方式：

```typescript
import { Router } from '@/uni_modules/w-router'

// 方式1：构造函数传参
const router = new Router({ tabbarPaths: ['/pages/index/index', '/pages/home/home'] })

// 方式2：直接赋值
router.tabbarPaths = ['/pages/index/index', '/pages/home/home']

// 方式3：链式 setter（等价于方式2，可链式调用）
router.setTabbarPaths(['/pages/index/index', '/pages/home/home'])
```

> 路径可带可不带前导 `/`，比较时会统一规范化。

### 自动注入 tabbarPaths

插件会根据映射配置文件生成完整的 `pages.json`，包括
`tabBar.list`。你可以利用生成的配置来自动填充 w-router 的 `tabbarPaths`：

```typescript
// router.ts
import { Router } from '@/uni_modules/w-router'
import pagesConfig from '@/pages.json'

const router = new Router()

// 从 pages.json 自动读取 TabBar 页面路径
if (pagesConfig.tabBar?.list) {
  router.setTabbarPaths(
    pagesConfig.tabBar.list.map(
      (item: { pagePath: string }) => item.pagePath
    )
  )
}

// 注册中间件...
router.interceptor.use(authGuard)

export default router
```

这样当你新增或删除 TabBar 页面时，`tabbarPaths` 会自动同步，无需手动维护。

> **提示：** 如果项目使用 uni-app 官方的 HBuilderX 开发，`pages.json` 由 HBuilderX
> 自动管理，无需使用此插件。本插件主要适用于使用 VS Code 等编辑器 +
> Vue CLI / Vite 构建的 uni-app 项目。

## TypeScript 使用

```typescript
import { Router } from '@/uni_modules/w-router'
import type {
  NavigationOptions,
  NavigationContext,
  Middleware,
  RouteRecord,
  NavigateType,
} from '@/uni_modules/w-router'

const router = new Router()

// 导航选项具备完整的类型安全
const options: NavigationOptions = {
  url: '/pages/detail/index',
  params: { id: 123 },
  data: { token: 'secret' },  // 隐式数据，不出现在 URL 上
  events: {
    onBack(params) {
      // TypeScript 知道 params 类型为 unknown —— 使用类型守卫处理
    }
  }
}

router.to(options)

// 类型化的中间件 — 通过 context.options 访问完整导航选项
const myInterceptor: Middleware = (context, next) => {
  console.log(context.from?.route)        // RouteRecord | undefined
  console.log(context.url)                // 便捷访问：规范化 URL
  console.log(context.params)             // 便捷访问：路由参数
  console.log(context.options.type)       // 导航类型：to/redirect/tab/launch/back
  console.log(context.options.data)       // 隐式数据
  console.log(context.options.delta)      // 返回层数
  next()
}

router.interceptor.use(myInterceptor)
```

## 在 uni-app x（uvue）中使用

> w-router 对 uni-app x 提供**同构的 UTS 实现**：同一套 `import` 路径，经典 uni-app 工程自动走 TS 实现（根目录 `index.ts` + `core/`），uni-app x 工程由编译器自动解析到 UTS 实现（`index.uts` + `uvue/`）。**业务代码的 import 路径无需任何改动。**

### 环境要求

- 需要 HBuilderX 4.x+（含 uni-app x 支持）。
- uni-app x 的 App 端（Android/iOS/Harmony）没有 JS 引擎，逻辑代码必须用 UTS（`.uts`）编译为 Kotlin/Swift；Web 与微信小程序端才编译为 JS。
- 页面使用 `.uvue`，逻辑使用 `.uts`（`<script setup lang="uts">`），**不能 `import` `.ts` 文件**——共享逻辑需额外提供 `.uts` 版本（如 `common/router.uts`）。
- uni-app x 工程使用 `manifest.uvue.json`（含 `uni-app-x` 节点）+ `platformConfig.json`；经典 uni-app 工程仍用 `manifest.json`。同一目录可同时维护 vue / uvue 两套入口与页面，按工程打开方式各自解析，互不干扰。

### 传参机制差异

uni-app x **没有 `getOpenerEventChannel`**，因此：

- `params` / `data` 不再走 EventChannel，统一通过 `uni.$emit` / `uni.$on` + pipeline 缓存传递。
- 接收侧一律用 `router.getPrevRouterDataCache()` 读取缓存；需要即时监听（含 Tab 页）用 `uni.$on`，事件名为 `onRouteParams[/pages/xxx]`、`onRouteData[/pages/xxx]`。
- `back` 回传仍通过 `events.onBack` 接收。uvue 下 `uni.navigateBack` 无 `success/fail/complete` 回调，`back()` 内部已改为 await 后同步触发 `success` 与 `onBack`，使用上行为一致。

### 页面标识基于实例稳定 id

uvue 页面没有 uid 字段，w-router 改用页面实例的**稳定 id** 作为页面事件键，经 `getPageKey()`（等价公开 API `getPageId()`）获取：

- **id 来源**：页面对象的 `vm.$basePage.id`（number）或 `vm.$nativePage.pageId`（string，与 `$basePage.id` 对应），两处互为镜像；
- **兼容兜底**：取不到时依次回退顶层 `$basePage.id` → `$nativePage.pageId` → route 字符串。

每个页面实例（即使同名 route 多开）id 唯一，因此 `onBack` 回传会准确投递到注册回调的那个页面实例，**不再错收**。`getPrevRouterDataCache()` 仍按目标 route 读取——目标页在导航发生时尚未创建、拿不到 id，且缓存是「页面加载时读取一次」的语义，route 键已足够。

### UTS 强类型约束

- 对象字面量传参时，接收侧读取建议 `as UTSJSONObject`（如 `cache.params as UTSJSONObject`），或先 `JSON.parse(JSON.stringify(...))`。
- 类型统一使用 `any`（UTS 无 `unknown`）。
- 中间件 `Middleware` 返回类型为 `void | Promise<void>`，**推荐写成 `async` 函数**（返回 `Promise<void>`），避免联合返回类型在 UTS 下的编译兼容问题。
- UTS 不支持 `Reflect.deleteProperty`、`WeakMap`、`Function.prototype.bind`、`import.meta.env` 等 JS 特性，插件内部已改写；使用方在中间件 / 回调中同样应避免。

### 页面滚动

uvue 页面默认不可滚动，**页面最外层需用 `<scroll-view scroll-y="true">` 包裹**才能滚动（本仓库 demo 的每个 `.uvue` 页面均如此）。

## API 参考

### `Router`

| 方法 | 说明 |
| --- | --- |
| `to(options)` | 跳转到新页面（压入页面栈） |
| `redirect(options)` | 替换当前页面 |
| `tab(options)` | 切换到 TabBar 页面 |
| `launch(options)` | 关闭所有页面，打开新页面 |
| `back(options?)` | 返回上一页（delta 默认为 1） |
| `addRootPath(url)` | 确保 URL 以 `/` 开头 |
| `getNavigatorUrl(fullUrl)` | 从完整 URL 中提取路径（去掉 query 参数） |
| `getPrevRouterDataCache()` | 获取当前页面的缓存路由数据 |
| `isTabBarPath(path)` | 判断路径是否为 TabBar 页面 |
| `tabbarPaths` | TabBar 页面路径数组，可通过构造函数、直接赋值或 `setTabbarPaths()` 设置 |
| `setTabbarPaths(paths)` | 设置 TabBar 页面路径数组，返回 `this` 支持链式调用 |

### `NavigationOptions`

| 字段 | 类型 | 说明 |
| --- | --- |---|
| `url` | `string` | 目标页面路径 |
| `params` | `unknown` | 路由参数（会拼接到 URL query 上，正向传递 + 返回传递均使用此字段） |
| `data` | `unknown` | 隐式数据（不会出现在 URL 上，仅通过 event channel / uni.$emit / 缓存传递） |
| `events` | `RouteEvents` | 页面事件回调（如 `onBack`） |
| `delta` | `number` | 返回的页面层数（默认 1） |
| `backOpenedPage` | `boolean` | 目标页已存在时，后退而非新开 |
| `notIntercept` | `boolean \| (() => boolean)` | 跳过拦截器 |
| `intercept` | `Middleware` | 单次导航自定义拦截器 |

### `NavigationContext`

中间件拦截器接收的导航上下文。顶层提供常用便捷字段，完整选项通过 `options` 聚合访问。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `url` | `string` | 规范化后的目标 URL（便捷字段） |
| `router` | `IRouter` | 路由实例 |
| `from` | `RouteRecord \| undefined` | 来源页面记录 |
| `params` | `unknown` | 路由参数（便捷字段，等同于 `options.params`） |
| `notIntercept` | `boolean` | 是否跳过拦截器（便捷字段，等同于 `options.notIntercept`） |
| `options` | `NavigationOptions` | 完整导航选项聚合 — 访问 `type`、`data`、`delta`、`events` 等 |

### `RouteDataCacheContext`

`getPrevRouterDataCache()` 返回的缓存数据结构：

| 字段 | 类型 | 说明 |
| --- | --- |---|
| `from` | `string` | 来源页面路径 |
| `to` | `string` | 目标页面路径 |
| `params` | `unknown` | 路由参数（与 URL query 一致） |
| `data` | `unknown` | 隐式传递的数据（不出现在 URL 上） |
| `onBack` | `(params: unknown) => void` | 返回参数回调 |

### 导出常量

| 常量 | 说明 |
| --- | --- |
| `onRouteParamsEventKey` | params 事件名前缀（`'onRouteParams'`），Tab 页通过 `uni.$on` 监听 |
| `onRouteDataEventKey` | data 事件名前缀（`'onRouteData'`），Tab 页通过 `uni.$on` 监听 |
| `onRouteParamsOnBackEvtKey` | back 回传事件名（`'onBack'`） |

### 工具函数

| 函数 | 说明 |
| --- | --- |
| `getPageId(page?)` | 获取页面实例稳定 id（uni-app x 下读取 `vm.$basePage.id` / `vm.$nativePage.pageId`，等价 `getPageKey()`） |
| `getPageKey(page?)` | `getPageId` 的底层实现，返回页面实例稳定 key；`page` 缺省取当前页 |

