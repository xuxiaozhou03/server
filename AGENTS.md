# 产品交付平台 - 协作规则

## 1. 工作范围
- 平台代码可位于 `server/`、`public/`、`scripts/`；产品内容位于 `products/<product-id>/`。
- `product-id` 使用小写英文、数字和连字符。
- 修改已有产品时，优先沿用该产品的数据模型、交互约定与目录结构，不做无必要的重构。

## 2. 产品形态
一个仓库只允许一个产品（`products/` 下必须且只能有一个带 `meta.json` 的产品目录），根入口直接进入该产品，不再展示产品列表。

每套产品由 Node 工作台统一承载：
- `.prototype-area`：左侧 iframe，加载产品自己的可交互 HTML 画布。
- `.insight-panel`：右侧说明面板，固定包含“本页需求 / 引导讲解 / 技术闭环”三个 Tab。
- Tour 层：由工作台统一实现，支持跨页切换、打开订单详情和定位真实 DOM。

产品必须按页面拆成独立 HTML，默认页面为 `dashboard.html`、`orders.html`、`customers.html`，不得用一个 HTML 中隐藏/显示页面来模拟多页。页面之间使用 `<a href>` 导航，并由工作台路由承载：`/p/dashboard`、`/p/orders`、`/p/customers`。`/p/` 后只能出现页面 ID，不得出现产品目录 ID 或 `products/<id>`。产品画布必须使用原生 HTML/CSS/JS，能够通过 `/canvas/<page>.html` 直接运行；iframe 切页也使用这些画布地址，不得把工作台路由递归装入 iframe。视觉参考 Tailwind + shadcn 的语义 token、字号、间距和组件观感，但不得引入 Tailwind、React、shadcn、Vite、Swagger UI、CDN 或任何前端构建依赖。

## 3. 设计资产先行
新需求先评估并维护以下设计资产，再同步产品画布：
1. `products/<id>/database/schema.json`：表、字段、主键、外键、索引和实体关系。该文件只表达数据库设计，不启动或连接本地数据库。
2. `products/<id>/api/openapi.json`：唯一 API 契约源，供系统内编辑、预览和独立文档生成。
3. `products/<id>/prototype/data/*.json`：需求、技术闭环与 Tour 数据，不在 HTML 中硬编码大段说明。
4. `products/<id>/meta.json`：产品元信息、体验配置文件、版本和更新时间。

数据模型应能解释产品界面的业务语义；接口契约应覆盖画布中的核心读写动作。数据库与 API 不允许各说各话。

页面配置必须通过 `pages.<page>` 关联需求、页面改动、验收点、数据表与 OpenAPI 操作。右侧面板至少展示“关联需求、本页需求改动、本页验收点、关联数据表、关联接口”，并允许从表 Chip 直达 `/p/database?table=<table>`、从接口卡片直达 `/p/docs#<operationId>`。

## 4. 交付流程
收到新需求时按顺序执行：
1. 给出简短方案与现有上下文的闭环评估。
2. 先更新数据库设计和 API 契约。
3. 更新需求、技术闭环与 Tour 数据。
4. 更新可直接运行的原生 HTML 产品画布。
5. 更新 `meta.json` 的 version 和 updatedAt。
6. 运行 `npm run validate`，并检查页面、Tour 和接口文档。

## 5. 体验与验收
- 主界面必须真实可点击、有状态变化，不得只是静态截图。
- Tour 每一步必须绑定真实 DOM 选择器并关联需求；跨页步骤显式声明 `page`。
- 工作台路由发生变化时，画布查询参数必须透传，保证筛选、客户和指定订单状态可恢复。
- 右侧必须展示当前页面关联的需求、改动、验收点、数据表和接口；技术闭环必须能进入 `/p/database`、`/p/api` 和 `/p/docs`。
- 所有页面资源本地化，不依赖外网。
- 不启动 SQLite / PostgreSQL / MySQL 等本地数据库服务。
- 不使用 Markdown 文档替代可运行产品。
