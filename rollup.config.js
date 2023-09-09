import babel from "@rollup/plugin-babel";

import nodeResolve from "@rollup/plugin-node-resolve";

import commonjs from "@rollup/plugin-commonjs";

import typescript from "@rollup/plugin-typescript";

import { terser } from "rollup-plugin-terser";

import postcss from "rollup-plugin-postcss";

import serve from "rollup-plugin-serve";

export default {
  // 入口文件
  input: "src/main.js",

  // 打包输出文件配置
  output: {
    //输出的文件路径和文件名
    file: "dist/bundle.cjs.js",

    //五种输出的格式 amd/es/iife/umd/cjs
    format: "cjs",

    //当format格式为iife和umd的时候必须提供变量名
    name: "bundleName",

    // 插件全局变量
    globals: {
      lodash: "_",
      jquery: "$",
    },
  },

  // 哪些插件跳过打包
  external: ["lodash", "jquery"],

  plugins: [
    // es6=>es5
    babel({
      exclude: /node_modules/,
    }),

    //作用是可以加载node_modules里有的模块
    nodeResolve(),

    //可以支持commonjs语法
    commonjs(),

    typescript(),

    // 压缩css
    terser(),

    // 压缩css
    postcss(),

    // 启动服务
    serve({
      open: true,
      port: 8080,
      contentBase: "./dist",
    }),
  ],
};
