/**
 * Type declarations for vite-pages-generator-plugin.
 *
 * 该插件为 DCloud 插件市场的 uni_modules 插件，不支持 npm 安装。
 * 下载地址: https://ext.dcloud.net.cn/plugin?id=16868
 *
 * 使用方法: 将此文件复制到项目的 types/ 或 src/types/ 目录中，
 * TypeScript 即可识别该模块的默认导出。
 */

declare module 'vite-pages-generator-plugin' {
  /**
   * pages.json 中单个页面的窗口样式。
   * 仅列出常用字段，完整类型参见 uni-app 文档。
   */
  interface PageStyle {
    navigationBarTitleText?: string
    navigationBarBackgroundColor?: string
    navigationBarTextStyle?: 'black' | 'white'
    enablePullDownRefresh?: boolean
    backgroundColor?: string
    [key: string]: unknown
  }

  /**
   * 映射配置文件中 pageMap 数组的元素类型。
   * 每个元素对应 pages.json 中的一项页面配置。
   */
  interface PageMapItem {
    /** 页面路径，如 "pages/index/index" */
    path: string
    /** 页面窗口样式 */
    style?: PageStyle
    /**
     * 条件编译表达式。
     * 设置后会在该页面配置前后添加 `// #ifdef` / `// #endif` 注释。
     * 值为 uni-app 条件编译平台标识，如 'H5'、'MP-WEIXIN'、'APP-PLUS' 等。
     */
    condition?: string
  }

  /**
   * 映射配置文件中 globalConfig 的类型。
   * 其属性会原样写入 pages.json 的顶层字段（globalStyle、tabBar、easycom 等）。
   */
  interface GlobalConfig {
    /** 全局样式配置 */
    globalStyle?: Record<string, unknown>
    /** TabBar 配置 */
    tabBar?: {
      list: Array<{
        pagePath: string
        text: string
        [key: string]: unknown
      }>
      [key: string]: unknown
    }
    /** 允许其他 uni-app 顶层配置字段 */
    [key: string]: unknown
  }

  /**
   * 映射配置文件的整体导出结构。
   * mapPath 指向的配置文件需导出 pageMap 和 globalConfig。
   */
  interface PagesConfig {
    /** 页面列表，每个元素对应 pages.json 中的一项 */
    pageMap?: PageMapItem[]
    /** 全局配置，将原样写入 pages.json 顶层字段 */
    globalConfig?: GlobalConfig
  }

  /**
   * 插件配置选项。
   */
  interface PagesGeneratorOptions {
    /**
     * 运行模式，用于从 mapPath / outputPath 的对象形式中选取对应模式的路径。
     * 通常传入 Vite 的 mode（如 'development'、'production'）。
     */
    mode?: string

    /**
     * 页面映射配置文件路径，相对于项目根目录。
     * 该文件需导出 pageMap 和 globalConfig。
     * 也支持按模式区分：{ development: '...', production: '...' }。
     */
    mapPath?: string | Record<string, string>

    /**
     * pages.json 输出路径，相对于项目根目录。
     * 也支持按模式区分：{ development: '...', production: '...' }。
     * @default 'src/pages.json'
     */
    outputPath?: string | Record<string, string>

    /** 允许传递任意额外的插件选项 */
    [key: string]: unknown
  }

  /**
   * Vite 插件实例。
   */
  interface PagesGeneratorPlugin {
    /** Vite 插件名称 */
    name: string
    /**
     * Vite 插件的 apply 方法。
     * 在构建启动阶段读取映射配置文件并生成 pages.json。
     */
    apply: 'build' | 'serve' | ((this: void, config: unknown, env: { command: string; mode: string }) => boolean)
  }

  /**
   * 创建 vite-pages-generator-plugin 实例。
   *
   * @param options - 插件配置选项
   * @returns Vite 插件实例，可直接放入 vite.config.ts 的 plugins 数组
   *
   * @example
   * ```typescript
   * import PagesGenerator from 'vite-pages-generator-plugin'
   *
   * export default defineConfig(({ mode }) => ({
   *   plugins: [
   *     uni(),
   *     PagesGenerator({
   *       mode,
   *       mapPath: 'src/config/pages.js',
   *       outputPath: 'src/pages.json',
   *     }),
   *   ],
   * }))
   * ```
   */
  function PagesGenerator(options?: PagesGeneratorOptions): PagesGeneratorPlugin

  export default PagesGenerator
}
