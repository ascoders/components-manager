#!/usr/bin/env node

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

import alias from './alias'
import depAnalyse from './dep-analyse'
import publish from './publish'

const commander = require('commander')

const packageJson = require('../package.json')
const managerConfig: ManagerConfig = require(path.join(process.cwd(), 'components-manager.json'))

commander.version(packageJson.version)

commander.command('alias <file> <prototype>')
  .description('更新 alias，包括 tsconfig.json，也支持自定义文件、自定义字段，当 components-manager.json 更新时执行')
  .action((file: string, prototype: string) => {
    alias(managerConfig, file, prototype)
  })

commander.command('dep-analyse')
  .description('依赖分析，并更新组件的 package.json，当任何组件依赖发生修改时执行')
  .action(() => {
    depAnalyse(managerConfig)
  })

commander.command('publish [packageName@<patch|mirror|major>...]')
  .description('发布组件')
  .action((packageNames: string[]) => {
    // 先依赖分析
    const { versionMap, dependenceMap } = depAnalyse(managerConfig)
    // 再发布
    publish(managerConfig, packageNames, versionMap, dependenceMap)
  })

commander.parse(process.argv)