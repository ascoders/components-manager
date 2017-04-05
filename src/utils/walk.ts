import * as fs from 'fs'
import * as path from 'path'

const walkSync = function (dir: string, filelist: string[]) {
  const files = fs.readdirSync(dir)
  filelist = filelist || []
  files.forEach(function (file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist)
    }
    else {
      filelist.push(path.join(dir, file))
    }
  })
  return filelist
}

export default (dir: string) => {
  const fileList: string[] = []
  walkSync(dir, fileList)
  return fileList
}