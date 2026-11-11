# Product Studio 产品说明

> 状态：产品方向已确认，待进入实施
> 更新日期：2026-11-11  
> 适用范围：产品定位、系统边界、核心流程、交付规则与后续演进  
> 说明：本文记录已确认的产品与架构决策。未确认内容会明确标注，不再把已决定事项留作开放问题。

---

## 1. 一句话定义

**Product Studio 是一套以需求为主线、连接产品设计、前后端实现、测试与交付的研发辅助系统。**

它采用**单仓库、pnpm workspace、单产品**的组织方式：

- 产品交付区保存产品事实：需求、页面、设计语言、数据库设计、API 契约、原型、正式代码、测试和发布记录。
- Product Studio 读取这些事实，负责展示、关联、拆分、检查和追踪。
- Product Studio 先以 Web 应用形态开发和调试，稳定后通过同一套核心能力提供 CLI。
- 正式前端和正式后端都位于同一工作区；具体技术栈由产品仓配置，原生 HTML 原型是独立资产。

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
8. 需求散落在即时消息、文档、任务系统和代码注释中，进入开发前需要重复解释、翻译和转换。
9. 产品文档与代码分开维护，代码已经变化但产品说明仍停留在上一次同步的状态。

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
- 在本地任务看板中管理工作项
- 后续再扩展 GitHub Issues、Linear 或 Jira 同步
- 生成测试计划和测试任务
- 校验页面、数据库、OpenAPI 与代码之间的一致性
- 追踪分支、PR、测试、验收和发布状态

一句话边界：

> **产品区负责“真相”，Product Studio 负责“组织、检查、拆分和追踪”。**

### 3.3 已确认的架构决策

以下决策已确认，后续目录和实施计划以此为准。

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
- 正式前端直接建立在 `apps/web`；当前示例仓采用 React + Vite + shadcn + Tailwind。
- 两者独立安装依赖、独立构建、独立测试、独立演进。
- 两者只共享设计 token、组件与样式约束、OpenAPI 契约和必要的静态资源。
- 正式前端的组件库不得被原型反向依赖。
- 原型只用于需求沟通和交互验证，不参与正式构建、正式测试和发布。
- 正式前端技术栈属于产品仓配置，当前示例仓采用 React + Vite + shadcn + Tailwind，后续产品可以替换。

```text
product/prototype     产品原型，原生 HTML/CSS/JS
apps/web              正式前端，当前示例为 React + Vite + shadcn + Tailwind
product/design        两者共享的设计源
product/api           两者共享的接口契约
```

正式后端同样按产品仓配置。当前示例仓采用 Hono.js + SQLite + Prisma；后续产品可以替换为其他框架和数据库，而不改变 Product Studio 的产品模型。

---

## 4. 核心产品原则

1. **一仓一产品**：产品仓不同时承载多个产品。
2. **需求优先**：首页和主要导航以需求为维度，而不是全量页面清单。
3. **页面独立**：每个产品页面使用独立 HTML，不通过单页隐藏切换模拟多个页面。
4. **设计先行**：先维护数据库、API、设计语言和验收标准，再同步产品或原型。
5. **契约驱动**：数据库和 OpenAPI 是正式设计资产，页面必须显式声明关联。
6. **原型与正式前端分离**：原型保持原生 HTML/CSS/JS，不参与正式构建和测试；正式前端位于 `apps/web`，当前示例采用 React + Vite + shadcn + Tailwind；两者只共享 token、组件与样式约束、契约。
7. **规则优先、AI 补全、人工确认**：第一版先由规则生成任务和测试草稿，再由 AI 补全，人工确认后才进入执行。
8. **本地任务优先**：第一版使用本地任务看板，不先接入外部任务系统。
9. **可追踪**：需求、页面、数据表、接口、代码、测试和 PR 必须能互相定位。
10. **桌面端优先**：当前阶段只保证电脑端展示，不处理移动端和平板适配。
11. **验收即完成**：需求只有在验收通过后才算完成，代码合并或测试通过本身不代表完成。
12. **文档即代码资产**：产品事实、需求、设计、契约、测试和正式代码同仓维护，并以可校验的结构化文件随代码一起更新。
13. **需求即上下文**：需求产出时直接形成可供 Studio、开发者和 Coding Agent 使用的最小上下文包，不依赖跨平台转述、翻译或二次转换。
14. **不做孤立功能**：每个新增功能都必须进入需求和技术闭环。

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
| Requirement Context | 从需求直接生成、可交给 Studio、开发者或 Coding Agent 执行的完整上下文 |
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

### 6.1 最新代码即产品文档

“最新代码即产品文档”不是指代码本身足以代替产品说明，也不是用注释替代需求。它表示：

- 产品文档与代码位于同一仓库、同一分支和同一次变更中，不维护仓库外的平行版本。
- 产品事实使用结构化文件表达，并与正式代码共享版本、提交历史和评审流程。
- 代码改变产品行为时，同一变更必须同步更新关联需求、页面、数据库设计、OpenAPI、测试和验收证据。
- Product Studio 展示的内容来自当前工作区和当前提交，不展示手工复制到另一平台的旧快照。
- 文档与资产不一致时，校验应失败，而不是由人凭经验判断哪一份最新。

最终形成的不是“文档旁边放代码”，而是同一套受版本控制的交付事实：

```text
同一仓库 + 同一分支 + 同一提交
├── 产品说明与需求
├── 页面与原型
├── 设计语言
├── 数据库设计与 OpenAPI
├── 正式前后端代码
├── 测试与验收证据
└── 交付计划与发布记录
```

### 6.2 需求即可直接使用的上下文

产品经理输出需求时，产物不是一段需要开发再次整理的描述，而是一份结构完整的需求上下文包。它至少包含：

- **意图**：背景、目标、用户、业务规则、范围和明确不做的内容。
- **实现边界**：受影响页面、数据表、OpenAPI 操作、组件与正式代码入口。
- **执行上下文**：前置依赖、约束、设计语言、关键文件、验证命令和禁止事项。
- **验收上下文**：可观察的验收标准、测试场景、测试类型和期望证据。
- **变更上下文**：本需求涉及的页面改动、数据变化、契约变化和兼容性影响。

上下文包应同时适合三类使用者：

```text
需求上下文包
├── 人：阅读目标、范围、流程、页面和技术闭环
├── Product Studio：展示、校验、拆任务和追踪验收
└── Coding Agent / 开发者：直接定位资产、修改代码并执行测试
```

这里的“直接使用”不等于让 AI 无边界执行。范围、约束、验收标准和必须人工确认的事项必须显式存在；无法从仓库确认的信息应标记为待确认，而不是自动补成产品事实。

跨平台复制不是主流程。GitHub、Linear、Jira 或即时消息只能作为入口或同步适配器，不能成为需求的唯一正文、唯一验收记录或产品事实的第二份手工维护源。

### 6.3 上下文包是稳定视图，不是第二份正文

需求主记录仍保存在 `product/requirements/requirements.json`。需求上下文包由主记录、页面关联、数据库设计、OpenAPI、设计约束、代码入口和测试状态组合而成，是在当前提交上生成并校验的稳定视图，不新增一份需要人工同步的平行文档。

示意：

```json
{
  "id": "REQ-02",
  "intent": {
    "summary": "支持订单组合筛选，并保持结果数量与已选条件同步",
    "scope": ["关键词、订单状态和付款状态组合筛选"],
    "nonGoals": ["不改变订单状态流转规则"]
  },
  "affected": {
    "pages": ["orders"],
    "tables": ["orders", "customers", "order_items"],
    "operations": ["listOrders"],
    "code": ["apps/web/src/pages/orders", "apps/api/src/orders"],
    "design": ["Table", "Input", "Select", "Badge"]
  },
  "execution": {
    "dependsOn": [],
    "constraints": ["筛选条件必须写入 URL", "结果数量来自服务端响应"],
    "verify": ["pnpm test:contract", "pnpm test:e2e"]
  },
  "acceptance": [
    "组合筛选后，结果数量、列表和筛选 Chip 同步更新",
    "筛选条件可单独清除，也可一键恢复全部订单"
  ]
}
```

这份结构应能直接用于需求详情展示、任务拆分、开发执行和测试生成；同一份数据不得为不同消费者再次人工改写。

---

## 7. 端到端流程

```text
1. 创建或更新需求
2. 明确业务流程、影响页面和验收标准，形成可直接使用的需求上下文包
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

任何阶段发现设计变化，都应回到对应资产更新，而不是只在代码中临时修补。需求上下文包随设计、代码和测试变化同步演进；提交评审时，产品说明、关联资产和正式代码必须处于同一变更上下文。

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

需求详情使用 `/requirements/<requirement-id>`，页面继续使用 `/p/<page-id>`。用于讨论单个需求的完整上下文：

- 需求上下文包摘要与可直接消费的执行上下文
- 背景与目标
- 范围与非目标
- 用户流程
- 关联页面
- 页面改动
- 验收标准
- 数据表
- 接口
- 设计语言与组件约束
- 关键代码入口和校验命令
- 实现约束、风险与待确认项
- 测试计划
- 任务依赖
- PR 与发布状态

需求详情不是一段孤立的描述页。它需要回答“为什么做、改哪里、受什么约束、如何证明已经完成”，并提供稳定、结构化、可供 Studio、开发者和 Coding Agent 直接消费的上下文。

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
- 只维护和展示设计，不由 Product Studio 启动或连接正式应用数据库
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

设计语言不是单纯的颜色表，而是一套可执行的组件与样式约束体系。

- 当前示例仓的正式前端选型为 React + Vite + shadcn + Tailwind
- `design/tokens.json` 作为颜色、排版、间距、圆角、阴影和动效的唯一源
- 生成 CSS 变量和正式前端主题，不在应用内重复维护颜色常量
- `design/components.json` 维护组件清单、语义、变体、尺寸和状态
- `design/rules.md` 维护页面布局、间距、层级、文案和交互约束
- 原型和正式前端共享 token 与组件语义，但不共享 React 组件实现
- Studio 提供组件预览和约束检查，而不只是静态色板

### 8.8 交付计划与任务

- 以需求为维度展示任务依赖图
- 区分前端、后端、契约、测试和文档任务
- 第一版使用本地任务看板
- 任务由规则生成草稿、AI 补全，再经人工确认
- 轻量文件作为交付计划事实源，SQLite 只用于本地运行态和查询
- 展示任务与 PR、测试和验收的关系

### 8.9 测试与验收

- 第一版覆盖验收用例、API 契约测试和 E2E
- 验收标准到测试用例的映射
- 展示测试类型、覆盖范围和执行结果
- 汇总失败项和未覆盖的验收标准
- 验收通过是需求完成的唯一判断标准

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

需求和交付对象使用独立命名空间：

```text
/requirements/<requirement-id>
/tasks/<task-id>
/tests/<test-id>
```

需求详情必须从 `/p/:requirementId` 迁移到 `/requirements/<requirement-id>`。页面继续保持 `/p/<page-id>`，两类 ID 不再混用同一命名空间。

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
│   │   ├── tokens.json              # 颜色、字号、间距、圆角、阴影，唯一设计源
│   │   ├── components.json          # 组件清单、变体、尺寸和状态约束
│   │   ├── rules.md                 # 布局、层级、文案和交互样式约束
│   │   └── preview.html             # 组件与约束预览
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
│   │   ├── plan.json                # 需求到任务的交付图，事实源
│   │   └── tests.json               # 验收标准到测试用例的映射，事实源
│   ├── .studio/
│   │   └── studio.sqlite            # 本地任务、执行和查询缓存，不提交
│   └── releases/
│       └── release-notes.md
├── apps/
│   ├── studio/                      # Product Studio Web，React + 独立部署
│   ├── web/                         # 正式前端示例：React + Vite + shadcn + Tailwind
│   └── api/                         # 正式后端示例：Hono.js + SQLite + Prisma
├── packages/
│   ├── studio-core/                 # Studio 的读取、校验、分析、生成和本地任务逻辑
│   ├── studio-cli/                  # 稳定后提供的 CLI，只调用 studio-core
│   ├── studio-store/                # 文件事实源与 SQLite 运行态的同步层
│   ├── contracts/                   # OpenAPI 生成的前后端共享类型
│   ├── design-tokens/               # token 生成、CSS 变量和主题适配
│   └── ui/                          # 当前示例的 shadcn 组件，不被原型依赖
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

apps/studio ─────┬──> packages/studio-store
apps/studio-cli ─┤
                 └──> product/delivery（读取计划，写入经人工确认）

product/prototype ───> product/design（仅共享 token 与样式约束）
```

约束：

- `studio-core` 不得依赖 `apps/studio` 的页面、组件或 Web 路由。
- `studio-cli` 不得复制 Studio 的业务逻辑。
- `apps/web` 不得依赖 `product/prototype` 的脚本或样式实现。
- `product/prototype` 不得依赖 `apps/web` 的 React 组件。
- 产品事实只保存在 `product/`，应用和包只读取或验证，不维护平行副本。
- 交付计划以 `delivery/plan.json` 为事实源，SQLite 不得成为第二份人工维护数据。

---

## 11. 产品配置与事实源

产品清单采用根目录的 `product.manifest.json`，作为产品、页面、导航、体验配置和资产路径的唯一清单。

它满足以下表达要求：

- 一个文件能说明“这是什么产品、有哪些页面、入口在哪里”
- Node 服务、Studio、导航、校验器和 CLI 都读取同一份清单
- 页面 ID、文件路径、路由和标题不重复硬编码
- 产品定位、版本、状态和更新时间有明确字段
- 设计、数据库、API、交付计划和测试计划的位置可被发现
- 后续新增页面或资产不需要同时修改多个服务文件

`meta.json` 不再作为独立产品清单扩展，避免形成两个入口。产品元信息合并进 `product.manifest.json`。

示意：

```json
{
  "id": "demo-order",
  "name": "订单运营中心",
  "version": "1.3.0",
  "status": "prototype",
  "updatedAt": "2026-11-11",
  "stack": {
    "web": {
      "framework": "react",
      "build": "vite",
      "ui": "shadcn",
      "css": "tailwind"
    },
    "api": {
      "framework": "hono",
      "database": "sqlite",
      "orm": "prisma"
    }
  },
  "assets": {
    "requirements": "product/requirements/requirements.json",
    "design": "product/design",
    "schema": "product/database/schema.json",
    "openapi": "product/api/openapi.json",
    "prototype": "product/prototype",
    "delivery": "product/delivery/plan.json",
    "tests": "product/delivery/tests.json"
  },
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

各类事实源如下：

| 资产 | 唯一事实源 |
| --- | --- |
| 产品元信息、页面、导航和资产索引 | `product.manifest.json` |
| 需求与验收 | `product/requirements/requirements.json` |
| 设计 token 与主题 | `product/design/tokens.json` |
| 组件和样式约束 | `product/design/components.json`、`product/design/rules.md` |
| 数据库设计 | `product/database/schema.json` |
| API 契约 | `product/api/openapi.json` |
| 交付计划 | `product/delivery/plan.json` |
| 测试计划 | `product/delivery/tests.json` |

文档与代码的同步规则：

- 产品事实不复制到 Studio 数据库、任务系统或外部文档平台成为另一份手工维护正文。
- 需求正文、结构化上下文、验收标准和关联资产随产品代码提交；提交记录就是产品文档的版本记录。
- 代码评审必须同时检查行为变化与产品事实是否一致，缺少必要同步视为未完成。
- 产品文档的完成标准不是“写过了”，而是与当前代码、关联资产和验收证据一致且可通过校验。
- Studio 只做读取、聚合、展示、校验和适配，生成物不得反向覆盖手工产品事实。
- 外部系统只接收稳定导出或同步结果，不能成为主数据的唯一来源。

技术栈的适用边界：

- `stack` 描述当前产品仓实际使用的正式前后端技术栈，是产品配置的一部分，不是 Product Studio 的平台级硬约束。
- Product Studio 只消费统一的能力描述，例如页面、数据模型、OpenAPI 和测试命令，不把 React、Vite、Hono 或 Prisma 写进核心流程。
- 当前示例仓采用 React + Vite + shadcn + Tailwind 和 Hono.js + SQLite + Prisma，用于验证完整链路；后续产品可按自身约束替换。
- 需求上下文包中的代码入口、设计组件和验证命令来自 `stack` 及产品清单，不由 Studio 假定某一种框架目录或命令格式。
- 正式应用数据库是 `apps/api` 的运行时依赖，与 Studio 的本地任务缓存 SQLite 是两套独立数据库。
- 数据库设计源与 Prisma schema 不得各维护一份。第一版以 `product/database/schema.json` 为设计事实源，`apps/api/prisma/schema.prisma` 是当前实现表示，必须通过生成或校验保持同步；具体同步方向在实施阶段确定。

SQLite 的边界：

- `product/delivery/*.json` 是可审阅、可提交、可合并的交付事实源。
- `.studio/studio.sqlite` 是 Studio 的本地运行态，用于任务看板查询、执行记录、索引和缓存。
- `apps/api` 的 SQLite 是当前示例正式后端的数据存储，由 Prisma 管理；Product Studio 不启动、不连接它。
- Studio 的 SQLite 数据可以由交付文件重建；删除数据库不会丢失产品定义。正式应用 SQLite 中的业务数据不在此重建范围内。
- 需要持久化的计划、任务和测试变更，必须回写对应文件后再同步 SQLite。
- Studio 的 SQLite 文件不提交到 Git；正式应用数据库文件也不应作为产品事实源提交。

---

## 12. 设计语言与组件约束

当前示例仓的正式前端技术选型：

```text
React + Vite + shadcn + Tailwind
```

设计语言基于上述体系的语义和视觉风格。正式前端技术栈可在后续产品中替换，但必须继续遵守 `tokens.json`、组件语义和样式约束。原生 HTML 原型不依赖这些第三方包，但复用同一套 token 与组件语义。

设计语言由三部分组成：

| 文件 | 负责内容 |
| --- | --- |
| `design/tokens.json` | 颜色、排版、间距、圆角、阴影和动效，唯一设计源 |
| `design/components.json` | 组件清单、变体、尺寸、状态和不可用组合 |
| `design/rules.md` | 页面布局、间距、层级、文案、交互和可访问性约束 |

`design/tokens.json` 生成：

- CSS 变量
- Tailwind 主题配置
- 正式前端主题
- 原型共享样式变量

设计 token 至少包含：

- 语义颜色：`background`、`foreground`、`primary`、`muted`、`border`、`destructive`
- 排版：字体、字号、行高、字重
- 间距：页面、区块、组件内部间距
- 圆角和阴影
- 动效和焦点状态
- 明暗主题预留能力

组件清单和样式约束至少包含：

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

约束：

- 颜色、间距、圆角、阴影不得在页面中随意硬编码
- 组件变体和状态必须在 `components.json` 中登记
- 当前示例的正式前端通过 shadcn 使用受控组件；替换技术栈时必须提供等价的组件与样式约束
- 原生 HTML 原型只复用 token 和组件语义，不引入 React 或 shadcn
- Studio 需要能检查未登记组件、硬编码 token 和不规范状态

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

第一版采用“规则生成 + AI 补全 + 人工确认”：

```text
读取需求和验收标准
→ 规则分析影响页面、数据表和接口
→ 生成前端、后端、契约和测试任务草稿
→ AI 补全任务描述、影响文件和风险
→ 标注任务依赖
→ 人工确认
→ 写入本地任务看板
```

约束：

- 规则负责稳定、可解释的拆分骨架
- AI 只补全，不绕过规则直接创造任务类型
- 人工确认前，任务状态必须是 `draft`
- 第一版只创建本地任务，不自动写入外部系统
- 每个 AI 补全结果都必须能追溯到需求、验收标准和影响资产

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

测试从需求阶段开始，而不是开发完成后补充。第一版必须覆盖：

```text
验收标准
├── 验收用例
├── API 契约测试
└── 关键路径 E2E 测试
```

前后端集成测试可以按需求补充，但不是第一版必须单独建立的一层。原生 HTML 原型不参与正式测试。

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

测试任务与开发任务同时生成，确保测试不是遗漏项。需求只有在全部验收用例通过后才能标记完成。

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

质量门禁分为“可合并”和“需求完成”两级：

```text
可合并：
Schema 合法
→ OpenAPI 合法
→ 页面引用完整
→ API 契约测试通过
→ 关键 E2E 通过

需求完成：
全部验收用例通过
→ 验收证据齐全
→ 人工确认验收结果
```

代码合并和自动化测试通过是完成的前置条件，不是完成本身。需求完成状态以验收通过为准；发布属于完成后的交付动作。

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
5. 还没有正式的交付计划、任务依赖图和本地任务看板。
6. 还没有验收标准到测试用例的映射，以及契约测试和 E2E 覆盖。
7. 需求详情与页面路由仍共用 `/p/` 命名空间。
8. `npm run validate` 仍包含旧页面模型规则，与当前需求中心入口存在冲突。

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
- `/requirements/<requirement-id>` 需求详情
- `/p/<page-id>` 页面工作台
- 数据库设计
- API 设计与接口文档
- 当前示例栈的设计语言、组件和样式约束预览

### 阶段 2：交付闭环

- `delivery/plan.json` 交付计划
- 规则生成 + AI 补全 + 人工确认
- 本地任务看板和依赖图
- 文件事实源与 SQLite 运行态同步
- 验收用例、API 契约测试和 E2E 映射
- 验收通过后更新需求完成状态
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
- 由 Product Studio 启动或连接正式应用数据库
- 用单 HTML 隐藏切换模拟多个页面
- 用 Markdown 文档替代可运行产品
- 为原生 HTML 原型引入 React、Tailwind、shadcn、Vite 或 CDN
- 让模型未经确认直接创建任务或写入外部系统
- 第一版接入 GitHub Issues、Linear 或 Jira
- 让原生 HTML 原型参与正式构建、正式测试和发布
- 在 `tokens.json` 之外维护另一套正式主题色
- 把 SQLite 当作人工维护的第二份产品事实源
- 优先处理移动端和平板适配

---

## 19. 验收指标

产品方向是否成立，可以通过以下指标判断：

- 新需求是否能快速定位关联页面、表、接口和测试
- 需求提出后是否能直接生成包含范围、代码入口、约束、验证命令和验收标准的上下文包
- 同一提交中的产品说明、关联资产、正式代码和验收证据是否能通过一致性校验
- 开发者或 Coding Agent 是否无需跨平台转述、翻译或重新整理即可开始执行
- 页面与数据库、接口引用是否能自动校验
- 前后端是否共享同一份 OpenAPI 契约
- 一个需求是否能生成完整且可执行的任务依赖图
- 验收标准是否全部映射到测试用例
- PR 是否能追溯需求和验收证据
- 原型、设计语言和正式前端是否使用一致的 token 与组件语义
- 是否覆盖验收用例、API 契约测试和关键 E2E
- 需求是否只有在验收通过后才标记完成
- 需求从设计到发布的每一步是否有状态和证据

---

## 20. 已确认决策

以下事项已全部确认，不作为开放问题保留。

### 20.1 工程与资产

1. **协作方式**：一个单产品 pnpm workspace，同时包含产品、正式前后端和 Product Studio。
2. **Studio 形态**：先在 `apps/studio` 开发和调试，稳定后通过 `packages/studio-cli` 提供 CLI；两者共享 `packages/studio-core`。
3. **代码范围**：产品仓同时包含正式前端、正式后端、产品、设计、原型和契约。
4. **原型边界**：原型与正式前端是两条独立资产；原型不参与正式构建和测试。
5. **正式前端**：直接建立在 `apps/web`；当前示例仓采用 React + Vite + shadcn + Tailwind，后续产品可调整。
6. **产品清单**：采用根目录 `product.manifest.json`，合并原 `meta.json` 中的产品元信息。
7. **正式后端**：当前示例仓采用 Hono.js + SQLite + Prisma；技术栈记录在产品清单中，可随产品调整。
8. **设计语言**：`design/tokens.json` 是颜色、排版、间距、圆角、阴影和动效的唯一源，并生成 CSS 变量和当前正式前端主题；`components.json` 和 `rules.md` 维护组件及样式约束。

### 20.2 路由与交付

9. **路由**：需求详情使用 `/requirements/<requirement-id>`；页面继续使用 `/p/<page-id>`。
10. **交付计划**：使用产品仓内的轻量文件 `product/delivery/plan.json` 作为事实源；使用 `.studio/studio.sqlite` 保存本地任务看板的任务、执行记录和查询缓存；SQLite 可由文件重建，不提交。
11. **任务管理**：第一版使用本地任务看板，不先对接 GitHub Issues、Linear 或 Jira。
12. **任务拆分**：采用“规则生成 + AI 补全 + 人工确认”；未经确认的任务保持 `draft`。
13. **测试范围**：第一版覆盖验收用例、API 契约测试和 E2E。
14. **完成标准**：验收通过是需求完成的唯一判断标准；代码合并、测试通过和发布都不是完成标准本身。

### 20.3 仍需后续细化但不再是方向性问题

以下内容属于实施方案，不影响当前产品方向：

- `product.manifest.json` 的具体 JSON Schema
- 需求上下文包的具体 Schema 和稳定导出格式
- `delivery/plan.json` 与 `delivery/tests.json` 的字段设计
- SQLite 表结构和同步策略
- AI 补全使用哪个模型及调用方式
- 本地任务看板的交互细节
- 外部任务系统接入时间

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

- `apps/studio` 作为 React Product Studio Web 应用
- `packages/studio-core` 作为可复用核心能力
- `packages/studio-cli` 作为稳定后的 CLI 入口
- 代码与产品事实同仓、同提交维护，最新代码即最新产品文档
- 需求产出即形成可供人、Studio 和 Coding Agent 直接消费的上下文包
- 正式前端 `apps/web`，当前示例采用 React + Vite + shadcn + Tailwind
- 正式后端 `apps/api`，当前示例采用 Hono.js + SQLite + Prisma
- 正式技术栈由产品清单声明，允许后续产品调整
- 根目录 `product.manifest.json` 作为唯一产品清单
- `design/tokens.json` 作为唯一设计 token 源
- 组件规范和样式约束
- `product/delivery/plan.json` 交付计划与本地 SQLite 运行态
- 规则生成 + AI 补全 + 人工确认
- 本地任务看板
- 验收用例、API 契约测试和 E2E
- 验收通过作为需求完成标准

已确认的逻辑边界：

- 产品事实源与 Product Studio 逻辑分离
- Product Studio 的 Web 与 CLI 共用 `studio-core`
- 原生 HTML 原型与正式前端代码分离
- 产品事实源与外部项目管理工具分离
- 需求上下文包是仓库事实的稳定视图，不是第二份手工维护正文
- 交付文件是事实源，SQLite 是可重建的本地运行态
- Product Studio 可以独立部署，但不先拆成独立仓库

最终目标：

> **让一个需求的背景、设计、页面、数据、接口、代码、测试和发布状态始终可以相互解释，并形成可验证的交付闭环。**
