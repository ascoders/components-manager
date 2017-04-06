import * as fs from 'fs'
import * as path from 'path'
import * as colors from 'colors'
import * as semver from 'semver'

/**
 * 发布可选版本
 */
type PublishVersion = 'patch' | 'mirror' | 'major'

/**
 * 发布结果信息
 */
interface PublishResult {
  /**
   * 发布级别
   */
  version: PublishVersion
}

/**
 * 发布组件
 */
export default (managerConfig: ManagerConfig, packageStrings: string[], versionMap: Map<string, string>, dependenceMap: Map<string, Map<string, string>>) => {
  // 发布需求 map
  const publishDemandMap = new Map<string, PublishVersion>()

  // 发布结果 map
  const publishResultMap = new Map<string, PublishResult>()

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

  // 对某个包发布新版本号
  function publishNewVersion(packageName: string, version: PublishVersion) {
    switch (version) {
      case 'patch': // bug fix
        if (!publishResultMap.has(packageName)) {
          publishResultMap.set(packageName, {
            version: version
          })
        } else {
          // 如果已经存在其他级别的发布版本，就用其他级别的，patch 优先级最低
        }
        break
      case 'mirror': // 向下兼容的新功能
        if (!publishResultMap.has(packageName)) {
          publishResultMap.set(packageName, {
            version: version
          })
        } else {
          // 如果已经存在发布版本是 patch，就改为 mirror，其他情况不考虑
          publishResultMap.get(packageName).version === 'patch'
          publishResultMap.set(packageName, {
            version: version
          })
        }
        break
      case 'major': // 不兼容的改动
        // 直接将版本更新为 major  
        publishResultMap.set(packageName, {
          version: version
        })

        // 找依赖它的组件，升级 patch 版本
        dependenceMap.forEach((dep, eachPackageName) => {
          if (dep.has(packageName)) {
            // 依赖了它，升级一个 patch 版本
            publishNewVersion(eachPackageName, 'patch')
          }
        })
        break
    }
  }

  publishDemandMap.forEach((publishVersion, packageName) => {
    publishNewVersion(packageName, publishVersion)
    console.log(publishResultMap)
  })

  publishResultMap.forEach((publishVersion, packageName) => {
    // const nextVersion = semver.inc(versionMap.get(packageName), publishVersion)

  })
}