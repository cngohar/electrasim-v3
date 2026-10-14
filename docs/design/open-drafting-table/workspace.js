const $ = (id) => document.getElementById(id);
const allParts = [
  {
    id: 'supply',
    name: 'AC supply',
    category: 'supply',
    description: 'Independent source · new device face',
  },
  {
    id: 'switch',
    name: 'Single-way switch',
    category: 'switching',
    description: 'Rocker switch · new device face',
  },
  {
    id: 'lamp',
    name: 'LED bulb',
    category: 'lighting',
    description: 'Circular fitting · new device face',
  },
  {
    id: 'socket',
    name: 'Socket outlet',
    category: 'loads',
    description: 'Socket plate · preview artwork',
  },
  {
    id: 'breaker',
    name: 'Circuit breaker',
    category: 'protection',
    description: 'DIN device · preview artwork',
  },
  {
    id: 'relay',
    name: 'Control relay',
    category: 'switching',
    description: 'Relay housing · preview artwork',
  },
  { id: 'motor', name: 'Motor', category: 'loads', description: 'Motor symbol · preview artwork' },
  {
    id: 'junction',
    name: 'Junction box',
    category: 'switching',
    description: 'Connection point · preview artwork',
  },
];
let selected = 'lamp';
let placement = null;
let redoPart = null;
let zoom = 100;
let toastTimer;
let returnFocus = null;
const preferences = { theme: 'light', header: 'centered', appearance: 'both', motion: 'subtle' };
const photoFiles = {
  supply: 'dist_board_3p_1786522082960.jpg',
  switch: 'component_light_switch_1786249016724.jpg',
  lamp: 'bulb_led_a60_1786782205960.jpg',
  socket: 'component_socket_outlet_1786248985392.jpg',
  breaker: 'component_mcb_breaker_1786248947812.jpg',
  relay: 'relay_module_1786522047102.jpg',
  motor: 'variant_motor.png',
  junction: 'dist_board_3p_1786522082960.jpg',
};
function adaptDrawing() {
  const compact = matchMedia('(max-width:800px)').matches;
  document
    .querySelector('.circuit')
    .setAttribute('viewBox', compact ? '0 0 460 550' : '0 0 1000 540');
  for (const [id, desktop, mobile] of [
    ['supply', '115 183', '40 95'],
    ['switch', '452 183', '286 95'],
    ['lamp', '785 183', '160 345'],
  ])
    document
      .querySelector(`.part[data-part="${id}"]`)
      .setAttribute('transform', `translate(${compact ? mobile : desktop})`);
  for (const [type, desktop, mobile] of [
    ['live', 'M235 238H452M572 238H785', 'M160 150H286M406 150H430V320H110V400H160'],
    ['neutral', 'M235 288H330V378H903V238H905', 'M160 200H205V280H320V400H280'],
    ['earth', 'M235 328H296V419H845V314', 'M160 240H180V476H220'],
  ])
    document.querySelector(`.wire.${type}`).setAttribute('d', compact ? mobile : desktop);
}
adaptDrawing();
window.addEventListener('resize', adaptDrawing);
const motionField = document.createElement('label');
motionField.className = 'field';
motionField.textContent = 'Interface motion';
const motionSelect = document.createElement('select');
motionSelect.id = 'motion';
motionSelect.innerHTML =
  '<option value="subtle">Subtle transitions</option><option value="off">No animation</option>';
motionField.append(motionSelect);
$('settings').insertBefore(motionField, $('settings').querySelector('p'));
try {
  const saved = JSON.parse(localStorage.getItem('electrasim-open-table-preview') || '{}');
  for (const key of Object.keys(preferences)) {
    const allowed = {
      theme: ['light', 'dark'],
      header: ['centered', 'wide'],
      appearance: ['devices', 'symbols', 'both'],
      motion: ['subtle', 'off'],
    }[key];
    if (allowed.includes(saved[key])) preferences[key] = saved[key];
  }
} catch {}
function applyPreferences() {
  document.body.dataset.theme = preferences.theme;
  document.body.dataset.header = preferences.header;
  document.body.dataset.appearance = preferences.appearance;
  document.body.dataset.motion = preferences.motion;
  $('motion').value = preferences.motion;
  $('theme').value = preferences.theme;
  $('header-layout').value = preferences.header;
  $('appearance').value = preferences.appearance;
  $('part-display').value = preferences.appearance;
  try {
    localStorage.setItem('electrasim-open-table-preview', JSON.stringify(preferences));
  } catch {}
}
applyPreferences();
for (const [id, key] of [
  ['theme', 'theme'],
  ['header-layout', 'header'],
  ['appearance', 'appearance'],
  ['part-display', 'appearance'],
  ['motion', 'motion'],
])
  $(id).addEventListener('change', (event) => {
    preferences[key] = event.target.value;
    applyPreferences();
  });
function notify(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => {
    $('toast').hidden = true;
  }, 4500);
}
function partButton(part) {
  const button = document.createElement('button');
  button.className = 'catalog-part';
  button.type = 'button';
  button.setAttribute('aria-label', `Preview ${part.name}`);
  button.innerHTML = `${DeviceArtwork.markup(part.type || DeviceArtwork.baseTypes[part.id])}<span class="part-name">${part.name}</span>`;
  button.addEventListener('click', () =>
    place({ ...part, type: part.type || DeviceArtwork.baseTypes[part.id] }),
  );
  return button;
}
function renderParts(category = 'essentials') {
  const items =
    category === 'essentials' ? allParts : allParts.filter((p) => p.category === category);
  $('parts-row').replaceChildren(...items.map(partButton));
}
function renderCatalog() {
  if (window.DesignPreview?.hooks.catalog) return window.DesignPreview.hooks.catalog();
  const query = $('search').value.trim().toLowerCase();
  const items = allParts.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(query));
  $('catalog-grid').replaceChildren(...items.map(partButton));
  if (!items.length) {
    const note = document.createElement('div');
    note.className = 'no-results';
    note.textContent = 'No preview components match your search.';
    $('catalog-grid').append(note);
  }
}
renderParts();
renderCatalog();
document.querySelectorAll('[data-category]').forEach((button) =>
  button.addEventListener('click', () => {
    document
      .querySelectorAll('[data-category]')
      .forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    renderParts(button.dataset.category);
  }),
);
const visibilityJobs = new Map();
const modalIds = ['catalog-modal', 'labs-modal', 'photo-modal', 'surface-modal'];
let activeModal = null;
function reveal(element, open) {
  const previous = visibilityJobs.get(element);
  const opacityBeforeCancel = element.hidden ? 0 : Number(getComputedStyle(element).opacity);
  previous?.animation?.cancel();
  const job = {};
  visibilityJobs.set(element, job);
  if (!open && element.hidden) {
    visibilityJobs.delete(element);
    return Promise.resolve();
  }
  const wasVisible = !element.hidden;
  const startOpacity = wasVisible ? opacityBeforeCancel : 0;
  element.hidden = false;
  element.inert = !open;
  element.dataset.visibility = open ? 'opening' : 'closing';
  const reduced =
    preferences.motion === 'off' || matchMedia('(prefers-reduced-motion:reduce)').matches;
  const complete = () => {
    if (visibilityJobs.get(element) !== job) return;
    element.hidden = !open;
    element.dataset.visibility = open ? 'open' : 'closed';
    visibilityJobs.delete(element);
  };
  if (reduced) {
    complete();
    return Promise.resolve();
  }
  const vertical =
    element.classList.contains('scrim') ||
    element.classList.contains('console-panel') ||
    element.classList.contains('task-sheet') ||
    matchMedia('(max-width:800px)').matches;
  const offset = vertical ? '0 10px' : '10px 0';
  job.animation = element.animate(
    [
      { opacity: startOpacity, translate: open && !wasVisible ? offset : '0 0' },
      { opacity: open ? 1 : 0, translate: open ? '0 0' : offset },
    ],
    {
      duration: open ? 180 : 160,
      easing: open ? 'cubic-bezier(.2,.7,.3,1)' : 'ease-in',
      fill: 'both',
    },
  );
  return job.animation.finished
    .catch(() => {})
    .then(() => {
      complete();
      if (visibilityJobs.get(element) !== job) job.animation.cancel();
    });
}
function setPanel(id, open, trigger) {
  if (trigger) $(trigger)?.setAttribute('aria-expanded', String(open));
  return reveal($(id), open);
}
function wantsOpen(id) {
  return $(id).hidden || $(id).dataset.visibility === 'closing';
}
function inspect(id, focus = false, additive = false) {
  if (matchMedia('(max-width:800px)').matches) setPanel('console-panel', false, 'console-button');
  selected = id;
  const part = allParts.find((p) => p.id === id);
  if (!part) return;
  $('inspector-title').textContent = part.name;
  $('part-label-input').value = part.name;
  $('inspector-description').textContent = part.description;
  $('reference-image').src = `../../../src/assets/images/${photoFiles[id]}`;
  $('reference-image').alt = `Representative ${part.name} photo`;
  setPanel('inspector', true, 'inspect-button');
  document.querySelector('.workspace').dataset.inspecting = 'true';
  document
    .querySelectorAll('.part')
    .forEach((g) => g.classList.toggle('is-selected', g.dataset.part === id));
  window.dispatchEvent(new CustomEvent('preview:selection', { detail: { id, additive } }));
  if (focus) $('close-inspector').focus();
}
function closeInspector() {
  setPanel('inspector', false, 'inspect-button');
  document.querySelector('.workspace').dataset.inspecting = 'false';
  document.body.dataset.pinned = 'false';
  $('pin').setAttribute('aria-pressed', 'false');
  document.querySelectorAll('.part').forEach((g) => g.classList.remove('is-selected'));
  window.SelectionLayout?.paint();
  $('inspect-button').focus();
}
document.querySelectorAll('.part').forEach((part) => {
  part.addEventListener('click', (event) => inspect(part.dataset.part, false, event.shiftKey));
  part.addEventListener('keydown', (event) => {
    if (['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      inspect(part.dataset.part, true, event.shiftKey);
    }
  });
});
$('inspect-button').addEventListener('click', () => {
  if (wantsOpen('inspector')) inspect(selected);
  else closeInspector();
});
$('close-inspector').addEventListener('click', closeInspector);
$('pin').addEventListener('click', () => {
  const pinned = document.body.dataset.pinned !== 'true';
  document.body.dataset.pinned = String(pinned);
  $('pin').setAttribute('aria-pressed', String(pinned));
});
const inspectorTabs = ['properties', 'readings', 'configure'];
function switchTab(id) {
  if (!inspectorTabs.includes(id)) return;
  $('quick-config-actions').hidden = id !== 'configure';
  for (const tab of inspectorTabs) {
    $(tab).hidden = tab !== id;
    $(`${tab}-tab`).setAttribute('aria-selected', String(tab === id));
    $(`${tab}-tab`).tabIndex = tab === id ? 0 : -1;
  }
}
for (const tab of inspectorTabs) $(`${tab}-tab`).addEventListener('click', () => switchTab(tab));
document.querySelector('.inspector-tabs').addEventListener('keydown', (event) => {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const current = inspectorTabs.findIndex(
    (tab) => $(`${tab}-tab`).getAttribute('aria-selected') === 'true',
  );
  const index =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? inspectorTabs.length - 1
        : (current + (event.key === 'ArrowRight' ? 1 : -1) + inspectorTabs.length) %
          inspectorTabs.length;
  switchTab(inspectorTabs[index]);
  $(`${inspectorTabs[index]}-tab`).focus();
});
$('part-label-input').addEventListener('input', () => {
  $('inspector-title').textContent = $('part-label-input').value || 'Unnamed device';
});
function closePopovers() {
  setPanel('settings', false, 'settings-button');
  setPanel('project-menu', false, 'project-button');
}
$('settings-button').addEventListener('click', () => {
  const open = wantsOpen('settings');
  closePopovers();
  setPanel('settings', open, 'settings-button');
  if (open) $('header-layout').focus();
});
$('close-settings').addEventListener('click', () => {
  setPanel('settings', false, 'settings-button');
  $('settings-button').focus();
});
$('project-button').addEventListener('click', () => {
  const open = wantsOpen('project-menu');
  closePopovers();
  setPanel('project-menu', open, 'project-button');
});
$('close-project').addEventListener('click', () => {
  setPanel('project-menu', false, 'project-button');
  $('project-button').focus();
});
$('project-settings').addEventListener('click', () => {
  closePopovers();
  setPanel('settings', true, 'settings-button');
  $('header-layout').focus();
});
function modalBackground(active) {
  for (const element of document.querySelector('.workspace').children)
    element.inert = !!active && element.id !== active && element.id !== 'toast';
}
function openModal(id, trigger) {
  closePopovers();
  if (activeModal && activeModal !== id) reveal($(activeModal), false);
  activeModal = id;
  returnFocus = trigger || document.activeElement;
  reveal($(id), true);
  modalBackground(id);
  const input = $(id).querySelector('input:not([type=checkbox]):not([type=radio])');
  (input || $(id).querySelector('button'))?.focus();
}
function closeModal(id) {
  const focus = returnFocus;
  if (activeModal === id) {
    activeModal = null;
    returnFocus = null;
  }
  return reveal($(id), false).then(() => {
    if (!activeModal) {
      modalBackground(null);
      if (focus?.isConnected) focus.focus();
      else $('project-button').focus();
    }
  });
}
$('reference-photo').addEventListener('click', () => {
  $('large-photo').src = $('reference-image').src;
  $('large-photo').alt = $('reference-image').alt;
  openModal('photo-modal', $('reference-photo'));
});
$('close-photo').addEventListener('click', () => closeModal('photo-modal'));
$('browse').addEventListener('click', () => openModal('catalog-modal', $('browse')));
$('close-catalog').addEventListener('click', () => closeModal('catalog-modal'));
$('search').addEventListener('input', renderCatalog);
$('labs-button').addEventListener('click', () => openModal('labs-modal', $('labs-button')));
$('project-labs').addEventListener('click', () => openModal('labs-modal', $('project-button')));
$('close-labs').addEventListener('click', () => closeModal('labs-modal'));
for (const id of ['catalog-modal', 'labs-modal', 'photo-modal'])
  $(id).addEventListener('click', (event) => {
    if (event.target === $(id)) closeModal(id);
  });
let sampleLogs = [
  {
    type: 'error',
    time: '00:00',
    message: 'Example: source configuration requires review.',
    part: 'supply',
  },
  { type: 'warning', time: '00:01', message: 'Example: cable rating has not been assessed.' },
  { type: 'info', time: '00:02', message: 'Example: circuit loaded.' },
];
let logFilter = 'all';
function openConsole() {
  if (matchMedia('(max-width:800px)').matches && !$('inspector').hidden) closeInspector();
  setPanel('console-panel', true, 'console-button');
  $('close-console').focus();
}
function renderLogs() {
  for (const type of ['error', 'warning']) {
    const count = sampleLogs.filter((item) => item.type === type).length;
    $(`${type}-count`).hidden = !count;
    $(`${type}-count`).textContent = `${count} ${type}${count === 1 ? '' : 's'}`;
  }
  document
    .querySelectorAll('[data-log-filter]')
    .forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.logFilter === logFilter)),
    );
  const items = sampleLogs.filter((item) => logFilter === 'all' || item.type === logFilter);
  $('console-messages').replaceChildren(
    ...items.map((item) => {
      const row = document.createElement('div');
      row.className = 'console-entry';
      const time = document.createElement('time');
      time.textContent = item.time;
      const kind = document.createElement('span');
      kind.className = `entry-type entry-${item.type}`;
      kind.textContent = item.type;
      const message = document.createElement('span');
      message.textContent = item.message;
      if (item.part) {
        const button = document.createElement('button');
        button.textContent = 'Inspect source';
        button.addEventListener('click', () => inspect(item.part, true));
        message.append(button);
      }
      row.append(time, kind, message);
      return row;
    }),
  );
  if (!items.length) {
    const note = document.createElement('p');
    note.className = 'readings';
    note.textContent = sampleLogs.length
      ? 'No messages match this filter.'
      : 'No messages. The circuit is unchanged.';
    $('console-messages').append(note);
  }
}
renderLogs();
document.querySelectorAll('[data-log-filter]').forEach((button) =>
  button.addEventListener('click', () => {
    logFilter = button.dataset.logFilter;
    renderLogs();
  }),
);
$('clear-console').addEventListener('click', () => {
  sampleLogs = [];
  renderLogs();
});
$('console-button').addEventListener('click', () => {
  if (wantsOpen('console-panel')) openConsole();
  else {
    setPanel('console-panel', false, 'console-button');
    $('console-button').focus();
  }
});
$('close-console').addEventListener('click', () => {
  setPanel('console-panel', false, 'console-button');
  $('console-button').focus();
});
function drawPlacement(updateHistory = true) {
  const button = $('placed');
  button.hidden = !placement;
  if (updateHistory) {
    $('undo').disabled = !placement;
    $('redo').disabled = !redoPart;
  }
  const represented =
    placement && (window.DesignPreview?.hooks.resolvePlacement?.(placement) || placement);
  if (placement)
    button.innerHTML = `${DeviceArtwork.markup(represented.type || DeviceArtwork.baseTypes[represented.id])}<span>${represented.name} · preview placement</span>`;
}
function place(part) {
  window.DesignPreview?.hooks.beforePlace?.(part);
  if (!$('catalog-modal').hidden) closeModal('catalog-modal');
  closePopovers();
  closeInspector();
  placement = part;
  redoPart = null;
  drawPlacement();
  notify('Preview placement. Select the part to explore its Inspector.');
}
$('placed').addEventListener('click', () => inspect(placement.id));
$('undo').addEventListener('click', () => {
  if (window.DesignPreview.hooks.undo?.()) return;
  redoPart = placement;
  placement = null;
  drawPlacement();
});
$('redo').addEventListener('click', () => {
  if (window.DesignPreview.hooks.redo?.()) return;
  placement = redoPart;
  redoPart = null;
  drawPlacement();
});
for (const tool of ['select', 'wire'])
  $(`${tool}-tool`).addEventListener('click', () => {
    for (const other of ['select', 'wire']) {
      $(`${other}-tool`).classList.toggle('active', other === tool);
      $(`${other}-tool`).setAttribute('aria-pressed', String(other === tool));
    }
    if (tool === 'wire')
      notify('Wire tool position preview. This mockup does not edit connections.');
  });
function setZoom(value) {
  zoom = Math.max(60, Math.min(130, value));
  $('zoom-level').textContent = `${zoom}%`;
  document.querySelector('.circuit').style.transform = `scale(${zoom / 100})`;
}
$('zoom-in').addEventListener('click', () => setZoom(zoom + 10));
$('zoom-out').addEventListener('click', () => setZoom(zoom - 10));
$('fit').addEventListener('click', () => setZoom(100));
$('run').addEventListener('click', () => {
  const running = document.querySelector('.workspace').classList.toggle('running');
  $('run').setAttribute('aria-pressed', String(running));
  $('run').setAttribute('aria-label', running ? 'Preview stopped state' : 'Preview running state');
  $('run').querySelector('span').textContent = running ? 'Stop' : 'Run';
  $('state-note').textContent = running
    ? 'Running appearance only · no electrical calculation'
    : 'Device details appear only when you need them';
  notify(
    running
      ? 'Running appearance preview · no electrical calculation.'
      : 'Stopped appearance preview.',
  );
});
document.querySelectorAll('[data-message]').forEach((button) =>
  button.addEventListener('click', () => {
    for (const id of ['catalog-modal', 'labs-modal']) if (!$(id).hidden) closeModal(id);
    closePopovers();
    notify(button.dataset.message);
  }),
);
document.addEventListener('keydown', (event) => {
  if (event.defaultPrevented) return;
  const modal = activeModal;
  if (event.key === 'Escape') {
    if (modal) closeModal(modal);
    else if (!$('settings').hidden) {
      closePopovers();
      $('settings-button').focus();
    } else if (!$('project-menu').hidden) {
      closePopovers();
      $('project-button').focus();
    } else if (!$('console-panel').hidden) {
      setPanel('console-panel', false, 'console-button');
      $('console-button').focus();
    } else if (!$('inspector').hidden) closeInspector();
  }
  if (event.key === 'Tab' && modal) {
    const items = [...$(modal).querySelectorAll('button,input,select,textarea,a[href]')].filter(
      (el) => !el.disabled && el.getClientRects().length,
    );
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
window.DesignPreview = {
  $,
  allParts,
  preferences,
  hooks: {},
  inspect,
  closeInspector,
  openConsole,
  openModal,
  closeModal,
  setPanel,
  reveal,
  notify,
  place,
  applyPreferences,
  renderParts,
  resetDrawing: adaptDrawing,
  refreshPlacement() {
    drawPlacement(false);
  },
  setZoom,
  switchTab,
  get selected() {
    return selected;
  },
  get activeModal() {
    return activeModal;
  },
  addLog(message, type = 'info') {
    sampleLogs.push({ type, time: '00:03', message });
    renderLogs();
  },
};
