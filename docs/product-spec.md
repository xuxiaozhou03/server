# Product Studio 产品说明（讨论稿）

> 状态：讨论稿，架构方向已确认 3 项
> 更新日期：2026-11-11  
> 适用范围：产品定位、系统边界、核心流程、交付规则与后续演进  
> 说明：本文用于对齐产品理解，不等同于最终 PRD。第 3.3 节记录已确认的架构决策，第 20 节记录决策状态与仍需讨论的事项。

---

## 1. 一句话定义

**Product Studio 是一套以需求为主线、连接产品设计、前后端实现、测试与交付的研发辅助系统。**

它采用**单仓库、pnpm workspace、单产品**的组织方式：

- 产品交付区保存产品事实：需求、页面、设计语言、数据库设计、API 契约、原型、正式代码、测试和发布记录。
- Product Studio 读取这些事实，负责展示、关联、拆分、检查和追踪。
- Product Studio 先以 Web 应用形态开发和调试，稳定后通过同一套核心能力提供 CLI。
- 正式前端和正式后端都位于同一工作区；原生 HTML 原型是独立资产。

核心目标不是展示更多页面，而是建立一条可追踪、可验证的交付链路：

```text
需求 → 页面 → 数据表 → 接口 → 前后端代码 → 测试 → 验收 → 发布
```

---

## 2. 背景与问题

当前常见的产品研发方式存在几个问题：

1. 需求和页面脱节。页面做完了，但无法快速确认它服务哪个需求、改了什么、如何验收。
2. 原型、正式前端和后端各自演进，缺少统一的产品上下文。
3. 数据库设计、API 契约和页面调用之间容易漂移。
4. 任务拆分依赖人工经验，开发、测试和验收之间缺少稳定的追踪关系。
5. PR 只能关联代码，很难完整说明它覆盖了哪些需求、页面、接口和测试。
6. 设计语言没有成为正式资产，组件样式在不同页面反复实现。
7. 产品演示、项目管理和研发流程是三个割裂的工具。

Product Studio 要解决的不是“如何画更多原型”，而是：

> **如何让一个产品的需求、设计、实现和测试始终对得上。**

---

## 3. 产品定位

### 3.1 单产品工作区

一个仓库只承载一个产品，是产品事实的唯一来源。产品区同时包含正式前端、正式后端、产品定义、设计语言、原型、契约、测试和交付记录。

产品工作区包含：

```text
单产品 pnpm workspace
├── 产品元信息与页面清单
├── 需求、业务流程与验收标准
├── 设计语言与组件规范
├── 数据库设计
├── OpenAPI 契约
├── 原生 HTML 产品原型
├── 正式前端代码
├── 正式后端代码
├── Product Studio Web 应用
├── Product Studio 核心能力与后续 CLI
├── 测试与验收用例
└── 发布与交付记录
```

### 3.2 Product Studio 辅助服务

Product Studio 与产品代码位于同一个 pnpm workspace，但在逻辑和运行边界上保持独立。它不拥有另一套产品事实，只读取和操作工作区中的产品资产。

它负责：

- 展示产品原型、需求上下文和技术闭环
- 以需求为维度组织页面，而不是展示孤立页面
- 展示数据库设计和 Swagger 风格接口文档
- 根据需求、页面、数据和接口生成交付计划草稿
- 拆分前端、后端、契约、测试和文档任务
- 人工确认后同步到 GitHub Issues、Linear 或 Jira
- 生成测试计划和测试任务
- 校验页面、数据库、OpenAPI 与代码之间的一致性
- 追踪分支、PR、测试、验收和发布状态

一句话边界：

> **产品区负责“真相”，Product Studio 负责“组织、检查、拆分和追踪”。**

### 3.3 已确认的架构决策

以下三项已确认，后续目录和实施计划以此为准。

#### 决策 1：采用 pnpm workspace，Product Studio 与产品代码共存

- 不先拆成两个独立仓库。
- 使用一个 pnpm workspace 承载单产品、正式前后端和 Product Studio。
- Product Studio 先作为工作区内的 Web 应用开发和调试。
- 稳定后提供 CLI，但不重新实现一套逻辑。
- `studio-core` 从第一天独立存在，Web 和 CLI 都是它的适配层。
- `apps/studio` 可以作为独立部署单元，但源代码仍位于当前工作区。

目标结构不是“Web 应用以后改写成 CLI”，而是：

```text
apps/studio ──────┐
                  ├──> packages/studio-core
packages/studio-cli ┘
```

Studio 的读取、校验、分析、任务生成、测试生成和同步逻辑必须放在 `studio-core`，不能写在页面组件或 Web 路由中。

#### 决策 2：产品仓同时包含正式前后端代码

当前仓库同时包含：

- 产品与需求
- 设计语言与组件规范
- 数据库设计与 OpenAPI 契约
- 原生 HTML 原型
- 正式前端 `apps/web`
- 正式后端 `apps/api`
- Product Studio `apps/studio`
- 共享包、测试和交付记录

因此，“一仓一产品”描述的是业务边界，不意味着仓库只能放原型。

#### 决策 3：原型与正式前端是两条独立资产

- 原生 HTML 原型位于 `product/prototype`，继续使用原生 HTML/CSS/JS。
- 正式前端直接建立在 `apps/web`，可以使用 Tailwind + shadcn。
- 两者独立安装依赖、独立构建、独立测试、独立演进。
- 两者只共享设计 token、语义规范、OpenAPI 契约和必要的静态资源。
- 正式前端的 React 组件库不得被原型反向依赖。
- 原型用于需求沟通和交互验证，不被强制纳入正式前端构建链。

```text
product/prototype     产品原型，原生 HTML/CSS/JS
apps/web              正式前端，Tailwind + shadcn
product/design        两者共享的设计源
product/api           两者共享的接口契约
```

---

## 4. 核心产品原则

1. **一仓一产品**：产品仓不同时承载多个产品。
2. **需求优先**：首页和主要导航以需求为维度，而不是全量页面清单。
3. **页面独立**：每个产品页面使用独立 HTML，不通过单页隐藏切换模拟多个页面。
4. **设计先行**：先维护数据库、API、设计语言和验收标准，再同步产品或原型。
5. **契约驱动**：数据库和 OpenAPI 是正式设计资产，页面必须显式声明关联。
6. **原型与正式前端分离**：原型保持原生 HTML/CSS/JS；正式前端位于 `apps/web`，可使用 Tailwind + shadcn；两者只共享设计 token 与契约。
7. **自动生成、人工确认**：自动拆分任务和测试，但创建外部任务前必须人工确认。
8. **可追踪**：需求、页面、数据表、接口、代码、测试和 PR 必须能互相定位。
9. **桌面端优先**：当前阶段只保证电脑端展示，不处理移动端和平板适配。
10. **不做孤立功能**：每个新增功能都必须进入需求和技术闭环。

---

## 5. 目标用户

| 用户 | 主要诉求 |
| --- | --- |
| 产品经理 | 快速说明需求、关联页面、确认范围和验收标准 |
| 设计师 | 维护设计语言、组件规范和交互原型 |
| 前端工程师 | 知道当前需求影响哪些页面、组件和接口 |
| 后端工程师 | 知道需要实现哪些表、接口和数据约束 |
| 测试工程师 | 从验收标准生成测试计划并追踪覆盖情况 |
| 技术负责人 | 检查契约一致性、任务依赖和交付风险 |
| 项目管理者 | 查看需求、任务、PR、测试和发布状态 |

---

## 6. 核心概念

| 概念 | 说明 |
| --- | --- |
| Product | 一个仓库中的一个产品 |
| Requirement | 业务需求，是产品交付的主索引 |
| Page | 可独立运行的产品页面 |
| Design System | 颜色、字体、间距、圆角、组件和状态规范 |
| Schema | 数据库表、字段、索引和外键关系 |
| API Contract | OpenAPI 形式的接口契约 |
| Prototype | 用于演示和验证交互的原生 HTML 页面 |
| Delivery Plan | 需求对应的交付计划和任务依赖图 |
| Task | 可执行的前端、后端、契约、测试或文档任务 |
| Test Case | 从验收标准推导出的手工或自动化测试 |
| Evidence | PR、测试结果、截图、验收记录等交付证据 |

核心关系：

```text
Product
├── Requirements
│   ├── Pages
│   ├── Schema Objects
│   ├── API Operations
│   ├── Delivery Tasks
│   └── Test Cases
├── Design System
├── Prototype
├── Frontend
├── Backend
└── Releases
```

一个需求可以关联多个页面；一个页面也可以服务多个需求。

---

## 7. 端到端流程

```text
1. 创建或更新需求
2. 明确业务流程、影响页面和验收标准
3. 更新数据库设计与 OpenAPI 契约
4. 更新设计语言和原生 HTML 原型
5. 生成交付计划草稿
6. 人工确认任务拆分和依赖关系
7. 创建前端、后端、契约、测试和文档任务
8. 开发和提交 PR
9. PR 关联需求、页面、接口和任务
10. 执行契约校验、自动化测试和人工验收
11. 汇总交付证据并更新需求状态
12. 发布并记录版本
```

任何阶段发现设计变化，都应回到对应资产更新，而不是只在代码中临时修补。

---

## 8. 信息架构

### 8.1 需求中心

首页以需求为维度展示：

- 需求 ID、标题和状态
- 关联页面
- 数据库影响
- 接口影响
- 需求改动
- 验收标准
- 测试覆盖
- 任务与交付状态

首页不应首先展示全量页面清单。

### 8.2 需求详情

用于讨论单个需求的完整上下文：

- 背景与目标
- 用户流程
- 关联页面
- 页面改动
- 验收标准
- 数据表
- 接口
- 测试计划
- 任务依赖
- PR 与发布状态

### 8.3 页面工作台

建议采用左右布局：

- 左侧：可交互产品画布
- 右侧：需求说明、引导讲解和技术闭环

右侧至少包含：

- 当前页面关联的需求
- 本页需求改动
- 本页验收点
- 关联数据表
- 关联接口
- 关联测试
- 当前任务和交付状态

### 8.4 数据库设计

- 以表、字段、键、索引和关系为主
- 只维护和展示设计，不启动或连接本地数据库
- 支持从页面关联直接下钻到具体数据表

### 8.5 API 设计

- OpenAPI 是唯一接口契约源
- 系统内可编辑、校验和保存
- 保存后即时生成文档预览
- 支持从页面下钻到具体 `operationId`

### 8.6 接口文档

- 使用 Swagger 风格的信息结构
- 由 OpenAPI 生成，不依赖完整 Swagger UI 运行时
- 按 Tag、路径和方法组织
- 与页面和需求互相关联

### 8.7 设计与组件

- 展示颜色、排版、间距、圆角和状态
- 展示正式组件清单和使用方式
- 原型和正式前端共享同一套设计 token，但不共享 UI 组件实现
- 提供可运行的组件预览，而不是只提供静态说明

### 8.8 交付计划与任务

- 以需求为维度展示任务依赖图
- 区分前端、后端、契约、测试和文档任务
- 支持人工确认后再同步外部项目管理工具
- 展示任务与 PR、测试和验收的关系

### 8.9 测试与验收

- 验收标准到测试用例的映射
- 展示测试类型、覆盖范围和执行结果
- 汇总失败项和未覆盖的验收标准
- 将测试结果作为需求完成和发布的依据

---

## 9. 路由建议

页面路由继续使用：

```text
/p/<page-id>
```

例如：

```text
/p/dashboard
/p/orders
/p/customers
```

设计资产使用：

```text
/p/database
/p/api
/p/docs
/p/design
```

需求、任务和测试建议使用独立命名空间：

```text
/requirements/<requirement-id>
/tasks/<task-id>
/tests/<test-id>
```

当前实现中，`/p/:requirementId` 与页面路由共用命名空间。建议后续调整，避免页面 ID 和需求 ID 冲突。

---

## 10. pnpm workspace 推荐结构

```text
product-repository/
├── pnpm-workspace.yaml
├── package.json                     # workspace 根脚本
├── product.manifest.json            # 产品、页面、导航和体验配置
├── product/
│   ├── requirements/
│   │   └── requirements.json        # 需求、页面改动和验收标准
│   ├── design/
│   │   ├── tokens.json              # 颜色、字号、间距、圆角、阴影
│   │   ├── components.json          # 组件清单、语义与状态
│   │   └── preview.html             # 原型设计语言预览
│   ├── database/
│   │   └── schema.json              # 数据库设计
│   ├── api/
│   │   └── openapi.json             # API 契约
│   ├── prototype/                   # 独立资产：原生 HTML/CSS/JS
│   │   ├── dashboard.html
│   │   ├── orders.html
│   │   ├── customers.html
│   │   └── shared/
│   ├── delivery/
│   │   ├── plan.json                # 需求到任务的交付图
│   │   └── tests.json               # 验收标准到测试用例的映射
│   └── releases/
│       └── release-notes.md
├── apps/
│   ├── studio/                      # Product Studio Web，可独立部署
│   ├── web/                         # 正式前端，可使用 Tailwind + shadcn
│   └── api/                         # 正式后端
├── packages/
│   ├── studio-core/                 # Studio 的读取、校验、分析、生成和同步逻辑
│   ├── studio-cli/                  # 稳定后提供的 CLI，只调用 studio-core
│   ├── contracts/                   # OpenAPI 生成的前后端共享类型
│   ├── design-tokens/               # token 生成、CSS 变量和主题适配
│   └── ui/                          # 正式前端组件库，不被原型依赖
├── tests/
│   ├── contract/
│   ├── integration/
│   ├── e2e/
│   └── acceptance/
└── docs/
    └── product-spec.md
```

依赖方向必须保持单向：

```text
apps/studio ─────┐
                 ├──> packages/studio-core
packages/studio-cli ┘

apps/web ────────┬──> packages/contracts
                 ├──> packages/design-tokens
                 └──> packages/ui

apps/api ────────┬──> packages/contracts
                 └──> product/database

product/prototype ───> product/design（仅共享 token 与静态规范）
```

约束：

- `studio-core` 不得依赖 `apps/studio` 的页面、组件或 Web 路由。
- `studio-cli` 不得复制 Studio 的业务逻辑。
- `apps/web` 不得依赖 `product/prototype` 的脚本或样式实现。
- `product/prototype` 不得依赖 `apps/web` 的 React 组件。
- 产品事实只保存在 `product/`，应用和包只读取或验证，不维护平行副本。

---

## 11. 产品配置与事实源

建议只维护一份页面清单，由 Node 服务、导航和校验器共同读取。

示意：

```json
{
  "productId": "demo-order",
  "name": "订单运营中心",
  "pages": {
    "dashboard": {
      "file": "dashboard.html",
      "route": "/p/dashboard",
      "title": "经营概览",
      "primary": true
    },
    "orders": {
      "file": "orders.html",
      "route": "/p/orders",
      "title": "订单管理"
    }
  }
}
```

要求：

- 页面 ID、文件名、路由和标题只在页面清单中声明
- 服务端不重复硬编码页面映射
- 校验器读取页面清单而不是写死页面规则
- 导航由页面清单生成
- 需求、页面、数据表和接口的引用必须经过校验

各类事实源建议如下：

| 资产 | 唯一事实源 |
| --- | --- |
| 页面和导航 | `product.manifest.json` |
| 需求与验收 | `requirements.json` |
| 设计语言 | `design/tokens.json` |
| 组件规范 | `design/components.json` |
| 数据库设计 | `database/schema.json` |
| API 契约 | `api/openapi.json` |
| 交付任务 | `delivery/plan.json` |
| 测试计划 | `delivery/tests.json` |

---

## 12. 设计语言

设计语言采用 Tailwind + shadcn 的语义和视觉风格，但原型不依赖这些第三方包。

设计 token 至少包含：

- 语义颜色：`background`、`foreground`、`primary`、`muted`、`border`、`destructive`
- 排版：字体、字号、行高、字重
- 间距：页面、区块、组件内部间距
- 圆角和阴影
- 动效和焦点状态
- 明暗主题预留能力

组件清单至少包含：

- Button
- Input / Select / Checkbox
- Table
- Badge
- Tabs
- Dialog / Drawer
- Card
- Empty State
- Loading State
- Error State
- Toast

正式前端可以使用 Tailwind + shadcn；原生 HTML 原型只复用同一套 token 和组件语义。

---

## 13. 任务拆分模型

### 13.1 任务类型

| 类型 | 说明 |
| --- | --- |
| `data` | 数据库表、字段、索引或关系调整 |
| `api` | 后端接口与业务逻辑 |
| `contract` | OpenAPI、共享类型与前后端契约 |
| `frontend` | 页面、组件、状态与交互 |
| `test` | 单元、集成、E2E 和验收测试 |
| `docs` | 产品说明、接口说明和交付文档 |

### 13.2 生成流程

```text
读取需求和验收标准
→ 分析影响页面、数据表和接口
→ 生成交付计划草稿
→ 标注任务依赖和风险
→ 人工确认
→ 创建外部任务
```

不建议由模型直接无审核创建外部任务。

### 13.3 任务字段

```json
{
  "id": "TASK-REQ02-API-01",
  "requirementId": "REQ-02",
  "pageIds": ["orders"],
  "type": "api",
  "title": "实现订单组合筛选接口",
  "dependsOn": ["TASK-REQ02-DATA-01"],
  "tables": ["orders", "customers"],
  "operations": ["listOrders"],
  "acceptance": [
    "多个筛选条件可以组合",
    "空结果有明确反馈"
  ],
  "affectedFiles": [
    "apps/api/src/orders/query.js"
  ],
  "testCommand": "npm run test:api",
  "status": "draft"
}
```

### 13.4 任务拆分规则

- 数据库变化先于接口任务
- 契约任务先于依赖契约的前后端实现
- 前端任务必须声明调用的 `operationId`
- 后端任务必须声明覆盖的表和接口
- 每个需求至少生成一个测试任务
- 每个任务必须能追溯到需求和验收标准
- 跨端变更必须建立显式依赖，而不是隐含在说明中

---

## 14. 测试模型

测试从需求阶段开始，而不是开发完成后补充。

```text
验收标准
├── 手工验收用例
├── API 契约测试
├── 前后端集成测试
├── 关键路径 E2E 测试
└── 非功能测试（按需）
```

每个测试用例建议包含：

- 测试 ID
- 关联需求和验收标准
- 测试类型
- 前置条件
- 操作步骤
- 预期结果
- 自动化状态
- 最近执行结果
- 对应证据

测试任务与开发任务同时生成，确保测试不是遗漏项。

---

## 15. 前后端联动开发规则

1. `database/schema.json` 是数据库设计源。
2. `api/openapi.json` 是接口契约源。
3. 页面必须声明关联的数据表和 `operationId`。
4. 前端调用的接口必须存在于 OpenAPI。
5. 后端实现必须覆盖被页面引用的接口。
6. OpenAPI Schema 变化必须标记受影响的页面和前端任务。
7. 数据库字段变化必须标记受影响的接口、页面和测试。
8. 每个 PR 必须关联需求 ID。
9. 每个需求必须有验收用例。
10. 合并前必须执行契约校验、自动化测试和关键页面检查。

建议的质量门禁：

```text
Schema 合法
→ OpenAPI 合法
→ 页面引用完整
→ 契约无破坏性变化
→ 单元/集成测试通过
→ 关键 E2E 通过
→ 验收证据齐全
```

---

## 16. 当前实现基线

当前仓库已经具备以下能力：

- 一仓库一产品的约束
- 以需求为中心的首页
- 独立 HTML 页面
- 左侧产品画布、右侧需求说明
- 跨页 Tour 引导
- 页面关联需求、数据表和接口
- 数据库设计展示
- OpenAPI 编辑与保存
- Swagger 风格接口文档
- 原生 HTML/CSS/JS，不依赖前端构建工具

当前仍是 MVP，且尚未迁移为 pnpm workspace。主要缺口包括：

1. 当前是单个 Node 服务，尚未建立 `apps/`、`packages/` 与 `product/` 的 workspace 边界。
2. 页面清单、服务端路由和校验规则仍存在多处硬编码。
3. 工作台、原型和设计页各自维护近似但不完全一致的设计 token。
4. 还没有独立的 `studio-core`，当前展示与校验能力尚未形成可复用核心。
5. 还没有正式的交付计划、任务依赖图和任务状态。
6. 还没有验收标准到测试用例的映射。
7. 还没有 GitHub Issues、Linear、Jira、PR 和 CI 的状态同步。
8. 需求详情与页面路由仍共用 `/p/` 命名空间。
9. `npm run validate` 仍包含旧页面模型规则，与当前需求中心入口存在冲突。

这些问题不影响继续讨论产品方向，但在进入正式开发前应优先收敛。

---

## 17. MVP 建议范围

### 阶段 0：工作区与架构基线

- 迁移为 pnpm workspace
- 建立 `product/`、`apps/studio`、`apps/web`、`apps/api` 和 `packages/`
- 把展示、校验、分析能力抽到 `studio-core`
- 统一产品清单
- 统一需求、页面、数据表和接口的关联模型
- 统一设计 token
- 修复校验器与当前路由模型的冲突
- 确认原型与正式前端完全独立

### 阶段 1：产品与技术闭环

- 需求中心
- 需求详情
- 页面工作台
- 数据库设计
- API 设计与接口文档
- 设计与组件预览

### 阶段 2：交付闭环

- 交付计划生成
- 人工确认
- 前端、后端、契约、测试任务拆分
- 任务看板和依赖图
- 验收标准到测试用例的映射
- PR 与需求追踪

### 阶段 3：外部集成

- GitHub Issues / Linear / Jira
- PR 和 CI 状态
- 自动化测试结果
- 发布和验收记录

---

## 18. 非目标

当前阶段明确不做：

- 多产品共用一个产品交付仓
- 启动或连接本地数据库
- 用单 HTML 隐藏切换模拟多个页面
- 用 Markdown 文档替代可运行产品
- 为原型引入 React、Tailwind、shadcn、Vite 或 CDN
- 让模型未经确认直接创建外部任务
- 用一个系统替代 GitHub、Jira 或 CI
- 优先处理移动端和平板适配

---

## 19. 验收指标

产品方向是否成立，可以通过以下指标判断：

- 新需求是否能快速定位关联页面、表、接口和测试
- 页面与数据库、接口引用是否能自动校验
- 前后端是否共享同一份 OpenAPI 契约
- 一个需求是否能生成完整且可执行的任务依赖图
- 验收标准是否全部映射到测试用例
- PR 是否能追溯需求和验收证据
- 原型、设计语言和正式前端是否使用一致的 token
- 需求从设计到发布的每一步是否有状态和证据

---

## 20. 架构决策与待讨论事项

以下 3 项已经确认：

1. **Product Studio 与产品代码共用一个 pnpm workspace。** Studio 先作为 `apps/studio` 开发和调试，稳定后通过 `packages/studio-cli` 提供 CLI；两者共享 `packages/studio-core`。Studio 可以作为独立部署单元，但不先拆仓库。
2. **产品仓同时包含正式前后端代码。** 正式前端位于 `apps/web`，正式后端位于 `apps/api`，与产品、设计、原型和契约同仓。
3. **原型与正式前端是两条独立资产。** 原型位于 `product/prototype`，保持原生 HTML/CSS/JS；正式前端直接建立在 `apps/web`，可以使用 Tailwind + shadcn。两者只共享设计 token、契约和规范。

以下问题仍需进一步确认：

4. 产品清单文件采用 `product.manifest.json`、`meta.json` 扩展，还是其他命名？
5. 需求详情是否迁移到 `/requirements/<id>`，页面继续使用 `/p/<page-id>`？
6. 设计语言是否以 `design/tokens.json` 为唯一源，并生成 CSS 变量和正式前端主题？
7. 交付计划是产品仓内的 `delivery/plan.json`，还是由 Studio 单独维护？
8. 第一版任务系统先接 GitHub Issues，还是先做本地任务看板？
9. 自动任务拆分第一版采用规则、AI，还是“规则生成 + AI 补全 + 人工确认”？
10. 测试第一版覆盖到什么层级：验收用例、API 契约测试，还是同时包含 E2E？
11. 原型是否只承担展示和交互验证，不参与正式构建与测试？
12. 产品完成状态的判断标准是什么：代码合并、测试通过、验收通过，还是已经发布？

---

## 21. 当前确认结论

已确认保留：

- 一仓库一产品
- 单仓库 pnpm workspace
- 正式前后端同仓
- 需求为中心
- 独立页面
- 数据库设计先行
- OpenAPI 契约驱动
- 原生 HTML 原型
- 原型与正式前端独立
- 桌面端优先

已确认新增：

- `apps/studio` 作为 Product Studio Web 应用
- `packages/studio-core` 作为可复用核心能力
- `packages/studio-cli` 作为稳定后的 CLI 入口
- 正式前端 `apps/web`
- 正式后端 `apps/api`
- 统一产品清单
- 统一下发设计 token
- 交付计划与任务依赖图
- 验收到测试的映射
- PR、测试和发布的追踪

已确认的逻辑边界：

- 产品事实源与 Product Studio 逻辑分离
- Product Studio 的 Web 与 CLI 共用 `studio-core`
- 原生 HTML 原型与正式前端代码分离
- 产品事实源与外部项目管理工具分离
- Product Studio 可以独立部署，但不先拆成独立仓库

最终目标：

> **让一个需求的背景、设计、页面、数据、接口、代码、测试和发布状态始终可以相互解释，并形成可验证的交付闭环。**
