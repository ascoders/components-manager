#!/usr/bin/env node

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

import alias from './alias'
import depAnalyse from './dep-analyse'
import publish from './publish'
import relative from './relative'
import absolute from './absolute'
import clean from './clean'

const commander = require('commander')

const packageJson = require('../package.json')

let managerConfig: ManagerConfig

const managerConfigJsonPath = path.join(process.cwd(), 'components-manager.json')
const managerConfigJsPath = path.join(process.cwd(), 'components-manager.config.js')

if (fs.existsSync(managerConfigJsonPath)) {
  managerConfig = require(managerConfigJsonPath)
} else if (fs.existsSync(managerConfigJsPath)) {
  managerConfig = require(managerConfigJsPath)
}

// managerConfig 每一项做处理
managerConfig.components = managerConfig.components.map(component => {
  if (!component.main) {
    component.main = './'
  }
  return component
})

commander.version(packageJson.version)

commander.command('alias [file] [prototype]')
  .description('更新 alias，包括 tsconfig.json，也支持自定义文件、自定义字段，当 components-manager.json 更新时执行')
  .action((file: string, prototype: string) => {
    alias(managerConfig, file, prototype)
  })

commander.command('relative [root]')
  .description('将目录下所有组件引用的包名替换为相对路径，在发布时使用')
  .action((root = './') => {
    relative(managerConfig, root)
  })

commander.command('absolute [root]')
  .description('将目录下所有组件引用的包名替换为绝对路径，一般不会使用，可能在迁移项目时候使用')
  .action((root = './') => {
    absolute(managerConfig, root)
  })

commander.command('dep-analyse')
  .description('依赖分析，并更新组件的 package.json，当任何组件依赖发生修改时执行')
  .action(() => {
    depAnalyse(managerConfig)
  })

commander.command('publish [packageName@<patch|minor|major>...]')
  .description('发布组件')
  .action((packageNames: string[]) => {
    // 先依赖分析
    const { versionMap, dependenceMap } = depAnalyse(managerConfig)
    // 再发布
    publish(managerConfig, packageNames, versionMap, dependenceMap)
  })

commander.command('clean')
  .description('清空组件的产出目录')
  .action(() => {
    clean(managerConfig)
  })

commander.parse(process.argv)
