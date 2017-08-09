export default {
  components: [
    {
      root: "./src/styles",
      name: "gaea-style"
    },
    {
      root: "./src/dom/dom-utils",
      name: "gaea-dom-utils"
    }
  ],
  publishCommand: "cnpm publish",
  build: "card build",
  dependencies: [
    "gaea-style"
  ],
  beforePublish: () => {

  }
}
