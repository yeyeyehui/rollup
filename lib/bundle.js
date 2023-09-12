const path = require("path");

const fs = require("fs");

const MagicString = require("magic-string");

const Module = require("./module");

const { hasOwnProperty, replaceIdentifier } = require("./utils");

/**
 * @param {*} options 入口文件路径
 * @return {New} Bundle实例
 */
class Bundle {
  // { entry: '绝对路径/rollup/src2/main.js' }
  constructor(options) {
    // 追加js后缀
    this.entryPath = path.resolve(options.entry.replace(/\.js$/, "") + ".js");

    this.modules = new Set();
  }

  /**
   * 开始打包
   * @param {*} output： '绝对路径/rollup/build2/bundle.js'
   */
  build(output) {
    // Module {
    //   code: MagicString {},
    //   path: '绝对路径/rollup/src2/main.js',
    //   bundle: Bundle {
    //     entryPath: '绝对路径/rollup/src2/main.js',
    //     modules: Set { [Circular] }
    //   },
    //   ast: Node {
    //     type: 'Program',
    //     start: 0,
    //     end: 132,
    //     body: [ [Node], [Node], [Node], [Node] ],
    //     sourceType: 'module'
    //   },
    //   imports: {
    //     age1: { source: './age1.js', importName: 'age1' },
    //     age2: { source: './age2.js', importName: 'age2' },
    //     age3: { source: './age3.js', importName: 'age3' }
    //   },
    //   exports: {},
    //   definitions: {},
    //   modifications: {},
    //   canonicalNames: {}
    // }
    const entryModule = this.fetchModule(this.entryPath);

    // 获取单个语句的集合
    this.statements = entryModule.expandAllStatements();

    this.deconflict();

    // 生成结果，拿到源代码
    const { code } = this.generate();

    // 创建文件生成内容
    fs.writeFileSync(output, code);
  }

  /**
   * 读取文件内容，创建模块实例
   * @param {*} importee 被引入的模块 '绝对路径/rollup/src2/main.js'
   * @param {*} importer 引入别的模块的模块 main.js
   * @return 模块的实例
   */
  fetchModule(importee, importer) {
    let route;

    // 添加后缀
    if (!importer) route = importee;
    else {
      if (path.isAbsolute(importee)) {
        route = importee.replace(/\.js$/, "") + ".js";
      } else {
        route = path.resolve(
          path.dirname(importer),
          importee.replace(/\.js$/, "") + ".js"
        );
      }
    }

    if (route) {
      //读取文件对应的内容
      const code = fs.readFileSync(route, "utf8");

      //创建一个文件模块的实例
      const module = new Module({
        code, //模块的源代码
        path: route, //模块的路径
        bundle: this, //Bundle实例
      });

      this.modules.add(module);

      return module;
    }
  }

  // 变量名重命名
  deconflict() {
    const defines = {}; // 定义的变量
    const conflicts = {}; // 变量名冲突的变量

    this.statements.forEach((statement) => {
      Object.keys(statement._defines).forEach((name) => {
        
        if (hasOwnProperty(defines, name)) conflicts[name] = true;
        else defines[name] = [];

        //把此变量定义语句对应模块放到数组里
        defines[name].push(statement._module);
      });
    });

    //获取变量名冲突的变量数组
    Object.keys(conflicts).forEach((name) => {
      const modules = defines[name];
      modules.pop(); //最后一个模块不需要重命名，可以保留原来的变量名
      modules.forEach((module, index) => {
        let replacement = `${name}$${modules.length - index}`;
        module.rename(name, replacement);
      });
    });
  }

  /**
   * 生成结果，拿到源代码
   * @return 合并后的源代码
   */
  generate() {
    // 对字符串进行截取等操作
    let bundle = new MagicString.Bundle();

    // 循环所有的语句
    this.statements.forEach((statement) => {
      let replacements = {};

      // 获取依赖的变量和定义的变量数组
      Object.keys(statement._dependsOn)
        .concat(Object.keys(statement._defines))
        .forEach((name) => {
          const canonicalName = statement._module.getCanonicalName(name);
          if (name !== canonicalName) {
            replacements[name] = canonicalName;
          }
        });

      // clone节点
      const source = statement._source.clone();

      if (statement.type === "ExportNamedDeclaration") {
        source.remove(statement.start, statement.declaration.start);
      }
      replaceIdentifier(statement, source, replacements);

      //把每个语句对应的源代码都添加bundle实例中
      bundle.addSource({
        content: source,
        separator: "\n",
      });
    });
    
    // 返回合并后的源代码
    return { code: bundle.toString() };
  }
}

module.exports = Bundle;
/**
 * rollup  Bundle = webpack.Compiler
 * rollup file module   = webpack file module
 */
