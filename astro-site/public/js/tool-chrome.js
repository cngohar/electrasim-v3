/**
 * tool-chrome.js — the shared interface layer for every Electrical Toolbox page.
 *
 * The drawer, the command palette (Shift+Space), the tool switcher, the help
 * dialog and fullscreen are identical chrome on all four calculators, so they
 * live here once instead of inside one tool's engine. Tools contribute the
 * actions only they understand:
 *
 *   window.ElectraChrome.register('reset', () => restoreDefaults());
 *   window.ElectraChrome.register('3d', () => toggle3d());
 *   window.ElectraChrome.register('animate', () => togglePause());
 *
 * Palette/drawer entries whose action nobody registers are hidden rather than
 * left to do nothing, so a tool never advertises a command it cannot run.
 * Generic entries (home, app, help, theme) are handled here.
 *
 * Also owns the modal overlay stack: whichever dialog is on top gets the Tab
 * focus trap, and closing one restores focus to the control that opened it.
 */
(() => {
  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const GENERIC_ACTIONS = new Set(['home', 'app', 'help', 'theme', 'fullscreen']);

  /* ── overlay stack (focus trap + focus restore) ───────────────────────── */
  const overlayStack = [];

  function pushOverlay(el, trigger, initialFocus) {
    if (!el) return;
    overlayStack.push({ el, trigger: trigger || document.activeElement });
    const target = initialFocus || el.querySelector(FOCUSABLE_SELECTOR);
    if (target) target.focus();
  }

  function popOverlay(el) {
    const idx = overlayStack.findIndex((o) => o.el === el);
    if (idx === -1) return;
    const entry = overlayStack.splice(idx, 1)[0];
    if (overlayStack.length === 0 && entry.trigger instanceof HTMLElement) {
      entry.trigger.focus();
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || overlayStack.length === 0) return;
    const topEl = overlayStack[overlayStack.length - 1].el;
    const items = Array.from(topEl.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (node) => node.offsetParent !== null || node === document.activeElement,
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!topEl.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  });

  /* ── action registry ──────────────────────────────────────────────────── */
  const actions = new Map();
  let toastHandler = null;

  function prune() {
    document.querySelectorAll('#cmd-results-list .cmd-item[data-action]').forEach((item) => {
      const action = item.getAttribute('data-action');
      if (!action || GENERIC_ACTIONS.has(action)) return;
      const supported = actions.has(action);
      item.style.display = supported ? '' : 'none';
      item.setAttribute('aria-disabled', supported ? 'false' : 'true');
    });
    const drawerReset = document.getElementById('drawer-cmd-reset');
    if (drawerReset && !actions.has('reset')) drawerReset.hidden = true;
  }

  function register(name, handler) {
    if (typeof handler === 'function') actions.set(name, handler);
    prune();
  }

  function runAction(name) {
    const handler = actions.get(name);
    if (handler) {
      handler();
      return true;
    }
    return false;
  }

  /** Tools may route chrome feedback through their own toast component. */
  function setToastHandler(fn) {
    toastHandler = typeof fn === 'function' ? fn : null;
  }

  function say(message, icon) {
    if (toastHandler) toastHandler(message, icon);
  }

  /* ── help dialog ──────────────────────────────────────────────────────── */
  const helpBackdrop = document.getElementById('tool-help-backdrop');
  const btnHelp = document.getElementById('tool-help-btn');
  const btnHelpClose = document.getElementById('tool-help-close');
  const btnHelpGotIt = document.getElementById('tool-help-confirm');

  function openHelp(trigger) {
    if (!helpBackdrop) return;
    helpBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    pushOverlay(helpBackdrop, trigger, btnHelpGotIt || helpBackdrop);
  }

  function closeHelp() {
    if (!helpBackdrop || helpBackdrop.hidden) return;
    helpBackdrop.hidden = true;
    document.body.style.overflow = '';
    popOverlay(helpBackdrop);
  }

  if (btnHelp) btnHelp.addEventListener('click', (e) => openHelp(e.currentTarget));
  if (btnHelpClose) btnHelpClose.addEventListener('click', closeHelp);
  if (btnHelpGotIt) btnHelpGotIt.addEventListener('click', closeHelp);
  if (helpBackdrop) {
    helpBackdrop.addEventListener('click', (e) => {
      if (e.target === helpBackdrop) closeHelp();
    });
  }

  /* ── drawer ───────────────────────────────────────────────────────────── */
  const btnDrawerOpen = document.getElementById('tool-drawer-btn');
  const btnDrawerClose = document.getElementById('tool-drawer-close');
  const drawerBackdrop = document.getElementById('tool-drawer-backdrop');
  const drawerAside = document.getElementById('tool-drawer-menu');
  const drawerSearch = document.getElementById('tool-drawer-search');

  function openDrawer() {
    if (!drawerAside || !drawerBackdrop) return;
    drawerAside.hidden = false;
    drawerBackdrop.hidden = false;
    if (btnDrawerOpen) btnDrawerOpen.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    pushOverlay(drawerAside, btnDrawerOpen, drawerSearch);
  }

  function closeDrawer() {
    if (!drawerAside || !drawerBackdrop || drawerAside.hidden) return;
    drawerAside.hidden = true;
    drawerBackdrop.hidden = true;
    if (btnDrawerOpen) btnDrawerOpen.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    popOverlay(drawerAside);
  }

  if (btnDrawerOpen) {
    btnDrawerOpen.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openDrawer();
    });
  }
  if (btnDrawerClose) btnDrawerClose.addEventListener('click', closeDrawer);
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

  if (drawerSearch) {
    drawerSearch.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      document.querySelectorAll('#drawer-tools-list .drawer-item').forEach((item) => {
        const name = item.getAttribute('data-tool-name') || '';
        item.style.display = name.includes(query) ? '' : 'none';
      });
    });
  }

  /* ── tool switcher dropdown (header) ──────────────────────────────────── */
  const btnSwitcher = document.getElementById('tool-switcher-btn');
  const menuSwitcher = document.getElementById('tool-switcher-menu');

  function closeSwitcher() {
    if (!menuSwitcher || !btnSwitcher) return;
    menuSwitcher.hidden = true;
    btnSwitcher.setAttribute('aria-expanded', 'false');
  }

  if (btnSwitcher && menuSwitcher) {
    btnSwitcher.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = menuSwitcher.hidden;
      menuSwitcher.hidden = !isHidden;
      btnSwitcher.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (!menuSwitcher.contains(e.target) && e.target !== btnSwitcher) closeSwitcher();
    });
  }

  /* ── command palette ──────────────────────────────────────────────────── */
  const cmdBackdrop = document.getElementById('cmd-palette-backdrop');
  const cmdInput = document.getElementById('cmd-palette-input');
  const cmdTrigger = document.getElementById('cmd-palette-trigger');
  const cmdOpenFromSwitcher = document.getElementById('open-cmd-palette-btn');

  function setSelectedCmd(item) {
    document.querySelectorAll('#cmd-results-list .cmd-item').forEach((it) => {
      const selected = it === item;
      it.classList.toggle('selected', selected);
      it.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    if (cmdInput) {
      if (item?.id) cmdInput.setAttribute('aria-activedescendant', item.id);
      else cmdInput.removeAttribute('aria-activedescendant');
    }
  }

  function setGroupLabelVisibility(group, visible) {
    const label = document.querySelector(
      `#cmd-results-list .cmd-group-label[data-group="${group}"]`,
    );
    if (label) label.style.display = visible ? '' : 'none';
  }

  function visibleItems() {
    return Array.from(document.querySelectorAll('#cmd-results-list .cmd-item')).filter(
      (it) => it.style.display !== 'none' && !it.hidden,
    );
  }

  function filterPalette(query) {
    const needle = query.toLowerCase();
    const items = Array.from(document.querySelectorAll('#cmd-results-list .cmd-item'));
    let firstVisible = null;
    items.forEach((item) => {
      const title = (item.getAttribute('data-title') || '').toLowerCase();
      const action = item.getAttribute('data-action');
      const unsupported = action && !GENERIC_ACTIONS.has(action) && !actions.has(action);
      const match = !needle || title.includes(needle);
      item.style.display = match && !unsupported ? '' : 'none';
      if (match && !unsupported && !firstVisible) firstVisible = item;
    });
    setGroupLabelVisibility(
      'tools',
      items.some((i) => i.getAttribute('data-type') === 'tool' && i.style.display !== 'none'),
    );
    setGroupLabelVisibility(
      'commands',
      items.some((i) => i.getAttribute('data-type') === 'cmd' && i.style.display !== 'none'),
    );
    const emptyEl = document.getElementById('cmd-empty-state');
    if (emptyEl) emptyEl.hidden = Boolean(firstVisible);
    setSelectedCmd(firstVisible);
  }

  function executePaletteItem(item) {
    if (!item) return;
    const type = item.getAttribute('data-type');
    if (type === 'tool') {
      const route = item.getAttribute('data-route');
      if (route) window.location.href = route;
      return;
    }
    const action = item.getAttribute('data-action');
    closePalette();
    if (!action) return;
    if (action === 'home') window.location.href = '/tools/';
    else if (action === 'app') window.location.href = '/app/';
    else if (action === 'help') openHelp();
    else if (action === 'theme') document.getElementById('tool-theme-toggle')?.click();
    else if (action === 'fullscreen') toggleFullscreen();
    else if (!runAction(action)) say('That command is not available on this tool.', 'info');
  }

  function openPalette(trigger) {
    if (!cmdBackdrop) return;
    cmdBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    pushOverlay(cmdBackdrop, trigger, cmdInput);
    filterPalette('');
    closeDrawer();
    closeSwitcher();
  }

  function closePalette() {
    if (!cmdBackdrop || cmdBackdrop.hidden) return;
    cmdBackdrop.hidden = true;
    document.body.style.overflow = '';
    popOverlay(cmdBackdrop);
  }

  if (cmdTrigger) cmdTrigger.addEventListener('click', (e) => openPalette(e.currentTarget));
  if (cmdOpenFromSwitcher) {
    cmdOpenFromSwitcher.addEventListener('click', (e) => openPalette(e.currentTarget));
  }
  if (cmdBackdrop) {
    cmdBackdrop.addEventListener('click', (e) => {
      if (e.target === cmdBackdrop) closePalette();
    });
  }
  if (cmdInput) {
    cmdInput.addEventListener('input', (e) => filterPalette(e.target.value));
  }
  const cmdList = document.getElementById('cmd-results-list');
  if (cmdList) {
    cmdList.addEventListener('click', (e) => {
      const item = e.target.closest('.cmd-item');
      if (item) executePaletteItem(item);
    });
  }

  /* ── drawer command shortcuts ─────────────────────────────────────────── */
  document.getElementById('drawer-cmd-help')?.addEventListener('click', () => {
    openHelp();
    closeDrawer();
  });
  document.getElementById('drawer-cmd-theme')?.addEventListener('click', () => {
    document.getElementById('tool-theme-toggle')?.click();
    closeDrawer();
  });
  document.getElementById('drawer-cmd-reset')?.addEventListener('click', () => {
    runAction('reset');
    closeDrawer();
  });

  /* ── fullscreen ───────────────────────────────────────────────────────── */
  const btnFullscreen = document.getElementById('tool-fullscreen-btn');
  const fsEnterIcon = document.querySelector('.fs-icon-enter');
  const fsExitIcon = document.querySelector('.fs-icon-exit');

  function toggleFullscreen() {
    const docEl = document.documentElement;
    if (!document.fullscreenElement) {
      const request =
        docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
      if (typeof request !== 'function') {
        say("Fullscreen isn't supported on this browser or device.", 'warning');
        return;
      }
      try {
        Promise.resolve(request.call(docEl))
          .then(() => say('Press Esc to exit fullscreen.', 'info'))
          .catch(() => say('Fullscreen was blocked by the browser.', 'warning'));
      } catch (_) {
        say("Fullscreen isn't available here.", 'warning');
      }
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    }
  }

  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', toggleFullscreen);
    document.addEventListener('fullscreenchange', () => {
      const isFs = Boolean(document.fullscreenElement);
      if (fsEnterIcon) fsEnterIcon.style.display = isFs ? 'none' : 'block';
      if (fsExitIcon) fsExitIcon.style.display = isFs ? 'block' : 'none';
    });
  }

  /* ── global keys: palette shortcut + Escape unwinding ──────────────────── */
  document.addEventListener('keydown', (e) => {
    if (e.shiftKey && e.code === 'Space') {
      const target = e.target;
      const typing =
        e.isComposing ||
        (target &&
          (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)));
      if (typing) return;
      e.preventDefault();
      if (cmdBackdrop && !cmdBackdrop.hidden) closePalette();
      else openPalette();
      return;
    }
    if (e.key === 'Escape') {
      closePalette();
      closeDrawer();
      closeHelp();
      closeSwitcher();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (!cmdBackdrop || cmdBackdrop.hidden) return;
    if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
    const items = visibleItems();
    if (!items.length) return;
    const currentIdx = items.findIndex((it) => it.classList.contains('selected'));
    e.preventDefault();
    if (e.key === 'ArrowDown') {
      const next = items[(currentIdx + 1) % items.length];
      setSelectedCmd(next);
      next.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      const prev = items[(currentIdx - 1 + items.length) % items.length];
      setSelectedCmd(prev);
      prev.scrollIntoView({ block: 'nearest' });
    } else if (currentIdx >= 0) {
      executePaletteItem(items[currentIdx]);
    }
  });

  window.ElectraChrome = {
    register,
    runAction,
    pushOverlay,
    popOverlay,
    setToastHandler,
    openHelp,
    openPalette,
    openDrawer,
    closeDrawer,
    closePalette,
    closeHelp,
    prune,
  };

  // Engines register on DOMContentLoaded; prune once up front so unsupported
  // entries never flash on first paint.
  prune();
})();
