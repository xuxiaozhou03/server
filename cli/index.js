/*
任务流程：家教小程序表结构与接口自动生成

1. 读取 example/table.ts
   - 加载所有 Table 定义（如 userTable, demandTable, orderTable, reviewTable, messageTable）
2. 解析 table.ts 的内容
   - 解析每个 Table 的表名、注释、字段及字段属性
3. 生成创建表结构的 SQL
   - 根据字段类型、主键、外键、唯一约束等生成标准 MySQL CREATE TABLE 语句
4. 生成针对表结构的 CURD SQL
   - 针对每个表生成 insert、select、update、delete 语句
   - 支持链表（如外键关联的 join 查询）
5. 生成 CURD 接口
   - 为每个表生成 RESTful API 接口（如 /user、/demand 等）
   - 包括列表、详情、新增、修改、删除等接口
6. 生成 CURD 接口对应的 OpenAPI Schema
   - 根据接口输入输出结构，自动生成 OpenAPI 规范的 schema
7. 根据 OpenAPI Schema 生成前端接口代码
   - 通过 OpenAPI 规范自动生成 TypeScript 前端请求方法和类型定义

// 具体实现可按以上步骤逐步开发
*/

// 1. 读取 example/table.ts
const path = require("path");
const tableDefPath = path.resolve(__dirname, "../example/table.ts");
const { parseTableModule } = require("./modules/parseTable");
const { generateCreateTableSQL } = require("./modules/generateCreateTableSQL");
const { generateCurdSQL } = require("./modules/generateCurdSQL");
const { generateCurdApi } = require("./modules/generateCurdApi");
const { generateOpenApiSchema } = require("./modules/generateOpenApiSchema");
const { generateFrontendApi } = require("./modules/generateFrontendApi");

async function main() {
  // 1. 读取并解析表结构
  const tables = await parseTableModule(tableDefPath);
  console.log("=== 表结构 ===");
  tables.forEach((t) => console.log(t.name, t));

  // 2. 生成建表 SQL
  console.log("\n=== 建表 SQL ===");
  tables.forEach((t) => console.log(generateCreateTableSQL(t)));

  // 3. 生成 CURD SQL
  console.log("\n=== CURD SQL ===");
  tables.forEach((t) => console.log(t.name, generateCurdSQL(t)));

  // 4. 生成 CURD 接口
  console.log("\n=== CURD 接口 ===");
  tables.forEach((t) => console.log(t.name, generateCurdApi(t)));

  // 5. 生成 OpenAPI Schema
  console.log("\n=== OpenAPI Schema ===");
  tables.forEach((t) => console.log(t.name, generateOpenApiSchema(t)));

  // 6. 生成前端接口代码
  console.log("\n=== 前端接口代码 ===");
  tables.forEach((t) => {
    const schema = generateOpenApiSchema(t);
    console.log(
      t.name,
      "\n" +
        generateFrontendApi(
          schema,
          t.name.charAt(0).toUpperCase() + t.name.slice(1)
        )
    );
  });
}

main().catch(console.error);
