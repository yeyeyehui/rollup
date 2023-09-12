const Bundle = require("./bundle");

/**
 * 打包入口文件，把结果输出到目录目录
 * @param {*} entry 入口文件
 * @param {*} output 输出目录加文件名
 */
function rollup(entry, output) {
  // 初始化准备工作
  const bundle = new Bundle({ entry });

  // 开始编译
  bundle.build(output);
}

module.exports = rollup;
