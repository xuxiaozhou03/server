import * as ts from "typescript";

export function extractTables(tsContent: string, filePath: string): any[] {
  const source = ts.createSourceFile(
    filePath,
    tsContent,
    ts.ScriptTarget.ES2015,
    true
  );
  const tables: any[] = [];
  source.forEachChild((node) => {
    if (ts.isVariableStatement(node)) {
      const decl = node.declarationList.declarations[0];
      if (
        decl &&
        decl.initializer &&
        decl.initializer.kind === ts.SyntaxKind.ObjectLiteralExpression
      ) {
        const name = decl.name.escapedText;
        // 安全提取对象字面量源码
        const start = decl.initializer.pos;
        const end = decl.initializer.end;
        if (
          typeof start === "number" &&
          typeof end === "number" &&
          start >= 0 &&
          end > start &&
          end <= tsContent.length
        ) {
          const objStr = tsContent.substring(start, end);
          let obj;
          try {
            obj = eval("(" + objStr + ")");
            tables.push({ name, ...obj });
          } catch (e) {
            // 跳过无法 eval 的对象
          }
        }
      }
    }
  });
  return tables;
}
