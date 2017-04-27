import * as fs from 'fs'
import * as path from 'path'
import * as colors from 'colors'
import * as semver from 'semver'
import * as prompt from 'prompt'
import publishTable from './utils/publish-table'
import * as formatJson from 'format-json'
import * as fse from 'fs-extra'
import { execSync } from 'child_process'

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
  /**
   * package.json 内容
   */
  packageJson: {
    version: string
    dependencies: {
      [packageName: string]: string
    }
  }
  /**
   * package.json 路径
   */
  packageJsonPath: string
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
    const componentConfig = managerConfig.components.find(config => config.name === packageName)
    const componentPackageJsonPath = path.join(process.cwd(), componentConfig.root, 'package.json')
    const componentPackageJson = JSON.parse(fs.readFileSync(componentPackageJsonPath).toString())

    switch (version) {
      case 'patch': // bug fix
        if (!publishResultMap.has(packageName)) {
          publishResultMap.set(packageName, {
            version: version,
            reason,
            packageJson: componentPackageJson,
            packageJsonPath: componentPackageJsonPath
          })
        } else {
          // 如果已经存在其他级别的发布版本，就用其他级别的，patch 优先级最低
        }
        break
      case 'mirror': // 向下兼容的新功能
        if (!publishResultMap.has(packageName)) {
          publishResultMap.set(packageName, {
            version: version,
            reason,
            packageJson: componentPackageJson,
            packageJsonPath: componentPackageJsonPath
          })
        } else {
          // 如果已经存在发布版本是 patch，就改为 mirror，其他情况不考虑
          publishResultMap.get(packageName).version === 'patch'
          publishResultMap.set(packageName, {
            version: version,
            reason,
            packageJson: componentPackageJson,
            packageJsonPath: componentPackageJsonPath
          })
        }
        break
      case 'major': // 不兼容的改动
        // 直接将版本更新为 major  
        publishResultMap.set(packageName, {
          version: version,
          reason,
          packageJson: componentPackageJson,
          packageJsonPath: componentPackageJsonPath
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

  // 遍历所有要发布的包，各自发布新版本，得到 publishResultMap
  publishDemandMap.forEach((publishVersion, packageName) => {
    publishNewVersion(packageName, publishVersion, '主动发布')
  })

  // 遍历发布结果，将所有要发布的包，将 packageJson 对象版本升级成最新
  publishResultMap.forEach((publishInfo, packageName) => {
    publishInfo.packageJson.version = semver.inc(versionMap.get(packageName), publishInfo.version)
  })

  // 遍历发布结果，将所有要发布的包，依赖版本升级成最新的
  publishResultMap.forEach((publishInfo, packageName) => {
    // 遍历所有要发布的包，如果有对其的依赖，依赖版本号升级为这个包最新发布的版本
    publishResultMap.forEach(_publishInfo => {
      if (_publishInfo.packageJson.dependencies && Object.keys(_publishInfo.packageJson.dependencies).find(depName => depName === packageName)) {
        _publishInfo.packageJson.dependencies[packageName] = publishInfo.packageJson.version
      }
    })
  })

  // 虚拟发布队列，数次遍历 publishResultMap，每次找到没有依赖本次发布组件的组件添加进去，直到所有组件被添加
  const publishQueue: Array<PublishResult & { packageName: string }> = []
  const resultSize = publishResultMap.size

  while (publishQueue.length !== resultSize) {
    publishResultMap.forEach((publishInfo, packageName) => {
      // 如果没有依赖任何发布中的包，添加进去，同时删除自身
      let used = false

      Object.keys(publishInfo.packageJson.dependencies).forEach(depName => {
        publishResultMap.forEach((_publishInfo, _packageName) => {
          // 不是自身
          if (_packageName === packageName) {
            return
          }

          if (_packageName === depName) {
            used = true
          }
        })
      })


      if (!used) {
        // 添加到发布队列
        publishQueue.push(Object.assign({}, publishInfo, { packageName }))
        // 从 publishResultMap 中删除
        publishResultMap.delete(packageName)
      }
    })
  }

  // 显示发布详情图标  
  publishTable(() => {
    const rows: Array<Array<string>> = []
    publishQueue.forEach(publishInfo => {
      // 如果发布的组件没有 builtPath，终止
      const componentConfig = managerConfig.components.find(config => config.name === publishInfo.packageName)

      const row: string[] = []
      row.push(publishInfo.packageName)
      row.push(publishInfo.reason)
      row.push(publishInfo.version)
      const nextVersion = semver.inc(versionMap.get(publishInfo.packageName), publishInfo.version)
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

    publishQueue.forEach(publishInfo => {
      // 更新 package.json
      fs.writeFileSync(publishInfo.packageJsonPath, formatJson.plain(publishInfo.packageJson))

      const componentConfig = managerConfig.components.find(config => config.name === publishInfo.packageName)
      if (!componentConfig.outputDir) {
        componentConfig.outputDir = 'lib'
      }

      if (componentConfig.builtPath) {
        // 把 builtPath 中文件拷贝到当前文件的 outputMain 文件夹
        const builtPath = path.join(process.cwd(), componentConfig.builtPath)
        const outputPath = path.join(process.cwd(), componentConfig.root, componentConfig.outputDir)

        // 删除 outputPath 文件夹
        fse.removeSync(outputPath)
        // 确保 outputPath 文件夹已被创建
        fse.ensureDirSync(outputPath)
        // 拷贝
        fse.copySync(builtPath, outputPath)
      }

      // 执行发布脚本
      if (!managerConfig.publishCommand) {
        managerConfig.publishCommand = 'npm publish'
      }
      execSync(`${managerConfig.publishCommand} ${path.join(process.cwd(), componentConfig.root)}`, {
        stdio: 'inherit'
      })
    })
  })
}