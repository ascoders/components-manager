import * as fs from 'fs'
import * as path from 'path'
import * as formatJson from 'format-json'
import * as _ from 'lodash'

/**
 * 设置配置文件 alias 到组件包名
 */
export default (managerConfig: ManagerConfig, aliasFileName: string, aliasPrototype = 'alias') => {
  settingTsConfig(managerConfig)

  if (aliasFileName && aliasPrototype) {
    settingCustomJsonFile(managerConfig, aliasFileName, aliasPrototype)
  }
}

/**
 * 配置 tsconfig.json
 */
function settingTsConfig(managerConfig: ManagerConfig) {
  // 读取 tsconfig.json，若没有则忽略
  const tsConfigPath = path.join(process.cwd(), 'tsconfig.json')

  if (!fs.existsSync(tsConfigPath)) {
    return
  }

  const tsConfig = JSON.parse(fs.readFileSync(tsConfigPath).toString())

  tsConfig.baseUrl = './'

  // 配置 tsconfig.json
  managerConfig.components.forEach(config => {
    _.set(tsConfig, `compilerOptions.paths.${config.name}`, [_.trimEnd(path.join(config.root, config.main), path.sep)])
  })

  // 覆写 tsconfig.json
  fs.writeFileSync(tsConfigPath, formatJson.plain(tsConfig))
}

/**
 * 配置自定义 json
 */
function settingCustomJsonFile(managerConfig: ManagerConfig, aliasFileName: string, aliasPrototype: string) {
  // 读取自定义配置文件
  const aliasFilePath = path.join(process.cwd(), aliasFileName)
  const aliasFileContent = JSON.parse(fs.readFileSync(aliasFilePath).toString() || '{}')

  // 配置自定义配置文件
  managerConfig.components.forEach(config => {
    _.set(aliasFileContent, `${aliasPrototype}.${config.name}`, _.trimEnd(path.join(config.root, config.main), path.sep))
  })

  // 覆写自定义配置文件
  fs.writeFileSync(aliasFilePath, formatJson.plain(aliasFileContent))
}
