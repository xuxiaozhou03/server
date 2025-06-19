/**
 * 生成 CURD 接口定义（RESTful 风格）
 * @param {any} table
 * @returns {string[]}
 */
function generateCurdApi(table) {
  const base = `/${table.name}`;
  return [
    `GET    ${base}        // 列表`,
    `GET    ${base}/:id    // 详情`,
    `POST   ${base}        // 新增`,
    `PUT    ${base}/:id    // 修改`,
    `DELETE ${base}/:id    // 删除`,
  ];
}

module.exports = { generateCurdApi };
