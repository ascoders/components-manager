import * as fs from 'fs'
import * as path from 'path'
import * as formatJson from 'format-json'
import * as colors from 'colors'
import * as fse from 'fs-extra'

/**
 * 将每个组件的产出目录删除
 */
export default (managerConfig: ManagerConfig) => {
  managerConfig.components.forEach(config => {
    if (!config.outputDir) {
      config.outputDir = 'lib'
    }

    const outputPath = path.join(process.cwd(), config.root, config.outputDir)
    if (fs.existsSync(outputPath)) {
      fse.removeSync(outputPath)
    }
  })
}