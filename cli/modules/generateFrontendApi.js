/**
 * 根据 OpenAPI Schema 生成前端 TypeScript 接口代码（简化版）
 * @param {object} schema
 * @param {string} name
 * @returns {string}
 */
function generateFrontendApi(schema, name) {
  const fields = Object.entries(schema.properties)
    .map(
      ([k, v]) =>
        `  ${k}: ${v.type === "number" ? "number" : "string"}; // ${
          v.description || ""
        }`
    )
    .join("\n");
  return `export interface ${name} {\n${fields}\n}`;
}

module.exports = { generateFrontendApi };
