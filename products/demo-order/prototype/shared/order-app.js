/**
 * 订单中心纯 HTML 交互层。
 * 每个 HTML 页面拥有独立文档；共享脚本按 body[data-page] 安全初始化。
 * 订单数据与跟进状态通过 localStorage 跨真实页面导航保留。
 */
(function () {
  'use strict';

  const STATUS = {
    pending: { label: '待付款', color: '#f59e0b' },
    processing: { label: '处理中', color: '#3b82f6' },
    shipped: { label: '已发货', color: '#0ea5e9' },
    completed: { label: '已完成', color: '#10b981' },
    cancelled: { label: '已取消', color: '#94a3b8' }
  };

  const PAYMENT_STATUS = {
    unpaid: { label: '未付款', className: 'payment-unpaid' },
    paid: { label: '已付款', className: 'payment-paid' },
    refunded: { label: '已退款', className: 'payment-refunded' }
  };

  const CUSTOMER_LEVELS = { vip: 'VIP', enterprise: '企业', regular: '普通' };

  const PRODUCTS = [
    { sku: 'SKU-AX01', name: 'Aero 人体工学椅', price: 289900 },
    { sku: 'SKU-DK02', name: 'Dock 扩展坞', price: 69900 },
    { sku: 'SKU-LM03', name: 'Lumen 桌面灯', price: 45900 },
    { sku: 'SKU-KB04', name: 'Keystone 机械键盘', price: 89900 },
    { sku: 'SKU-MT05', name: 'Mat 桌垫', price: 19900 }
  ];

  const customers = [
    { id: 'CUS-001', name: '周予安', email: 'yuan@northstar.cn', phone: '138****2061', company: '北辰科技', level: 'enterprise' },
    { id: 'CUS-002', name: '林默', email: 'mo.lin@atlas.design', phone: '136****8824', company: 'Atlas Design', level: 'vip' },
    { id: 'CUS-003', name: '陈嘉禾', email: 'jiahe@fieldwork.co', phone: '139****5117', company: 'Fieldwork', level: 'regular' },
    { id: 'CUS-004', name: '苏青', email: 'qing.su@mono.studio', phone: '137****1968', company: 'Mono Studio', level: 'vip' },
    { id: 'CUS-005', name: '许知远', email: 'zhiyuan@wavelength.io', phone: '135****7042', company: 'Wavelength', level: 'enterprise' },
    { id: 'CUS-006', name: '沈一', email: 'yi.shen@loom.cn', phone: '133****3390', company: 'Loom 空间', level: 'regular' }
  ];

  const seedOrders = [
    {
      id: 'ORD-1048', no: 'SO-2026-1048', status: 'pending', paymentStatus: 'unpaid',
      customerId: 'CUS-001', assignee: '王倩', createdAt: '2026-11-11 09:42',
      note: '客户要求周五前送达，收货后请电话确认。', address: '上海市徐汇区龙腾大道 2879 号 A 座 12F',
      followedUpAt: null,
      items: [{ sku: 'SKU-AX01', quantity: 2, price: 289900 }, { sku: 'SKU-LM03', quantity: 2, price: 45900 }]
    },
    {
      id: 'ORD-1047', no: 'SO-2026-1047', status: 'processing', paymentStatus: 'paid',
      customerId: 'CUS-002', assignee: '刘畅', createdAt: '2026-11-11 09:16',
      note: '设计团队扩编，需开具增值税专用发票。', address: '杭州市滨江区江陵路 1760 号 5 号楼',
      followedUpAt: '2026-11-11 09:30',
      items: [{ sku: 'SKU-DK02', quantity: 3, price: 69900 }, { sku: 'SKU-KB04', quantity: 3, price: 89900 }, { sku: 'SKU-MT05', quantity: 3, price: 19900 }]
    },
    {
      id: 'ORD-1046', no: 'SO-2026-1046', status: 'shipped', paymentStatus: 'paid',
      customerId: 'CUS-003', assignee: '陈晨', createdAt: '2026-11-10 18:08',
      note: '已从华东仓发出，物流单号 SF143820661。', address: '北京市朝阳区酒仙桥路 10 号恒通商务园',
      followedUpAt: '2026-11-11 08:50', items: [{ sku: 'SKU-LM03', quantity: 4, price: 45900 }]
    },
    {
      id: 'ORD-1045', no: 'SO-2026-1045', status: 'completed', paymentStatus: 'paid',
      customerId: 'CUS-004', assignee: '王倩', createdAt: '2026-11-10 15:33',
      note: '客户已签收，回访满意度 5 分。', address: '深圳市南山区华侨城创意文化园北区 B3',
      followedUpAt: '2026-11-10 17:20',
      items: [{ sku: 'SKU-AX01', quantity: 1, price: 289900 }, { sku: 'SKU-MT05', quantity: 2, price: 19900 }]
    },
    {
      id: 'ORD-1044', no: 'SO-2026-1044', status: 'processing', paymentStatus: 'paid',
      customerId: 'CUS-005', assignee: '刘畅', createdAt: '2026-11-10 13:55',
      note: '需要分批入仓，首批 6 件。', address: '苏州市工业园区星湖街 328 号创意产业园',
      followedUpAt: null, items: [{ sku: 'SKU-KB04', quantity: 8, price: 89900 }]
    },
    {
      id: 'ORD-1043', no: 'SO-2026-1043', status: 'pending', paymentStatus: 'unpaid',
      customerId: 'CUS-006', assignee: '陈晨', createdAt: '2026-11-10 11:24',
      note: '等待财务确认预算，明日上午再次联系。', address: '成都市武侯区天府三街 199 号',
      followedUpAt: null, items: [{ sku: 'SKU-DK02', quantity: 2, price: 69900 }, { sku: 'SKU-MT05', quantity: 2, price: 19900 }]
    },
    {
      id: 'ORD-1042', no: 'SO-2026-1042', status: 'cancelled', paymentStatus: 'refunded',
      customerId: 'CUS-002', assignee: '王倩', createdAt: '2026-11-09 16:47',
      note: '客户调整采购计划，款项已原路退回。', address: '杭州市滨江区江陵路 1760 号 5 号楼',
      followedUpAt: '2026-11-09 17:10', items: [{ sku: 'SKU-LM03', quantity: 1, price: 45900 }]
    },
    {
      id: 'ORD-1041', no: 'SO-2026-1041', status: 'completed', paymentStatus: 'paid',
      customerId: 'CUS-001', assignee: '王倩', createdAt: '2026-11-09 10:05',
      note: '总部第二批办公家具，已完成验收。', address: '上海市徐汇区龙腾大道 2879 号 A 座 12F',
      followedUpAt: '2026-11-09 14:40',
      items: [{ sku: 'SKU-AX01', quantity: 4, price: 289900 }, { sku: 'SKU-DK02', quantity: 4, price: 69900 }]
    }
  ];

  const STORAGE_KEY = 'orderly:orders:v1';

  function cloneSeedOrders() {
    return JSON.parse(JSON.stringify(seedOrders));
  }

  function loadOrders() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return cloneSeedOrders();
      const parsed = JSON.parse(stored);
      const valid = Array.isArray(parsed) && parsed.every((order) =>
        order && typeof order.id === 'string' && Array.isArray(order.items)
      );
      return valid ? parsed : cloneSeedOrders();
    } catch (_error) {
      return cloneSeedOrders();
    }
  }

  const orders = loadOrders();

  function saveOrders() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (_error) {
      // 隐私模式或存储配额受限时，当前页面仍可继续交互。
    }
  }

  const activities = [
    { icon: '↗', title: 'SO-2026-1047 已标记为处理中', detail: '刘畅 · 订单履约', time: '2 分钟前' },
    { icon: '¥', title: 'SO-2026-1048 等待客户付款', detail: '王倩 · 付款提醒', time: '18 分钟前' },
    { icon: '✓', title: 'SO-2026-1045 已完成客户回访', detail: '王倩 · 跟进记录', time: '43 分钟前' },
    { icon: '⇢', title: 'SO-2026-1046 已从华东仓发出', detail: '陈晨 · 履约动态', time: '1 小时前' }
  ];

  const currentPage = document.body.dataset.page || 'dashboard';
  const state = {
    page: currentPage, keyword: '', status: 'all', paymentStatus: 'all', customerId: '',
    selectedIds: new Set(), detailId: null, drawerTab: 'overview',
    customerKeyword: '', customerLevel: 'all', toastTimer: null
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const on = (selector, eventName, handler, root = document) => {
    const element = $(selector, root);
    if (element) element.addEventListener(eventName, handler);
    return element;
  };
  const setText = (selector, value) => {
    const element = $(selector);
    if (element) element.textContent = value;
  };
  const setHtml = (selector, value) => {
    const element = $(selector);
    if (element) element.innerHTML = value;
  };
  const currency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', minimumFractionDigits: 2 });
  const compactCurrency = new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 0 });

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  }

  function getCustomer(order) {
    return customers.find((customer) => customer.id === order.customerId) || { id: order.customerId, name: '未知客户', email: '', company: '', level: 'regular' };
  }

  function getProduct(sku) {
    return PRODUCTS.find((product) => product.sku === sku) || { sku, name: sku, price: 0 };
  }

  function getOrderTotal(order) {
    return order.items.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  function getOrderCustomerStats(customerId) {
    const customerOrders = orders.filter((order) => order.customerId === customerId);
    return {
      orderCount: customerOrders.length,
      totalSpent: customerOrders.filter((order) => order.status !== 'cancelled').reduce((total, order) => total + getOrderTotal(order), 0)
    };
  }

  function statusBadge(status) {
    const config = STATUS[status] || STATUS.pending;
    return '<span class="status-badge status-' + escapeHtml(status) + '">' + config.label + '</span>';
  }

  function paymentBadge(paymentStatus) {
    const config = PAYMENT_STATUS[paymentStatus] || PAYMENT_STATUS.unpaid;
    return '<span class="payment-badge ' + config.className + '">' + config.label + '</span>';
  }

  function levelBadge(level) {
    return '<span class="level-badge level-' + escapeHtml(level) + '">' + (CUSTOMER_LEVELS[level] || '普通') + '</span>';
  }

  function renderMetrics() {
    const pendingCount = orders.filter((order) => ['pending', 'processing'].includes(order.status)).length;
    const revenue = orders.filter((order) => order.status !== 'cancelled').reduce((total, order) => total + getOrderTotal(order), 0);
    const followupCount = orders.filter((order) => !order.followedUpAt).length;

    setText('#nav-pending-count', String(orders.filter((order) => order.status === 'pending').length));
    if (state.page !== 'dashboard') return;

    setText('#metric-orders', String(orders.length));
    setText('#metric-pending', String(pendingCount));
    setText('#metric-revenue', compactCurrency.format(revenue / 100));
    setText('#metric-followup', String(followupCount));
    const progress = $('.metric-progress span');
    if (progress) progress.style.width = Math.max(8, Math.round(pendingCount / Math.max(orders.length, 1) * 100)) + '%';
    const summary = $('#page-dashboard .page-heading p');
    if (summary) summary.innerHTML = '今天有 <strong>' + orders.filter((order) => order.paymentStatus === 'unpaid').length + ' 笔</strong>订单等待付款，<strong>' + orders.filter((order) => ['processing', 'shipped'].includes(order.status)).length + ' 笔</strong>订单仍在履约中。';

    let offset = 0;
    const total = orders.length || 1;
    const segments = Object.entries(STATUS).map(([key, config]) => {
      const amount = orders.filter((order) => order.status === key).length;
      const start = offset;
      offset += amount / total * 100;
      return config.color + ' ' + start + '% ' + offset + '%';
    });
    const donut = $('#status-donut');
    if (donut) {
      donut.style.background = 'conic-gradient(' + segments.join(', ') + ')';
      const totalNode = $('span strong', donut);
      if (totalNode) totalNode.textContent = String(orders.length);
    }
    setHtml('#status-legend', Object.entries(STATUS).map(([key, config]) => {
      const count = orders.filter((order) => order.status === key).length;
      return '<div class="legend-row"><span class="legend-dot" style="background:' + config.color + '"></span><span>' + config.label + '</span><strong>' + count + '</strong></div>';
    }).join(''));
  }

  function renderRecentOrders() {
    const body = $('#recent-order-body');
    if (!body) return;
    body.innerHTML = orders.slice(0, 5).map((order) => {
      const customer = getCustomer(order);
      const product = getProduct(order.items[0].sku);
      const extra = order.items.length > 1 ? ' 等 ' + order.items.length + ' 件' : '';
      return '<tr><td class="order-id"><a href="/p/orders?order=' + encodeURIComponent(order.id) + '">' + escapeHtml(order.no) + '</a></td><td><span class="customer-name">' + escapeHtml(customer.name) + '</span><span class="customer-email">' + escapeHtml(customer.company) + '</span></td><td>' + escapeHtml(product.name) + extra + '</td><td class="amount">' + currency.format(getOrderTotal(order) / 100) + '</td><td>' + statusBadge(order.status) + '</td><td>' + escapeHtml(order.createdAt) + '</td></tr>';
    }).join('');
  }

  function renderActivities() {
    setHtml('#activity-list', activities.map((activity) => '<div class="activity-row"><span class="activity-icon">' + escapeHtml(activity.icon) + '</span><div><strong>' + escapeHtml(activity.title) + '</strong><small>' + escapeHtml(activity.detail) + '</small></div><time>' + escapeHtml(activity.time) + '</time></div>').join(''));
  }

  function getFilteredOrders() {
    const keyword = state.keyword.trim().toLowerCase();
    return orders.filter((order) => {
      const customer = getCustomer(order);
      const products = order.items.map((item) => getProduct(item.sku).name).join(' ');
      const haystack = (order.no + ' ' + customer.name + ' ' + customer.company + ' ' + customer.email + ' ' + products).toLowerCase();
      return (!keyword || haystack.includes(keyword)) && (!state.customerId || order.customerId === state.customerId) && (state.status === 'all' || order.status === state.status) && (state.paymentStatus === 'all' || order.paymentStatus === state.paymentStatus);
    });
  }

  function renderActiveFilters() {
    const target = $('#active-filters');
    const chips = [];
    if (state.keyword) chips.push({ key: 'keyword', label: '关键词：' + state.keyword });
    if (state.status !== 'all') chips.push({ key: 'status', label: '状态：' + STATUS[state.status].label });
    if (state.paymentStatus !== 'all') chips.push({ key: 'payment', label: '付款：' + PAYMENT_STATUS[state.paymentStatus].label });
    if (state.customerId) { const customer = customers.find((item) => item.id === state.customerId); chips.push({ key: 'customer', label: '客户：' + (customer?.name || state.customerId) }); }
    if (!target) return;
    target.hidden = chips.length === 0;
    target.innerHTML = chips.map((chip) => '<span class="filter-chip">' + escapeHtml(chip.label) + '<button type="button" data-remove-filter="' + chip.key + '" aria-label="移除筛选">×</button></span>').join('');
  }

  function renderOrders() {
    const body = $('#order-body');
    if (!body) return;
    const filtered = getFilteredOrders();
    const allVisibleSelected = filtered.length > 0 && filtered.every((order) => state.selectedIds.has(order.id));
    body.innerHTML = filtered.map((order) => {
      const customer = getCustomer(order);
      const product = getProduct(order.items[0].sku);
      const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
      return '<tr data-open-order="' + order.id + '" class="' + (state.selectedIds.has(order.id) ? 'selected' : '') + '"><td class="check-col"><input type="checkbox" data-select-order="' + order.id + '" ' + (state.selectedIds.has(order.id) ? 'checked' : '') + ' aria-label="选择订单 ' + escapeHtml(order.no) + '"></td><td class="order-id">' + escapeHtml(order.no) + '</td><td><span class="customer-name">' + escapeHtml(customer.name) + '</span><span class="customer-email">' + escapeHtml(customer.email) + '</span></td><td>' + escapeHtml(product.name) + (order.items.length > 1 ? ' 等 ' + itemCount + ' 件' : ' × ' + itemCount) + '</td><td class="amount">' + currency.format(getOrderTotal(order) / 100) + '</td><td>' + statusBadge(order.status) + '</td><td>' + paymentBadge(order.paymentStatus) + '</td><td><span class="assignee">' + escapeHtml(order.assignee || '未分配') + '</span></td><td>' + escapeHtml(order.createdAt) + '</td><td><button class="row-more" type="button" data-open-order="' + order.id + '" aria-label="查看订单">⋯</button></td></tr>';
    }).join('');
    const empty = $('#empty-orders');
    if (empty) empty.hidden = filtered.length !== 0;
    const table = $('#order-table table');
    if (table) table.hidden = filtered.length === 0;
    setText('#result-count', String(filtered.length));
    setText('#selection-note', state.selectedIds.size ? '已选择 ' + state.selectedIds.size + ' 项' : '');
    const selectAll = $('#select-all');
    if (selectAll) {
      selectAll.checked = allVisibleSelected;
      selectAll.indeterminate = !allVisibleSelected && filtered.some((order) => state.selectedIds.has(order.id));
    }
    setText('#pagination-summary', filtered.length ? '显示 1–' + filtered.length + ' / 共 ' + filtered.length + ' 条' : '暂无订单');
    renderActiveFilters();
  }

  function renderCustomerCards() {
    const keyword = state.customerKeyword.trim().toLowerCase();
    const filtered = customers.filter((customer) => {
      const haystack = (customer.name + ' ' + customer.company + ' ' + customer.email).toLowerCase();
      return (!keyword || haystack.includes(keyword)) && (state.customerLevel === 'all' || customer.level === state.customerLevel);
    });
    const grid = $('#customer-grid');
    if (!grid) return;
    if (!filtered.length) {
      grid.innerHTML = '<div class="customer-empty"><span>⌕</span><strong>没有找到匹配客户</strong><small>尝试更换关键词或客户等级。</small></div>';
      return;
    }
    grid.innerHTML = filtered.map((customer) => {
      const stats = getOrderCustomerStats(customer.id);
      return '<article class="customer-card"><div class="customer-card-top"><div class="customer-identity"><span class="customer-avatar">' + escapeHtml(customer.name.slice(0, 1)) + '</span><div><strong>' + escapeHtml(customer.name) + '</strong><span>' + escapeHtml(customer.company || '个人客户') + '</span></div></div>' + levelBadge(customer.level) + '</div><div class="customer-contact"><span>' + escapeHtml(customer.email) + '</span><span>' + escapeHtml(customer.phone || '未留电话') + '</span></div><div class="customer-stats"><div><span>订单数</span><strong>' + stats.orderCount + '</strong></div><div><span>累计成交</span><strong>' + compactCurrency.format(stats.totalSpent / 100) + '</strong></div></div><a class="customer-order-link" href="/p/orders?customer=' + encodeURIComponent(customer.id) + '">查看客户订单 →</a></article>';
    }).join('');
    setText('#page-customers .eyebrow', 'CUSTOMERS / ' + filtered.length);
  }

  const PAGE_FILES = { dashboard: 'dashboard.html', orders: 'orders.html', customers: 'customers.html' };

  function navigate(page, params = {}) {
    const file = PAGE_FILES[page];
    if (!file) return;
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, value);
    });
    const base = '/p/' + page;
    const destination = base + (query.size ? '?' + query.toString() : '');
    if (window.top !== window) window.top.location.href = destination;
    else window.location.href = destination;
  }

  function bindPageNavigation() {
    document.addEventListener('click', (event) => {
      const anchor = event.target.closest('a[href]');
      if (!anchor || anchor.hasAttribute('download')) return;

      const url = new URL(anchor.href, window.location.href);
      const match = Object.entries(PAGE_FILES).find(([key]) => url.pathname === '/p/' + key || url.pathname === '/p/' + key + '/');
      if (!match) return;

      event.preventDefault();
      navigate(match[0], Object.fromEntries(url.searchParams.entries()));
    });
  }

  function openBackdrop(selector) {
    const backdrop = $(selector);
    if (!backdrop) return;
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
  }

  function closeBackdrop(selector) {
    const backdrop = $(selector);
    if (!backdrop) return;
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
  }

  function updateCreateTotal() {
    const productElement = $('#create-product');
    const quantityElement = $('#create-quantity');
    if (!productElement || !quantityElement) return;
    const product = getProduct(productElement.value);
    const quantity = Math.max(1, Number(quantityElement.value) || 1);
    setText('#create-total', currency.format(product.price * quantity / 100));
  }

  function openCreateDialog() {
    if (state.page !== 'orders' || !$('#create-form')) return;
    $('#create-customer').innerHTML = customers.map((customer) => '<option value="' + customer.id + '">' + escapeHtml(customer.name) + ' · ' + escapeHtml(customer.company || '个人客户') + '</option>').join('');
    $('#create-product').innerHTML = PRODUCTS.map((product) => '<option value="' + product.sku + '">' + escapeHtml(product.name) + ' · ' + currency.format(product.price / 100) + '</option>').join('');
    $('#create-quantity').value = '1';
    $('#create-note').value = '';
    updateCreateTotal();
    openBackdrop('#create-backdrop');
  }

  function createOrder(event) {
    event.preventDefault();
    const sku = $('#create-product').value;
    const quantity = Math.max(1, Number($('#create-quantity').value) || 1);
    const product = getProduct(sku);
    const nextNumber = Math.max(...orders.map((order) => Number(order.no.split('-').at(-1)) || 0)) + 1;
    const now = new Date();
    const pad = (value) => String(value).padStart(2, '0');
    const createdAt = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes());
    const order = {
      id: 'ORD-' + nextNumber, no: 'SO-2026-' + nextNumber, status: 'pending', paymentStatus: 'unpaid',
      customerId: $('#create-customer').value, assignee: $('#create-assignee').value, createdAt,
      note: $('#create-note').value.trim() || '无备注', address: '待补充收货地址', followedUpAt: null,
      items: [{ sku, quantity, price: product.price }]
    };
    orders.unshift(order);
    saveOrders();
    state.selectedIds.clear();
    state.customerId = '';
    renderAll();
    closeBackdrop('#create-backdrop');
    openOrderDetail(order.id);
    showToast('订单 ' + order.no + ' 已创建');
  }

  function renderDrawer() {
    const order = orders.find((item) => item.id === state.detailId);
    if (!order || !$('#detail-grid')) return;
    const customer = getCustomer(order);
    $('#detail-grid').innerHTML = [
      ['客户', customer.name], ['所属企业', customer.company || '个人客户'], ['跟进人', order.assignee || '未分配'],
      ['付款状态', PAYMENT_STATUS[order.paymentStatus]?.label || '未知'], ['创建时间', order.createdAt], ['最近跟进', order.followedUpAt || '尚未跟进']
    ].map(([label, value]) => '<div class="detail-cell"><label>' + escapeHtml(label) + '</label><strong>' + escapeHtml(value) + '</strong></div>').join('');
    $('#detail-note').textContent = order.note || '暂无备注';
    $('#detail-address').textContent = order.address || '暂无配送地址';
    $('#drawer-items').innerHTML = order.items.map((item) => {
      const product = getProduct(item.sku);
      return '<div class="line-item"><div><strong>' + escapeHtml(product.name) + '</strong><span>' + escapeHtml(item.sku) + ' · ' + currency.format(item.price / 100) + ' × ' + item.quantity + '</span></div><b>' + currency.format(item.price * item.quantity / 100) + '</b></div>';
    }).join('');
    $('#drawer-total').textContent = currency.format(getOrderTotal(order) / 100);
    const timeline = [
      { title: '订单创建', content: customer.name + ' 创建订单，等待付款', time: order.createdAt },
      { title: '状态更新', content: '当前状态：' + STATUS[order.status].label, time: order.followedUpAt || order.createdAt }
    ];
    if (order.followedUpAt) timeline.push({ title: '跟进完成', content: (order.assignee || '运营') + ' 已记录跟进结果', time: order.followedUpAt });
    $('#drawer-activity').innerHTML = timeline.map((entry) => '<li><strong>' + escapeHtml(entry.title) + '</strong><p>' + escapeHtml(entry.content) + '</p><time>' + escapeHtml(entry.time) + '</time></li>').join('');
    $('#detail-action').textContent = order.followedUpAt ? '取消跟进标记' : '标记已跟进';
    $('#action-feedback').textContent = '';
    $$('[data-drawer-tab]').forEach((tab) => tab.classList.toggle('active', tab.dataset.drawerTab === state.drawerTab));
    $$('.drawer-view').forEach((view) => view.classList.toggle('active', view.id === 'drawer-view-' + state.drawerTab));
  }

  function closeOrderDetail() {
    closeBackdrop('#detail-backdrop');
  }

  function openOrderDetail(orderId) {
    const order = orders.find((item) => item.id === orderId);
    if (!order || !$('#detail-backdrop')) return;
    state.detailId = orderId;
    state.drawerTab = 'overview';
    const customer = getCustomer(order);
    $('#drawer-title').textContent = order.no;
    $('#drawer-subtitle').textContent = customer.name + ' · ' + order.createdAt;
    $('#drawer-status').innerHTML = statusBadge(order.status) + paymentBadge(order.paymentStatus) + '<span class="status-badge status-cancelled">' + escapeHtml(order.assignee || '未分配') + '</span>';
    renderDrawer();
    openBackdrop('#detail-backdrop');
  }

  function toggleFollowup() {
    const order = orders.find((item) => item.id === state.detailId);
    if (!order) return;
    order.followedUpAt = order.followedUpAt ? null : new Date().toLocaleString('zh-CN', { hour12: false });
    saveOrders();
    renderAll();
    renderDrawer();
    showToast(order.followedUpAt ? '订单已标记为已跟进' : '已取消跟进标记');
  }

  function syncFilterInputs() {
    const keyword = $('#keyword-input');
    const status = $('#status-filter');
    const payment = $('#payment-filter');
    if (keyword) keyword.value = state.keyword;
    if (status) status.value = state.status;
    if (payment) payment.value = state.paymentStatus;
  }

  function resetFilters() {
    state.keyword = ''; state.status = 'all'; state.paymentStatus = 'all'; state.customerId = '';
    syncFilterInputs(); renderOrders();
  }

  function removeFilter(key) {
    if (key === 'keyword') state.keyword = '';
    if (key === 'status') state.status = 'all';
    if (key === 'payment') state.paymentStatus = 'all';
    if (key === 'customer') state.customerId = '';
    syncFilterInputs(); renderOrders();
  }

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function exportOrders() {
    const rows = getFilteredOrders();
    const csv = [['订单号', '客户', '企业', '金额（元）', '状态', '付款状态', '跟进人', '创建时间'], ...rows.map((order) => {
      const customer = getCustomer(order);
      return [order.no, customer.name, customer.company || '', (getOrderTotal(order) / 100).toFixed(2), STATUS[order.status].label, PAYMENT_STATUS[order.paymentStatus].label, order.assignee || '', order.createdAt];
    })].map((row) => row.map((cell) => '"' + String(cell).replaceAll('"', '""') + '"').join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'orders-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    showToast('已导出 ' + rows.length + ' 条订单');
  }

  function renderAll() {
    renderMetrics();
    renderRecentOrders();
    renderActivities();
    renderOrders();
    renderCustomerCards();
  }

  function applyUrlState() {
    const params = new URLSearchParams(window.location.search);
    const keyword = params.get('q');
    const customerId = params.get('customer');
    const status = params.get('status');
    const paymentStatus = params.get('payment');
    if (keyword) state.keyword = keyword;
    if (customerId && customers.some((customer) => customer.id === customerId)) state.customerId = customerId;
    if (status && STATUS[status]) state.status = status;
    if (paymentStatus && PAYMENT_STATUS[paymentStatus]) state.paymentStatus = paymentStatus;
    syncFilterInputs();
    return {
      orderId: params.get('order'),
      create: params.get('action') === 'create'
    };
  }

  function bindEvents() {
    on('#global-search-form', 'submit', (event) => {
      event.preventDefault();
      const input = $('#global-search');
      navigate('orders', { q: input ? input.value.trim() : '' });
    });

    on('#top-create-button', 'click', openCreateDialog);
    on('[data-open-create]', 'click', openCreateDialog);
    on('#create-product', 'change', updateCreateTotal);
    on('#create-quantity', 'input', updateCreateTotal);
    on('#create-form', 'submit', createOrder);
    ['#create-close', '#create-cancel'].forEach((selector) => on(selector, 'click', () => closeBackdrop('#create-backdrop')));
    on('#create-backdrop', 'click', (event) => { if (event.target === event.currentTarget) closeBackdrop('#create-backdrop'); });

    on('#keyword-input', 'input', (event) => { state.keyword = event.target.value; renderOrders(); });
    on('#status-filter', 'change', (event) => { state.status = event.target.value; renderOrders(); });
    on('#payment-filter', 'change', (event) => { state.paymentStatus = event.target.value; renderOrders(); });
    on('#reset-filter', 'click', resetFilters);
    on('#empty-reset', 'click', resetFilters);
    on('#active-filters', 'click', (event) => {
      const button = event.target.closest('[data-remove-filter]');
      if (button) removeFilter(button.dataset.removeFilter);
    });
    on('#order-body', 'click', (event) => {
      const checkbox = event.target.closest('[data-select-order]');
      if (checkbox) {
        event.stopPropagation();
        if (checkbox.checked) state.selectedIds.add(checkbox.dataset.selectOrder);
        else state.selectedIds.delete(checkbox.dataset.selectOrder);
        renderOrders();
        return;
      }
      const trigger = event.target.closest('[data-open-order]');
      if (trigger) openOrderDetail(trigger.dataset.openOrder);
    });
    on('#select-all', 'change', (event) => {
      const visible = getFilteredOrders();
      if (event.target.checked) visible.forEach((order) => state.selectedIds.add(order.id));
      else visible.forEach((order) => state.selectedIds.delete(order.id));
      renderOrders();
    });
    ['#drawer-close', '#detail-close-action'].forEach((selector) => on(selector, 'click', () => closeOrderDetail()));
    on('#detail-backdrop', 'click', (event) => { if (event.target === event.currentTarget) closeOrderDetail(); });
    $$('[data-drawer-tab]').forEach((tab) => tab.addEventListener('click', () => {
      state.drawerTab = tab.dataset.drawerTab;
      renderDrawer();
    }));
    on('#detail-action', 'click', toggleFollowup);

    on('#customer-search', 'input', (event) => { state.customerKeyword = event.target.value; renderCustomerCards(); });
    on('#customer-level-filter', 'click', (event) => {
      const button = event.target.closest('[data-level]');
      if (!button) return;
      state.customerLevel = button.dataset.level;
      $$('#customer-level-filter button').forEach((item) => item.classList.toggle('active', item === button));
      renderCustomerCards();
    });

    on('#export-button', 'click', exportOrders);
    on('#customer-export', 'click', () => showToast('客户导出已准备（演示）'));
    on('#dashboard-refresh', 'click', () => { renderAll(); showToast('数据已刷新'); });
    on('#refresh-button', 'click', () => { renderAll(); showToast('订单数据已刷新'); });
    on('#save-view', 'click', () => showToast('当前筛选视图已保存（演示）'));
    on('#column-button', 'click', () => showToast('字段设置（演示）'));
    on('#customer-create', 'click', () => showToast('新建客户（演示）'));

    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const input = $('#global-search');
        if (input) input.focus();
      }
      if (event.key === 'Escape') {
        closeBackdrop('#create-backdrop');
        closeOrderDetail();
      }
    });
  }

  function init() {
    bindPageNavigation();
    bindEvents();
    const initial = applyUrlState();
    renderAll();
    if (initial.orderId) openOrderDetail(initial.orderId);
    if (initial.create) openCreateDialog();
  }

  window.orderApp = {
    navigate,
    openOrderDetail,
    closeOrderDetail,
    resetFilters,
    getPage: () => currentPage,
    getState: () => ({ ...state, selectedIds: Array.from(state.selectedIds) })
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
