# 产品交付平台

一个仓库只交付一个产品。Node 统一承载产品工作台，左侧挂载可直接运行的原生 HTML 产品页面，右侧展示需求说明、跨页 Tour 与技术闭环。

## 产品形态

订单运营中心不是把所有内容塞进一个 HTML，也不是一组孤立页面，而是一套连续的产品交付物：

1. **独立页面**：经营概览、订单管理、客户管理分别对应独立 HTML，并通过真实工作台路由导航。
2. **数据库设计**：先维护表、字段、键、索引和关系，不启动或连接本地数据库。
3. **API 设计**：在系统内编辑 `openapi.json`，保存后即时预览契约。
4. **接口文档**：根据 OpenAPI 生成 Swagger 风格只读文档，不引入 Swagger UI。
5. **需求与引导**：以页面为中心关联需求、本页改动、验收点、数据表和接口；Tour 能跨页切换并打开真实订单详情。

前端视觉采用 Tailwind + shadcn 风格的语义 token、排版、间距和组件观感，但所有页面仍是原生 HTML/CSS/JS；不引入 Tailwind、React、shadcn、Vite 或 CDN。

## 快速开始

```bash
npm install
npm run dev
```

打开 [http://localhost:3020](http://localhost:3020)，服务端会直接进入当前唯一产品的经营概览，不展示产品列表。

## 页面入口

| 页面 | 地址 |
| --- | --- |
| 根入口 | <http://localhost:3020/>（跳转到 `/p/dashboard`） |
| 经营概览 | <http://localhost:3020/p/dashboard> |
| 订单管理 | <http://localhost:3020/p/orders> |
| 客户管理 | <http://localhost:3020/p/customers> |
| 独立画布：概览 | <http://localhost:3020/canvas/dashboard.html> |
| 独立画布：订单 | <http://localhost:3020/canvas/orders.html> |
| 独立画布：客户 | <http://localhost:3020/canvas/customers.html> |
| 数据库设计 | <http://localhost:3020/p/database> |
| API 设计器 | <http://localhost:3020/p/api> |
| 接口文档 | <http://localhost:3020/p/docs> |

页面 URL 使用 `/p/<page-id>`，`<page-id>` 是页面而不是产品 ID，因此不暴露产品目录。根入口、裸旧路径以及旧的 `/p/demo-order/*` 只做 302 兼容跳转；新导航、画布业务链接和所有页面入口只使用 `/p/*`。

## 页面与需求关联

页面关联模型位于 `products/demo-order/prototype/data/order-list.json` 的 `pages` 节点。每个页面必须声明：

- `requirementIds`：关联需求；
- `changes`：本页需求改动；
- `acceptance`：本页验收点；
- `tables`：关联数据库表；
- `operations`：关联 OpenAPI `operationId`。

右侧 `本页需求` 面板据此展示页面上下文，并提供精确下钻：`/p/database?table=orders` 直达表设计，`/p/docs#getOrder` 直达接口文档锚点。`npm run validate` 会拒绝不存在的需求、数据表或接口关联。

## 目录结构

```text
.
├── AGENTS.md                       # 产品与平台协作规则
├── server/
│   ├── index.js                    # Express 入口、页面和设计资产 API
│   ├── workspace.js                # 工作台、Insight 面板与 Tour 页面组装
│   └── design.js                   # 数据库/API 设计页与只读文档渲染
├── public/
│   ├── index.html                  # 无脚本兼容跳转页
│   └── shared/                     # 工作台、Tour、数据库与 API 设计交互
├── products/
│   └── demo-order/                  # 唯一产品的内部内容目录，不出现在页面 URL 中
│       ├── meta.json
│       ├── database/schema.json    # 数据库设计源
│       ├── api/openapi.json        # OpenAPI 唯一运行时源
│       └── prototype/
│           ├── dashboard.html      # 经营概览
│           ├── orders.html         # 订单管理
│           ├── customers.html      # 客户管理
│           ├── index.html          # 轻量重定向到概览
│           ├── data/               # 需求、技术闭环与 Tour
│           └── shared/             # 画布原生 CSS/JS
└── scripts/
    └── validate.js                 # 设计资产与产品完整性校验
```

## 数据库与 API 闭环

数据库设计从表结构开始，当前示例包含客户、订单、订单明细、订单动态和跟进记录。`schema.json` 中的字段引用、索引字段、外键目标和关系端点会被校验。

API 以 `api/openapi.json` 为唯一源：

```text
GET /api/database
GET /api/openapi
PUT /api/openapi
```

`PUT` 会校验 OpenAPI 3.x 结构、路径、`responses` 和 `$ref`；非法文档返回 `422`。保存后，API 设计器预览与独立文档页面读取同一份契约。

> 平台只展示和维护数据库设计，不启动 SQLite / PostgreSQL / MySQL，也不连接真实数据源。

## Tour 约定

工作台 URL 是页面导航的唯一入口；画布内的链接会提升到顶层工作台路由。Tour 默认在产品 iframe 内查找 `targetSelector`，需要高亮 Node 工作台元素时声明 `targetScope: "workspace"`。

```json
{
  "page": "orders",
  "openOrder": "ORD-1048",
  "targetSelector": ".order-drawer",
  "targetScope": "frame"
}
```

- `page`：在 iframe 中加载 `/canvas/dashboard.html`、`/canvas/orders.html` 或 `/canvas/customers.html`；不会递归加载工作台路由。
- `openOrder`：进入订单页后打开指定订单详情。
- `frame`（默认）：选择器作用于产品画布。
- `workspace`：选择器作用于 Node 工作台。

## 校验

```bash
npm run validate
```

校验范围包括：一仓库一产品、独立 HTML 页面完整性、真实导航链接、轻度重定向入口、页面需求/表/接口关联、体验配置、Tour 页面与目标、数据库表和字段唯一性、索引字段、外键与关系引用、OpenAPI 操作和 `$ref`、外部 CDN 引用、第三方前端构建依赖。

## 常用命令

```bash
npm run dev       # 启动本地服务，默认端口 3020
npm run validate  # 校验所有产品
```

> 如需临时换端口，可使用 `PORT=3107 npm run dev`。
