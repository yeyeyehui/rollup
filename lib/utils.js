const walk = require("./ast/walk");

/**
 * 用来判断一个属性是定义在对象本身而不是继承自原型链
 * @param {*} obj 对象本身
 * @param {*} prop 需要判断的属性
 */
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

exports.hasOwnProperty = hasOwnProperty;

function replaceIdentifier(statement, source, replacements) {
  walk(statement, {
    enter(node) {
      if (node.type === "Identifier") {
        if (node.name && replacements[node.name])
          source.overwrite(node.start, node.end, replacements[node.name]);
      }
    },
  });
}
exports.replaceIdentifier = replaceIdentifier;
