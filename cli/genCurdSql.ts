import { Table } from "./type";

/**
 * 生成 CURD SQL 语句，支持链表（外键）操作
 * @param table 当前表结构
 * @param allTables 所有表结构
 */
export function genCurdSql(table: Table, allTables: Table[]): string {
  const { name, fields } = table;
  const pk = fields.find((f) => f.primaryKey) || fields[0];
  const idField = pk.field;

  // 关联字段 join 语句
  const joinClauses: string[] = [];
  const selectFields: string[] = fields.map((f) => `t.\`${f.field}\``);
  fields.forEach((f) => {
    if (f.foreignKey) {
      const refTable = allTables.find(
        (t) => t.name === f.foreignKey!.referencedTable
      );
      if (refTable) {
        joinClauses.push(
          `LEFT JOIN \`${refTable.name}\` AS ${refTable.name} ON t.\`${
            f.field
          }\` = ${refTable.name}.\`${f.foreignKey!.referencedColumn}\``
        );
        // 展开主表 select 字段
        refTable.fields.forEach((rf) => {
          selectFields.push(
            `${refTable.name}.\`${rf.field}\` AS ${refTable.name}__${rf.field}`
          );
        });
      }
    }
  });

  // 查询所有（带 join）
  const selectAll = `SELECT ${selectFields.join(", ")} FROM \`${name}\` AS t${
    joinClauses.length ? " " + joinClauses.join(" ") : ""
  };`;
  // 查询单个
  const selectOne = `SELECT ${selectFields.join(", ")} FROM \`${name}\` AS t${
    joinClauses.length ? " " + joinClauses.join(" ") : ""
  } WHERE t.\`${idField}\` = ?;`;
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
