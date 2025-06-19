import * as ts from "typescript";
import * as fs from "fs";

/**
 * 使用 TypeScript AST 解析 table.ts，返回所有 Table 对象
 * @param tableFilePath
 * @returns {Promise<any[]>}
 */
export async function parseTableModule(tableFilePath) {
  const code = fs.readFileSync(tableFilePath, "utf-8");
  const sourceFile = ts.createSourceFile(
    tableFilePath,
    code,
    ts.ScriptTarget.ESNext,
    true
  );
  const tables = [];

  sourceFile.forEachChild((node) => {
    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach((decl) => {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          ts.isObjectLiteralExpression(decl.initializer)
        ) {
          // 只处理 export const xxxTable = {...}
          const varName = decl.name.text;
          if (/Table$/.test(varName)) {
            // 利用 eval 简单还原对象（更安全可用 AST 递归解析）
            try {
              // eslint-disable-next-line no-eval
              const obj = eval(
                "(" +
                  code.slice(decl.initializer.pos, decl.initializer.end) +
                  ")"
              );
              obj.__name = varName.replace(/Table$/, "");
              tables.push(obj);
            } catch (e) {
              // 解析失败
            }
          }
        }
      });
    }
  });
  return tables;
}
