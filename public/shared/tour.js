/**
 * Node 工作台统一 Tour 引擎。
 * 步骤可以驱动左侧画布切页、打开抽屉，再定位真实元素。
 */
(function (global) {
  'use strict';

  const TRANSITION_DELAY = 90;
  const TARGET_TIMEOUT = 1800;
  const FRAME_LOAD_TIMEOUT = 5000;
  const CANVAS_ROUTES = {
    dashboard: '/canvas/dashboard.html',
    orders: '/canvas/orders.html',
    customers: '/canvas/customers.html'
  };

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function createTour(options) {
    const { steps, frame, onStart, onEnd } = options;
    let currentIndex = -1;
    let active = false;
    let transitionVersion = 0;

    const layer = document.querySelector('.tour-layer');
    const highlight = layer.querySelector('.tour-highlight');
    const tooltip = layer.querySelector('.tour-tooltip');
    const title = layer.querySelector('.tour-title');
    const description = layer.querySelector('.tour-description');
    const requirement = layer.querySelector('.tour-requirement');
    const count = layer.querySelector('.tour-count');
    const dots = layer.querySelector('.tour-dots');
    const previousButton = layer.querySelector('[data-tour-prev]');
    const nextButton = layer.querySelector('[data-tour-next]');
    const endButton = layer.querySelector('[data-tour-end]');

    function getTargetScope(step) {
      return step.targetScope === 'workspace' ? 'workspace' : 'frame';
    }

    function getFrameApp() {
      try {
        return frame?.contentWindow?.orderApp || null;
      } catch (_error) {
        return null;
      }
    }

    function getCurrentPage() {
      try {
        return frame?.contentDocument?.body?.dataset?.page || '';
      } catch (_error) {
        return '';
      }
    }

    function waitForFrameLoad() {
      return new Promise((resolve) => {
        let timer;
        const finish = () => {
          clearTimeout(timer);
          frame.removeEventListener('load', finish);
          resolve();
        };
        frame.addEventListener('load', finish);
        timer = setTimeout(finish, FRAME_LOAD_TIMEOUT);
      });
    }

    async function loadFramePage(page, version) {
      if (!frame || !CANVAS_ROUTES[page] || getCurrentPage() === page) return true;

      const loaded = waitForFrameLoad();
      frame.src = CANVAS_ROUTES[page];
      await loaded;
      if (!active || version !== transitionVersion) return false;

      const startedAt = performance.now();
      while (active && version === transitionVersion && performance.now() - startedAt < TARGET_TIMEOUT) {
        if (getCurrentPage() === page && getFrameApp()) return true;
        await delay(40);
      }
      return getCurrentPage() === page;
    }

    function getTarget(step) {
      if (getTargetScope(step) === 'workspace') {
        return document.querySelector(step.targetSelector);
      }
      if (!frame || !frame.contentDocument) return null;
      return frame.contentDocument.querySelector(step.targetSelector);
    }

    function getTargetRect(target, scope) {
      const targetRect = target.getBoundingClientRect();
      if (scope === 'workspace') {
        return {
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height
        };
      }

      const frameRect = frame.getBoundingClientRect();
      const scaleX = frameRect.width / (frame.contentWindow.innerWidth || frameRect.width);
      const scaleY = frameRect.height / (frame.contentWindow.innerHeight || frameRect.height);

      return {
        top: frameRect.top + targetRect.top * scaleY,
        left: frameRect.left + targetRect.left * scaleX,
        width: targetRect.width * scaleX,
        height: targetRect.height * scaleY
      };
    }

    async function waitForTarget(step, version) {
      const startedAt = performance.now();
      while (active && version === transitionVersion && performance.now() - startedAt < TARGET_TIMEOUT) {
        const target = getTarget(step);
        if (target) {
          const rect = target.getBoundingClientRect();
          if (rect.width > 0 || rect.height > 0) return target;
        }
        await delay(40);
      }
      return null;
    }

    async function prepareStep(step) {
      if (step.page && !(await loadFramePage(step.page, transitionVersion))) return null;

      const app = getFrameApp();

      if (app) {
        if (step.openOrder) {
          app.openOrderDetail(step.openOrder);
          await delay(TRANSITION_DELAY);
        } else if (getTargetScope(step) === 'frame' && app.closeOrderDetail) {
          app.closeOrderDetail();
        }
      }

      const target = await waitForTarget(step, transitionVersion);
      if (target) {
        target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        await delay(40);
      }
      return target;
    }

    function showMissingTarget(step, scope) {
      title.textContent = '引导目标暂不可见';
      description.textContent = `当前步骤找不到${scope === 'workspace' ? '工作台' : '画布'}元素 ${step.targetSelector}，请检查页面状态后重试。`;
      requirement.textContent = step.requirementId || '关联需求';
      highlight.style.width = '0px';
      highlight.style.height = '0px';
      highlight.style.boxShadow = 'none';
    }

    async function positionCurrentStep() {
      const step = steps[currentIndex];
      if (!step) return;

      const version = ++transitionVersion;
      const scope = getTargetScope(step);
      const target = await prepareStep(step);
      if (!active || version !== transitionVersion) return;
      if (!target) {
        showMissingTarget(step, scope);
        return;
      }

      const rect = getTargetRect(target, scope);
      requestAnimationFrame(() => {
        if (!active || version !== transitionVersion) return;
        const gap = 8;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const tooltipWidth = Math.min(360, viewportWidth - 28);
        const tooltipHeight = tooltip.offsetHeight || 240;
        const safeTop = Math.max(rect.top - gap, 8);
        const safeLeft = Math.max(rect.left - gap, 8);

        highlight.style.boxShadow = '';
        highlight.style.top = `${safeTop}px`;
        highlight.style.left = `${safeLeft}px`;
        highlight.style.width = `${Math.min(rect.width + gap * 2, viewportWidth - safeLeft - 8)}px`;
        highlight.style.height = `${Math.min(rect.height + gap * 2, viewportHeight - safeTop - 8)}px`;

        let top = rect.top + rect.height + 16;
        let left = Math.min(Math.max(rect.left, 14), viewportWidth - tooltipWidth - 14);

        if (top + tooltipHeight > viewportHeight - 14) top = Math.max(14, rect.top - tooltipHeight - 16);
        if (step.placement === 'left') {
          left = Math.max(14, rect.left - tooltipWidth - 20);
          top = Math.min(Math.max(rect.top + 16, 14), viewportHeight - tooltipHeight - 14);
        }
        if (viewportWidth < 700) {
          left = 14;
          top = Math.max(14, Math.min(rect.top + rect.height + 12, viewportHeight - tooltipHeight - 14));
        }

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      });
    }

    function render() {
      const step = steps[currentIndex];
      title.textContent = step.title;
      description.textContent = step.description;
      requirement.textContent = step.requirementId || '关联需求';
      count.textContent = `${currentIndex + 1} / ${steps.length}`;
      previousButton.disabled = currentIndex === 0;
      nextButton.textContent = currentIndex === steps.length - 1 ? '完成' : '下一步';
      dots.replaceChildren(...steps.map((_, index) => {
        const dot = document.createElement('span');
        dot.className = index === currentIndex ? 'tour-dot active' : 'tour-dot';
        return dot;
      }));
      positionCurrentStep();
    }

    function start() {
      if (!steps.length) return;
      active = true;
      currentIndex = 0;
      layer.classList.add('active');
      layer.setAttribute('aria-hidden', 'false');
      if (onStart) onStart();
      render();
    }

    function finish() {
      active = false;
      transitionVersion += 1;
      layer.classList.remove('active');
      layer.setAttribute('aria-hidden', 'true');
      if (onEnd) onEnd();
    }

    function previous() {
      if (currentIndex > 0) {
        currentIndex -= 1;
        render();
      }
    }

    function advance() {
      if (currentIndex < steps.length - 1) {
        currentIndex += 1;
        render();
      } else {
        finish();
      }
    }

    previousButton.addEventListener('click', previous);
    nextButton.addEventListener('click', advance);
    endButton.addEventListener('click', finish);
    window.addEventListener('resize', () => { if (active) positionCurrentStep(); });
    document.addEventListener('keydown', (event) => {
      if (!active) return;
      if (event.key === 'Escape') finish();
      if (event.key === 'ArrowLeft') previous();
      if (event.key === 'ArrowRight') advance();
    });

    return { start, finish, previous, advance };
  }

  global.createTour = createTour;
})(window);
