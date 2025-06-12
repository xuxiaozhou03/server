function genSwagger(tables) {
  const paths = {};
  tables.forEach((table) => {
    const name = table.name;
    paths[`/${name}`] = {
      get: {
        summary: `获取${name}列表`,
        responses: { 200: { description: "OK" } },
      },
      post: {
        summary: `新增${name}`,
        responses: { 200: { description: "OK" } },
      },
    };
    paths[`/${name}/{id}`] = {
      get: {
        summary: `获取单个${name}`,
        responses: { 200: { description: "OK" } },
      },
      put: {
        summary: `更新${name}`,
        responses: { 200: { description: "OK" } },
      },
      delete: {
        summary: `删除${name}`,
        responses: { 200: { description: "OK" } },
      },
    };
  });
  return {
    openapi: "3.0.0",
    info: { title: "API", version: "1.0.0" },
    paths,
  };
}

module.exports = { genSwagger };
