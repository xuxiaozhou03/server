const path = require('node:path');
const fs = require('fs-extra');
const { CANVAS_PAGES } = require('../server/workspace');

const PRODUCTS_DIR = path.resolve(__dirname, '..', 'products');
const REQUIRED_FIELDS = ['id', 'name', 'version', 'description'];
const PRODUCT_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
const PAGE_KEYS = Object.keys(CANVAS_PAGES);
const TOUR_PAGES = new Set(PAGE_KEYS);
const REQUIRED_PROTOTYPE_PAGES = Object.values(CANVAS_PAGES);
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.json']);
const EXTERNAL_RESOURCE_PATTERNS = [
  /<(?:script|link|img|iframe)\b[^>]*(?:src|href)=["']https?:\/\//i,
  /@import\s+(?:url\()?["']?https?:\/\//i,
  /url\(\s*["']?https?:\/\//i,
];
const FORBIDDEN_DEPENDENCIES = new Set([
  'react', 'react-dom', 'vite', '@vitejs/plugin-react', 'tailwindcss',
  '@tailwindcss/vite', '@tailwindcss/postcss', 'shadcn', 'swagger-ui',
  'swagger-ui-express',
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function splitColumnReference(value) {
  if (!isNonEmptyString(value)) return null;
  const separator = value.lastIndexOf('.');
  if (separator <= 0 || separator === value.length - 1) return null;
  return { table: value.slice(0, separator), column: value.slice(separator + 1) };
}

function normalizeIndexColumn(value) {
  return String(value).replace(/\s+(?:ASC|DESC)$/i, '').trim();
}

function resolveJsonPointer(document, ref) {
  if (!ref.startsWith('#/')) return undefined;
  return ref.slice(2).split('/').reduce((current, part) => {
    if (!isObject(current) && !Array.isArray(current)) return undefined;
    const key = part.replaceAll('~1', '/').replaceAll('~0', '~');
    return current[key];
  }, document);
}

function validateSchema(schema, productName, errors) {
  const prefix = `[${productName}] database/schema.json`;
  if (!isObject(schema)) {
    errors.push(`${prefix} 必须是 JSON 对象`);
    return;
  }
  if (!isNonEmptyString(schema.name)) errors.push(`${prefix} 缺少 name`);
  if (!isNonEmptyString(schema.dialect)) errors.push(`${prefix} 缺少 dialect`);
  if (!Array.isArray(schema.tables) || schema.tables.length === 0) {
    errors.push(`${prefix} 必须包含非空 tables 数组`);
    return;
  }
  if (!Array.isArray(schema.relations)) errors.push(`${prefix} 缺少 relations 数组`);

  const tableMap = new Map();
  const indexNames = new Set();

  schema.tables.forEach((table, tableIndex) => {
    const tableLabel = `表 #${tableIndex + 1}`;
    if (!isObject(table)) {
      errors.push(`${prefix} ${tableLabel} 必须是对象`);
      return;
    }
    if (!isNonEmptyString(table.name)) {
      errors.push(`${prefix} ${tableLabel} 缺少 name`);
      return;
    }
    if (tableMap.has(table.name)) errors.push(`${prefix} 表名重复：${table.name}`);
    if (!Array.isArray(table.columns) || table.columns.length === 0) {
      errors.push(`${prefix} 表 ${table.name} 缺少 columns`);
      return;
    }

    const columns = new Map();
    table.columns.forEach((column, columnIndex) => {
      if (!isObject(column) || !isNonEmptyString(column.name)) {
        errors.push(`${prefix} 表 ${table.name} 的字段 #${columnIndex + 1} 缺少 name`);
        return;
      }
      if (columns.has(column.name)) errors.push(`${prefix} 表 ${table.name} 字段名重复：${column.name}`);
      if (!isNonEmptyString(column.type)) errors.push(`${prefix} 表 ${table.name}.${column.name} 缺少 type`);
      if (typeof column.nullable !== 'boolean') {
        errors.push(`${prefix} 表 ${table.name}.${column.name} 缺少布尔值 nullable`);
      }
      columns.set(column.name, column);
    });

    tableMap.set(table.name, { table, columns });

    if (table.indexes !== undefined && !Array.isArray(table.indexes)) {
      errors.push(`${prefix} 表 ${table.name} 的 indexes 必须是数组`);
    }
    (Array.isArray(table.indexes) ? table.indexes : []).forEach((index) => {
      if (!isObject(index) || !isNonEmptyString(index.name)) {
        errors.push(`${prefix} 表 ${table.name} 存在缺少 name 的索引`);
        return;
      }
      if (indexNames.has(index.name)) errors.push(`${prefix} 索引名重复：${index.name}`);
      indexNames.add(index.name);
      if (!Array.isArray(index.columns) || index.columns.length === 0) {
        errors.push(`${prefix} 索引 ${index.name} 缺少 columns`);
        return;
      }
      index.columns.forEach((columnName) => {
        const normalized = normalizeIndexColumn(columnName);
        if (!columns.has(normalized)) {
          errors.push(`${prefix} 索引 ${index.name} 引用了不存在的字段 ${table.name}.${normalized}`);
        }
      });
    });
  });

  const assertColumnReference = (value, location) => {
    const reference = splitColumnReference(value);
    if (!reference) {
      errors.push(`${prefix} ${location} 的字段引用格式必须为 table.column：${value || '缺失'}`);
      return;
    }
    const target = tableMap.get(reference.table);
    if (!target) {
      errors.push(`${prefix} ${location} 引用了不存在的表：${reference.table}`);
      return;
    }
    if (!target.columns.has(reference.column)) {
      errors.push(`${prefix} ${location} 引用了不存在的字段：${value}`);
    }
  };

  tableMap.forEach(({ table }, tableName) => {
    table.columns.forEach((column) => {
      if (column.key === 'FK' && !column.references) {
        errors.push(`${prefix} 外键 ${tableName}.${column.name} 缺少 references`);
      }
      if (column.references) assertColumnReference(column.references, `外键 ${tableName}.${column.name}`);
    });
  });

  (Array.isArray(schema.relations) ? schema.relations : []).forEach((relation, index) => {
    const location = `relation #${index + 1}`;
    if (!isObject(relation)) {
      errors.push(`${prefix} ${location} 必须是对象`);
      return;
    }
    if (!isNonEmptyString(relation.cardinality)) errors.push(`${prefix} ${location} 缺少 cardinality`);
    assertColumnReference(relation.from, `${location}.from`);
    assertColumnReference(relation.to, `${location}.to`);
  });
}

function validateOpenApi(openapi, productName, errors) {
  const prefix = `[${productName}] api/openapi.json`;
  if (!isObject(openapi)) {
    errors.push(`${prefix} 必须是 JSON 对象`);
    return;
  }
  if (!isNonEmptyString(openapi.openapi) || !openapi.openapi.startsWith('3.')) {
    errors.push(`${prefix} openapi 必须是 3.x 版本字符串`);
  }
  if (!isObject(openapi.info) || !isNonEmptyString(openapi.info.title) || !isNonEmptyString(openapi.info.version)) {
    errors.push(`${prefix} 缺少 info.title 或 info.version`);
  }
  if (!isObject(openapi.paths)) {
    errors.push(`${prefix} 缺少 paths 对象`);
    return;
  }

  const operationIds = new Set();
  for (const [route, pathItem] of Object.entries(openapi.paths)) {
    if (!route.startsWith('/')) errors.push(`${prefix} 接口路径必须以 / 开头：${route}`);
    if (!isObject(pathItem)) {
      errors.push(`${prefix} 路径 ${route} 的定义必须是对象`);
      continue;
    }
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation) continue;
      const location = `${method.toUpperCase()} ${route}`;
      if (!isObject(operation)) {
        errors.push(`${prefix} ${location} 必须是对象`);
        continue;
      }
      if (!isNonEmptyString(operation.operationId)) {
        errors.push(`${prefix} ${location} 缺少 operationId`);
      } else if (operationIds.has(operation.operationId)) {
        errors.push(`${prefix} operationId 重复：${operation.operationId}`);
      } else {
        operationIds.add(operation.operationId);
      }
      if (!isObject(operation.responses) || Object.keys(operation.responses).length === 0) {
        errors.push(`${prefix} ${location} 缺少 responses`);
      }
    }
  }

  const refs = [];
  function collectRefs(value) {
    if (Array.isArray(value)) {
      value.forEach(collectRefs);
      return;
    }
    if (!isObject(value)) return;
    if (typeof value.$ref === 'string' && value.$ref.startsWith('#/')) refs.push(value.$ref);
    Object.values(value).forEach(collectRefs);
  }
  collectRefs(openapi);
  [...new Set(refs)].forEach((ref) => {
    if (resolveJsonPointer(openapi, ref) === undefined) {
      errors.push(`${prefix} 存在无法解析的 $ref：${ref}`);
    }
  });
}

function validateExperienceAssociations(experience, schema, openapi, productName, errors) {
  const prefix = `[${productName}] 页面关联`;
  if (!isObject(experience.pages)) {
    errors.push(`${prefix} 缺少 pages 配置`);
    return;
  }

  const requirements = Array.isArray(experience.requirements?.items) ? experience.requirements.items : [];
  const requirementIds = new Set(requirements.map((item) => item?.id).filter(isNonEmptyString));
  const tableNames = new Set((schema?.tables || []).map((table) => table?.name).filter(isNonEmptyString));
  const operationIds = new Set();

  for (const [route, pathItem] of Object.entries(openapi?.paths || {})) {
    if (route === 'parameters' || !isObject(pathItem)) continue;
    for (const method of HTTP_METHODS) {
      const operationId = pathItem[method]?.operationId;
      if (isNonEmptyString(operationId)) operationIds.add(operationId);
    }
  }

  for (const page of PAGE_KEYS) {
    const config = experience.pages[page];
    const location = `pages.${page}`;
    if (!isObject(config)) {
      errors.push(`${prefix} 缺少 ${location}`);
      continue;
    }
    if (config.route !== `/p/${page}`) {
      errors.push(`${prefix} ${location}.route 必须是 /p/${page}`);
    }
    if (!isNonEmptyString(config.title)) errors.push(`${prefix} ${location} 缺少 title`);
    if (!isNonEmptyString(config.summary)) errors.push(`${prefix} ${location} 缺少 summary`);
    if (!Array.isArray(config.requirementIds) || config.requirementIds.length === 0) {
      errors.push(`${prefix} ${location} 至少关联一个需求`);
    }
    (Array.isArray(config.requirementIds) ? config.requirementIds : []).forEach((id) => {
      if (!requirementIds.has(id)) errors.push(`${prefix} ${location} 关联了不存在的需求：${id}`);
    });
    if (!Array.isArray(config.changes) || config.changes.length === 0) {
      errors.push(`${prefix} ${location} 缺少本页需求改动 changes`);
    }
    if (!Array.isArray(config.acceptance) || config.acceptance.length === 0) {
      errors.push(`${prefix} ${location} 缺少本页验收点 acceptance`);
    }
    if (!Array.isArray(config.tables) || config.tables.length === 0) {
      errors.push(`${prefix} ${location} 至少关联一张数据表`);
    }
    (Array.isArray(config.tables) ? config.tables : []).forEach((name) => {
      if (!tableNames.has(name)) errors.push(`${prefix} ${location} 关联了不存在的数据表：${name}`);
    });
    if (!Array.isArray(config.operations) || config.operations.length === 0) {
      errors.push(`${prefix} ${location} 至少关联一个接口`);
    }
    (Array.isArray(config.operations) ? config.operations : []).forEach((id) => {
      if (!operationIds.has(id)) errors.push(`${prefix} ${location} 关联了不存在的接口 operationId：${id}`);
    });
  }
}

function validateTour(experience, productName, errors) {
  const prefix = `[${productName}] 体验配置`;
  if (!isObject(experience.requirements)) errors.push(`${prefix} 缺少 requirements`);
  if (!Array.isArray(experience.requirements?.items) || experience.requirements.items.length === 0) {
    errors.push(`${prefix} requirements.items 必须是非空数组`);
  }
  if (!isObject(experience.technical)) errors.push(`${prefix} 缺少 technical`);
  if (!Array.isArray(experience.tour) || experience.tour.length === 0) {
    errors.push(`${prefix} 缺少 tour 步骤`);
    return;
  }

  const stepIds = new Set();
  experience.tour.forEach((step, index) => {
    const location = `Tour 第 ${index + 1} 步`;
    if (!isObject(step)) {
      errors.push(`${prefix} ${location} 必须是对象`);
      return;
    }
    if (!isNonEmptyString(step.title)) errors.push(`${prefix} ${location} 缺少 title`);
    if (!isNonEmptyString(step.targetSelector)) errors.push(`${prefix} ${location} 缺少 targetSelector`);
    if (!isNonEmptyString(step.requirementId)) errors.push(`${prefix} ${location} 缺少 requirementId`);
    else if (Array.isArray(experience.requirements?.items) && !experience.requirements.items.some((item) => item?.id === step.requirementId)) {
      errors.push(`${prefix} ${location} 关联了不存在的需求：${step.requirementId}`);
    }
    if (step.targetScope && !['frame', 'workspace'].includes(step.targetScope)) {
      errors.push(`${prefix} ${location} 的 targetScope 只能是 frame 或 workspace`);
    }
    if (step.page && !TOUR_PAGES.has(step.page)) {
      errors.push(`${prefix} ${location} 的 page 不合法：${step.page}`);
    }
    if (Object.prototype.hasOwnProperty.call(step, 'openOrder') && !isNonEmptyString(step.openOrder)) {
      errors.push(`${prefix} ${location} 的 openOrder 必须是非空字符串`);
    }
    if (isNonEmptyString(step.id)) {
      if (stepIds.has(step.id)) errors.push(`${prefix} Tour step id 重复：${step.id}`);
      stepIds.add(step.id);
    }
  });
}

async function listFiles(directory) {
  const files = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

async function validatePrototypeConstraints(productDir, productName, errors) {
  const prefix = `[${productName}] 原型资源`;
  const files = await listFiles(productDir).catch(() => []);
  for (const file of files) {
    if (!TEXT_EXTENSIONS.has(path.extname(file))) continue;
    const content = await fs.readFile(file, 'utf8');
    if (EXTERNAL_RESOURCE_PATTERNS.some((pattern) => pattern.test(content))) {
      errors.push(`${prefix} 禁止引用外部 URL/CDN：${path.relative(productDir, file)}`);
    }

    if (path.basename(file) !== 'package.json') continue;
    let packageJson;
    try {
      packageJson = JSON.parse(content);
    } catch (error) {
      errors.push(`${prefix} package.json 不是合法 JSON：${path.relative(productDir, file)}`);
      continue;
    }
    const dependencies = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
      ...(packageJson.peerDependencies || {}),
    };
    for (const dependency of Object.keys(dependencies)) {
      if (FORBIDDEN_DEPENDENCIES.has(dependency)) {
        errors.push(`${prefix} 不允许前端构建/运行时依赖 ${dependency}`);
      }
    }
  }
}

async function validatePrototypePages(prototypeDir, productName, errors) {
  const prefix = `[${productName}] 页面结构`;
  const indexFile = path.join(prototypeDir, 'index.html');

  for (const [page, pageFile] of Object.entries(CANVAS_PAGES)) {
    const pagePath = path.join(prototypeDir, pageFile);
    if (!(await fs.pathExists(pagePath))) {
      errors.push(`${prefix} 缺少独立页面 prototype/${pageFile}`);
      continue;
    }

    const html = await fs.readFile(pagePath, 'utf8');
    const hasSpaNav = /<button\b[^>]*\bclass=["'][^"']*\bnav-item\b[^"']*["'][^>]*\bdata-page\s*=|<button\b[^>]*\bdata-page\s*=[^>]*\bclass=["'][^"']*\bnav-item\b/i.test(html);
    if (hasSpaNav) {
      errors.push(`${prefix} ${pageFile} 仍在使用 button.nav-item[data-page] 做页面切换`);
    }

    for (const targetPage of Object.keys(CANVAS_PAGES)) {
      const linkPattern = new RegExp(`href=["']/p/${targetPage}(?:[/?#][^"']*)?["']`);
      if (!linkPattern.test(html)) {
        errors.push(`${prefix} ${pageFile} 缺少指向 /p/${targetPage} 的真实页面链接`);
      }
    }
    if (/href=["']\.\/(?:dashboard|orders|customers)\.html(?:[?#][^"']*)?["']/i.test(html)) {
      errors.push(`${prefix} ${pageFile} 的业务导航不得使用画布文件名，应使用 /p/<page-id>`);
    }
    if (/\/p\/demo-order(?:\/|["'?])/i.test(html)) {
      errors.push(`${prefix} ${pageFile} 不得暴露产品目录路由 /p/demo-order`);
    }
  }

  if (!(await fs.pathExists(indexFile))) {
    errors.push(`${prefix} 缺少 prototype/index.html`);
    return;
  }

  const indexHtml = await fs.readFile(indexFile, 'utf8');
  if (!/<meta\s+http-equiv=["']refresh["'][^>]*(?:\/p\/dashboard|dashboard\.html)/i.test(indexHtml)) {
    errors.push(`${prefix} prototype/index.html 必须轻量重定向到 /p/dashboard`);
  }
  if (/href=["']\.\/(?:dashboard|orders|customers)\.html(?:[?#][^"']*)?["']/i.test(indexHtml)) {
    errors.push(`${prefix} prototype/index.html 不得使用画布文件名作为业务入口`);
  }
  if (/<script\b/i.test(indexHtml)) {
    errors.push(`${prefix} prototype/index.html 不得承载产品脚本`);
  }
}

async function validate() {
  await fs.ensureDir(PRODUCTS_DIR);
  const entries = await fs.readdir(PRODUCTS_DIR, { withFileTypes: true });
  const productDirs = entries.filter((entry) => entry.isDirectory());
  const errors = [];

  if (productDirs.length !== 1) {
    errors.push(`一仓库一产品：products/ 下必须且只能有一个产品目录，当前为 ${productDirs.length} 个`);
  }

  for (const entry of productDirs) {
    let experienceDocument = null;
    let schemaDocument = null;
    let openapiDocument = null;
    const productDir = path.join(PRODUCTS_DIR, entry.name);
    const metaPath = path.join(productDir, 'meta.json');
    const prototypeDir = path.join(productDir, 'prototype');
    const schemaPath = path.join(productDir, 'database', 'schema.json');
    const openapiPath = path.join(productDir, 'api', 'openapi.json');

    if (!(await fs.pathExists(metaPath))) {
      errors.push(`[${entry.name}] 缺少 meta.json`);
      continue;
    }

    let meta;
    try {
      meta = await fs.readJson(metaPath);
    } catch (error) {
      errors.push(`[${entry.name}] meta.json 不是合法 JSON：${error.message}`);
      continue;
    }

    for (const field of REQUIRED_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(meta, field) || meta[field] === '') {
        errors.push(`[${entry.name}] meta.json 缺少字段：${field}`);
      }
    }
    if (!PRODUCT_ID_PATTERN.test(entry.name)) {
      errors.push(`[${entry.name}] 目录名必须使用小写英文、数字和连字符`);
    }
    if (meta.id !== entry.name) {
      errors.push(`[${entry.name}] meta.json 的 id "${meta.id}" 与目录名不一致`);
    }
    if (!isNonEmptyString(meta.updatedAt)) errors.push(`[${entry.name}] meta.json 缺少 updatedAt`);

    const experienceFile = meta.experienceFile || 'data/order-list.json';
    const experiencePath = path.resolve(productDir, 'prototype', experienceFile);
    const resolvedPrototypeDir = path.resolve(productDir, 'prototype');
    if (!experiencePath.startsWith(`${resolvedPrototypeDir}${path.sep}`)) {
      errors.push(`[${entry.name}] experienceFile 必须位于 prototype/ 内`);
    } else if (!(await fs.pathExists(experiencePath))) {
      errors.push(`[${entry.name}] 缺少体验配置：prototype/${experienceFile}`);
    } else {
      try {
        const experience = await fs.readJson(experiencePath);
        experienceDocument = experience;
        validateTour(experience, entry.name, errors);
        for (const step of experience.tour || []) {
          if (!step || !TOUR_PAGES.has(step.page)) continue;
          const pagePath = path.join(prototypeDir, CANVAS_PAGES[step.page]);
          if (!(await fs.pathExists(pagePath))) {
            errors.push(`[${entry.name}] Tour 步骤 ${step.id || step.title || '未命名'} 指向不存在的页面 prototype/${CANVAS_PAGES[step.page]}`);
          }
        }
      } catch (error) {
        errors.push(`[${entry.name}] 体验配置不是合法 JSON：${error.message}`);
      }
    }

    if (!(await fs.pathExists(schemaPath))) {
      errors.push(`[${entry.name}] 缺少 database/schema.json`);
    } else {
      try {
        const schema = await fs.readJson(schemaPath);
        validateSchema(schema, entry.name, errors);
        schemaDocument = schema;
      } catch (error) {
        errors.push(`[${entry.name}] database/schema.json 不是合法 JSON：${error.message}`);
      }
    }

    if (!(await fs.pathExists(openapiPath))) {
      errors.push(`[${entry.name}] 缺少 api/openapi.json`);
    } else {
      try {
        const openapi = await fs.readJson(openapiPath);
        validateOpenApi(openapi, entry.name, errors);
        openapiDocument = openapi;
      } catch (error) {
        errors.push(`[${entry.name}] api/openapi.json 不是合法 JSON：${error.message}`);
      }
    }

    if (experienceDocument) {
      validateExperienceAssociations(
        experienceDocument,
        schemaDocument,
        openapiDocument,
        entry.name,
        errors,
      );
    }

    await validatePrototypePages(prototypeDir, entry.name, errors);
    await validatePrototypeConstraints(productDir, entry.name, errors);
  }

  if (errors.length > 0) {
    console.error('❌ 产品校验失败：');
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`✅ 所有产品校验通过（共 ${productDirs.length} 个产品）`);
}

validate().catch((error) => {
  console.error(`❌ 校验脚本执行失败：${error.message}`);
  process.exitCode = 1;
});
