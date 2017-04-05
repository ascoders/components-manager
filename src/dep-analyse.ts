import * as fs from 'fs'
import * as path from 'path'
import * as formatJson from 'format-json'
import walk from './utils/walk'
import { isJsFile } from './utils/js-suffix'
import * as colors from 'colors'
import matchImportRequire from './utils/match-import-require'

/**
 * 对所有组件依赖分析，并更新组件的 package.json
 * 如果不存在 package.json 会创建
 */
export default (managerConfig: ManagerConfig) => {
  // 读取根目录 package.json
  const rootPackageJsonPath = path.join(process.cwd(), 'package.json')
  const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath).toString())

  // 组件版本 map
  const versionMap = new Map<string, string>()

  // 依赖 map
  const dependenceMap = new Map<string, Map<string, string>>()

  // 从根目录 package.json 收集依赖
  rootPackageJson.dependencies && Object.keys(rootPackageJson.dependencies).map(packageName => {
    const version = rootPackageJson.dependencies[packageName]
    if (!versionMap.has(packageName)) {
      versionMap.set(packageName, version)
    }
  })

  // 从所有配置的组件中收集依赖
  managerConfig.components.forEach(component => {
    // 读取当前组件的 package.json
    const componentPackageJsonPath = path.join(process.cwd(), component.path, 'package.json')
    if (!fs.existsSync(componentPackageJsonPath)) {
      return
    }
    const componentPackageJson = JSON.parse(fs.readFileSync(componentPackageJsonPath).toString())

    if (!versionMap.has(component.npm)) {
      versionMap.set(component.npm, componentPackageJson.version)
    }
  })

  // 配置每个组件的 package.json
  managerConfig.components.forEach(config => {
    // 当前组件的 package.json
    const currentComponentPackageJsonPath = path.join(process.cwd(), config.path, 'package.json')
    // 当前组件 package.json 内容
    let currentComponentPackageJson: any

    // 当前组件的依赖列表
    const currentComponentDepMap = new Map<string, string>()

    // 有 package.json
    if (fs.existsSync(currentComponentPackageJsonPath)) {
      // 读取当前组件 package.json
      currentComponentPackageJson = JSON.parse(fs.readFileSync(currentComponentPackageJsonPath).toString())
    } else {  // 没有 package.json
      // 设置默认的 package.json
      currentComponentPackageJson = {
        version: '0.0.1',
        name: config.npm,
        dependencies: {}
      }
    }

    // 当前组件依赖的第三方包名
    const currentComponentDepSet = new Set<string>()

    // 该组件目录下所有文件路径，将所有文件依赖的包暂存
    const filePaths = walk(path.join(process.cwd(), config.path))
    filePaths.forEach(filePath => {
      // 只读取指定 js 后缀的文件
      if (!isJsFile(filePath)) {
        return
      }

      // 读取文件内容
      const fileContent = fs.readFileSync(filePath).toString()

      let match
      while ((match = matchImportRequire.exec(fileContent)) != null) {
        const moduleName = match[2] || match[3]
        // 只处理非 ./ ../ 开头的
        if (!moduleName.startsWith('./') && !moduleName.startsWith('../')) {
          currentComponentDepSet.add(moduleName)
        }
      }
    })

    // 依赖是否有变化
    let depHasChanged = false

    // 将当前组件所有依赖放入 package.json
    currentComponentDepSet.forEach(depName => {
      // 忽略 nodejs 内部模块
      if (['assert', 'zlib', 'fs', 'dns', 'http', 'http-req', 'http-res', 'http-client', 'http-server', 'https', 'net', 'dgram', 'url', 'crypto', 'querystring', 'buffer', 'child_process'].find(nodePackage => nodePackage === depName)) {
        return
      }

      currentComponentDepMap.set(depName, versionMap.get(depName))

      if (versionMap.has(depName)) {
        if (!depHasChanged && currentComponentPackageJson.dependencies[depName] !== versionMap.get(depName)) {
          depHasChanged = true
        }

        currentComponentPackageJson.dependencies[depName] = versionMap.get(depName)
      } else {
        console.log(colors.red(`${config.npm} 组件依赖的 ${depName} 不存在于根目录 package.json 或不在当前 components-manager.json 定义的包名中.`))
        process.exit(1)
      }
    })

    // 更新依赖 map
    dependenceMap.set(config.npm, currentComponentDepMap)

    // 重新写入 package.json
    if (depHasChanged) {
      fs.writeFileSync(currentComponentPackageJsonPath, formatJson.plain(currentComponentPackageJson))
    }
  })

  return {
    versionMap,
    dependenceMap
  }
}