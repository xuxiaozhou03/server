/**
 * 生成 CURD SQL 语句（insert/select/update/delete），支持链表 join
 * @param {any} table
 * @returns {object}
 */
function generateCurdSQL(table) {
  const tableName = table.name;
  const fields = table.columns.map((c) => c.name);
  // insert
  const insert = `INSERT INTO \`${tableName}\` (${fields
    .map((f) => `\`${f}\``)
    .join(", ")}) VALUES (${fields.map(() => "?").join(", ")});`;
  // select
  const select = `SELECT ${fields
    .map((f) => `\`${tableName}\`.\`${f}\``)
    .join(", ")} FROM \`${tableName}\``;
  // update
  const update = `UPDATE \`${tableName}\` SET ${fields
    .map((f) => `\`${f}\` = ?`)
    .join(", ")} WHERE \`id\` = ?;`;
  // delete
  const del = `DELETE FROM \`${tableName}\` WHERE \`id\` = ?;`;
  // join 示例（只处理外键）
  const joins = table.columns
    .filter((c) => c.foreignKey)
    .map(
      (c) =>
        `LEFT JOIN \`${c.foreignKey.table}\` ON \`${tableName}\`.\`${c.name}\` = \`${c.foreignKey.table}\`.\`${c.foreignKey.field}\``
    );
  const selectWithJoin = joins.length ? `${select} ${joins.join(" ")}` : select;
  return { insert, select, update, delete: del, selectWithJoin };
}

module.exports = { generateCurdSQL };
