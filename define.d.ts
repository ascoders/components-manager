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
    * 入口的相对路径（相对于根目录），默认为 ./（根目录）
    */
    main?: string
  }>
  /**
   * 组件产出的目录
   */
  outputDirPath?: string
}