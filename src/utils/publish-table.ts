import * as semver from 'semver'
import * as colors from 'colors'
import * as ttyTable from 'tty-table'

const header = [{
  value: '包名'
}, {
  value: '发布原因'
}, {
  value: '发布级别',
  formatter: (value: string) => {
    switch (value) {
      case 'major':
        return colors.bold(value)
      case 'minor':
        return value
      case 'patch':
        return value
      case 'empty':
        return colors.grey('依赖发布')
    }
  }
}, {
  value: '最终发布版本',
  formatter: (value: string　) => {
    return value
  }
}]

/**
 * 生成发布信息的表格输出到控制台
 */
export default (callback: () => Array<Array<string>>) => {
  const rows = callback()

  const table = ttyTable(header, rows, null, {
    borderStyle: 1,
    paddingBottom: 0,
    headerAlign: 'center',
    align: 'center'
  })

  console.log(table.render())
}