declare module 'format-json'
declare module 'prompt'
declare module 'tty-table'

declare interface ManagerConfig {
  /**
   * 组件
   */
  components: Array<{
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
     * 代码引用的入口（相对路径于根目录），默认为 ./
     */
    main?: string
    /**
     * 外部引用的入口（相对路径于根目录），默认为 ./lib
     */
    outputMain?: string
    /**
     * 编译产出路径，如果不设置，无法发布
     */
    builtPath?: string
  }>
}