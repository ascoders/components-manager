import * as fs from 'fs'
import * as path from 'path'
import * as _ from 'lodash'
import walk from './utils/walk'
import { isJsFile } from './utils/js-suffix'
import matchImportRequire from './utils/match-import-require'

/**
 * 将引用改为包名
 */
export default (managerConfig: ManagerConfig, basePath: string) => {
  const filePaths = walk(path.join(process.cwd(), basePath))

  // 记录所有组件的绝对路径 -> 包名
  const absolutePathAndPackageName = new Map<string, string>()
  managerConfig.components.forEach(componentInfo => {
    absolutePathAndPackageName.set(path.join(process.cwd(), _.trimEnd(path.join(componentInfo.root, componentInfo.main), path.sep)), componentInfo.name)
  })

  filePaths.forEach(filePath => {
    // 只读取指定 js 后缀的文件
    if (!isJsFile(filePath)) {
      return
    }

    // 读取文件内容
    let fileContent = fs.readFileSync(filePath).toString()

    // 是否有修改文件内容
    let hasChanged = false

    fileContent = fileContent.replace(matchImportRequire, (substring: string, importBody: string, importModule: string, requireModule: string) => {
      const moduleName = importModule || requireModule
      // 只处理 ./ 或 ../ 开头的
      if (moduleName.startsWith('./') || moduleName.startsWith('../')) {
        // 找到模块完整路径
        const moduleFullPath = path.resolve(path.dirname(filePath), moduleName)

        if (absolutePathAndPackageName.has(moduleFullPath)) {
          hasChanged = true

          const packageName = absolutePathAndPackageName.get(moduleFullPath)
          if (importModule) {
            return _.trim(importBody) + ' ' + `\'${packageName}\'`
          } else {
            return `require('${packageName}')`
          }
        }
      }
      return substring
    })

    if (hasChanged) {
      // 覆写文件
      fs.writeFileSync(filePath, fileContent)
    }
  })
}