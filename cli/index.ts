import fs from "fs";
import path from "path";
import { extractTables } from "./tableExtractor";
import { genSQL } from "./sqlGenerator";
import { genCurd } from "./curdGenerator";
import { genSwagger } from "./swaggerGenerator";
import { genCurdSql } from "./genCurdSql";

// 1. 读取db目录下所有ts文件
const dbDir = path.resolve(__dirname, "../db");
const dbFiles = fs.readdirSync(dbDir).filter((f) => f.endsWith(".ts"));
let tables: any[] = [];
dbFiles.forEach((file) => {
  const filePath = path.join(dbDir, file);
  const content = fs.readFileSync(filePath, "utf-8");
  tables = tables.concat(extractTables(content, filePath));
});

console.log(JSON.stringify(tables, null, 2));

// 3. 确保输出目录存在
const outDir = path.resolve(__dirname, "..", "out");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

// 4. 生成建表SQL
const sqlDir = path.resolve(outDir, "sql");
if (!fs.existsSync(sqlDir)) fs.mkdirSync(sqlDir);
tables.forEach((table) => {
  const sql = genSQL(table);
  fs.writeFileSync(path.join(sqlDir, `${table.name}.sql`), sql, "utf-8");
});

// 5. 生成CURD SQL语句（含链表操作）
const curdSqlDir = path.resolve(outDir, "curd-sql");
if (!fs.existsSync(curdSqlDir)) fs.mkdirSync(curdSqlDir);
tables.forEach((table) => {
  const content = genCurdSql(table, tables);
  fs.writeFileSync(
    path.join(curdSqlDir, `${table.name}.sql`),
    content,
    "utf-8"
  );
});
