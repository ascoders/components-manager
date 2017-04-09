declare module 'format-json'
declare module 'prompt'
declare module 'tty-table'

declare interface ManagerConfig {
  /**
   * 组件
   */
  components: Array<{
    /**
     * 相对当前项目的路径
     */
    path: string
    /**
     * npm 包名
     */
    npm: string
    /**
     * git 仓库地址
     */
    git: string
  }>
}