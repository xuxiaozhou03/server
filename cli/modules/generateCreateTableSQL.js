/**
 * 根据 Table 对象生成 CREATE TABLE SQL 语句
 * @param {any} table
 * @returns {string}
 */
function generateCreateTableSQL(table) {
  const lines = [`CREATE TABLE \`${table.name}\` (`];
  for (const col of table.columns) {
    let line = `  \`${col.name}\` ${col.dataType}`;
    if (col.length) line += `(${col.length})`;
    if (col.enumValues)
      line += `(${col.enumValues.map((e) => `'${e.value}'`).join(",")})`;
    if (col.unsigned) line += " UNSIGNED";
    if (col.zerofill) line += " ZEROFILL";
    if (col.nullable === false) line += " NOT NULL";
    if (col.unique) line += " UNIQUE";
    if (col.autoIncrement) line += " AUTO_INCREMENT";
    if (col.defaultValue !== undefined)
      line += ` DEFAULT '${col.defaultValue}'`;
    if (col.comment) line += ` COMMENT '${col.comment}'`;
    lines.push(line + ",");
  }
  // 主键
  const pk = table.columns.find((c) => c.primaryKey);
  if (pk) lines.push(`  PRIMARY KEY (\`${pk.name}\`),`);
  // 外键
  for (const col of table.columns) {
    if (col.foreignKey) {
      lines.push(
        `  FOREIGN KEY (\`${col.name}\`) REFERENCES \`${col.foreignKey.table}\`(\`${col.foreignKey.field}\`),`
      );
    }
  }
  // 去掉最后逗号
  lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, "");
  lines.push(") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
  return lines.join("\n");
}

module.exports = { generateCreateTableSQL };
