import * as fs from 'fs'
import * as path from 'path'
import * as colors from 'colors'

type PublishVersion = 'patch' | 'mirror' | 'major'

/**
 * 发布组件
 */
export default (managerConfig: ManagerConfig, packageStrings: string[], versionMap: Map<string, string>, dependenceMap: Map<string, Map<string, string>>) => {
  // 解析入参，生成发布组件名、发布级别的 map
  const publishMap = new Map<string, PublishVersion>()

  packageStrings.forEach(packageString => {
    // packageName: packageName@patch；使用 @ 分割
    const packageStringSplit = packageString.split('@')
    // 包名
    const packageName = packageStringSplit.slice(0, packageStringSplit.length - 1).join('@')
    // 发布界别
    const publishVersion = packageStringSplit[packageStringSplit.length - 1] as PublishVersion

    if (!['patch', 'mirror', 'major'].some(legalPublishVersion => publishVersion === legalPublishVersion)) {
      console.log(colors.red(`${packageName} 发布的版本号必须为 patch mirror major 之一`))
      process.exit(1)
    }

    // 发布不允许模块名重复，而且不会覆盖，而是提示用户错误，因为发布是一项谨慎的操作    
    if (publishMap.has(packageName)) {
      console.log(colors.red(`${packageName} 重复`))
      process.exit(1)
    }

    // 如果包名不在当前组件列表中，同样报错
    if (!managerConfig.components.some(existPackage => packageName === existPackage.npm)) {
      console.log(colors.red(`${packageName} 组件不存在于当前项目中`))
      process.exit(1)
    }

    publishMap.set(packageName, publishVersion)
  })
}