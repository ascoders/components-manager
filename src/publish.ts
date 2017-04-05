import * as fs from 'fs'
import * as path from 'path'
import * as colors from 'colors'
import * as semver from 'semver'

type PublishVersion = 'patch' | 'mirror' | 'major'

/**
 * 发布组件
 */
export default (managerConfig: ManagerConfig, packageStrings: string[], versionMap: Map<string, string>, dependenceMap: Map<string, Map<string, string>>) => {
  // 发布需求 map
  const publishDemandMap = new Map<string, PublishVersion>()

  // 发布结果 map
  const publishResultMap = new Map<string, string>()

  packageStrings.forEach(packageString => {
    // packageName: packageName@patch；使用 @ 分割
    const packageStringSplit = packageString.split('@')
    // 包名
    const packageName = packageStringSplit.slice(0, packageStringSplit.length - 1).join('@')
    // 发布级别
    const publishVersion = packageStringSplit[packageStringSplit.length - 1] as PublishVersion

    if (!['patch', 'mirror', 'major'].some(legalPublishVersion => publishVersion === legalPublishVersion)) {
      console.log(colors.red(`${packageName} 发布的版本号必须为 patch mirror major 之一`))
      process.exit(1)
    }

    // 发布不允许模块名重复，而且不会覆盖，而是提示用户错误，因为发布是一项谨慎的操作    
    if (publishDemandMap.has(packageName)) {
      console.log(colors.red(`${packageName} 重复`))
      process.exit(1)
    }

    // 如果包名不在当前组件列表中，同样报错
    if (!versionMap.has(packageName)) {
      console.log(colors.red(`${packageName} 组件不存在于当前项目中`))
      process.exit(1)
    }

    publishDemandMap.set(packageName, publishVersion)
  })

  publishDemandMap.forEach((publishVersion, packageName) => {
    switch (publishVersion) {
      case 'patch': // bug fix
        if (!publishResultMap.has(packageName)) {
          publishResultMap.set(packageName, semver.inc(versionMap.get(packageName), publishVersion))
        }
        
        break
      case 'mirror': // 向下兼容的新功能
        break
      case 'major': // 不兼容的改动
        break
    }
    console.log(publishVersion, packageName)
  })
}