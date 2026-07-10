import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// 简单的 pages.json 生成插件
const vitePagesGenerator = (options = {}) => {
	let lastConfigHash = null
	// 获取当前运行模式
	let mode = options.mode
	// 根据运行模式确定配置文件路径
	let mapPath = options.mapPath
	if (typeof mapPath === 'object') {
		mapPath = mapPath[mode]
	}
	const outputPath =
		typeof options.outputPath === 'object'
			? options.outputPath[mode]
			: options.outputPath || 'src/pages.json'

	// 生成默认 pages.json
	const generateDefaultPagesJson = () => {
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

		fs.writeFileSync(
			path.resolve(process.cwd(), outputPath),
			JSON.stringify(defaultConfig, null, 2)
		)

		console.log('✅ pages.json 已使用默认配置生成')
	}

	// 生成 pages.json
	const generatePagesJson = async () => {
		try {
			const configPath = path.resolve(process.cwd(), mapPath)
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
			let pageMap = []
			let globalConfig = {}

			try {
				// 动态导入配置文件
				const config = await import(`file://${configPath}?t=${Date.now()}`)
				pageMap = config.pageMap || []
				globalConfig = config.globalConfig || {}
			} catch (error) {
				console.error('❌ 导入配置文件失败，使用默认配置:', error)
				generateDefaultPagesJson()
				return
			}

			// 生成带条件编译注释的 pages 配置
			let pagesContent = '  "pages": [\n'
			pageMap.forEach((page, index) => {
				// 添加条件编译注释
				if (page.condition) {
					let conditionValue = page.condition
					// 转换 condition 值为 uniapp 条件编译格式
					pagesContent += `    // #ifdef ${conditionValue}\n`
				}

				// 添加页面配置
				const pageConfig = {
					path: page.path,
					style: page.style
				}
				pagesContent += `    ${JSON.stringify(pageConfig, null, 2).replace(/\n/g, '\n    ')}`

				// 添加逗号（最后一个元素除外）
				if (index < pageMap.length - 1) {
					pagesContent += ','
				}

				// 添加结束条件编译注释
				if (page.condition) {
					pagesContent += `\n    // #endif`
				}

				pagesContent += '\n'
			})
			pagesContent += '  ]'

			// 生成其他配置
			let otherConfigContent = ''
			Object.entries(globalConfig).forEach(([key, value], index) => {
				const configStr = JSON.stringify({ [key]: value }, null, 2)
				// 移除首尾的 {}，并添加缩进
				const formattedConfig = configStr
					.substring(1, configStr.length - 1)
					.replace(/^/, '  ')
					.replace(/\n/g, '\n  ')
				otherConfigContent += formattedConfig
				// 添加逗号（最后一个元素除外）
				if (index < Object.entries(globalConfig).length - 1) {
					otherConfigContent += ','
				}
			})

			// 组合最终内容
			const finalContent = `{${pagesContent},${otherConfigContent}}`

			// 写入文件
			fs.writeFileSync(path.resolve(process.cwd(), outputPath), finalContent)

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

		async watchChange(id) {
			const configPath = path.resolve(process.cwd(), mapPath)
			if (id === configPath) {
				console.log('🔄 检测到配置文件变更，重新生成 pages.json')
				generatePagesJson()
			}
			// 也检测默认配置文件的变更
			const defaultConfigPath = path.resolve(process.cwd(), 'src/config/pages.js')
			if (id === defaultConfigPath && mapPath === defaultConfigPath) {
				console.log('🔄 检测到默认配置文件变更，重新生成 pages.json')
				generatePagesJson()
			}
		}
	}
}

export default vitePagesGenerator
