const path = require('node:path');
const fs = require('fs-extra');

const PRODUCT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
const CANVAS_PAGES = {
  dashboard: 'dashboard.html',
  orders: 'orders.html',
  customers: 'customers.html',
};
const PAGE_ROUTES = {
  dashboard: '/p/dashboard',
  orders: '/p/orders',
  customers: '/p/customers',
};

function isValidProductId(id) {
  return typeof id === 'string' && PRODUCT_ID_PATTERN.test(id);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function serializeForHtml(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

function resolveInside(baseDir, relativePath) {
  const resolved = path.resolve(baseDir, relativePath);
  const prefix = `${path.resolve(baseDir)}${path.sep}`;
  if (resolved !== path.resolve(baseDir) && !resolved.startsWith(prefix)) {
    throw new Error('体验配置路径越界');
  }
  return resolved;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function createTableCatalog(schema) {
  return new Map((schema?.tables || []).map((table) => [table.name, table]));
}

function createOperationCatalog(openapi) {
  const operations = new Map();
  for (const [route, pathItem] of Object.entries(openapi?.paths || {})) {
    for (const method of HTTP_METHODS) {
      const operation = pathItem?.[method];
      if (operation?.operationId) {
        operations.set(operation.operationId, { route, method, operation });
      }
    }
  }
  return operations;
}

function resolveTables(names, tableCatalog) {
  return unique(names)
    .map((name) => tableCatalog.get(name))
    .filter(Boolean)
    .map((table) => ({
      name: table.name,
      label: table.label || table.name,
      description: table.description || '',
    }));
}

function resolveOperations(names, operationCatalog) {
  return unique(names)
    .map((operationId) => operationCatalog.get(operationId))
    .filter(Boolean)
    .map(({ route, method, operation }) => ({
      operationId: operation.operationId,
      route,
      method: method.toUpperCase(),
      summary: operation.summary || operation.operationId,
    }));
}

async function readProductMeta(productsDir, id) {
  if (!isValidProductId(id)) return null;

  const metaPath = path.join(productsDir, id, 'meta.json');
  if (!(await fs.pathExists(metaPath))) return null;
  return fs.readJson(metaPath);
}

async function readProductExperience(productsDir, id, meta) {
  const productDir = path.join(productsDir, id);
  const prototypeDir = path.join(productDir, 'prototype');
  const experienceFile = meta.experienceFile || 'data/order-list.json';
  const experiencePath = resolveInside(prototypeDir, experienceFile);

  if (!(await fs.pathExists(experiencePath))) {
    throw new Error(`体验配置不存在: ${experienceFile}`);
  }

  const experience = await fs.readJson(experiencePath);
  if (!experience.requirements || !experience.technical || !Array.isArray(experience.tour)) {
    throw new Error('体验配置必须包含 requirements、technical 和 tour');
  }

  return experience;
}

/**
 * 以页面为单位关联需求、表与 OpenAPI 操作。配置缺失时回退到产品级说明，
 * 让旧产品仍可展示，但新页面必须通过 validate 校验关联完整性。
 */
function createPageContext({ experience, page, schema, openapi }) {
  const pageConfig = experience.pages?.[page] || {};
  const requirementMap = new Map(
    (experience.requirements?.items || []).map((item) => [item.id, item]),
  );
  const tableMap = createTableCatalog(schema);
  const operationMap = createOperationCatalog(openapi);

  const requirements = (pageConfig.requirementIds || [])
    .map((requirementId) => requirementMap.get(requirementId))
    .filter(Boolean);
  const tables = resolveTables(pageConfig.tables || [], tableMap);
  const operations = resolveOperations(pageConfig.operations || [], operationMap);

  return {
    route: PAGE_ROUTES[page] || '/p/dashboard',
    title: pageConfig.title || experience.pageTitle || '产品页面',
    eyebrow: pageConfig.eyebrow || `PAGE / ${String(page || 'dashboard').toUpperCase()}`,
    summary: pageConfig.summary || experience.requirements?.summary || '',
    requirements,
    changes: pageConfig.changes || [],
    acceptance: pageConfig.acceptance || [],
    tables,
    operations,
  };
}

function getRequirementPages(experience, requirementId) {
  return Object.entries(experience.pages || {})
    .filter(([, config]) => (config.requirementIds || []).includes(requirementId))
    .map(([page, config]) => ({
      page,
      route: PAGE_ROUTES[page] || `/p/${page}`,
      title: config.title || page,
      eyebrow: config.eyebrow || `PAGE / ${page.toUpperCase()}`,
      summary: config.summary || '',
      contextSummary: config.summary || '',
      changes: config.changes || [],
      acceptance: config.acceptance || [],
      tables: config.tables || [],
      operations: config.operations || [],
    }));
}

/**
 * 需求是交付单元，页面、Tour 与设计资产都必须从需求上下文反向解析。
 * 需求级配置优先，缺失时才回退到关联页面的并集，避免旧配置立即失效。
 */
function createRequirementContext({
  experience,
  requirementId,
  schema,
  openapi,
  selectedPage = '',
}) {
  const requirement = (experience.requirements?.items || [])
    .find((item) => item.id === requirementId);
  if (!requirement) return null;

  const pages = getRequirementPages(experience, requirementId);
  const page = pages.find((item) => item.page === selectedPage) || pages[0] || null;
  const tableMap = createTableCatalog(schema);
  const operationMap = createOperationCatalog(openapi);
  const pageTables = pages.flatMap((item) => item.tables || []);
  const pageOperations = pages.flatMap((item) => item.operations || []);
  const tableNames = Array.isArray(requirement.tables) && requirement.tables.length
    ? requirement.tables
    : pageTables;
  const operationIds = Array.isArray(requirement.operations) && requirement.operations.length
    ? requirement.operations
    : pageOperations;
  const tours = (experience.tour || [])
    .filter((step) => step.requirementId === requirementId);
  const pageChanges = page ? page.changes : pages.flatMap((item) => item.changes || []);
  const pageAcceptance = page ? page.acceptance : pages.flatMap((item) => item.acceptance || []);

  return {
    id: requirement.id,
    title: requirement.title,
    summary: requirement.summary,
    status: requirement.status || '需求',
    owner: requirement.owner || '',
    route: `/p/${encodeURIComponent(requirement.id)}`,
    pages,
    page,
    tour: tours,
    pageChanges: pageChanges || [],
    pageAcceptance: pageAcceptance || [],
    changes: Array.isArray(requirement.changes) ? requirement.changes : pageChanges,
    acceptance: Array.isArray(requirement.acceptance) ? requirement.acceptance : pageAcceptance,
    tables: resolveTables(tableNames, tableMap),
    operations: resolveOperations(operationIds, operationMap),
    designPages: Array.isArray(requirement.designPages) ? requirement.designPages : [],
    technicalSummary: requirement.technicalSummary || '',
  };
}

function createRequirementSummaries({ experience, schema, openapi }) {
  return (experience.requirements?.items || []).map((item) => {
    const context = createRequirementContext({
      experience,
      requirementId: item.id,
      schema,
      openapi,
    });
    return context;
  }).filter(Boolean);
}

function renderPageContext(context) {
  const requirements = context.requirements.map((item) => `
    <article class="linked-requirement">
      <div class="linked-requirement-top">
        <span class="requirement-id">${escapeHtml(item.id)}</span>
        <span class="requirement-status">${escapeHtml(item.status || '需求')}</span>
      </div>
      <h4>${escapeHtml(item.title)}</h4>
      <p>${escapeHtml(item.summary)}</p>
      ${item.owner ? `<span class="requirement-owner">${escapeHtml(item.owner)}</span>` : ''}
    </article>`).join('');

  const changes = context.changes.length
    ? `<ul class="page-change-list">${context.changes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="empty-panel-copy">当前页面尚未记录改动点。</p>';

  const acceptance = context.acceptance.length
    ? `<ul class="check-list page-acceptance">${context.acceptance.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="empty-panel-copy">当前页面尚未记录验收点。</p>';

  const tableLinks = context.tables.length
    ? `<div class="asset-chip-grid">${context.tables.map((table) => `<a class="asset-chip" href="/p/database?table=${encodeURIComponent(table.name)}" title="${escapeHtml(table.description)}"><span>TABLE</span><strong>${escapeHtml(table.name)}</strong><small>${escapeHtml(table.label)}</small></a>`).join('')}</div>`
    : '<p class="empty-panel-copy">当前页面尚未关联数据表。</p>';

  const operationLinks = context.operations.length
    ? `<div class="operation-link-list">${context.operations.map((operation) => `<a class="operation-link" href="/p/docs#${encodeURIComponent(operation.operationId)}"><span class="operation-method method-${operation.method.toLowerCase()}">${escapeHtml(operation.method)}</span><code>${escapeHtml(operation.route)}</code><small>${escapeHtml(operation.summary)}</small></a>`).join('')}</div>`
    : '<p class="empty-panel-copy">当前页面尚未关联接口。</p>';

  return `
    <div class="page-context-heading">
      <span class="view-kicker">${escapeHtml(context.eyebrow)}</span>
      <h3>${escapeHtml(context.title)}</h3>
      <p>${escapeHtml(context.summary)}</p>
    </div>

    <section class="context-section">
      <div class="context-section-heading"><span class="panel-label">关联需求</span><span class="context-count">${context.requirements.length}</span></div>
      <div class="linked-requirement-list">${requirements || '<p class="empty-panel-copy">当前页面尚未关联需求。</p>'}</div>
    </section>

    <section class="context-section">
      <span class="panel-label">本页需求改动</span>
      ${changes}
    </section>

    <section class="context-section">
      <span class="panel-label">本页验收点</span>
      ${acceptance}
    </section>

    <section class="context-section">
      <div class="context-section-heading"><span class="panel-label">关联数据表</span><span class="context-count">${context.tables.length}</span></div>
      ${tableLinks}
    </section>

    <section class="context-section">
      <div class="context-section-heading"><span class="panel-label">关联接口</span><span class="context-count">${context.operations.length}</span></div>
      ${operationLinks}
    </section>

    <section class="context-section context-design-section">
      <span class="panel-label">设计资产</span>
      <div class="context-design-links">
        <a href="/p/database"><span>DATABASE</span><strong>数据库设计</strong><small>表、字段、索引与关系</small></a>
        <a href="/p/api"><span>OPENAPI</span><strong>API 设计</strong><small>维护与校验接口契约</small></a>
        <a href="/p/docs"><span>DOCS</span><strong>接口文档</strong><small>Swagger 风格只读文档</small></a>
      </div>
    </section>`;
}

function renderDesignLinks(summary = {}, technical = {}) {
  const tableCount = Number(summary.tableCount) || 0;
  const relationCount = Number(summary.relationCount) || 0;
  const operationCount = Number(summary.operationCount) || 0;
  const designLinks = Array.isArray(technical.designLinks) ? technical.designLinks : [];

  const cards = [
    '<a class="design-entry" href="/p/database"><span class="design-entry-kicker">DATABASE</span><strong>数据库设计</strong><p>' + tableCount + ' 张表 · ' + relationCount + ' 条关系 · ' + escapeHtml(summary.dialect || '未配置') + '</p><span class="design-entry-link">查看表结构 →</span></a>',
    '<a class="design-entry" href="/p/api"><span class="design-entry-kicker">OPENAPI</span><strong>API 设计</strong><p>' + operationCount + ' 个操作 · OpenAPI ' + escapeHtml(summary.openapiVersion || '缺失') + '</p><span class="design-entry-link">打开设计器 →</span></a>',
    '<a class="design-entry" href="/p/docs"><span class="design-entry-kicker">DOCS</span><strong>接口文档</strong><p>按 Tag 分组的只读接口文档</p><span class="design-entry-link">查看接口文档 →</span></a>',
  ];

  return `
    <div class="design-entry-grid">${cards.join('')}</div>
    ${designLinks.length ? `<div class="design-link-note">${designLinks.map((item) => escapeHtml(item)).join(' · ')}</div>` : ''}`;
}

function renderTechnicalSections(technical, summary = {}) {
  const flow = Array.isArray(technical.flow) ? technical.flow : [];
  const checks = Array.isArray(technical.checks) ? technical.checks : [];

  return `
    <p class="panel-lead">${escapeHtml(technical.summary)}</p>
    ${flow.map((item) => `
      <div class="tech-step">
        <span class="tech-index">${escapeHtml(item.step)}</span>
        <div>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.detail)}</p>
        </div>
      </div>`).join('')}
    ${renderDesignLinks(summary, technical)}
    <div class="panel-section">
      <span class="panel-label">闭环检查</span>
      <ul class="check-list">
        ${checks.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>`;
}

function renderTourPreview(steps) {
  return steps.map((step, index) => `
    <li class="tour-preview-item">
      <span class="tour-preview-index">${String(index + 1).padStart(2, '0')}</span>
      <span>${escapeHtml(step.title)}</span>
    </li>`).join('');
}

function renderRequirementTour(steps) {
  return steps.map((step, index) => `
    <li class="requirement-tour-step">
      <span class="requirement-tour-index">${String(index + 1).padStart(2, '0')}</span>
      <div>
        <strong>${escapeHtml(step.title)}</strong>
        <p>${escapeHtml(step.description || '')}</p>
        <span>${escapeHtml(step.page ? (PAGE_ROUTES[step.page] ? `画布 / ${step.page}` : '技术闭环') : '工作台')}</span>
      </div>
    </li>`).join('');
}

function renderRequirementDesignLinks(context, summary = {}) {
  const tables = context.tables;
  const operations = context.operations;
  const tableLinks = tables.length
    ? tables.map((table) => `<a class="requirement-asset" href="/p/database?table=${encodeURIComponent(table.name)}"><span>TABLE</span><strong>${escapeHtml(table.name)}</strong><small>${escapeHtml(table.label)}</small></a>`).join('')
    : '<p class="empty-panel-copy">该需求尚未关联数据表。</p>';
  const operationLinks = operations.length
    ? operations.map((operation) => `<a class="requirement-operation" href="/p/docs#${encodeURIComponent(operation.operationId)}"><span class="operation-method method-${operation.method.toLowerCase()}">${escapeHtml(operation.method)}</span><code>${escapeHtml(operation.route)}</code><small>${escapeHtml(operation.summary)}</small></a>`).join('')
    : '<p class="empty-panel-copy">该需求尚未关联接口。</p>';

  return `
    <section class="requirement-asset-section">
      <div class="context-section-heading"><span class="panel-label">关联数据表</span><span class="context-count">${tables.length}</span></div>
      <div class="asset-chip-grid">${tableLinks}</div>
    </section>
    <section class="requirement-asset-section">
      <div class="context-section-heading"><span class="panel-label">关联接口</span><span class="context-count">${operations.length}</span></div>
      <div class="operation-link-list">${operationLinks}</div>
    </section>
    <section class="requirement-design-links design-entry-grid">
      <a href="/p/database${tables[0] ? `?table=${encodeURIComponent(tables[0].name)}` : ''}"><span>DATABASE</span><strong>数据库设计</strong><small>${tables.length} 张关联表 · 不启动数据库</small></a>
      <a href="/p/api"><span>OPENAPI</span><strong>API 设计</strong><small>${operations.length} 个关联操作契约</small></a>
      <a href="/p/docs${operations[0] ? `#${encodeURIComponent(operations[0].operationId)}` : ''}"><span>DOCS</span><strong>接口文档</strong><small>Swagger 风格只读文档</small></a>
    </section>
    <p class="requirement-design-note">技术闭环：数据模型 ${tables.length} 表 · 接口契约 ${operations.length} 操作 · ${escapeHtml(summary.dialect || '设计资产')}</p>`;
}

function renderRequirementPagesNav(context) {
  if (!context.pages.length) {
    return `<div class="requirement-empty-pages"><span>TECHNICAL ONLY</span><strong>该需求由设计资产闭环，无独立业务画布</strong></div>`;
  }
  return `<nav class="requirement-page-nav" aria-label="${escapeHtml(context.title)}关联页面">${context.pages.map((item) => `<a class="${context.page?.page === item.page ? 'active' : ''}" href="${context.route}?page=${encodeURIComponent(item.page)}"${context.page?.page === item.page ? ' aria-current="page"' : ''}><span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.page)}</small></a>`).join('')}</nav>`;
}

function renderRequirementIndexPage({ meta, experience, schema, openapi, designSummary: summary = {} }) {
  const requirements = createRequirementSummaries({ experience, schema, openapi });
  const requirementRows = requirements.map((item) => {
    const pageChips = item.pages.length
      ? item.pages.map((page) => `<a href="${item.route}?page=${encodeURIComponent(page.page)}">${escapeHtml(page.title)}</a>`).join('')
      : '<span class="requirement-page-chip muted">设计资产</span>';
    const tableEntry = item.tables[0]
      ? `<a href="/p/database?table=${encodeURIComponent(item.tables[0].name)}"><b>${item.tables.length}</b> 表</a>`
      : '<span><b>0</b> 表</span>';
    const operationEntry = item.operations[0]
      ? `<a href="/p/docs#${encodeURIComponent(item.operations[0].operationId)}"><b>${item.operations.length}</b> 接口</a>`
      : '<span><b>0</b> 接口</span>';
    return `
      <tr>
        <td class="requirement-table-main" data-label="需求">
          <div class="requirement-table-title">
            <span class="requirement-id">${escapeHtml(item.id)}</span>
            <a href="${item.route}">${escapeHtml(item.title)}</a>
          </div>
          <p>${escapeHtml(item.summary)}</p>
        </td>
        <td class="requirement-table-status" data-label="状态">
          <span class="requirement-status">${escapeHtml(item.status)}</span>
        </td>
        <td class="requirement-table-pages" data-label="关联页面">
          <div class="requirement-page-chips">${pageChips}</div>
        </td>
        <td class="requirement-table-tech" data-label="技术闭环">
          <div class="requirement-tech-links">${tableEntry}${operationEntry}<span><b>${item.tour.length}</b> 步引导</span></div>
        </td>
        <td class="requirement-table-owner" data-label="负责人">${escapeHtml(item.owner || '未指定')}</td>
        <td class="requirement-table-action" data-label="详情">
          <a href="${item.route}" aria-label="查看 ${escapeHtml(item.id)} ${escapeHtml(item.title)}">查看闭环 <span aria-hidden="true">→</span></a>
        </td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(meta.name || '需求中心')} · 需求中心</title>
  <link rel="stylesheet" href="/shared/workspace.css">
</head>
<body class="requirement-index-body">
  <div class="requirement-index-shell">
    <header class="requirement-index-topbar">
      <a class="product-mark" href="/"><span>${escapeHtml((meta.name || 'P').slice(0, 1))}</span><strong>${escapeHtml(meta.name || '产品')}</strong><small>需求交付中心</small></a>
      <nav aria-label="设计资产"><a href="/p/database">数据库</a><a href="/p/api">API 设计</a><a href="/p/docs">接口文档</a></nav>
    </header>
    <main>
      <section class="requirement-overview">
        <div class="requirement-overview-copy">
          <div class="requirement-overview-meta"><span class="requirement-eyebrow">DELIVERY WORKSPACE</span><span class="requirement-version">v${escapeHtml(meta.version || '0.0.0')}</span></div>
          <h1>需求交付</h1>
          <p>以需求为交付单元，串联关联页面、引导讲解、数据库设计与接口契约。</p>
        </div>
        <dl class="requirement-overview-stats" aria-label="交付概览">
          <div><dd>${requirements.length}</dd><dt>需求</dt></div>
          <div><dd>${new Set(requirements.flatMap((item) => item.pages.map((page) => page.page))).size}</dd><dt>页面</dt></div>
          <div><dd>${summary.tableCount || 0}</dd><dt>数据表</dt></div>
          <div><dd>${summary.operationCount || 0}</dd><dt>接口</dt></div>
        </dl>
      </section>
      <section class="requirement-list-panel">
        <div class="requirement-list-heading">
          <div><h2>需求清单</h2><span>${requirements.length} 个交付单元</span></div>
          <p>需求 → 页面 → 设计资产</p>
        </div>
        <div class="requirement-table-wrap">
          <table class="requirement-table">
            <thead>
              <tr>
                <th scope="col">需求</th>
                <th scope="col">状态</th>
                <th scope="col">关联页面</th>
                <th scope="col">技术闭环</th>
                <th scope="col">负责人</th>
                <th scope="col"><span class="sr-only">详情</span></th>
              </tr>
            </thead>
            <tbody>${requirementRows}</tbody>
          </table>
        </div>
      </section>
      <section class="requirement-index-footer">
        <span>${escapeHtml(meta.version || '0.0.0')} · ${escapeHtml(summary.dialect || '设计资产')}</span>
        <span>数据库与接口均为设计资产，不启动本地数据库</span>
      </section>
    </main>
  </div>
</body>
</html>`;
}

function renderRequirementDetailPage({
  id,
  meta,
  experience,
  schema,
  openapi,
  designSummary: summary = {},
  requirementId,
  selectedPage = '',
  canvasQuery = '',
}) {
  const context = createRequirementContext({
    experience,
    requirementId,
    schema,
    openapi,
    selectedPage,
  });
  if (!context) return null;

  const canvasPage = context.page ? CANVAS_PAGES[context.page.page] : '';
  const canvasSrc = canvasPage
    ? `/canvas/${canvasPage}${canvasQuery ? `?${canvasQuery}` : ''}`
    : '';
  const requirementData = {
    ...experience,
    tour: context.tour,
    activeRequirementId: context.id,
  };
  const changes = context.changes.length
    ? `<ul class="page-change-list">${context.changes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="empty-panel-copy">该需求尚未记录改动点。</p>';
  const acceptance = context.acceptance.length
    ? `<ul class="check-list page-acceptance">${context.acceptance.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="empty-panel-copy">该需求尚未记录验收点。</p>';
  const pageChanges = context.pageChanges.length
    ? `<ul class="page-change-list">${context.pageChanges.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : '<p class="empty-panel-copy">当前关联页面尚未记录改动点。</p>';
  const tourContent = context.tour.length
    ? `<ol class="requirement-tour-list">${renderRequirementTour(context.tour)}</ol><button class="tour-launch" type="button" id="tour-start" disabled>正在准备画布…</button><div class="tour-note">引导只包含该需求的 ${context.tour.length} 个步骤，不会带入其他需求的讲解。</div>`
    : '<div class="empty-requirement-view"><span>GUIDED TOUR</span><strong>该需求暂无引导步骤</strong><p>可在体验配置的 tour 节点中补充 requirementId 为该需求的真实步骤。</p></div>';
  const pageSelector = context.pages.length
    ? `<div class="requirement-secondary-pages"><span class="panel-label">需求关联页面</span>${renderRequirementPagesNav(context)}</div>`
    : '';
  const title = `${context.id} · ${context.title}`;
  const productTitle = escapeHtml(`${meta.name || id} · ${title}`);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${productTitle}</title>
  <link rel="stylesheet" href="/shared/workspace.css">
</head>
<body class="requirement-detail-body">
  <header class="requirement-detail-topbar">
    <a class="product-mark compact" href="/"><span>${escapeHtml((meta.name || 'P').slice(0, 1))}</span><strong>${escapeHtml(meta.name || '产品')}</strong><small>需求交付中心</small></a>
    <div class="requirement-detail-identity"><span class="requirement-id">${escapeHtml(context.id)}</span><strong>${escapeHtml(context.title)}</strong></div>
    <nav aria-label="设计资产"><a href="/p/database">数据库</a><a href="/p/api">API 设计</a><a href="/p/docs">接口文档</a></nav>
  </header>
  <div class="workspace requirement-workspace" id="workspace">
    <section class="prototype-area requirement-prototype" aria-label="需求关联产品画布">
      <div class="canvas-toolbar">
        <div class="canvas-identity"><span class="canvas-status"><i></i> REQUIREMENT CANVAS</span><strong>${escapeHtml(context.page?.title || '无业务画布')}</strong>${context.page ? `<span>${escapeHtml(context.page.page)}</span>` : ''}</div>
        <div class="canvas-toolbar-right">
          ${renderRequirementPagesNav(context)}
          ${canvasSrc ? `<a class="canvas-open-link" href="${canvasSrc}" target="_blank" rel="noreferrer">新窗口 ↗</a>` : ''}
        </div>
      </div>
      ${canvasSrc
        ? `<iframe class="prototype-frame" id="prototype-frame" src="${canvasSrc}" title="${escapeHtml(`${context.title} - ${context.page.title}`)}" loading="eager"></iframe>`
        : `<div class="requirement-no-canvas"><div class="requirement-no-canvas-mark">⌘</div><span class="requirement-eyebrow">DESIGN-ONLY REQUIREMENT</span><h2>${escapeHtml(context.title)}</h2><p>该需求没有独立业务画布，技术闭环由数据模型与接口契约组成。右侧可查看具体表、接口和文档入口。</p><div class="requirement-no-canvas-links"><a href="/p/database">打开数据库设计 →</a><a href="/p/api">打开 API 设计 →</a><a href="/p/docs">打开接口文档 →</a></div></div>`}
    </section>
    <aside class="insight-panel requirement-insight" aria-label="需求说明、引导与技术闭环">
      <div class="panel-top">
        <div class="panel-heading"><div class="panel-kicker">REQUIREMENT CONTEXT</div><h2>${escapeHtml(context.title)}</h2><p>${escapeHtml(context.summary)}</p></div>
        <div class="panel-collapsed-label">REQ</div>
        <button class="panel-collapse" type="button" id="panel-toggle" aria-label="收起需求面板" aria-expanded="true">›</button>
      </div>
      <div class="panel-tabs" role="tablist" aria-label="需求说明">
        <button class="panel-tab active" type="button" role="tab" aria-selected="true" aria-controls="view-requirements" data-tab="requirements">需求说明</button>
        <button class="panel-tab" type="button" role="tab" aria-selected="false" aria-controls="view-tour" data-tab="tour">引导讲解</button>
        <button class="panel-tab" type="button" role="tab" aria-selected="false" aria-controls="view-technical" data-tab="technical">技术闭环</button>
      </div>
      <div class="panel-body">
        <section class="panel-view active" id="view-requirements" role="tabpanel">
          <div class="requirement-context-heading"><div class="requirement-context-meta"><span class="requirement-id">${escapeHtml(context.id)}</span><span class="requirement-status">${escapeHtml(context.status)}</span></div><h3>${escapeHtml(context.title)}</h3><p>${escapeHtml(context.summary)}</p><span class="requirement-owner">${escapeHtml(context.owner || '负责人待补充')}</span></div>
          <section class="context-section"><span class="panel-label">需求改动</span>${changes}</section>
          <section class="context-section"><span class="panel-label">验收标准</span>${acceptance}</section>
          ${pageSelector}
          <section class="context-section"><div class="context-section-heading"><span class="panel-label">当前页面改动</span>${context.page ? `<span class="context-count">${escapeHtml(context.page.title)}</span>` : ''}</div>${pageChanges}</section>
          <section class="context-section"><span class="panel-label">关联内容</span><div class="requirement-link-grid"><a href="${context.route}#tour"><span>TOUR</span><strong>${context.tour.length} 步引导</strong><small>只看本需求讲解</small></a><a href="/p/database"><span>DATA</span><strong>${context.tables.length} 张表</strong><small>查看数据设计</small></a><a href="/p/docs"><span>API</span><strong>${context.operations.length} 个接口</strong><small>查看接口文档</small></a></div></section>
        </section>
        <section class="panel-view" id="view-tour" role="tabpanel">
          <div class="view-heading"><span class="view-kicker">GUIDED TOUR</span><h3>按需求走完一段真实操作</h3></div>
          <p class="panel-lead">${context.tour.length ? `由 Node 服务下发 ${context.tour.length} 步引导，步骤已按需求 ${escapeHtml(context.id)} 过滤。` : '该需求目前没有可播放的引导步骤。'}</p>
          ${tourContent}
        </section>
        <section class="panel-view" id="view-technical" role="tabpanel">
          <div class="view-heading"><span class="view-kicker">TECHNICAL LOOP</span><h3>从数据模型到接口契约</h3></div>
          <p class="panel-lead">${escapeHtml(context.technicalSummary || experience.technical?.summary || '')}</p>
          ${renderRequirementDesignLinks(context, summary)}
        </section>
      </div>
    </aside>
  </div>
  <div class="tour-layer" aria-hidden="true"><div class="tour-backdrop"></div><div class="tour-highlight"></div><div class="tour-tooltip" role="dialog" aria-modal="true" aria-labelledby="tour-title"><div class="tour-topline"><span class="tour-kicker">GUIDED TOUR</span><span class="tour-count"></span></div><h3 class="tour-title" id="tour-title"></h3><p class="tour-description"></p><span class="tour-requirement"></span><div class="tour-actions"><div class="tour-dots"></div><div class="tour-actions-right"><button class="tour-button" type="button" data-tour-prev>上一步</button><button class="tour-button primary" type="button" data-tour-next>下一步</button><button class="tour-button" type="button" data-tour-end>结束</button></div></div></div></div>
  <script type="application/json" id="requirement-data">${serializeForHtml(requirementData)}</script>
  <script src="/shared/requirement.js"></script>
  <script src="/shared/tour.js"></script>
</body>
</html>`;
}

function renderPageNav(page, context) {
  const links = [
    ['dashboard', '经营概览'],
    ['orders', '订单管理'],
    ['customers', '客户管理'],
  ];
  return `<nav class="workspace-page-nav" aria-label="产品页面"><a href="/">需求中心</a>${links.map(([key, label]) => `<a class="${page === key ? 'active' : ''}" href="${PAGE_ROUTES[key]}"${page === key ? ' aria-current="page"' : ''}>${label}</a>`).join('')}<a href="/p/database">数据库</a><a href="/p/docs">接口</a></nav>`;
}

function renderWorkspacePage({
  id,
  meta,
  experience,
  schema,
  openapi,
  designSummary: summary = {},
  page = 'dashboard',
  canvasQuery = '',
}) {
  const canvasPage = CANVAS_PAGES[page] || CANVAS_PAGES.dashboard;
  const canvasPath = `/canvas/${canvasPage}`;
  const canvasSrc = canvasQuery ? `${canvasPath}?${canvasQuery}` : canvasPath;
  const safeTitle = escapeHtml(`${meta.name || id} - 产品交付平台`);
  const safeDescription = escapeHtml(meta.description || '');
  const tourSteps = experience.tour || [];
  const context = createPageContext({ experience, page, schema, openapi });

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  <link rel="stylesheet" href="/shared/workspace.css">
</head>
<body>
  <div class="workspace" id="workspace">
    <section class="prototype-area" aria-label="产品原型画布">
      <div class="canvas-toolbar">
        <div class="canvas-identity">
          <span class="canvas-status"><i></i> LIVE PRODUCT</span>
          <strong>${escapeHtml(meta.name || id)}</strong>
          <span>v${escapeHtml(meta.version || '0.0.0')}</span>
        </div>
        <div class="canvas-toolbar-right">
          ${renderPageNav(page)}
          <a class="canvas-open-link" href="${canvasSrc}" target="_blank" rel="noreferrer">新窗口 ↗</a>
        </div>
      </div>
      <iframe
        class="prototype-frame"
        id="prototype-frame"
        src="${canvasSrc}"
        title="${safeTitle}"
        loading="eager"
      ></iframe>
    </section>

    <aside class="insight-panel" aria-label="页面需求与产品资产">
      <div class="panel-top">
        <div class="panel-heading">
          <div class="panel-kicker">PAGE CONTEXT</div>
          <h2>${escapeHtml(context.title)}</h2>
          <p>${safeDescription}</p>
        </div>
        <div class="panel-collapsed-label">PAGE</div>
        <button class="panel-collapse" type="button" id="panel-toggle" aria-label="收起说明面板" aria-expanded="true">›</button>
      </div>

      <div class="panel-tabs" role="tablist" aria-label="页面说明">
        <button class="panel-tab active" type="button" role="tab" aria-selected="true" aria-controls="view-requirements" data-tab="requirements">本页需求</button>
        <button class="panel-tab" type="button" role="tab" aria-selected="false" aria-controls="view-tour" data-tab="tour">引导讲解</button>
        <button class="panel-tab" type="button" role="tab" aria-selected="false" aria-controls="view-technical" data-tab="technical">技术闭环</button>
      </div>

      <div class="panel-body">
        <section class="panel-view active" id="view-requirements" role="tabpanel">
          ${renderPageContext(context)}
        </section>

        <section class="panel-view" id="view-tour" role="tabpanel">
          <div class="view-heading">
            <span class="view-kicker">GUIDED TOUR</span>
            <h3>从关键交互理解需求</h3>
          </div>
          <p class="panel-lead">由 Node 服务下发 ${tourSteps.length} 步引导，覆盖需求、页面、数据库与接口之间的关联。</p>
          <ol class="tour-preview">${renderTourPreview(tourSteps)}</ol>
          <button class="tour-launch" type="button" id="tour-start" disabled>正在准备画布…</button>
          <div class="tour-note">支持键盘 ← → 切换步骤，按 Esc 退出。</div>
        </section>

        <section class="panel-view" id="view-technical" role="tabpanel">
          <div class="view-heading">
            <span class="view-kicker">TECHNICAL LOOP</span>
            <h3>${escapeHtml(experience.technical.title || '技术闭环')}</h3>
          </div>
          ${renderTechnicalSections(experience.technical, summary)}
        </section>
      </div>
    </aside>
  </div>

  <a class="back-link" href="/" aria-label="回到需求中心">← 需求中心</a>

  <div class="tour-layer" aria-hidden="true">
    <div class="tour-backdrop"></div>
    <div class="tour-highlight"></div>
    <div class="tour-tooltip" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div class="tour-topline">
        <span class="tour-kicker">GUIDED TOUR</span>
        <span class="tour-count"></span>
      </div>
      <h3 class="tour-title" id="tour-title"></h3>
      <p class="tour-description"></p>
      <span class="tour-requirement"></span>
      <div class="tour-actions">
        <div class="tour-dots"></div>
        <div class="tour-actions-right">
          <button class="tour-button" type="button" data-tour-prev>上一步</button>
          <button class="tour-button primary" type="button" data-tour-next>下一步</button>
          <button class="tour-button" type="button" data-tour-end>结束</button>
        </div>
      </div>
    </div>
  </div>

  <script type="application/json" id="experience-data">${serializeForHtml(experience)}</script>
  <script src="/shared/tour.js"></script>
  <script src="/shared/workspace.js"></script>
</body>
</html>`;
}

module.exports = {
  CANVAS_PAGES,
  PAGE_ROUTES,
  createPageContext,
  createRequirementContext,
  createRequirementSummaries,
  isValidProductId,
  readProductExperience,
  readProductMeta,
  renderRequirementDetailPage,
  renderRequirementIndexPage,
  renderWorkspacePage,
};
