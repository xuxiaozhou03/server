(function () {
  'use strict';

  const nav = document.getElementById('table-nav');
  const search = document.getElementById('table-search');
  const panels = Array.from(document.querySelectorAll('[data-table-panel]'));

  function hasTable(tableName) {
    return panels.some((panel) => panel.dataset.tablePanel === tableName);
  }

  function activate(tableName, { updateUrl = false, reveal = false } = {}) {
    if (!hasTable(tableName)) return false;
    document.querySelectorAll('[data-table-target]').forEach((button) => {
      button.classList.toggle('active', button.dataset.tableTarget === tableName);
    });
    panels.forEach((panel) => panel.classList.toggle('active', panel.dataset.tablePanel === tableName));

    const activePanel = panels.find((panel) => panel.dataset.tablePanel === tableName);
    if (reveal && activePanel) activePanel.scrollIntoView({ block: 'start', behavior: 'smooth' });
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set('table', tableName);
      window.history.replaceState(null, '', url);
    }
    return true;
  }

  nav?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-table-target]');
    if (button) activate(button.dataset.tableTarget, { updateUrl: true });
  });

  search?.addEventListener('input', () => {
    const keyword = search.value.trim().toLowerCase();
    document.querySelectorAll('[data-table-target]').forEach((button) => {
      const panel = panels.find((item) => item.dataset.tablePanel === button.dataset.tableTarget);
      button.hidden = Boolean(keyword) && !panel?.textContent.toLowerCase().includes(keyword);
    });
    if (!keyword) return;
    const firstVisible = Array.from(document.querySelectorAll('[data-table-target]')).find((button) => !button.hidden);
    if (firstVisible) activate(firstVisible.dataset.tableTarget, { updateUrl: true });
  });

  const requestedTable = new URLSearchParams(window.location.search).get('table');
  if (requestedTable) activate(requestedTable, { reveal: true });
})();
