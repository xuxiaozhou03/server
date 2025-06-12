const fs = require("fs");
const path = require("path");
const { extractTables } = require("./tableExtractor");
const { genSQL } = require("./sqlGenerator");
const { genCurd } = require("./curdGenerator");
const { genSwagger } = require("./swaggerGenerator");

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

// // 3. 生成建表SQL
// const sqlDir = path.resolve(__dirname, "sql");
// if (!fs.existsSync(sqlDir)) fs.mkdirSync(sqlDir);
// tables.forEach((table) => {
//   const sql = genSQL(table);
//   fs.writeFileSync(path.join(sqlDir, `${table.name}.sql`), sql, "utf-8");
// });

// // 4. 生成CURD代码（以express风格为例）
// const curdDir = path.resolve(__dirname, "curd");
// if (!fs.existsSync(curdDir)) fs.mkdirSync(curdDir);
// tables.forEach((table) => {
//   const curd = genCurd(table);
//   fs.writeFileSync(path.join(curdDir, `${table.name}.js`), curd, "utf-8");
// });

// // 5. 生成swagger文档（OpenAPI 3.0）
// const swagger = genSwagger(tables);
// fs.writeFileSync(
//   path.resolve(__dirname, "swagger.json"),
//   JSON.stringify(swagger, null, 2),
//   "utf-8"
// );
