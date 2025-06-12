'use strict';

var fs = require('fs');
var path = require('path');
var ts = require('typescript');

function extractTables(tsContent, filePath) {
    const source = ts.createSourceFile(filePath, tsContent, ts.ScriptTarget.ES2015, true);
    const tables = [];
    source.forEachChild((node) => {
        if (ts.isVariableStatement(node)) {
            const decl = node.declarationList.declarations[0];
            if (decl &&
                decl.initializer &&
                decl.initializer.kind === ts.SyntaxKind.ObjectLiteralExpression) {
                const name = decl.name.escapedText;
                // 安全提取对象字面量源码
                const start = decl.initializer.pos;
                const end = decl.initializer.end;
                if (typeof start === "number" &&
                    typeof end === "number" &&
                    start >= 0 &&
                    end > start &&
                    end <= tsContent.length) {
                    const objStr = tsContent.substring(start, end);
                    let obj;
                    try {
                        obj = eval("(" + objStr + ")");
                        tables.push({ name, ...obj });
                    }
                    catch (e) {
                        // 跳过无法 eval 的对象
                    }
                }
            }
        }
    });
    return tables;
}

function genSQL(table) {
    const fields = table.fields.map((f) => {
        let line = `\`${f.field}\` ${f.type.toUpperCase()}`;
        if (f.length)
            line += `(${f.length})`;
        if (f.unsigned)
            line += " UNSIGNED";
        if (!f.nullable)
            line += " NOT NULL";
        if (f.autoIncrement)
            line += " AUTO_INCREMENT";
        if (f.primaryKey)
            line += " PRIMARY KEY";
        if (f.unique)
            line += " UNIQUE";
        if (f.default !== undefined)
            line += ` DEFAULT '${f.default}'`;
        if (f.comment)
            line += ` COMMENT '${f.comment}'`;
        return line;
    });
    table.fields.forEach((f) => {
        if (f.foreignKey) {
            fields.push(`FOREIGN KEY (\`${f.field}\`) REFERENCES \`${f.foreignKey.referencedTable}\`(\`${f.foreignKey.referencedColumn}\`)`);
        }
    });
    return `CREATE TABLE IF NOT EXISTS \`${table.name}\` (\n  ${fields.join(",\n  ")}\n);`;
}

/**
 * 生成 CURD SQL 语句，支持链表（外键）操作
 * @param table 当前表结构
 * @param allTables 所有表结构
 */
function genCurdSql(table, allTables) {
    const { name, fields } = table;
    const pk = fields.find((f) => f.primaryKey) || fields[0];
    const idField = pk.field;
    // 关联字段 join 语句
    const joinClauses = [];
    const selectFields = fields.map((f) => `t.\`${f.field}\``);
    fields.forEach((f) => {
        if (f.foreignKey) {
            const refTable = allTables.find((t) => t.name === f.foreignKey.referencedTable);
            if (refTable) {
                joinClauses.push(`LEFT JOIN \`${refTable.name}\` AS ${refTable.name} ON t.\`${f.field}\` = ${refTable.name}.\`${f.foreignKey.referencedColumn}\``);
                // 展开主表 select 字段
                refTable.fields.forEach((rf) => {
                    selectFields.push(`${refTable.name}.\`${rf.field}\` AS ${refTable.name}__${rf.field}`);
                });
            }
        }
    });
    // 查询所有（带 join）
    const selectAll = `SELECT ${selectFields.join(", ")} FROM \`${name}\` AS t${joinClauses.length ? " " + joinClauses.join(" ") : ""};`;
    // 查询单个
    const selectOne = `SELECT ${selectFields.join(", ")} FROM \`${name}\` AS t${joinClauses.length ? " " + joinClauses.join(" ") : ""} WHERE t.\`${idField}\` = ?;`;
    // 新增
    const insert = `INSERT INTO \`${name}\` (${fields
        .map((f) => `\`${f.field}\``)
        .join(", ")}) VALUES (${fields.map((_) => "?").join(", ")});`;
    // 更新
    const update = `UPDATE \`${name}\` SET ${fields
        .filter((f) => f.field !== idField)
        .map((f) => `\`${f.field}\` = ?`)
        .join(", ")} WHERE \`${idField}\` = ?;`;
    // 删除
    const del = `DELETE FROM \`${name}\` WHERE \`${idField}\` = ?;`;
    return [
        `-- 查询所有（含链表）\n${selectAll}`,
        `-- 查询单个（含链表）\n${selectOne}`,
        `-- 新增\n${insert}`,
        `-- 更新\n${update}`,
        `-- 删除\n${del}`,
    ].join("\n\n");
}

// 1. 读取db目录下所有ts文件
const dbDir = path.resolve(__dirname, "../db");
const dbFiles = fs.readdirSync(dbDir).filter((f) => f.endsWith(".ts"));
let tables = [];
dbFiles.forEach((file) => {
    const filePath = path.join(dbDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    tables = tables.concat(extractTables(content, filePath));
});
console.log(JSON.stringify(tables, null, 2));
// 3. 确保输出目录存在
const outDir = path.resolve(__dirname, "..", "out");
if (!fs.existsSync(outDir))
    fs.mkdirSync(outDir);
// 4. 生成建表SQL
const sqlDir = path.resolve(outDir, "sql");
if (!fs.existsSync(sqlDir))
    fs.mkdirSync(sqlDir);
tables.forEach((table) => {
    const sql = genSQL(table);
    fs.writeFileSync(path.join(sqlDir, `${table.name}.sql`), sql, "utf-8");
});
// 5. 生成CURD SQL语句（含链表操作）
const curdSqlDir = path.resolve(outDir, "curd-sql");
if (!fs.existsSync(curdSqlDir))
    fs.mkdirSync(curdSqlDir);
tables.forEach((table) => {
    const content = genCurdSql(table, tables);
    fs.writeFileSync(path.join(curdSqlDir, `${table.name}.sql`), content, "utf-8");
});
//# sourceMappingURL=cli.js.map
