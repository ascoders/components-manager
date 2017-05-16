export default {
  components: [
    {
      root: "./src/styles",
      name: "gaea-style"
    },
    {
      root: "./src/dom/dom-utils",
      name: "gaea-dom-utils",
      builtPath: "./lib-npm/dom/dom-utils"
    }
  ],
  publishCommand: "cnpm publish",
  dependencies: [
    "gaea-style"
  ],
  beforePublish: () => {

  }
}
