declare module 'format-json'
declare module 'prompt'
declare module 'tty-table'

declare interface ManagerConfig {
  /**
   * 组件
   */
  components: Array<ComponentInfo>
  /**
   * 发布脚本，默认是 npm publish
   */
  publishCommand?: string
  /**
   * 所有组件都依赖的包
   */
  dependencies?: string[]
  /**
   * 发布前的回调，【仅支持 js 配置文件】
   */
  beforePublish?: (componentInfo?: ComponentInfo) => void | boolean
}

declare interface ComponentInfo {
  /**
   * 组件根目录的相对路径
   */
  root: string
  /**
   * 组件的包名
   */
  name: string
  /**
   * git 仓库地址
   */
  git?: string
  /**
   * 代码引用的入口文件（相对路径于根目录），默认为 ./
   */
  main?: string
  /**
   * 外部引用的入口文件夹，不用精确到文件，文件会自动从 main 中补全（相对路径于根目录），默认为 ./lib
   */
  outputDir?: string
  /**
   * 编译产出路径，如果不设置，说明不需要产出，可以直接发布
   */
  builtPath?: string
  /**
   * 依赖分析忽略的目录
   */
  analyseIgnore?: string[]
}
