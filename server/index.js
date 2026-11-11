const path = require("node:path");
const fs = require("fs-extra");
const express = require("express");
const cors = require("cors");
const {
  CANVAS_PAGES,
  isValidProductId,
  readProductExperience,
  readProductMeta,
  renderRequirementDetailPage,
  renderRequirementIndexPage,
  renderWorkspacePage,
} = require("./workspace");
const {
  assertValidDesignDocument,
  designSummary,
  readProductDesign,
  renderApiDocsPage,
  renderApiStudioPage,
  renderDatabasePage,
} = require("./design");

const app = express();
const PORT = Number(process.env.PORT) || 3020;

const ROOT_DIR = path.resolve(__dirname, "..");
const PRODUCTS_DIR = path.join(ROOT_DIR, "products");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const PAGE_ROUTES = {
  dashboard: "/p/dashboard",
  orders: "/p/orders",
  customers: "/p/customers",
};

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.get("/index.html", (_req, res) => res.redirect(302, "/"));
app.use(express.static(PUBLIC_DIR, { index: false }));

/**
 * 读取全部产品元信息。没有 meta.json 或内容非法的目录会被跳过，
 * 避免一个未完成的产品阻断整个门户页面。
 */
async function readProducts() {
  await fs.ensureDir(PRODUCTS_DIR);
  const entries = await fs.readdir(PRODUCTS_DIR, { withFileTypes: true });
  const products = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const metaPath = path.join(PRODUCTS_DIR, entry.name, "meta.json");
    if (!(await fs.pathExists(metaPath))) continue;

    try {
      const meta = await fs.readJson(metaPath);
      products.push(meta);
    } catch (error) {
      console.warn(`跳过无法读取的产品元信息: ${metaPath} (${error.message})`);
    }
  }

  return products.sort((a, b) => a.id.localeCompare(b.id));
}

async function readCurrentProduct() {
  const products = await readProducts();
  if (!products.length) {
    const error = new Error("尚未创建产品");
    error.statusCode = 404;
    throw error;
  }
  if (products.length > 1) {
    const error = new Error("当前仓库包含多个产品，请保持一仓库一产品");
    error.statusCode = 409;
    throw error;
  }
  return products[0];
}

async function readCurrentDesign() {
  const meta = await readCurrentProduct();
  return {
    id: meta.id,
    meta,
    design: await readProductDesign(PRODUCTS_DIR, meta.id),
  };
}

function queryString(query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query || {})) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, String(item)));
    } else if (value !== undefined) {
      params.append(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function sendError(res, error, next) {
  if (error.statusCode) {
    return res.status(error.statusCode).send(error.message);
  }
  return next(error);
}

app.get("/api/products", async (_req, res, next) => {
  try {
    res.json(await readProducts());
  } catch (error) {
    next(error);
  }
});

app.get("/api/products/:id", async (req, res, next) => {
  try {
    const meta = await readProductMeta(PRODUCTS_DIR, req.params.id);
    if (!meta) {
      return res.status(404).json({ error: "产品不存在", id: req.params.id });
    }
    res.json(meta);
  } catch (error) {
    next(error);
  }
});

// Node 负责组装统一工作台所需的产品说明与 Tour 数据。
app.get("/api/products/:id/experience", async (req, res, next) => {
  try {
    const meta = await readProductMeta(PRODUCTS_DIR, req.params.id);
    if (!meta) {
      return res.status(404).json({ error: "产品不存在", id: req.params.id });
    }

    const experience = await readProductExperience(
      PRODUCTS_DIR,
      req.params.id,
      meta,
    );
    res.json({
      product: meta,
      pageTitle: experience.pageTitle,
      requirements: experience.requirements,
      technical: experience.technical,
      pages: experience.pages,
      tour: experience.tour,
    });
  } catch (error) {
    if (error.code === "ENOENT") {
      return res
        .status(404)
        .json({ error: "产品体验配置不存在", id: req.params.id });
    }
    next(error);
  }
});

app.get("/api/products/:id/database", async (req, res, next) => {
  try {
    const meta = await readProductMeta(PRODUCTS_DIR, req.params.id);
    if (!meta) return res.status(404).json({ error: "产品不存在", id: req.params.id });
    const design = await readProductDesign(PRODUCTS_DIR, req.params.id);
    if (!design.schema) return res.status(404).json({ error: "数据库设计不存在", id: req.params.id });
    res.json({ product: meta, schema: design.schema, summary: designSummary(design) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/products/:id/openapi", async (req, res, next) => {
  try {
    const meta = await readProductMeta(PRODUCTS_DIR, req.params.id);
    if (!meta) return res.status(404).json({ error: "产品不存在", id: req.params.id });
    const design = await readProductDesign(PRODUCTS_DIR, req.params.id);
    if (!design.openapi) return res.status(404).json({ error: "OpenAPI 契约不存在", id: req.params.id });
    if (design.openapi.parseError) return res.status(422).json({ error: design.openapi.parseError });
    res.json(design.openapi);
  } catch (error) {
    next(error);
  }
});

app.put("/api/products/:id/openapi", async (req, res, next) => {
  try {
    const meta = await readProductMeta(PRODUCTS_DIR, req.params.id);
    if (!meta) return res.status(404).json({ error: "产品不存在", id: req.params.id });

    let document;
    try {
      document = assertValidDesignDocument(req.body);
    } catch (error) {
      return res.status(422).json({ error: error.message });
    }

    const targetPath = path.join(PRODUCTS_DIR, req.params.id, "api", "openapi.json");
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeJson(targetPath, document, { spaces: 2 });
    res.json({ ok: true, openapi: document });
  } catch (error) {
    next(error);
  }
});

// 当前仓库只有一个产品，因此设计资产 API 不再要求调用方知道产品目录名。
app.get("/api/database", async (_req, res, next) => {
  try {
    const { id, meta, design } = await readCurrentDesign();
    if (!design.schema) return res.status(404).json({ error: "数据库设计不存在", id });
    res.json({ product: meta, schema: design.schema, summary: designSummary(design) });
  } catch (error) {
    sendError(res, error, next);
  }
});

app.get("/api/openapi", async (_req, res, next) => {
  try {
    const { id, design } = await readCurrentDesign();
    if (!design.openapi) return res.status(404).json({ error: "OpenAPI 契约不存在", id });
    if (design.openapi.parseError) return res.status(422).json({ error: design.openapi.parseError });
    res.json(design.openapi);
  } catch (error) {
    sendError(res, error, next);
  }
});

app.put("/api/openapi", async (req, res, next) => {
  try {
    const { id } = await readCurrentDesign();
    let document;
    try {
      document = assertValidDesignDocument(req.body);
    } catch (error) {
      return res.status(422).json({ error: error.message });
    }

    const targetPath = path.join(PRODUCTS_DIR, id, "api", "openapi.json");
    await fs.ensureDir(path.dirname(targetPath));
    await fs.writeJson(targetPath, document, { spaces: 2 });
    res.json({ ok: true, openapi: document });
  } catch (error) {
    sendError(res, error, next);
  }
});

// 产品画布只包含产品自身的 UI；右侧说明与 Tour 由 Node 工作台注入。
app.use("/canvas", async (req, res, next) => {
  try {
    const { id } = await readCurrentProduct();
    const prototypeDir = path.join(PRODUCTS_DIR, id, "prototype");
    if (!(await fs.pathExists(prototypeDir))) {
      return res.status(404).json({ error: "产品原型不存在", id });
    }

    express.static(prototypeDir, { index: false })(req, res, next);
  } catch (error) {
    sendError(res, error, next);
  }
});

// Node 返回统一工作台外壳，再把当前独立 HTML 页面挂载到左侧区域。
async function sendWorkspace(req, res, next, page = "dashboard") {
  try {
    const { id, meta } = await readCurrentDesign();
    const experience = await readProductExperience(PRODUCTS_DIR, id, meta);
    const design = await readProductDesign(PRODUCTS_DIR, id);
    res.type("html").send(renderWorkspacePage({
      id,
      meta,
      experience,
      schema: design.schema,
      openapi: design.openapi,
      designSummary: designSummary(design),
      page,
      canvasQuery: queryString(req.query).slice(1),
    }));
  } catch (error) {
    if (error.code === "ENOENT") {
      return res.status(404).send("产品体验配置不存在");
    }
    sendError(res, error, next);
  }
}

async function readWorkspaceData() {
  const { id, meta, design } = await readCurrentDesign();
  const experience = await readProductExperience(PRODUCTS_DIR, id, meta);
  return {
    id,
    meta,
    experience,
    schema: design.schema,
    openapi: design.openapi,
    designSummary: designSummary(design),
  };
}

app.get("/", async (_req, res, next) => {
  try {
    const data = await readWorkspaceData();
    res.type("html").send(renderRequirementIndexPage(data));
  } catch (error) {
    sendError(res, error, next);
  }
});

app.get(["/p/:requirementId", "/p/:requirementId/"], async (req, res, next) => {
  const requirementId = String(req.params.requirementId || "").toUpperCase();
  if (!/^REQ-[A-Z0-9-]+$/.test(requirementId)) return next();

  try {
    const data = await readWorkspaceData();
    const requirement = (data.experience.requirements?.items || [])
      .find((item) => String(item.id).toUpperCase() === requirementId);
    if (!requirement) return res.status(404).send("需求不存在");
    const html = renderRequirementDetailPage({
      ...data,
      requirementId: requirement.id,
      selectedPage: String(req.query.page || ""),
      canvasQuery: queryString(req.query).slice(1),
    });
    if (!html) return res.status(404).send("需求不存在");
    res.type("html").send(html);
  } catch (error) {
    sendError(res, error, next);
  }
});

for (const [page, route] of Object.entries(PAGE_ROUTES)) {
  app.get([route, `${route}/`], (req, res, next) => sendWorkspace(req, res, next, page));
}

// 设计资产使用服务端原生 HTML 渲染，避免引入 Swagger UI 或 YAML 运行时。
app.get(["/p/database", "/p/database/"], async (req, res, next) => {
  try {
    const { id, design } = await readCurrentDesign();
    if (!design.schema) return res.status(404).send("数据库设计不存在");
    res.type("html").send(renderDatabasePage({ schema: design.schema, productId: id }));
  } catch (error) {
    sendError(res, error, next);
  }
});

app.get(["/p/api", "/p/api/"], async (_req, res, next) => {
  try {
    const { id, design } = await readCurrentDesign();
    if (!design.openapi) return res.status(404).send("OpenAPI 契约不存在");
    if (design.openapi.parseError) return res.status(422).send(design.openapi.parseError);
    res.type("html").send(renderApiStudioPage({ openapi: design.openapi, productId: id }));
  } catch (error) {
    sendError(res, error, next);
  }
});

app.get(["/p/docs", "/p/docs/"], async (_req, res, next) => {
  try {
    const { design } = await readCurrentDesign();
    if (!design.openapi) return res.status(404).send("OpenAPI 契约不存在");
    if (design.openapi.parseError) return res.status(422).send(design.openapi.parseError);
    res.type("html").send(renderApiDocsPage({ openapi: design.openapi }));
  } catch (error) {
    sendError(res, error, next);
  }
});

// 旧产品前缀只做一次性兼容跳转；新导航与页面地址绝不暴露产品目录名。
const PRODUCT_PREFIX_REDIRECTS = {
  dashboard: "/p/dashboard",
  orders: "/p/orders",
  customers: "/p/customers",
  database: "/p/database",
  api: "/p/api",
  docs: "/p/docs",
};
app.get(["/p/demo-order", "/p/demo-order/"], (req, res) => {
  res.redirect(302, `/`);
});
app.get(["/p/demo-order/:page", "/p/demo-order/:page/"], (req, res) => {
  const target = PRODUCT_PREFIX_REDIRECTS[req.params.page];
  if (!target) return res.status(404).send("页面不存在");
  res.redirect(302, `${target}${queryString(req.query)}`);
});

// 裸路径仅用于旧书签兼容；页面导航统一使用 /p/<page-id>。
for (const [legacy, target] of Object.entries({
  "/dashboard": "/p/dashboard",
  "/orders": "/p/orders",
  "/customers": "/p/customers",
  "/database": "/p/database",
  "/api": "/p/api",
  "/docs": "/p/docs",
})) {
  app.get([legacy, `${legacy}/`], (req, res) => {
    res.redirect(302, `${target}${queryString(req.query)}`);
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "服务器内部错误" });
});

const server = app.listen(PORT, "127.0.0.1", () => {
  console.log(`Product Platform running at http://localhost:${PORT}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down`);
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
