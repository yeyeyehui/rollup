const path = require("path");

// 自定义rollup
const rollup = require("./lib/rollup");

// 入口文件
const entry = path.resolve(__dirname, "src2/main.js");

// 生成文件
const output = path.resolve(__dirname, "build2/bundle.js");

// 开始编译
rollup(entry, output);
