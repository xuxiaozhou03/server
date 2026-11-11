const path = require('node:path');
const fs = require('fs-extra');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

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

function assertValidDesignDocument(document) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('OpenAPI 文档必须是一个 JSON 对象');
  }
  if (typeof document.openapi !== 'string' || !document.openapi.startsWith('3.')) {
    throw new Error('openapi 字段必须是 3.x 版本字符串');
  }
  if (!document.info || typeof document.info.title !== 'string' || typeof document.info.version !== 'string') {
    throw new Error('OpenAPI 必须包含 info.title 和 info.version');
  }
  if (!document.paths || typeof document.paths !== 'object' || Array.isArray(document.paths)) {
    throw new Error('OpenAPI 必须包含 paths 对象');
  }
  for (const [route, pathItem] of Object.entries(document.paths)) {
    if (!route.startsWith('/')) throw new Error(`接口路径必须以 / 开头：${route}`);
    if (!pathItem || typeof pathItem !== 'object') throw new Error(`接口路径定义不合法：${route}`);
    for (const method of HTTP_METHODS) {
      if (pathItem[method] && (!pathItem[method].responses || typeof pathItem[method].responses !== 'object')) {
        throw new Error(`${method.toUpperCase()} ${route} 缺少 responses`);
      }
    }
  }
  return document;
}

async function readProductDesign(productsDir, id) {
  const productDir = path.join(productsDir, id);
  const schemaPath = path.join(productDir, 'database', 'schema.json');
  const openapiPath = path.join(productDir, 'api', 'openapi.json');
  const schema = (await fs.pathExists(schemaPath)) ? await fs.readJson(schemaPath) : null;
  let openapi = null;
  if (await fs.pathExists(openapiPath)) {
    try {
      openapi = assertValidDesignDocument(await fs.readJson(openapiPath));
    } catch (error) {
      openapi = { parseError: error.message };
    }
  }
  return { schema, openapi, schemaPath, openapiPath };
}

function countOperations(openapi) {
  if (!openapi || !openapi.paths) return 0;
  return Object.values(openapi.paths).reduce((total, pathItem) => (
    total + HTTP_METHODS.filter((method) => pathItem && pathItem[method]).length
  ), 0);
}

function designSummary(design) {
  return {
    tableCount: design.schema?.tables?.length || 0,
    relationCount: design.schema?.relations?.length || 0,
    dialect: design.schema?.dialect || '未配置',
    operationCount: countOperations(design.openapi),
    openapiVersion: design.openapi?.openapi || '缺失',
  };
}

function layout({ title, subtitle, active, content, scripts = '' }) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} · 产品设计中心</title>
  <link rel="stylesheet" href="/shared/design.css">
</head>
<body>
  <header class="design-topbar">
    <a class="design-brand" href="/">
      <span class="design-brand-mark">D</span>
      <span><strong>Product Studio</strong><small>数据库与接口设计</small></span>
    </a>
    <nav class="design-nav" aria-label="设计导航">
      <a class="${active === 'database' ? 'active' : ''}" href="/p/database">数据库设计</a>
      <a class="${active === 'api' ? 'active' : ''}" href="/p/api">API 设计</a>
      <a class="${active === 'docs' ? 'active' : ''}" href="/p/docs">接口文档</a>
    </nav>
    <a class="back-workspace" href="/p/dashboard">← 返回产品工作台</a>
  </header>
  <main class="design-shell">
    <div class="design-heading">
      <div><span class="design-kicker">${escapeHtml(active === 'database' ? 'DATA MODEL' : 'API CONTRACT')}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>
      <span class="source-pill"><i></i> 设计资产 · 不启动数据库</span>
    </div>
    ${content}
  </main>
  ${scripts}
</body>
</html>`;
}

function renderDatabaseOverview(schema) {
  const tables = schema?.tables || [];
  const relations = schema?.relations || [];
  const columnCount = tables.reduce((total, table) => total + (table.columns?.length || 0), 0);
  const indexCount = tables.reduce((total, table) => total + (table.indexes?.length || 0), 0);
  return `<section class="summary-grid">
    <article class="summary-card"><span>数据库方言</span><strong>${escapeHtml(schema?.dialect || '未配置')}</strong><small>设计基线，不启动本地数据库</small></article>
    <article class="summary-card"><span>数据表</span><strong>${tables.length}</strong><small>围绕订单聚合组织</small></article>
    <article class="summary-card"><span>字段</span><strong>${columnCount}</strong><small>含主键、外键与审计字段</small></article>
    <article class="summary-card"><span>关系 / 索引</span><strong>${relations.length} / ${indexCount}</strong><small>关系约束与查询路径</small></article>
  </section>`;
}

function renderRelations(schema) {
  const relations = schema?.relations || [];
  return `<section class="design-card relation-card">
    <div class="card-heading"><div><span class="card-kicker">RELATIONSHIP MAP</span><h2>实体关系</h2></div><span class="muted-count">${relations.length} 条关系</span></div>
    <div class="relation-map">
      ${relations.map((relation) => `
        <div class="relation-row">
          <code>${escapeHtml(relation.from)}</code>
          <span class="relation-arrow"><i></i><b>${escapeHtml(relation.cardinality)}</b></span>
          <code>${escapeHtml(relation.to)}</code>
          <span class="relation-label">${escapeHtml(relation.label)} · ON DELETE ${escapeHtml(relation.onDelete || 'RESTRICT')}</span>
        </div>`).join('')}
    </div>
  </section>`;
}

function renderColumnRow(column) {
  const key = column.key || (column.unique ? 'UQ' : '');
  return `<tr>
    <td><code class="column-name">${escapeHtml(column.name)}</code>${column.references ? `<small>→ ${escapeHtml(column.references)}</small>` : ''}</td>
    <td><span class="type-badge">${escapeHtml(column.type)}</span></td>
    <td>${key ? `<span class="key-badge key-${escapeHtml(key.toLowerCase())}">${escapeHtml(key)}</span>` : '<span class="dash">—</span>'}</td>
    <td>${column.nullable ? '<span class="nullable">NULL</span>' : '<span class="required">NOT NULL</span>'}</td>
    <td><code class="default-value">${column.default ? escapeHtml(column.default) : '—'}</code></td>
    <td>${escapeHtml(column.description || '')}</td>
  </tr>`;
}

function renderTable(table, active) {
  return `<section class="design-card table-panel ${active ? 'active' : ''}" data-table-panel="${escapeHtml(table.name)}">
    <div class="card-heading">
      <div><span class="card-kicker">TABLE / ${escapeHtml(table.name)}</span><h2>${escapeHtml(table.label || table.name)} <code>${escapeHtml(table.name)}</code></h2><p>${escapeHtml(table.description || '')}</p></div>
      <span class="muted-count">${table.columns?.length || 0} 字段</span>
    </div>
    <div class="table-scroll"><table class="schema-table"><thead><tr><th>字段</th><th>类型</th><th>键</th><th>可空</th><th>默认值</th><th>说明</th></tr></thead><tbody>${(table.columns || []).map(renderColumnRow).join('')}</tbody></table></div>
    <div class="index-list"><span class="card-kicker">INDEXES</span>${(table.indexes || []).map((index) => `<div class="index-row"><code>${escapeHtml(index.name)}</code><span>${(index.columns || []).map(escapeHtml).join(', ')}</span><span class="index-kind">${index.unique ? 'UNIQUE' : 'INDEX'}</span><small>${escapeHtml(index.reason || '')}</small></div>`).join('') || '<p class="empty-copy">暂无索引定义</p>'}</div>
  </section>`;
}

function renderDatabasePage({ schema }) {
  const tables = schema?.tables || [];
  const principles = schema?.principles || [];
  const content = `
    ${renderDatabaseOverview(schema)}
    <div class="database-layout">
      <aside class="table-sidebar">
        <div class="sidebar-head"><span>数据表</span><b>${tables.length}</b></div>
        <label class="design-search"><span>⌕</span><input id="table-search" type="search" placeholder="搜索表或字段"></label>
        <nav id="table-nav">
          ${tables.map((table, index) => `<button type="button" class="${index === 0 ? 'active' : ''}" data-table-target="${escapeHtml(table.name)}"><span>${escapeHtml(table.label || table.name)}</span><code>${escapeHtml(table.name)}</code><b>${table.columns?.length || 0}</b></button>`).join('')}
        </nav>
        <div class="principle-box"><span class="card-kicker">DESIGN NOTES</span>${principles.map((item) => `<p>${escapeHtml(item)}</p>`).join('')}</div>
      </aside>
      <div class="table-detail">${tables.map((table, index) => renderTable(table, index === 0)).join('')}</div>
    </div>
    ${renderRelations(schema)}`;
  return layout({
    title: schema?.name ? `${schema.name} 数据库设计` : '数据库设计',
    subtitle: '从表结构、约束和关系开始维护业务模型；这里只展示设计资产，不连接或启动真实数据库。',
    active: 'database',
    content,
    scripts: '<script src="/shared/database-design.js"></script>',
  });
}

function operationEntries(openapi) {
  const entries = [];
  for (const [route, pathItem] of Object.entries(openapi?.paths || {})) {
    for (const method of HTTP_METHODS) {
      if (pathItem[method]) entries.push({ route, method, operation: pathItem[method], pathParameters: pathItem.parameters || [] });
    }
  }
  return entries;
}

function resolveRefName(ref) {
  if (typeof ref !== 'string') return '';
  return ref.split('/').at(-1) || ref;
}

function schemaLabel(schema) {
  if (!schema) return 'Any';
  if (schema.$ref) return resolveRefName(schema.$ref);
  if (schema.type === 'array') return `${schemaLabel(schema.items)}[]`;
  if (Array.isArray(schema.type)) return schema.type.join(' | ');
  return schema.type || 'Object';
}

function schemaFields(schema) {
  if (!schema) return [];
  if (schema.$ref) return [];
  if (schema.allOf) return schema.allOf.flatMap(schemaFields);
  return Object.entries(schema.properties || {}).map(([name, property]) => ({
    name,
    type: schemaLabel(property),
    required: Array.isArray(schema.required) && schema.required.includes(name),
    description: property.description || '',
  }));
}

function operationAnchor(entry) {
  const raw = entry.operation.operationId || `${entry.method}-${entry.route}`;
  return String(raw).replace(/[^a-zA-Z0-9_-]/g, '-');
}

function renderParameter(parameter) {
  const param = parameter.$ref ? { name: resolveRefName(parameter.$ref), in: 'ref', required: true, schema: {} } : parameter;
  return `<div class="param-row"><code>${escapeHtml(param.name || 'parameter')}</code><span>${escapeHtml(param.in || '')}</span><span class="param-type">${escapeHtml(schemaLabel(param.schema))}</span><b>${param.required ? 'required' : 'optional'}</b><p>${escapeHtml(param.description || '')}</p></div>`;
}

function renderOperation(entry) {
  const { route, method, operation, pathParameters } = entry;
  const parameters = [...pathParameters, ...(operation.parameters || [])];
  const responses = Object.entries(operation.responses || {});
  const requestBody = operation.requestBody?.content?.['application/json']?.schema;
  const requestName = resolveRefName(operation.requestBody?.content?.['application/json']?.schema?.$ref);
  return `<article class="endpoint-card" id="${operationAnchor(entry)}" data-method="${method}" data-route="${escapeHtml(route)}">
    <div class="endpoint-head">
      <span class="method method-${method}">${method.toUpperCase()}</span>
      <code class="endpoint-path">${escapeHtml(route)}</code>
      <span class="operation-id">${escapeHtml(operation.operationId || '')}</span>
    </div>
    <div class="endpoint-body">
      <div class="endpoint-summary"><h3>${escapeHtml(operation.summary || route)}</h3><p>${escapeHtml(operation.description || '')}</p></div>
      ${parameters.length ? `<div class="endpoint-section"><span class="mini-label">PARAMETERS</span><div class="param-list">${parameters.map(renderParameter).join('')}</div></div>` : ''}
      ${requestBody ? `<div class="endpoint-section"><span class="mini-label">REQUEST BODY · application/json</span><div class="schema-chip">${escapeHtml(requestName || schemaLabel(requestBody))}</div>${renderSchemaPreview(requestName || schemaLabel(requestBody), requestBody)}</div>` : ''}
      <div class="endpoint-section"><span class="mini-label">RESPONSES</span><div class="response-list">${responses.map(([status, response]) => {
        const responseSchema = response?.content?.['application/json']?.schema;
        return `<div class="response-row"><code class="response-status ${String(status).startsWith('2') ? 'success' : 'error'}">${escapeHtml(status)}</code><span>${escapeHtml(response?.description || '')}</span>${responseSchema ? `<code class="response-schema">${escapeHtml(resolveRefName(responseSchema.$ref) || schemaLabel(responseSchema))}</code>` : ''}</div>`;
      }).join('')}</div></div>
    </div>
  </article>`;
}

function renderSchemaPreview(name, schema) {
  const fields = schemaFields(schema);
  if (!fields.length) return '';
  return `<div class="schema-preview"><div class="schema-preview-head"><strong>${escapeHtml(name)}</strong><span>${fields.length} fields</span></div>${fields.map((field) => `<div class="schema-field"><code>${escapeHtml(field.name)}</code><span>${escapeHtml(field.type)}</span>${field.required ? '<b>required</b>' : ''}<small>${escapeHtml(field.description)}</small></div>`).join('')}</div>`;
}

function renderOpenApiDocs(openapi, { compact = false } = {}) {
  const entries = operationEntries(openapi);
  const tags = openapi?.tags || [];
  const grouped = tags.length
    ? tags.map((tag) => ({ name: tag.name, description: tag.description, entries: entries.filter((entry) => (entry.operation.tags || []).includes(tag.name)) })).filter((group) => group.entries.length)
    : [{ name: 'API', description: '', entries }];
  return `<div class="docs-overview">
      <div class="api-meta"><span class="version-badge">OpenAPI ${escapeHtml(openapi?.openapi || '')}</span><span>${entries.length} 个操作</span><span>${Object.keys(openapi?.components?.schemas || {}).length} 个 Schema</span></div>
      <p>${escapeHtml(openapi?.info?.description || '')}</p>
      ${openapi?.servers?.length ? `<div class="server-bar"><span>BASE URL</span><code>${escapeHtml(openapi.servers[0].url || '/')}</code></div>` : ''}
    </div>
    <div class="docs-groups">${grouped.map((group) => `
      <section class="docs-group" data-tag="${escapeHtml(group.name)}">
        <div class="group-heading"><div><span class="card-kicker">TAG</span><h2>${escapeHtml(group.name)}</h2></div><span>${group.entries.length} endpoints</span></div>
        <p>${escapeHtml(group.description || '')}</p>
        ${group.entries.map(renderOperation).join('')}
      </section>`).join('')}</div>${compact ? '' : ''}`;
}

function renderApiStudioPage({ openapi }) {
  const safeOpenapi = openapi || { openapi: '3.1.0', info: { title: 'API', version: '1.0.0' }, paths: {} };
  const content = `<div class="studio-layout">
    <section class="studio-editor design-card">
      <div class="studio-toolbar">
        <div><span class="card-kicker">OPENAPI CONTRACT</span><h2>接口契约编辑</h2></div>
        <div class="toolbar-actions"><button class="design-button secondary" type="button" id="format-contract">格式化</button><button class="design-button secondary" type="button" id="reset-contract">重置</button><button class="design-button primary" type="button" id="save-contract">保存设计</button></div>
      </div>
      <div class="editor-note"><span id="save-status">修改 JSON 后保存，右侧文档会同步刷新。</span><code>OpenAPI Contract</code></div>
      <textarea id="contract-editor" spellcheck="false" aria-label="OpenAPI JSON 编辑器">${escapeHtml(JSON.stringify(safeOpenapi, null, 2))}</textarea>
      <div class="editor-footer"><span><i></i> Node 原生读写</span><span id="validation-state">JSON 结构待校验</span></div>
    </section>
    <section class="studio-preview">
      <div class="preview-heading"><div><span class="card-kicker">SWAGGER-LIKE VIEWER</span><h2>接口文档预览</h2></div><button class="design-button secondary" type="button" id="open-docs">独立文档 ↗</button></div>
      <div class="docs-shell" id="swagger-preview">${renderOpenApiDocs(safeOpenapi)}</div>
    </section>
  </div>`;
  return layout({
    title: 'API 契约设计',
    subtitle: '在系统内维护 OpenAPI JSON，保存后即时获得按 Tag 分组的接口文档。',
    active: 'api',
    content,
    scripts: `<script type="application/json" id="openapi-data">${serializeForHtml(safeOpenapi)}</script><script src="/shared/api-studio.js"></script>`,
  });
}

function renderApiDocsPage({ openapi }) {
  const content = `<div class="docs-page-grid">
    <aside class="docs-sidebar design-card"><span class="card-kicker">ENDPOINTS</span>${operationEntries(openapi).map((entry) => `<a href="#${operationAnchor(entry)}"><span class="method method-${entry.method}">${entry.method.toUpperCase()}</span><code>${escapeHtml(entry.route)}</code></a>`).join('')}<div class="docs-side-note">接口文档由当前产品的 OpenAPI 契约生成，无第三方 Swagger 运行时。</div></aside>
    <section class="docs-main">${renderOpenApiDocs(openapi)}</section>
  </div>`;
  return layout({
    title: openapi?.info?.title || '接口文档',
    subtitle: '只读的 Swagger 风格接口文档，用于评审、联调和交付。',
    active: 'docs',
    content,
  });
}

module.exports = {
  assertValidDesignDocument,
  countOperations,
  designSummary,
  operationEntries,
  readProductDesign,
  renderApiDocsPage,
  renderApiStudioPage,
  renderDatabasePage,
  renderOpenApiDocs,
};
