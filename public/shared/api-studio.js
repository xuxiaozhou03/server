(function () {
  'use strict';

  const editor = document.getElementById('contract-editor');
  const saveButton = document.getElementById('save-contract');
  const formatButton = document.getElementById('format-contract');
  const resetButton = document.getElementById('reset-contract');
  const saveStatus = document.getElementById('save-status');
  const validationState = document.getElementById('validation-state');
  const preview = document.getElementById('swagger-preview');
  const initialData = JSON.parse(document.getElementById('openapi-data').textContent);
  let initialText = JSON.stringify(initialData, null, 2);

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function parseDocument() {
    try {
      const document = JSON.parse(editor.value);
      validationState.textContent = 'JSON 合法';
      validationState.classList.remove('invalid');
      return document;
    } catch (error) {
      validationState.textContent = 'JSON 解析失败';
      validationState.classList.add('invalid');
      throw error;
    }
  }

  function readSchemaLabel(schema) {
    if (!schema) return 'Any';
    if (schema.$ref) return schema.$ref.split('/').at(-1);
    if (schema.type === 'array') return readSchemaLabel(schema.items) + '[]';
    if (Array.isArray(schema.type)) return schema.type.join(' | ');
    return schema.type || 'Object';
  }

  function schemaFields(schema) {
    if (!schema || schema.$ref) return [];
    if (schema.allOf) return schema.allOf.flatMap(schemaFields);
    return Object.entries(schema.properties || {}).map(([name, property]) => ({
      name,
      type: readSchemaLabel(property),
      required: Array.isArray(schema.required) && schema.required.includes(name),
      description: property.description || ''
    }));
  }

  function renderOperation(method, route, operation, pathParameters) {
    const parameters = [...(pathParameters || []), ...(operation.parameters || [])];
    const requestSchema = operation.requestBody?.content?.['application/json']?.schema;
    const fields = schemaFields(requestSchema);
    return '<article class="endpoint-card" id="' + escapeHtml(operation.operationId || method + route) + '">' +
      '<div class="endpoint-head"><span class="method method-' + method + '">' + method.toUpperCase() + '</span><code class="endpoint-path">' + escapeHtml(route) + '</code><span class="operation-id">' + escapeHtml(operation.operationId || '') + '</span></div>' +
      '<div class="endpoint-body"><div class="endpoint-summary"><h3>' + escapeHtml(operation.summary || route) + '</h3><p>' + escapeHtml(operation.description || '') + '</p></div>' +
      (parameters.length ? '<div class="endpoint-section"><span class="mini-label">PARAMETERS</span><div class="param-list">' + parameters.map((parameter) => {
        const param = parameter.$ref ? { name: parameter.$ref.split('/').at(-1), in: 'ref', required: true, schema: {}, description: '' } : parameter;
        return '<div class="param-row"><code>' + escapeHtml(param.name) + '</code><span>' + escapeHtml(param.in || '') + '</span><span class="param-type">' + escapeHtml(readSchemaLabel(param.schema)) + '</span><b>' + (param.required ? 'required' : 'optional') + '</b><p>' + escapeHtml(param.description || '') + '</p></div>';
      }).join('') + '</div></div>' : '') +
      (requestSchema ? '<div class="endpoint-section"><span class="mini-label">REQUEST BODY · application/json</span><div class="schema-chip">' + (fields.length ? 'Inline object' : escapeHtml(readSchemaLabel(requestSchema))) + '</div>' + (fields.length ? '<div class="schema-preview"><div class="schema-preview-head"><strong>Body</strong><span>' + fields.length + ' fields</span></div>' + fields.map((field) => '<div class="schema-field"><code>' + escapeHtml(field.name) + '</code><span>' + escapeHtml(field.type) + '</span>' + (field.required ? '<b>required</b>' : '<span></span>') + '<small>' + escapeHtml(field.description) + '</small></div>').join('') + '</div>' : '') + '</div>' : '') +
      '<div class="endpoint-section"><span class="mini-label">RESPONSES</span><div class="response-list">' + Object.entries(operation.responses || {}).map(([status, response]) => {
        const responseSchema = response?.content?.['application/json']?.schema;
        return '<div class="response-row"><code class="response-status ' + (status.startsWith('2') ? 'success' : 'error') + '">' + escapeHtml(status) + '</code><span>' + escapeHtml(response?.description || '') + '</span>' + (responseSchema ? '<code class="response-schema">' + escapeHtml(readSchemaLabel(responseSchema)) + '</code>' : '') + '</div>';
      }).join('') + '</div></div></div></article>';
  }

  function renderDocument(document) {
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];
    const entries = [];
    Object.entries(document.paths || {}).forEach(([route, pathItem]) => {
      methods.forEach((method) => {
        if (pathItem[method]) entries.push({ route, method, operation: pathItem[method], pathParameters: pathItem.parameters });
      });
    });
    const tags = Array.isArray(document.tags) && document.tags.length ? document.tags : [{ name: 'API', description: '' }];
    const groups = tags.map((tag) => ({ ...tag, entries: entries.filter((entry) => (entry.operation.tags || []).includes(tag.name)) })).filter((tag) => tag.entries.length);
    preview.innerHTML = '<div class="docs-overview"><div class="api-meta"><span class="version-badge">OpenAPI ' + escapeHtml(document.openapi || '') + '</span><span>' + entries.length + ' 个操作</span><span>' + Object.keys(document.components?.schemas || {}).length + ' 个 Schema</span></div><p>' + escapeHtml(document.info?.description || '') + '</p>' + (document.servers?.[0]?.url ? '<div class="server-bar"><span>BASE URL</span><code>' + escapeHtml(document.servers[0].url) + '</code></div>' : '') + '</div><div class="docs-groups">' + groups.map((group) => '<section class="docs-group"><div class="group-heading"><div><span class="card-kicker">TAG</span><h2>' + escapeHtml(group.name) + '</h2></div><span>' + group.entries.length + ' endpoints</span></div><p>' + escapeHtml(group.description || '') + '</p>' + group.entries.map((entry) => renderOperation(entry.method, entry.route, entry.operation, entry.pathParameters)).join('') + '</section>').join('') + '</div>';
  }

  function validate(document) {
    if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error('文档必须是 JSON 对象');
    if (typeof document.openapi !== 'string' || !document.openapi.startsWith('3.')) throw new Error('openapi 必须是 3.x 版本');
    if (!document.info?.title || !document.info?.version) throw new Error('缺少 info.title 或 info.version');
    if (!document.paths || typeof document.paths !== 'object' || Array.isArray(document.paths)) throw new Error('缺少 paths 对象');
    return document;
  }

  formatButton?.addEventListener('click', () => {
    try {
      editor.value = JSON.stringify(parseDocument(), null, 2);
      renderDocument(parseDocument());
      saveStatus.textContent = '格式已整理，未保存';
    } catch (error) {
      saveStatus.textContent = error.message;
    }
  });

  resetButton?.addEventListener('click', () => {
    editor.value = initialText;
    validationState.textContent = '已恢复到最近加载版本';
    validationState.classList.remove('invalid');
    renderDocument(JSON.parse(initialText));
    saveStatus.textContent = '已重置，未保存';
  });

  saveButton?.addEventListener('click', async () => {
    try {
      const document = validate(parseDocument());
      saveButton.disabled = true;
      saveStatus.textContent = '正在保存…';
      const response = await fetch('/api/openapi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(document)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '保存失败');
      initialText = JSON.stringify(document, null, 2);
      renderDocument(document);
      saveStatus.textContent = '已保存 · ' + new Date().toLocaleTimeString('zh-CN', { hour12: false });
    } catch (error) {
      saveStatus.textContent = error.message;
      validationState.classList.add('invalid');
      validationState.textContent = '校验未通过';
    } finally {
      saveButton.disabled = false;
    }
  });

  document.getElementById('open-docs')?.addEventListener('click', () => {
    window.open('/p/docs', '_blank', 'noopener');
  });

  editor?.addEventListener('input', () => {
    try {
      parseDocument();
      saveStatus.textContent = '有未保存修改';
    } catch {
      saveStatus.textContent = 'JSON 语法错误，修正后才能保存';
    }
  });

  renderDocument(initialData);
})();
