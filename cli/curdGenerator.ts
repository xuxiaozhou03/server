import fs from "fs";
import path from "path";

export function genCurd(table: any): string {
  const pk = table.fields.find((f: any) => f.primaryKey) || table.fields[0];
  const idField = pk.field;
  return `// ${table.name} CURD\nconst express = require('express');\nconst router = express.Router();\n\n// 查询所有\nrouter.get('/', async (req, res) => {\n  // TODO: 查询所有\n  res.send([]);\n});\n// 查询单个\nrouter.get('/:id', async (req, res) => {\n  // TODO: 查询单个\n  res.send({});\n});\n// 新增\nrouter.post('/', async (req, res) => {\n  // TODO: 新增\n  res.send({});\n});\n// 更新\nrouter.put('/:id', async (req, res) => {\n  // TODO: 更新\n  res.send({});\n});\n// 删除\nrouter.delete('/:id', async (req, res) => {\n  // TODO: 删除\n  res.send({});\n});\n\nmodule.exports = router;\n`;
}
