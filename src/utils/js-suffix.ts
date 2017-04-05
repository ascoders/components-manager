const jsSuffix = ['.js', 'es', '.jsx', '.ts', '.tsx']

export default jsSuffix

export const isJsFile = (filePath: string) => {
  // 排除 .d.ts
  if (filePath.endsWith('.d.ts')) {
    return false
  }

  return jsSuffix.some(suffix => filePath.endsWith(suffix))
}