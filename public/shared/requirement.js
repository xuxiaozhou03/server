(function () {
  'use strict';

  const frame = document.getElementById('prototype-frame');
  const workspace = document.getElementById('workspace');
  const panelToggle = document.getElementById('panel-toggle');
  const tourStart = document.getElementById('tour-start');
  const requirementData = document.getElementById('requirement-data');

  let experience = null;
  let tour = null;
  let tourReady = false;

  try {
    experience = JSON.parse(requirementData.textContent);
  } catch (error) {
    console.error('需求数据解析失败', error);
  }

  function switchTab(tabName) {
    document.querySelectorAll('.panel-tab').forEach((tab) => {
      const active = tab.dataset.tab === tabName;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    document.querySelectorAll('.panel-view').forEach((view) => {
      view.classList.toggle('active', view.id === `view-${tabName}`);
    });
  }

  function enableTourWhenReady() {
    if (!tourStart || tourReady) return;
    if (!experience || !Array.isArray(experience.tour) || !experience.tour.length) {
      tourStart.textContent = '暂无引导步骤';
      return;
    }

    tour = createTour({
      steps: experience.tour,
      frame,
      onStart: () => switchTab('tour'),
      onEnd: () => switchTab('tour'),
    });
    tourReady = true;
    tourStart.disabled = false;
    tourStart.textContent = '开始需求引导';
  }

  panelToggle?.addEventListener('click', () => {
    const collapsed = workspace.classList.toggle('insight-collapsed');
    panelToggle.setAttribute('aria-expanded', String(!collapsed));
    panelToggle.setAttribute('aria-label', collapsed ? '展开需求面板' : '收起需求面板');
  });

  document.querySelectorAll('.panel-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  tourStart?.addEventListener('click', () => tour && tour.start());
  frame?.addEventListener('load', enableTourWhenReady);

  if (!frame || (frame.contentDocument && frame.contentDocument.readyState === 'complete')) {
    enableTourWhenReady();
  }

  if (window.location.hash === '#tour') switchTab('tour');
})();
