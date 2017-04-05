import * as fs from 'fs'
import * as path from 'path'
import * as _ from 'lodash'
import walk from './utils/walk'
import { isJsFile } from './utils/js-suffix'
import matchImportRequire from './utils/match-import-require'

/**
 * 将文件对 npm 引用改为相对路径
 */
export default (managerConfig: ManagerConfig, basePath: string) => {
  const filePaths = walk(path.join(process.cwd(), basePath))
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
      // 只处理非 ./ ../ 开头的
      if (!moduleName.startsWith('./') && !moduleName.startsWith('../')) {
        // 如果这个 npm 包存在于组件定义中，将其还原为相对路径
        const componentInfo = managerConfig.components.find(componentInfo => componentInfo.npm === moduleName)
        if (componentInfo) {
          hasChanged = true

          const importFullPath = path.join(process.cwd(), componentInfo.path)
          // 引用该组件的相对路径
          let importRelativePath = path.relative(path.dirname(filePath), importFullPath)

          // 如果开头不是 ./ 或 ../, 要加上 ./
          if (!importRelativePath.startsWith('./') && !importRelativePath.startsWith('../')) {
            importRelativePath = './' + importRelativePath
          }

          if (importModule) {
            return _.trim(importBody) + ' ' + `\'${importRelativePath}\'`
          } else {
            return `require('${importRelativePath}')`
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