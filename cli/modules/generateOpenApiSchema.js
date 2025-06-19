/**
 * 生成 OpenAPI Schema（简化版）
 * @param {any} table
 * @returns {object}
 */
function generateOpenApiSchema(table) {
  const properties = {};
  for (const col of table.columns) {
    let type = "string";
    if (["INT", "FLOAT", "DECIMAL"].includes(col.dataType)) type = "number";
    if (col.dataType === "DATETIME") type = "string";
    if (col.dataType === "ENUM") type = "string";
    if (col.dataType === "BOOLEAN") type = "boolean";
    properties[col.name] = { type };
    if (col.enumValues)
      properties[col.name].enum = col.enumValues.map((e) => e.value);
    if (col.comment) properties[col.name].description = col.comment;
  }
  return {
    type: "object",
    properties,
    required: table.columns
      .filter((c) => c.nullable === false)
      .map((c) => c.name),
    description: table.comment || "",
  };
}

module.exports = { generateOpenApiSchema };
