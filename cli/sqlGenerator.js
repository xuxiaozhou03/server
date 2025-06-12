function genSQL(table) {
  const fields = table.fields.map((f) => {
    let line = `\`${f.field}\` ${f.type.toUpperCase()}`;
    if (f.length) line += `(${f.length})`;
    if (f.unsigned) line += " UNSIGNED";
    if (!f.nullable) line += " NOT NULL";
    if (f.autoIncrement) line += " AUTO_INCREMENT";
    if (f.primaryKey) line += " PRIMARY KEY";
    if (f.unique) line += " UNIQUE";
    if (f.default !== undefined) line += ` DEFAULT '${f.default}'`;
    if (f.comment) line += ` COMMENT '${f.comment}'`;
    return line;
  });
  table.fields.forEach((f) => {
    if (f.foreignKey) {
      fields.push(
        `FOREIGN KEY (\`${f.field}\`) REFERENCES \`${f.foreignKey.referencedTable}\`(\`${f.foreignKey.referencedColumn}\`)`
      );
    }
  });
  return `CREATE TABLE IF NOT EXISTS \`${table.name}\` (\n  ${fields.join(
    ",\n  "
  )}\n);`;
}

module.exports = { genSQL };
