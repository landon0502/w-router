# w-router · 路由增强

基于洋葱模型中间件的 uni-app 类型安全路由增强插件。

## 功能特点

- 🧅 **洋葱模型中间件** — 支持全局拦截器和单次导航拦截器，轻松实现鉴权守卫、日志埋点等
- 🔀 **多种导航方式** — `to` / `redirect` / `tab` / `launch` / `back` 全覆盖
- 📦 **页面间传参** — 统一的 `params` 机制，支持正向传递和 `back` 回传
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

```typescript
// 向目标页面传递参数（适用于 to、tab、redirect、launch）
router.to({ url: '/pages/xxx/xxx', params: { id: 1, name: 'hello' } })

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
  router.tabbarPaths = pagesConfig.tabBar.list.map(
    (item: { pagePath: string }) => item.pagePath
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
  Middleware,
  RouteRecord,
  NavigateType,
} from '@/uni_modules/w-router'

const router = new Router()

// 导航选项具备完整的类型安全
const options: NavigationOptions = {
  url: '/pages/detail/index',
  params: { id: 123 },
  events: {
    onBack(params) {
      // TypeScript 知道 params 类型为 unknown —— 使用类型守卫处理
    }
  }
}

router.to(options)

// 类型化的中间件
const myInterceptor: Middleware = (context, next) => {
  console.log(context.from?.route)  // RouteRecord | undefined
  next()
}

router.interceptor.use(myInterceptor)
```

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
| `tabbarPaths` | TabBar 页面路径数组，需手动赋值 |

### `NavigationOptions`

| 字段 | 类型 | 说明 |
| --- | --- |---|
| `url` | `string` | 目标页面路径 |
| `params` | `unknown` | 路由参数（正向传递 + 返回传递均使用此字段） |
| `events` | `RouteEvents` | 页面事件回调（如 `onBack`） |
| `delta` | `number` | 返回的页面层数（默认 1） |
| `backOpenedPage` | `boolean` | 目标页已存在时，后退而非新开 |
| `notIntercept` | `boolean \| (() => boolean)` | 跳过拦截器 |
| `intercept` | `Middleware` | 单次导航自定义拦截器 |

