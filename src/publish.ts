import * as fs from 'fs'
import * as path from 'path'
import * as colors from 'colors'
import * as semver from 'semver'
import * as prompt from 'prompt'
import publishTable from './utils/publish-table'
import * as formatJson from 'format-json'

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
  /**
   * 发布原因
   */
  reason: string
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
  function publishNewVersion(packageName: string, version: PublishVersion, reason: string) {
    switch (version) {
      case 'patch': // bug fix
        if (!publishResultMap.has(packageName)) {
          publishResultMap.set(packageName, {
            version: version,
            reason
          })
        } else {
          // 如果已经存在其他级别的发布版本，就用其他级别的，patch 优先级最低
        }
        break
      case 'mirror': // 向下兼容的新功能
        if (!publishResultMap.has(packageName)) {
          publishResultMap.set(packageName, {
            version: version,
            reason
          })
        } else {
          // 如果已经存在发布版本是 patch，就改为 mirror，其他情况不考虑
          publishResultMap.get(packageName).version === 'patch'
          publishResultMap.set(packageName, {
            version: version,
            reason
          })
        }
        break
      case 'major': // 不兼容的改动
        // 直接将版本更新为 major  
        publishResultMap.set(packageName, {
          version: version,
          reason
        })

        // 找依赖它的组件，升级 patch 版本
        dependenceMap.forEach((dep, eachPackageName) => {
          if (dep.has(packageName)) {
            // 依赖了它，升级一个 patch 版本
            publishNewVersion(eachPackageName, 'patch', '依赖关联')
          }
        })
        break
    }
  }

  // 遍历所有要发布的包，各自发布新版本  
  publishDemandMap.forEach((publishVersion, packageName) => {
    publishNewVersion(packageName, publishVersion, '主动发布')
  })

  // 显示发布详情图标  
  publishTable(() => {
    const rows: Array<Array<string>> = []
    Array.from(publishResultMap).forEach(([packageName, publishInfo], index) => {
      const row: string[] = []
      row.push(packageName)
      row.push(publishInfo.reason)
      row.push(publishInfo.version)
      const nextVersion = semver.inc(versionMap.get(packageName), publishInfo.version)
      row.push(nextVersion)
      rows.push(row)
    })
    return rows
  })

  prompt.start()
  prompt.get([{
    name: 'canPublish',
    description: '以上是最终发布信息, 确认发布吗? (true or false)',
    message: '选择必须是 true or false 中的任意一个',
    type: 'boolean',
    required: true
  }], (err: Error, result: any) => {
    if (err || !result || !result.canPublish) {
      return
    }

    publishResultMap.forEach((publishInfo, packageName) => {
      const nextVersion = semver.inc(versionMap.get(packageName), publishInfo.version)
      const componentInfo = managerConfig.components.find(component => component.npm === packageName)
      const componentPath = path.join(process.cwd(), componentInfo.path)
      const componentPackageJsonPath = path.join(componentPath, 'package.json')
      const componentPackageJson = JSON.parse(fs.readFileSync(componentPackageJsonPath).toString())
      componentPackageJson.version = nextVersion
      fs.writeFileSync(componentPackageJsonPath, formatJson.plain(componentPackageJson))
    })
  })
}