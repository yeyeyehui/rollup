const walk = require("./walk");

const Scope = require("./scope");

const { hasOwnProperty } = require("../utils");

/**
 * 分析模块对应的AST语法树
 * @param {*} ast 语法树
 * @param {*} code 源代码
 * @param {*} module 模块实例
 */
function analyse(ast, code, module) {

  //开始第1轮循环 找出本模块导出导出了哪些变量
  ast.body.forEach((statement) => {
    Object.defineProperties(statement, {
      //表示这条语句默认不包括在输出结果里
      _included: { value: false, writable: true },

      //指向它自己的模块
      _module: { value: module },

      //这是这个语句自己对应的源码
      _source: { value: code.snip(statement.start, statement.end) },

      //依赖的变量
      _dependsOn: { value: {} },

      //存放本语句定义了哪些变量
      _defines: { value: {} },

      //存放本语句修改哪些变量
      _modifies: { value: {} },
    });

    //找出使用import导入了哪些变量?
    if (statement.type === "ImportDeclaration") {
      //获取导入的模块的相对路径，form './msg
      let source = statement.source.value; //./msg

      statement.specifiers.forEach((specifier) => {
        //导入的变量名
        let importName = specifier.imported.name;

        //当前模块使用的变量名，使用了as后imported和local就不一样
        let localName = specifier.local.name;

        //我当前模块内导入的变量名localName来自于source模块导出的importName变量
        module.imports[localName] = { source, importName };
      });
    } else if (statement.type === "ExportNamedDeclaration") {
      // 找出使用export导出了哪些变量?
      const declaration = statement.declaration;

      if (declaration && declaration.type === "VariableDeclaration") {
        const declarations = declaration.declarations;

        declarations.forEach((variableDeclarator) => {
          //var a=1,b=2,c=3;
          const localName = variableDeclarator.id.name;

          // 获取导出的名字
          const exportName = localName; //age age

          module.exports[exportName] = { localName };
        });
      }
    }
  });
  
  //开始第2轮循环
  //需要知道本模块内用到了哪些变量，用到的变量留 下，没用到不管理了
  //我还得知道这个变量是局部变量，还是全局变量
  //一上来创建顶级作用域,当前作用域找不到可以找父级作用域
  let currentScope = new Scope({ name: "模块内的顶级作用域" });

  ast.body.forEach((statement) => {
    function addToScope(name, isBlockDeclaration) {
      //是否块级变量
      currentScope.add(name, isBlockDeclaration); //把此变量名添加到当前作用域的变量数组中
      //如果说当前的作用域没有父作用域了，说它就是顶级作用域，那此变量就是顶级变量
      if (
        !currentScope.parent ||
        //如果当前的作用域(BlockStatement)是块级作用域，并且变量声明不是块级声明，是var
        (currentScope.isBlock && !isBlockDeclaration)
      ) {
        //表示此语句定义了一个顶级变量 IfStatement._defines['age']=true
        statement._defines[name] = true;
        //此顶级变量的定义语句就是这条语句
        module.definitions[name] = statement;
      }
    }

    function checkForReads(node) {
      if (node.type === "Identifier") {
        //表示当前这个语句依赖了node.name这个变量
        statement._dependsOn[node.name] = true;
      }
    }

    function checkForWrites(node) {
      function addNode(node) {
        const { name } = node; //name age
        statement._modifies[name] = true; //表示此语句修改了name这个变量
        //module.modifications对象 属性是变量名 值是一个修改语句组成的数组
        if (!hasOwnProperty(module.modifications, name)) {
          module.modifications[name] = [];
        }
        //存放此变量对应的所有的修改语句
        module.modifications[name].push(statement);
      }
      if (node.type === "AssignmentExpression") {
        addNode(node.left);
      } else if (node.type === "UpdateExpression") {
        addNode(node.argument);
      }
    }

    walk(statement, {
      enter(node) {
        checkForReads(node);
        checkForWrites(node);
        let newScope;
        switch (node.type) {
          case "FunctionDeclaration":
          case "ArrowFunctionDeclaration":
            addToScope(node.id.name); //把函数名添加到当前的作用域变量中
            const names = node.params.map((param) => param.name);
            newScope = new Scope({
              name: node.id.name,
              parent: currentScope, //当创建新的作用域的时候，父作用域就是当前作用域
              names,
              isBlock: false, //函数创建的不是一个块级作用域
            });
            break;
          case "VariableDeclaration":
            node.declarations.forEach((declaration) => {
              if (node.kind === "let" || node.kind === "const") {
                addToScope(declaration.id.name, true);
              } else {
                addToScope(declaration.id.name);
              }
            });
            break;
          case "BlockStatement":
            newScope = new Scope({ parent: currentScope, isBlock: true });
            break;
          default:
            break;
        }
        if (newScope) {
          Object.defineProperty(node, "_scope", { value: newScope });
          currentScope = newScope;
        }
      },
      leave(node) {
        //如果当前节点有有_scope,说明它前节点创建了一个新的作用域，离开此节点的时候，要退出到父作用域
        if (Object.hasOwnProperty(node, "_scope")) {
          currentScope = currentScope.parent;
        }
      },
    });

  });
}

module.exports = analyse;
