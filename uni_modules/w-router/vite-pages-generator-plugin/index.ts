// @ts-nocheck
/**
 * vite-pages-generator-plugin
 *
 * 读取映射配置文件（导出 pageMap 与 globalConfig），生成 uni-app 的 pages.json。
 * 页面级条件编译（condition）会以 `// #ifdef` / `// #endif` 注释写入，
 * 交由 uni-app 编译器处理。
 *
 * 该文件运行在 Node 侧（Vite 配置加载阶段），依赖 Node 内置模块，
 * 使用前请确保项目中安装有 `@types/node`。
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

/** pages.json 中单个页面的窗口样式，字段与 pages.json 的 style 一致 */
export interface PageStyle {
	navigationBarTitleText?: string
	navigationBarBackgroundColor?: string
	navigationBarTextStyle?: 'black' | 'white'
	enablePullDownRefresh?: boolean
	backgroundColor?: string
	[key: string]: unknown
}

/** 映射配置文件中 pageMap 数组的元素，对应 pages.json 中的一项页面配置 */
export interface PageMapItem {
	/** 页面路径，如 "pages/index/index" */
	path: string
	/** 页面窗口样式 */
	style?: PageStyle
	/**
	 * 条件编译表达式，为 uni-app 平台标识，如 'H5'、'MP-WEIXIN'、'APP-PLUS' 等。
	 * 设置后会以 `// #ifdef` / `// #endif` 注释包裹该页面配置。
	 */
	condition?: string
}

/** 映射配置文件中 globalConfig 的类型，属性会原样写入 pages.json 顶层字段 */
export interface GlobalConfig {
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

/** 映射配置文件（mapPath 指向的文件）的整体导出结构 */
export interface PagesConfig {
	/** 页面列表，每个元素对应 pages.json 中的一项 */
	pageMap?: PageMapItem[]
	/** 全局配置，原样写入 pages.json 顶层字段 */
	globalConfig?: GlobalConfig
}

/** 支持按运行模式区分取值的路径配置 */
export type ModePath = string | Record<string, string>

/** 插件配置选项 */
export interface PagesGeneratorOptions {
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
	mapPath?: ModePath
	/**
	 * pages.json 输出路径，相对于项目根目录。
	 * 也支持按模式区分：{ development: '...', production: '...' }。
	 * @default 'src/pages.json'
	 */
	outputPath?: ModePath
	/** 允许传递任意额外的插件选项 */
	[key: string]: unknown
}

/** Vite 插件实例（结构与 Vite 的 Plugin 兼容） */
export interface PagesGeneratorPlugin {
	/** Vite 插件名称 */
	name: string
	/** 构建启动阶段读取映射配置文件并生成 pages.json */
	buildStart(): Promise<void>
	/** 监听映射配置文件变更并重新生成 pages.json */
	watchChange(id: string): Promise<void>
}

/** 默认的映射配置文件路径 */
const DEFAULT_MAP_PATH = 'src/config/pages.js'
/** 默认的 pages.json 输出路径 */
const DEFAULT_OUTPUT_PATH = 'src/pages.json'

/**
 * 将单个顶层配置项序列化为 JSON 片段，缩进与最终文件保持一致。
 *
 * `JSON.stringify({ [key]: value }, null, 2)` 的首尾两行分别是外层
 * `{` / `}`，去掉它们后，剩余行（含内层缩进）恰好就是该配置项在顶层
 * 所需的形态，例如：
 *
 * ```
 * {                →  去掉
 *   "easycom": {   →    "easycom": {
 *     "custom": {} →      "custom": {}
 *   }              →    }
 * }                →  去掉
 * ```
 *
 * @returns 形如 `  "easycom": {\n    ...\n  }` 的片段，不含末尾逗号
 */
const stringifyConfigEntry = (key: string, value: unknown): string =>
	JSON.stringify({ [key]: value }, null, 2).split('\n').slice(1, -1).join('\n')

/**
 * 解析字符串或按模式区分的路径配置。
 * 对象形式下未命中当前 mode 时回退到默认值。
 */
const resolveModePath = (
	value: ModePath | undefined,
	mode: string | undefined,
	fallback: string
): string => {
	if (value === undefined) return fallback
	if (typeof value === 'string') return value || fallback
	return (mode !== undefined ? value[mode] : undefined) || fallback
}

// 简单的 pages.json 生成插件
const vitePagesGenerator = (options: PagesGeneratorOptions = {}): PagesGeneratorPlugin => {
	// 上一次生成时配置文件的哈希，用于跳过无变更的重复生成
	let lastConfigHash: string | null = null
	// 获取当前运行模式
	const mode = options.mode
	// 根据运行模式确定配置文件路径与输出路径
	const mapPath = resolveModePath(options.mapPath, mode, DEFAULT_MAP_PATH)
	const outputPath = resolveModePath(options.outputPath, mode, DEFAULT_OUTPUT_PATH)

	/** 映射配置文件的绝对路径 */
	const configFilePath = (): string => path.resolve(process.cwd(), mapPath)
	/** pages.json 的绝对路径 */
	const outputFilePath = (): string => path.resolve(process.cwd(), outputPath)

	// 生成默认 pages.json
	const generateDefaultPagesJson = (): void => {
		const defaultConfig = {
			pages: [
				{
					path: 'pages/index/index',
					style: {
						navigationBarTitleText: '首页',
						navigationStyle: 'custom'
					}
				}
			],
			globalStyle: {
				navigationBarTextStyle: 'black',
				navigationBarTitleText: 'uni-app',
				navigationBarBackgroundColor: '#F8F8F8',
				backgroundColor: '#F8F8F8'
			}
		}

		fs.writeFileSync(outputFilePath(), JSON.stringify(defaultConfig, null, 2))

		console.log('✅ pages.json 已使用默认配置生成')
	}

	// 生成 pages.json
	const generatePagesJson = async (): Promise<void> => {
		try {
			const configPath = configFilePath()
			if (!fs.existsSync(configPath)) {
				console.warn('⚠️  配置文件不存在，使用默认配置')
				generateDefaultPagesJson()
				return
			}

			// 读取配置文件
			const configContent = fs.readFileSync(configPath, 'utf8')
			const currentHash = crypto.createHash('md5').update(configContent).digest('hex')

			// 检查是否需要重新生成
			if (currentHash === lastConfigHash) {
				return
			}
			lastConfigHash = currentHash

			// 使用动态导入来获取配置
			let pageMap: PageMapItem[] = []
			let globalConfig: GlobalConfig = {}

			try {
				// 动态导入配置文件
				const config = (await import(`file://${configPath}?t=${Date.now()}`)) as PagesConfig
				pageMap = config.pageMap || []
				globalConfig = config.globalConfig || {}
			} catch (error) {
				console.error('❌ 导入配置文件失败，使用默认配置:', error)
				generateDefaultPagesJson()
				return
			}

			// 生成带条件编译注释的 pages 配置
			const pageItems = pageMap.map((page, index) => {
				let item = ''
				// 添加条件编译注释
				if (page.condition) {
					// 转换 condition 值为 uniapp 条件编译格式
					item += `    // #ifdef ${page.condition}\n`
				}

				// 添加页面配置
				const pageConfig = {
					path: page.path,
					style: page.style
				}
				item += `    ${JSON.stringify(pageConfig, null, 2).replace(/\n/g, '\n    ')}`

				// 添加逗号（最后一个元素除外）
				if (index < pageMap.length - 1) {
					item += ','
				}

				// 添加结束条件编译注释
				if (page.condition) {
					item += `\n    // #endif`
				}

				return item
			})
			const pagesContent =
				pageItems.length > 0 ? `  "pages": [\n${pageItems.join('\n')}\n  ]` : '  "pages": []'

			// 生成其他配置（globalStyle、tabBar、easycom 等），逗号统一跟在上一项的 `}` 之后
			const otherConfigSections = Object.entries(globalConfig)
				.map(([key, value]) => stringifyConfigEntry(key, value))
				.filter((section) => section !== '')

			// 组合最终内容
			const finalContent = `{\n${[pagesContent, ...otherConfigSections].join(',\n')}\n}`

			// 写入文件
			fs.writeFileSync(outputFilePath(), finalContent)

			console.log('✅ pages.json 已从映射配置生成')
		} catch (error) {
			console.error('❌ 生成 pages.json 失败:', error)
			generateDefaultPagesJson()
		}
	}

	return {
		name: 'pages-json-generator',

		async buildStart() {
			await generatePagesJson()
		},

		async watchChange(id: string) {
			// Vite 传入的是绝对路径，与解析后的配置路径比对
			if (id === configFilePath()) {
				console.log('🔄 检测到配置文件变更，重新生成 pages.json')
				await generatePagesJson()
			}
		}
	}
}

export default vitePagesGenerator
