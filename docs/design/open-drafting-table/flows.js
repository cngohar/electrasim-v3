/* Clickable design workflows; never imports a production store or calls an API. */
(() => {
  const P = window.DesignPreview;
  const V = window.PrototypeViews;
  const $ = P.$;
  const state = {
    placementSource: 'Document supply',
    standard: 'IEC',
    deviceState: 'Off',
    timerKind: 'Interval',
    sequence: 'ABC',
    curve: 'B',
    models: {},
    inspectorTarget: 'component',
    wireKey: 'live',
    wires: {},
    basics: {},
    quickDraft: null,
    pendingBasic: null,
    selected: 'lamp',
    types: {
      supply: 'ac-mains-supply',
      switch: 'single-way-switch',
      lamp: 'bulb',
      socket: 'socket-3pin',
      breaker: 'mcb',
      relay: 'control-relay',
      motor: 'motor',
      junction: 'junction-box',
    },
    labels: {},
    saved: ['Single-switch lighting', 'My workshop circuit'],
    pendingVariant: null,
    pendingSupply: null,
    confirmText: '',
    confirmKind: '',
    access: 'guest',
    uiState: 'normal',
    readiness: 'ready',
    routing: 'Orthogonal',
    diagnosticFilter: 'All',
    helpTopic: 'Getting started',
    tourStep: 0,
    prefs: {
      confirmDelete: true,
      customWiring: false,
      joints: true,
      alignment: true,
      recent: true,
      grid: true,
      minimap: false,
      tooltips: true,
      currentFlow: true,
      deviceEffects: true,
      physicsEffects: true,
      reducedEffects: false,
    },
    model: { voltage: 230, delay: 0 },
    wire: {
      label: 'Lighting conductor',
      length: 5,
      area: 1.5,
      material: 'Copper',
      method: 'Clipped direct',
    },
    supply: { kind: 'AC', voltage: 230, frequency: 50 },
    difficulty: 'Beginner',
    seed: 'design-preview-01',
    faultChoice: 'Open path',
    task: null,
    step: 0,
    paused: false,
    repair: { clear: false, reset: false, replace: false },
    events: [
      { title: 'Example circuit loaded', detail: 'Design sample · no calculation' },
      {
        title: 'Example configuration reviewed',
        detail: 'Readings and applicability remain unavailable in the prototype',
      },
    ],
  };
  state.wires = Object.fromEntries(
    Object.entries({
      live: 'Live conductor',
      neutral: 'Neutral conductor',
      earth: 'Protective conductor',
    }).map(([key, label]) => [key, { ...state.wire, label }]),
  );
  const byType = new Map(DesignCatalog.catalog.map((def) => [def.type, def]));
  const component = (type) => byType.get(type) || byType.get('bulb');
  const baseFor = (def) =>
    ({
      supply: 'supply',
      switch: 'switch',
      socket: 'socket',
      protection: 'breaker',
      relay: 'relay',
      contactor: 'relay',
      transformer: 'relay',
      timer: 'relay',
      lighting: 'lamp',
      motor: 'motor',
      load: 'motor',
      heater: 'motor',
      junction: 'junction',
    })[def.category] || 'junction';
  const photo = (type) => {
    const def = component(type);
    const base = baseFor(def);
    const file =
      DesignCatalog.photos[type] ||
      {
        supply: 'dist_board_3p_1786522082960.jpg',
        switch: 'component_light_switch_1786249016724.jpg',
        lamp: 'bulb_led_a60_1786782205960.jpg',
        socket: 'component_socket_outlet_1786248985392.jpg',
        breaker: 'component_mcb_breaker_1786248947812.jpg',
        relay: 'relay_module_1786522047102.jpg',
        motor: 'variant_motor.png',
        junction: 'dist_board_3p_1786522082960.jpg',
      }[base];
    return `../../../src/assets/images/${file}`;
  };
  const context = { component, photo, preferences: P.preferences };
  let currentView = 'map';
  const history = [];
  let redo = [];
  let contextTarget = 'lamp';
  const workspace = document.querySelector('.workspace');
  const surface = document.createElement('section');
  surface.className = 'scrim';
  surface.id = 'surface-modal';
  surface.hidden = true;
  surface.innerHTML =
    '<div class="catalog surface-dialog" role="dialog" aria-modal="true" aria-labelledby="surface-title"><header class="surface-head"><div><div class="eyebrow" id="surface-group"></div><h1 id="surface-title"></h1></div><button id="close-surface" aria-label="Close screen"><svg><use href="#i-close"/></svg></button></header><div class="surface-body" id="surface-body"></div><footer class="surface-footer"><span>Interactive design prototype · example states</span><button type="button" data-action="open" data-view="map">Design map</button></footer></div>';
  workspace.append(surface);
  const task = document.createElement('aside');
  task.className = 'task-sheet';
  task.id = 'task-sheet';
  task.hidden = true;
  task.setAttribute('aria-label', 'Focused learning task');
  workspace.append(task);
  const menu = document.createElement('section');
  menu.className = 'context-menu';
  menu.id = 'context-menu';
  menu.hidden = true;
  menu.setAttribute('aria-label', 'Selection actions');
  workspace.append(menu);
  const readiness = document.createElement('div');
  readiness.className = 'readiness-chip';
  readiness.id = 'readiness-chip';
  readiness.hidden = true;
  workspace.append(readiness);
  const minimap = document.createElement('button');
  minimap.className = 'mini-preview';
  minimap.id = 'mini-preview';
  minimap.hidden = true;
  minimap.setAttribute('aria-label', 'Fit drawing using mini-map');
  minimap.innerHTML =
    '<svg viewBox="0 0 160 80" aria-hidden="true"><path d="M25 25H80H135M25 40V65H135V25" fill="none" stroke="var(--line)" stroke-width="3"/><rect x="12" y="12" width="26" height="33" rx="5" fill="var(--soft)" stroke="var(--blue)"/><rect x="66" y="12" width="28" height="28" rx="5" fill="var(--soft)" stroke="var(--blue)"/><circle cx="135" cy="25" r="14" fill="var(--soft)" stroke="var(--blue)"/></svg>';
  minimap.addEventListener('click', () => P.setZoom(100));
  workspace.append(minimap);
  const variantSection = document.createElement('section');
  variantSection.className = 'variant-inspector';
  variantSection.id = 'variant-inspector';
  $('properties').insertBefore(variantSection, $('properties').querySelector('.field'));
  const inspectorTools = document.createElement('div');
  inspectorTools.className = 'inspector-tools';
  inspectorTools.innerHTML =
    V.open('Connections', 'connections') +
    V.button('Configure', 'quick-config') +
    V.open('More tools', 'selection-tools');
  $('properties').append(inspectorTools);
  $('properties').querySelector('details').innerHTML =
    `<summary>Advanced information</summary><div class="inspector-tools">${V.open('Model scope', 'component-info')}${V.open('Diagnostics', 'validation')}${V.open('Event history', 'history')}${V.open('Earth-fault loop', 'zs')}</div>`;
  function renderCanvasArtwork() {
    for (const group of document.querySelectorAll('.circuit .part')) {
      const id = group.dataset.part;
      const def = component(state.types[id]);
      const changed = group.dataset.artType !== def.type;
      group.dataset.artType = def.type;
      group.dataset.artFamily = DeviceArtwork.mapping[def.type].family;
      if (changed) {
        const tall = id === 'supply';
        const light = def.category === 'lighting';
        const artwork = DeviceArtwork.device(def.type);
        group.querySelector('.part-device').innerHTML =
          `<rect class="device-face" width="120" height="${tall ? 158 : 120}" rx="18"/>${
            light
              ? '<ellipse class="lamp-halo" cx="60" cy="43" rx="34" ry="35"/><ellipse class="lamp-glow" cx="60" cy="43" rx="24" ry="25"/>'
              : ''
          }<svg class="canvas-device-art" x="20" y="${tall ? 24 : 10}" width="80" height="96" viewBox="0 0 48 48" aria-hidden="true">${artwork}</svg>`;
        group.querySelector('.part-symbol').innerHTML =
          `<svg x="12" y="12" width="96" height="96" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6">${DeviceArtwork.symbol(def.type)}</svg>`;
        group.querySelector('.part-symbol-badge').innerHTML =
          `<rect x="1" y="1" width="46" height="46" rx="12" fill="var(--paper)" stroke="var(--line)"/><svg x="5" y="5" width="38" height="38" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6">${DeviceArtwork.symbol(def.type)}</svg>`;
      }
      group.querySelector('.part-label').textContent =
        state.labels[id] || def.label.replace(/\s*\([^)]*\)\s*/g, '');
      group.querySelector('.part-note').textContent = 'Reference appearance';
    }
  }
  $('part-label-input').closest('label').hidden = true;
  $('part-display').closest('label').hidden = true;
  const propertySummary = document.createElement('section');
  propertySummary.id = 'property-summary';
  variantSection.after(propertySummary);
  function resetQuickDraft() {
    const def = component(state.types[state.selected]);
    const basic = state.basics[state.selected] || {};
    state.quickDraft =
      state.inspectorTarget === 'wire'
        ? { ...state.wire }
        : {
            label: state.labels[state.selected] || def.label,
            variant: def.type,
            voltage: basic.voltage ?? 230,
            power: basic.power ?? def.powerWatts ?? '',
            on: basic.on || 'Off',
            sourceVoltage: state.supply.voltage,
            sourceFrequency: state.supply.frequency,
          };
  }
  function renderQuick() {
    if (!state.quickDraft) resetQuickDraft();
    state.quickVariantType = state.quickDraft.variant;
    $('configure').innerHTML = QuickInspector.view(state, context, state.quickDraft);
    const locked = state.access === 'readonly' || workspace.classList.contains('running');
    $('quick-config-actions')
      .querySelectorAll('button')
      .forEach((button) => {
        button.disabled = locked;
      });
    $('quick-config-feedback').textContent = '';
  }
  function applyBasic(draft) {
    state.labels[state.selected] = draft.label;
    state.basics[state.selected] = { voltage: draft.voltage, power: draft.power, on: draft.on };
  }
  function inspectorContent() {
    renderCanvasArtwork();
    P.refreshPlacement();
    const def = component(state.types[state.selected]);
    $('inspector-title').textContent = state.labels[state.selected] || def.label;
    $('part-label-input').value = state.labels[state.selected] || def.label;
    $('part-label-input').disabled = state.access === 'readonly';
    $('inspector-description').textContent =
      `${def.category} · ${state.access === 'readonly' ? 'Read-only' : 'Selected component'}`;
    $('reference-image').src = photo(def.type);
    $('reference-image').alt = `Representative ${def.label} photo`;
    variantSection.innerHTML = `<div class="eyebrow">Variant</div><strong>${V.escape(def.label)}</strong>${V.button('Change variant', 'quick-config')}${V.open('Specs', 'component-info')}`;
    document.querySelector('.inspector-top .eyebrow').textContent =
      state.inspectorTarget === 'wire' ? 'Selected wire' : 'Selected device';
    $('reference-photo').hidden = state.inspectorTarget === 'wire';
    variantSection.hidden = state.inspectorTarget === 'wire';
    propertySummary.innerHTML = QuickInspector.summary([
      ['Category', def.category],
      ['Terminals', def.ports.map((p) => p.label).join(' · ')],
      [
        'Nameplate power',
        (state.basics[state.selected]?.power ?? def.powerWatts) === undefined
          ? 'Not declared'
          : `${state.basics[state.selected]?.power ?? def.powerWatts} W`,
      ],
    ]);
    const family = DeviceArtwork.mapping[def.type].family;
    const extra =
      family === 'transformer'
        ? [
            'Primary / secondary voltage',
            'Primary / secondary current',
            'Primary / secondary power',
          ]
        : ['relay', 'contactor', 'smartrelay'].includes(family)
          ? [
              'Coil voltage and consumption',
              'Contact state and pole currents',
              'Pending pickup / dropout',
            ]
          : family === 'timer'
            ? ['Simulated time', 'Timed contact state', 'Next scheduled transition']
            : def.category === 'protection'
              ? [
                  'Pole current / rating',
                  'Trip state and reason',
                  'Residual current where supported',
                ]
              : def.type === 'motor-3phase'
                ? ['Phase currents and sequence', 'Voltage unbalance', 'Teaching-model operation']
                : def.isLoad
                  ? ['Load response', 'Model compatibility', 'Power relative to nameplate']
                  : ['Contact / branch state', 'Pole currents where supported'];
    $('readings').innerHTML =
      `<div class="reading-status"><span class="soft-tag">Not calculated</span><p>No simulation runs in this design preview.</p></div><dl class="inspector-measurements">${[
        'Terminal-pair voltage · V',
        'Branch current · A',
        'Power · W',
      ]
        .map((name) => `<div><dt>${name}</dt><dd>—</dd></div>`)
        .join(
          '',
        )}</dl><p class="readings">Voltage uses named terminals; current follows the branch direction. AC magnitudes use RMS.</p><details class="advanced"><summary>Device-specific readings</summary><ul class="reading-details">${extra.map((name) => `<li>${name}<small>Unavailable in preview</small></li>`).join('')}</ul></details><p class="readings">Fresh engine results only. Edited circuits show stale results until recalculated; unsupported measurements stay unavailable.</p>`;
    const group = document.querySelector(`.part[data-part="${state.selected}"]`);
    if (group) {
      group.querySelector('.part-label').textContent =
        state.labels[state.selected] || def.label.replace(/\s*\([^)]*\)\s*/g, '');
      group.querySelector('.part-note').textContent = 'Reference appearance';
    }
    $('properties').querySelector('.inspector-tools').hidden = state.inspectorTarget === 'wire';
    $('properties').querySelector('details').hidden = state.inspectorTarget === 'wire';
    if (state.inspectorTarget === 'wire') wireInspectorContent();
    renderQuick();
  }
  function wireInspectorContent() {
    $('inspector-title').textContent = state.wire.label;
    $('inspector-description').textContent =
      `${state.wireKey === 'earth' ? 'Protective conductor' : 'Selected wire'} · ${state.access === 'readonly' ? 'Read-only' : 'Configuration available'}`;
    $('reference-photo').hidden = true;
    variantSection.hidden = true;
    propertySummary.innerHTML = `${QuickInspector.summary([
      ['Conductor', state.wire.material],
      ['Length', `${state.wire.length} m`],
      ['Cross-section', `${state.wire.area} mm²`],
      ['Installation', state.wire.method],
    ])}<p class="config-note">Sample ${state.wireKey} path. Actual endpoints and wire IDs remain production data.</p>`;
    $('readings').innerHTML =
      `<span class="soft-tag">Not calculated</span><dl class="inspector-measurements">${[
        'Branch current · A',
        'Wire resistance · Ω',
        'Capacity assessment · A',
      ]
        .map((name) => `<div><dt>${name}</dt><dd>—</dd></div>`)
        .join(
          '',
        )}</dl><p class="readings">No wire calculation runs here. The real editor uses current results and declared installation details.</p>`;
    $('properties').querySelector('.inspector-tools').hidden = true;
    $('properties').querySelector('details').hidden = true;
  }
  function inspectWire(key) {
    state.inspectorTarget = 'wire';
    state.wireKey = key;
    state.wire = {
      ...(state.wires[key] || {
        ...state.wire,
        label: {
          live: 'Live conductor',
          neutral: 'Neutral conductor',
          earth: 'Protective conductor',
        }[key],
      }),
    };
    SelectionLayout.select(null);
    resetQuickDraft();
    inspectorContent();
    if (matchMedia('(max-width:800px)').matches) {
      P.setPanel('console-panel', false, 'console-button');
      P.setPanel('task-sheet', false);
    }
    P.setPanel('inspector', true, 'inspect-button');
    workspace.dataset.inspecting = 'true';
  }
  window.addEventListener('preview:selection', (event) => {
    state.inspectorTarget = 'component';
    state.quickDraft = null;
    state.selected = event.detail.id;
    SelectionLayout.select(event.detail.id, event.detail.additive);
    inspectorContent();
    if (matchMedia('(max-width:800px)').matches) P.setPanel('task-sheet', false);
  });
  $('part-label-input').addEventListener('input', () => {
    state.labels[state.selected] = $('part-label-input').value;
    inspectorContent();
  });
  function renderSurface() {
    const descriptor = V.screens.find((item) => item.id === currentView);
    if (!descriptor) throw new Error(`No screen for ${currentView}`);
    $('surface-title').textContent = descriptor.title;
    $('surface-group').textContent = descriptor.group;
    $('surface-body').innerHTML = V.view(currentView, state, context);
    wireForms();
    if (currentView === 'validation')
      $('surface-body')
        .querySelectorAll('.screen-list .screen-card')
        .forEach((card) => {
          card.hidden =
            state.diagnosticFilter !== 'All' && !card.textContent.includes(state.diagnosticFilter);
        });
  }
  function openView(id, trigger = document.activeElement) {
    if (id === 'supply') state.supplyDraft = { ...state.supply };
    if (id === 'wire') state.wireDraft = { ...state.wire };
    if (id === 'device-model') {
      const basic = state.basics[state.selected] || {};
      state.model = { ...state.model, voltage: basic.voltage ?? 230 };
      state.deviceState = basic.on || 'Off';
    }
    if (id === 'pause') {
      state.paused = true;
      P.setPanel('task-sheet', false);
    }
    currentView = id;
    renderSurface();
    P.openModal('surface-modal', trigger);
  }
  function closeView() {
    return P.closeModal('surface-modal');
  }
  $('close-surface').addEventListener('click', closeView);
  surface.addEventListener('click', (event) => {
    if (event.target === surface) closeView();
  });
  function showPrefs() {
    workspace.dataset.grid = String(state.prefs.grid);
    minimap.hidden = !state.prefs.minimap;
    document.body.dataset.tooltips = String(state.prefs.tooltips);
  }
  function historyButtons() {
    $('undo').disabled = !history.length;
    $('redo').disabled = !redo.length;
  }
  function snapshot() {
    return JSON.parse(
      JSON.stringify({
        types: state.types,
        supply: state.supply,
        wire: state.wire,
        labels: state.labels,
        basics: state.basics,
        wires: state.wires,
        layout: SelectionLayout.snapshot(),
      }),
    );
  }
  function applySnapshot(data) {
    Object.assign(state, JSON.parse(JSON.stringify(data)));
    SelectionLayout.restore(data.layout);
    if (state.inspectorTarget === 'wire' && state.wires[state.wireKey])
      state.wire = { ...state.wires[state.wireKey] };
    state.quickDraft = null;
    inspectorContent();
    historyButtons();
  }
  function change(label, apply) {
    const before = snapshot();
    apply();
    history.push({ before, after: snapshot(), label });
    redo = [];
    historyButtons();
    state.events.unshift({
      title: label,
      detail: 'Preview change · electrical results not calculated',
    });
    P.addLog(`Preview: ${label}`);
  }
  P.hooks.undo = () => {
    if (!history.length) return false;
    const entry = history.pop();
    redo.push(entry);
    applySnapshot(entry.before);
    P.notify(`Undid ${entry.label}`);
    return true;
  };
  P.hooks.redo = () => {
    if (!redo.length) return false;
    const entry = redo.pop();
    history.push(entry);
    applySnapshot(entry.after);
    P.notify(`Redid ${entry.label}`);
    return true;
  };
  function updateState() {
    const blocked = state.readiness === 'blocked' || state.access === 'readonly';
    $('run').disabled = blocked;
    readiness.hidden = !blocked && state.uiState === 'normal';
    if (!readiness.hidden) {
      readiness.innerHTML = `<span>${V.escape(
        state.access === 'readonly'
          ? 'Read-only circuit'
          : state.readiness === 'blocked'
            ? 'Run blocked'
            : state.uiState === 'offline'
              ? 'Offline workspace'
              : state.uiState === 'loading'
                ? 'Loading example'
                : state.readiness === 'unassessed'
                  ? 'Review required'
                  : 'Example state',
      )}</span>${V.open('Review', state.access === 'readonly' ? 'recovery' : 'readiness')}`;
    }
    document.querySelector('.project-meta').textContent = `Design study · ${state.access}`;
    inspectorContent();
  }
  function catalog() {
    const query = $('search').value.trim().toLowerCase();
    const category = $('catalog-category').value;
    const compatible = $('catalog-compatible').checked;
    let items = DesignCatalog.catalog.filter(
      (def) =>
        `${def.label} ${def.category} ${def.type}`.toLowerCase().includes(query) &&
        (category === 'all' || def.category === category),
    );
    if (compatible) items = items.filter((def) => def.tier !== 'pro');
    $('catalog-count').textContent =
      `${items.length} of ${DesignCatalog.catalog.length} components`;
    $('catalog-grid').replaceChildren(
      ...items.map((def) => {
        const button = document.createElement('button');
        button.className = 'catalog-part';
        button.type = 'button';
        button.setAttribute('aria-label', `Preview ${def.label}`);
        const base = baseFor(def);
        button.innerHTML = `${DeviceArtwork.markup(def.type)}<span class="part-name">${V.escape(def.label)}</span>${def.tier === 'pro' ? '<span class="catalog-tier">Membership</span>' : ''}`;
        button.addEventListener('click', () => {
          if (def.tier === 'pro' && state.access !== 'pro') {
            openView('recovery', button);
            return;
          }
          state.types[base] = def.type;
          P.place({ id: base, name: def.label, type: def.type });
          state.selected = base;
        });
        return button;
      }),
    );
    if (!items.length)
      $('catalog-grid').innerHTML = '<p class="no-results">No components match these filters.</p>';
  }
  const catalogToolbar = document.createElement('div');
  catalogToolbar.className = 'catalog-toolbar';
  catalogToolbar.innerHTML = `<select id="catalog-category" aria-label="Catalogue category"><option value="all">All categories</option>${[
    ...new Set(DesignCatalog.catalog.map((def) => def.category)),
  ]
    .map((category) => `<option value="${V.escape(category)}">${V.escape(category)}</option>`)
    .join(
      '',
    )}</select><label><input type="checkbox" id="catalog-compatible"> Basic catalogue</label><span class="catalog-count" id="catalog-count"></span>`;
  $('catalog-grid').before(catalogToolbar);
  $('catalog-modal').querySelector('p').textContent =
    'Browse the current component catalogue. Variant and rating controls stay in the Inspector.';
  $('catalog-category').addEventListener('change', catalog);
  $('catalog-compatible').addEventListener('change', catalog);
  P.hooks.catalog = catalog;
  catalog();
  function renderTask() {
    const titles = {
      faults: 'Fault Lab',
      diagnosis: 'Diagnosis Lab',
      guided: 'Guided lighting circuit',
    };
    const checks = [
      'Place compatible components',
      'Connect the intended terminals',
      'Review Run and available readings',
    ];
    let body = `<div class="task-progress"><span>Example task</span><span>${state.paused ? 'Paused' : `Step ${state.step + 1} of 3`}</span></div>`;
    if (state.task === 'diagnosis')
      body += `${V.note(
        'Symptom: a lighting circuit no longer operates as expected. The fault and location are not revealed.',
      )}<h3>Identify the fault</h3><nav class="segments" aria-label="Diagnosis choice">${[
        'Open path',
        'Short circuit',
        'Leakage',
      ]
        .map((value) =>
          V.button(
            value,
            'diagnosis-answer',
            `data-value="${value}" aria-pressed="${state.answer === value}"`,
          ),
        )
        .join(
          '',
        )}</nav><label class="screen-field">Location<select id="diagnosis-location"><option value="">Choose a location</option><option>Supply path</option><option>Switching path</option><option>Load path</option></select></label>${V.button('Review diagnosis', 'diagnosis-check', '', 'primary')}`;
    else if (state.task === 'faults')
      body += `${V.note('Select a target and inspect applicable faults. This task uses sample states.')}<span class="soft-tag">${V.escape(state.faultChoice)}</span><div class="screen-actions">${V.button('Inject preview fault', 'inject-fault', '', 'primary')}${V.button('Clear fault', 'repair', 'data-kind="clear"')}${V.button('Reset protection', 'repair', 'data-kind="reset"')}${V.button('Replace damaged item', 'repair', 'data-kind="replace"')}</div>`;
    else
      body +=
        V.note(
          state.task === 'guided'
            ? 'Follow the checklist while building. The authored production circuit and outcomes stay authoritative.'
            : 'Build a switch-controlled lighting circuit. Keep its authored supply and permitted edits.',
        ) +
        checks
          .map(
            (text, index) =>
              `<label class="check-row"><input type="checkbox" data-task-check="${index}" ${index < state.step ? 'checked' : ''}>${text}</label>`,
          )
          .join('') +
        V.button('Review this step', 'task-next', '', 'primary');
    body += `<div class="task-feedback" id="task-feedback" hidden aria-live="polite"></div><div class="screen-actions">${V.open('Review attempt', 'practice-result')}${V.open('Pause', 'pause')}${V.button('Exit task', 'exit-task')}</div>`;
    task.innerHTML = `<header class="task-head"><div><div class="eyebrow">${state.task === 'guided' ? 'Learn' : 'Practice'}</div><h2>${titles[state.task]}</h2></div><button id="close-task" aria-label="Close learning task"><svg><use href="#i-close"/></svg></button></header><div class="task-body">${body}</div>`;
    $('close-task').addEventListener('click', () => openView('pause', $('close-task')));
  }
  function startTask(kind) {
    if (!['guided', 'faults', 'diagnosis'].includes(kind)) return;
    state.task = kind;
    state.step = 0;
    state.paused = false;
    renderTask();
    closeView();
    P.closeInspector();
    P.setPanel('console-panel', false, 'console-button');
    P.setPanel('task-sheet', true);
  }
  function resumeTask() {
    if (!state.task) state.task = 'guided';
    state.paused = false;
    renderTask();
    closeView();
    P.setPanel('task-sheet', true);
  }
  function exitTask() {
    state.task = null;
    state.paused = false;
    P.setPanel('task-sheet', false);
    closeView();
    P.notify('Returned to the preview workspace.');
  }
  function recordRepair(kind) {
    state.repair[kind] = true;
    state.events.unshift({
      title: `Preview ${
        { clear: 'fault cleared', reset: 'protection reset', replace: 'damaged item replaced' }[
          kind
        ]
      }`,
      detail: 'Separate repair action · sample state only',
    });
    P.addLog(`Preview: ${kind} repair action`);
    if ($('task-feedback')) {
      $('task-feedback').hidden = false;
      $('task-feedback').textContent =
        'Preview action recorded. Actual recovery and assessment remain engine-validated.';
    } else P.notify(`Preview repair action recorded: ${kind}.`);
  }
  function captureWire() {
    state.wireDraft = {
      ...state.wireDraft,
      label: $('wire-label').value,
      length: Number($('wire-length').value),
      area: Number($('wire-area').value),
    };
  }
  function confirm(kind, text) {
    state.confirmKind = kind;
    state.confirmText = text;
    openView('confirm-delete');
  }
  function download(name, data, type = 'application/json') {
    const href = URL.createObjectURL(new Blob([data], { type }));
    const link = document.createElement('a');
    link.href = href;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  }
  function captureQuick() {
    if (!state.quickDraft) resetQuickDraft();
    const map = {
      label: 'label',
      variant: 'variant',
      length: 'length',
      area: 'area',
      voltage: 'voltage',
      power: 'power',
      on: 'on',
      'source-voltage': 'sourceVoltage',
      'source-frequency': 'sourceFrequency',
    };
    for (const [id, key] of Object.entries(map)) {
      const input = $(`config-${id}`);
      if (input)
        state.quickDraft[key] = input.type === 'number' ? Number(input.value) : input.value;
    }
  }
  $('configure').addEventListener('input', captureQuick);
  $('configure').addEventListener('change', (event) => {
    const previous = component(state.quickVariantType || state.types[state.selected]);
    captureQuick();
    if (event.target.id === 'config-variant') {
      const next = component(state.quickDraft.variant);
      if (state.quickDraft.label === previous.label) {
        state.quickDraft.label = next.label;
        $('config-label').value = next.label;
      }
      if (
        $('config-power') &&
        state.quickDraft.power === previous.powerWatts &&
        next.powerWatts !== undefined
      ) {
        state.quickDraft.power = next.powerWatts;
        $('config-power').value = next.powerWatts;
      }
      state.quickVariantType = next.type;
    }
    if ($('config-variant-note')) {
      const def = component(state.quickDraft.variant);
      $('config-variant-note').textContent =
        def.ports.map((p) => p.label).join(' · ') +
        (def.tier === 'pro' && state.access !== 'pro'
          ? ' · Membership required'
          : ' · Review before applying');
    }
  });
  $('configure').addEventListener('submit', (event) => {
    event.preventDefault();
    actions['quick-apply']();
  });
  function wireForms() {
    $('command-search')?.addEventListener('input', (event) => {
      $('command-list')
        .querySelectorAll('button')
        .forEach((button) => {
          button.hidden = !button.textContent
            .toLowerCase()
            .includes(event.target.value.toLowerCase());
        });
    });
    surface.querySelectorAll('input[id^="specific-model-"]').forEach((input) => {
      const saved = state.models[currentView]?.values;
      if (saved && saved[input.id] !== undefined) input.value = saved[input.id];
    });

    const signIn = $('sign-in-form');
    signIn?.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!signIn.reportValidity()) return;
      state.access = 'free';
      $('sign-in-result').textContent =
        'Signed-in state previewed locally. No account was created.';
      updateState();
    });
    const contact = $('contact-form');
    contact?.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!contact.reportValidity()) return;
      $('contact-result').textContent =
        'Submission confirmation preview. Your message was not sent.';
    });
  }
  const actions = {
    'quick-config': () => {
      P.switchTab('configure');
      $('config-label')?.focus();
    },
    'quick-reset': () => {
      resetQuickDraft();
      renderQuick();
    },
    'quick-material': (el) => {
      captureQuick();
      state.quickDraft.material = el.dataset.value;
      $('configure')
        .querySelectorAll('[data-action="quick-material"]')
        .forEach((button) => button.setAttribute('aria-pressed', String(button === el)));
    },
    'quick-apply': () => {
      if (state.access === 'readonly' || workspace.classList.contains('running')) return;
      const form = $('quick-config-form');
      if (!form.reportValidity()) return;
      captureQuick();
      const draft = { ...state.quickDraft };
      if (state.inspectorTarget === 'wire') {
        change('wire basics changed', () => {
          state.wire = {
            ...state.wire,
            label: draft.label,
            length: draft.length,
            area: draft.area,
            material: draft.material,
          };
          state.wires[state.wireKey] = { ...state.wire };
        });
      } else {
        const def = component(state.types[state.selected]);
        const family = DeviceArtwork.mapping[def.type].family;
        if (draft.variant !== def.type) {
          state.pendingBasic = draft;
          state.pendingVariant = draft.variant;
          state.pendingSupply =
            ['mains', 'battery', 'solar', 'generator'].includes(family) &&
            (draft.sourceVoltage !== state.supply.voltage ||
              draft.sourceFrequency !== state.supply.frequency)
              ? { ...state.supply, voltage: draft.sourceVoltage, frequency: draft.sourceFrequency }
              : null;
          openView('variant-review');
          return;
        }
        if (
          ['mains', 'battery', 'solar', 'generator'].includes(family) &&
          (draft.sourceVoltage !== state.supply.voltage ||
            draft.sourceFrequency !== state.supply.frequency)
        ) {
          state.pendingBasic = draft;
          state.pendingSupply = {
            ...state.supply,
            voltage: draft.sourceVoltage,
            frequency: draft.sourceFrequency,
          };
          openView('supply-review');
          return;
        }
        change('component basics changed', () => applyBasic(draft));
      }
      state.quickDraft = null;
      inspectorContent();
      P.switchTab('configure');
      $('quick-config-feedback').textContent = 'Applied. Undo restores the previous settings.';
    },
    'placement-source': (el) => {
      state.placementSource = el.dataset.value;
      renderSurface();
    },
    standard: (el) => {
      state.standard = el.dataset.value;
      renderSurface();
    },
    'device-state': (el) => {
      state.deviceState = el.dataset.value;
      renderSurface();
    },
    'timer-kind': (el) => {
      state.timerKind = el.dataset.value;
      renderSurface();
    },
    'phase-sequence': (el) => {
      state.sequence = el.dataset.value;
      renderSurface();
    },
    'protection-curve': (el) => {
      state.curve = el.dataset.value;
      renderSurface();
    },
    'specific-model-save': (el) => {
      if (state.access === 'readonly') return;
      const inputs = [...surface.querySelectorAll('input[id^="specific-model-"]')];
      if (inputs.some((input) => !input.value || !input.reportValidity())) {
        P.notify('Complete the declared model fields.');
        return;
      }
      state.models[currentView] = {
        values: Object.fromEntries(inputs.map((input) => [input.id, input.value])),
      };
      P.notify(`Declared ${el.dataset.model} model saved in the preview.`);
      closeView();
    },
    'model-remove': () => {
      if (state.access === 'readonly') return;
      delete state.models[currentView];
      renderSurface();
      P.notify('Declared preview model removed.');
    },
    'inspect-part': (el) => {
      closeView();
      P.inspect(el.dataset.part);
    },
    open: (el) => openView(el.dataset.view, el),
    close: closeView,
    catalog: () => {
      closeView();
      P.openModal('catalog-modal', $('browse'));
    },
    console: () => {
      closeView();
      P.openConsole();
    },
    'save-file': () => {
      state.saved.push(document.querySelector('.project-name').textContent);
      renderSurface();
      P.notify('Saved a local design example.');
    },
    'load-file': (el) => {
      document.querySelector('.project-name').textContent = state.saved[Number(el.dataset.file)];
      closeView();
    },
    'rename-file': (el) => {
      const index = Number(el.dataset.file);
      state.saved[index] = `${state.saved[index]} (renamed)`;
      renderSurface();
    },
    'remove-file': (el) =>
      confirm(
        `file:${el.dataset.file}`,
        `Remove saved preview circuit “${state.saved[Number(el.dataset.file)]}”?`,
      ),
    'new-circuit': () =>
      confirm('new', 'Start a new preview drawing? The current saved examples are retained.'),
    'sample-import': () => {
      $('import-json').value = JSON.stringify({ name: 'Imported example', preview: true }, null, 2);
    },
    'review-import': () => {
      try {
        const value = JSON.parse($('import-json').value);
        if (!value || typeof value.name !== 'string' || value.preview !== true)
          throw new Error('Use a named design-preview document with preview: true.');
        state.imported = value;
        confirm('import', `Replace the preview drawing with “${value.name}”?`);
      } catch (error) {
        $('import-message').textContent = error.message;
        $('import-message').dataset.error = 'true';
      }
    },
    'export-format': (el) => {
      const format = el.dataset.format;
      const review = $('export-review');
      review.hidden = false;
      review.innerHTML = `<h2>${V.escape(format)} export</h2>${V.field('Filename', 'export-name', 'electrasim-design-preview')}${V.note(
        format === 'Mini EIC'
          ? 'Assessment and readings are unavailable; this preview cannot certify an installation.'
          : 'Review layout, labels and available data before export.',
      )}${V.button('Download design example', 'export-download', '', 'primary')}`;
    },
    'export-download': () =>
      download(
        `${$('export-name')?.value || 'electrasim-design-preview'}.json`,
        JSON.stringify(
          {
            preview: true,
            name: document.querySelector('.project-name').textContent,
            note: 'Design example; no electrical assessment',
            types: state.types,
          },
          null,
          2,
        ),
      ),
    'template-preview': (el) => {
      P.notify(`Template ${Number(el.dataset.template) + 1} selected for preview.`);
      openView('guided', el);
    },
    'template-load': (el) => {
      state.template = Number(el.dataset.template);
      confirm('template', 'Load the selected example template and replace the preview drawing?');
    },
    routing: (el) => {
      state.routing = el.dataset.value;
      renderSurface();
    },
    appearance: (el) => {
      P.preferences.appearance = el.dataset.value;
      P.applyPreferences();
      renderSurface();
    },
    theme: (el) => {
      P.preferences.theme = el.dataset.value;
      P.applyPreferences();
      renderSurface();
    },
    motion: (el) => {
      P.preferences.motion = el.dataset.value;
      P.applyPreferences();
      renderSurface();
    },
    'backup-export': () =>
      download(
        'electrasim-design-backup.json',
        JSON.stringify({ preview: true, preferences: P.preferences, types: state.types }, null, 2),
      ),
    'backup-restore': () =>
      confirm('restore', 'Restore sample preferences and drawing after reviewing the backup?'),
    'stage-variant': (el) => {
      state.pendingVariant = el.dataset.type;
      openView('variant-review', el);
    },
    'cancel-variant': () => {
      state.pendingVariant = null;
      if (state.pendingBasic) state.pendingSupply = null;
      state.pendingBasic = null;
      closeView();
    },
    'apply-variant': () => {
      const target = component(state.pendingVariant);
      if (state.access === 'readonly' || (target.tier === 'pro' && state.access !== 'pro')) return;
      change('variant changed', () => {
        state.types[state.selected] = target.type;
        if (state.pendingBasic) applyBasic(state.pendingBasic);
        if (state.pendingBasic && state.pendingSupply) state.supply = { ...state.pendingSupply };
      });
      state.pendingSupply = null;
      state.pendingBasic = null;
      state.quickDraft = null;
      state.pendingVariant = null;
      inspectorContent();
      closeView();
      P.notify('Preview variant changed. Undo restores the previous variant.');
    },
    'model-save': () => {
      if (state.access === 'readonly' || workspace.classList.contains('running')) return;
      const inputs = [...$('surface-body').querySelectorAll('input')];
      if (inputs.some((input) => !input.reportValidity())) return;
      change('device configuration changed', () => {
        state.labels[state.selected] = $('model-label').value;
        state.basics[state.selected] = {
          ...(state.basics[state.selected] || {}),
          voltage: $('model-voltage') ? Number($('model-voltage').value) : undefined,
          power: $('model-power') ? Number($('model-power').value) : undefined,
          on: state.deviceState,
        };
      });
      state.quickDraft = null;
      inspectorContent();
      closeView();
      P.notify('Preview configuration saved.');
    },
    'supply-kind': (el) => {
      state.supplyDraft = {
        ...state.supplyDraft,
        voltage: Number($('supply-voltage').value),
        frequency: Number($('supply-frequency')?.value || 50),
        kind: el.dataset.value,
      };
      renderSurface();
    },
    'supply-stage': () => {
      const voltage = Number($('supply-voltage').value);
      const frequency = Number($('supply-frequency')?.value || 50);
      if (!(voltage > 0) || !(frequency > 0)) {
        P.notify('Enter positive supply values.');
        return;
      }
      state.pendingSupply = { kind: state.supplyDraft.kind, voltage, frequency };
      openView('supply-review');
    },
    'supply-cancel': () => {
      state.pendingSupply = null;
      state.pendingBasic = null;
      closeView();
    },
    'supply-apply': () => {
      if (state.access === 'readonly') return;
      change('supply changed', () => {
        state.supply = { ...(state.pendingSupply || state.supply) };
        if (state.pendingBasic) applyBasic(state.pendingBasic);
      });
      state.pendingSupply = null;
      state.pendingBasic = null;
      state.quickDraft = null;
      inspectorContent();
      closeView();
      P.notify('Supply preview applied; prior readings would become stale. Undo is available.');
    },
    'wire-material': (el) => {
      captureWire();
      state.wireDraft.material = el.dataset.value;
      renderSurface();
    },
    'wire-method': (el) => {
      captureWire();
      state.wireDraft.method = el.dataset.value;
      renderSurface();
    },
    'wire-save': () => {
      if (state.access === 'readonly') return;
      const length = Number($('wire-length').value);
      const area = Number($('wire-area').value);
      if (!(length > 0) || !(area > 0)) {
        P.notify('Enter positive wire dimensions.');
        return;
      }
      change('wire settings changed', () => {
        state.wire = { ...state.wireDraft, label: $('wire-label').value, length, area };
        state.wires[state.wireKey] = { ...state.wire };
      });
      state.quickDraft = null;
      inspectorContent();
      closeView();
    },
    duplicate: () => {
      const def = component(state.types[state.selected]);
      P.place({ id: state.selected, name: def.label, type: def.type });
      closeView();
    },
    rotate: (el) => {
      if (
        state.access === 'readonly' ||
        workspace.classList.contains('running') ||
        !SelectionLayout.selected.length
      )
        return;
      change('components rotated', () => SelectionLayout.rotate(Number(el.dataset.value || 90)));
    },
    align: (el) => {
      if (
        state.access === 'readonly' ||
        workspace.classList.contains('running') ||
        SelectionLayout.selected.length < 2
      )
        return;
      change('components aligned', () => SelectionLayout.align(el.dataset.value));
    },
    distribute: (el) => {
      if (
        state.access === 'readonly' ||
        workspace.classList.contains('running') ||
        SelectionLayout.selected.length < 3
      )
        return;
      change('components distributed', () => SelectionLayout.distribute(el.dataset.value));
    },
    'delete-review': () =>
      confirm('selected', 'Remove the selected preview component and review its connected wires?'),
    'confirm-cancel': closeView,
    'confirm-remove': () => {
      if (state.confirmKind.startsWith('file:'))
        state.saved.splice(Number(state.confirmKind.split(':')[1]), 1);
      else if (state.confirmKind === 'import')
        document.querySelector('.project-name').textContent = state.imported.name;
      else if (state.confirmKind === 'template') {
        document.querySelector('.project-name').textContent = [
          'Single-switch lighting',
          'Two-way staircase',
          'Protected socket circuit',
          'Three-phase DOL starter',
        ][state.template];
        startTask('guided');
        return;
      } else if (state.confirmKind === 'new')
        document.querySelector('.project-name').textContent = 'Untitled design';
      else if (state.confirmKind === 'copy') {
        state.access = 'free';
        document.querySelector('.project-name').textContent += ' · basic copy';
        updateState();
      }
      P.addLog(`Preview: confirmed ${state.confirmKind}`);
      closeView();
      P.notify('Confirmed in the design example. Production data is unchanged.');
    },
    'diagnostic-filter': (el) => {
      state.diagnosticFilter = el.dataset.value;
      renderSurface();
    },
    'validate-refresh': () => {
      P.addLog('Preview: diagnostic report refreshed');
      P.notify('Example report refreshed; no compliance result was calculated.');
    },
    'history-clear': () => {
      state.events = [];
      renderSurface();
    },
    repair: (el) => recordRepair(el.dataset.kind),
    task: (el) => startTask(el.dataset.task),
    difficulty: (el) => {
      state.difficulty = el.dataset.value;
      renderSurface();
    },
    'fault-choice': (el) => {
      state.faultChoice = el.dataset.value;
      renderSurface();
    },
    'resume-task': resumeTask,
    'exit-task': exitTask,
    'diagnosis-answer': (el) => {
      state.answer = el.dataset.value;
      renderTask();
    },
    'diagnosis-check': () => {
      const message = $('task-feedback');
      message.hidden = false;
      message.textContent = state.answer
        ? 'Response preview recorded. A real attempt requires identification and verified repair.'
        : 'Choose a fault type and location before submitting.';
    },
    'inject-fault': () => {
      $('task-feedback').hidden = false;
      $('task-feedback').textContent =
        'Injected-fault example state. Clear fault, reset and replacement remain distinct.';
      P.addLog('Preview: fault injection selected', 'warning');
    },
    'task-next': () => {
      state.step = Math.min(3, state.step + 1);
      if (state.step === 3) openView('practice-result');
      else renderTask();
    },
    provider: (el) => {
      $('sign-in-result').textContent =
        `${el.dataset.provider} provider redirect preview. No external request was made.`;
    },
    'access-refresh': () => {
      P.notify('Example access refreshed. No server request was made.');
    },
    'copy-review': () =>
      confirm(
        'copy',
        'Back up the original, then create a basic preview copy with the selected removals?',
      ),
    'help-topic': (el) => {
      state.helpTopic = el.dataset.topic;
      renderSurface();
    },
    'tour-previous': () => {
      state.tourStep = Math.max(0, state.tourStep - 1);
      renderSurface();
    },
    'tour-next': () => {
      if (state.tourStep === 4) {
        state.tourStep = 0;
        closeView();
      } else {
        state.tourStep++;
        renderSurface();
      }
    },
    'error-retry': () => {
      state.uiState = 'normal';
      state.readiness = 'ready';
      updateState();
      closeView();
    },
    state: (el) => {
      const value = el.dataset.state;
      if (['guest', 'free', 'pro', 'readonly'].includes(value)) {
        state.access = value;
        state.uiState = 'normal';
      } else {
        state.uiState = value;
        state.readiness =
          value === 'blocked' ? 'blocked' : value === 'unassessed' ? 'unassessed' : 'ready';
      }
      updateState();
      if (value === 'error') openView('error');
      else if (value === 'readonly') openView('recovery');
      else closeView();
    },
  };
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    const action = actions[button.dataset.action];
    if (!action) throw new Error(`Unmapped action ${button.dataset.action}`);
    action(button);
    if (menu.contains(button)) P.setPanel('context-menu', false);
  });
  document.addEventListener('change', (event) => {
    if (event.target.dataset.pref) {
      state.prefs[event.target.dataset.pref] = event.target.checked;
      showPrefs();
    }
    if (event.target.dataset.taskCheck)
      state.step = Math.max(state.step, Number(event.target.dataset.taskCheck) + 1);
  });
  function previewVariant(type) {
    const def = component(type);
    if (!$('variant-photo')) return;
    $('variant-photo').src = photo(type);
    $('variant-photo').alt = `Representative ${def.label}`;
    $('variant-name').textContent = def.label;
    $('variant-ports').textContent = def.ports.map((port) => port.label).join(' · ');
  }
  $('surface-body').addEventListener('pointerover', (event) => {
    const target = event.target.closest('[data-variant-preview]');
    if (target) previewVariant(target.dataset.variantPreview);
  });
  $('surface-body').addEventListener('focusin', (event) => {
    const target = event.target.closest('[data-variant-preview]');
    if (target) previewVariant(target.dataset.variantPreview);
  });
  $('surface-body').addEventListener('pointerleave', () => {
    if (currentView === 'variant') previewVariant(state.types[state.selected]);
  });
  $('surface-body').addEventListener('focusout', (event) => {
    if (currentView === 'variant' && !event.relatedTarget?.closest('[data-variant-preview]'))
      previewVariant(state.types[state.selected]);
  });
  function redirectButton(id, view) {
    $(id).addEventListener(
      'click',
      (event) => {
        event.stopImmediatePropagation();
        openView(view, $(id));
      },
      true,
    );
  }
  redirectButton('project-settings', 'settings-editing');
  const fullSettings = document.createElement('button');
  fullSettings.className = 'action';
  fullSettings.textContent = 'All simulator settings';
  fullSettings.dataset.action = 'open';
  fullSettings.dataset.view = 'settings-editing';
  $('settings').append(fullSettings);
  const projectLinks = [
    ['Files & saved circuits', 'files'],
    ['Templates & guided circuits', 'templates'],
    ['Fault Lab', 'faults'],
    ['Diagnosis Lab', 'diagnosis'],
    ['Checks & diagnostics', 'readiness'],
    ['Account & recovery', 'account'],
    ['Settings', 'settings-editing'],
    ['Help & shortcuts', 'help'],
    ['Full simulator design map', 'map'],
  ];
  $('project-menu')
    .querySelectorAll('button:not(#close-project),hr')
    .forEach((element) => {
      if (element.id === 'project-settings') return;
      element.hidden = true;
    });
  $('project-settings').hidden = true;
  for (const [label, id] of projectLinks) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.action = 'open';
    button.dataset.view = id;
    $('project-menu').append(button);
  }
  $('labs-modal').querySelector('.catalog-grid').innerHTML =
    V.open('Fault Lab', 'faults') +
    V.open('Diagnosis Lab', 'diagnosis') +
    V.open('Guided circuits', 'templates');
  function showContext(event, target) {
    event.preventDefault();
    contextTarget = target;
    state.selected = target;
    SelectionLayout.selectTarget(target);
    menu.innerHTML = `${
      V.button('Inspect component', 'inspect-target') +
      V.open('Change variant', 'variant') +
      V.open('Configure', 'device-model') +
      V.open('Wire properties', 'wire')
    }<hr>${V.button('Duplicate selected', 'duplicate')}${SelectionLayout.controls(
      state.access === 'readonly' || workspace.classList.contains('running'),
    )}${V.button('Remove selected', 'delete-review', '', 'danger')}`;
    menu.querySelector('[data-action=inspect-target]').addEventListener('click', () => {
      P.inspect(contextTarget);
      P.setPanel('context-menu', false);
    });
    menu.style.left = `${Math.max(8, Math.min(event.clientX, innerWidth - 278))}px`;
    P.setPanel('context-menu', true);
    menu.style.top = `${Math.max(8, Math.min(event.clientY, innerHeight - menu.offsetHeight - 8))}px`;
  }
  actions['inspect-target'] = () => {};
  document
    .querySelectorAll('.part')
    .forEach((element) =>
      element.addEventListener('contextmenu', (event) => showContext(event, element.dataset.part)),
    );
  document.querySelector('.circuit').addEventListener('click', (event) => {
    if (!event.target.closest('.part,.wire')) {
      SelectionLayout.select(null);
      P.setPanel('context-menu', false);
    }
  });
  document.querySelector('.circuit').addEventListener('contextmenu', (event) => {
    if (event.target.closest('.part,.wire')) return;
    event.preventDefault();
    SelectionLayout.select(null);
    menu.innerHTML =
      V.button('Select tool', 'select-tool') +
      V.button('Wire tool', 'wire-tool') +
      V.open('Component catalogue', 'placement');
    menu.style.left = `${Math.max(8, Math.min(event.clientX, innerWidth - 278))}px`;
    P.setPanel('context-menu', true);
    menu.style.top = `${Math.max(8, Math.min(event.clientY, innerHeight - menu.offsetHeight - 8))}px`;
  });
  actions['select-tool'] = () => $('select-tool').click();
  actions['wire-tool'] = () => $('wire-tool').click();
  document.querySelectorAll('.wire').forEach((element) => {
    element.setAttribute('tabindex', '0');
    element.setAttribute('role', 'button');
    element.setAttribute(
      'aria-label',
      `Inspect ${
        element.classList.contains('live')
          ? 'live'
          : element.classList.contains('neutral')
            ? 'neutral'
            : 'earth'
      } wire`,
    );
    element.addEventListener('click', () =>
      inspectWire(
        element.classList.contains('live')
          ? 'live'
          : element.classList.contains('neutral')
            ? 'neutral'
            : 'earth',
      ),
    );
    element.addEventListener('keydown', (event) => {
      if (['Enter', ' '].includes(event.key)) {
        event.preventDefault();
        inspectWire(
          element.classList.contains('live')
            ? 'live'
            : element.classList.contains('neutral')
              ? 'neutral'
              : 'earth',
        );
      }
    });
  });
  document.addEventListener('pointerdown', (event) => {
    if (!menu.hidden && !menu.contains(event.target)) P.setPanel('context-menu', false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input,select,textarea')) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openView('commands');
    }
    if (event.key === 'Delete' && !P.activeModal) {
      event.preventDefault();
      confirm('selected', 'Remove the selected preview component and review its connected wires?');
    }
    if (event.key === 'Escape' && !menu.hidden) P.setPanel('context-menu', false);
  });
  // Every action has a preview destination; no production component is embedded.
  P.hooks.beforePlace = (part) => {
    state.types[part.id] = part.type || state.types[part.id];
    renderCanvasArtwork();
  };
  P.hooks.resolvePlacement = (part) => ({
    ...part,
    type: state.types[part.id],
    name: component(state.types[part.id]).label,
  });
  window.DesignGallery = {
    screens: V.screens,
    state,
    open: openView,
    close: closeView,
    render: renderSurface,
    component,
    photo,
    inspectWire,
  };
  $('console-button').addEventListener(
    'click',
    () => {
      if (matchMedia('(max-width:800px)').matches) P.setPanel('task-sheet', false);
    },
    true,
  );
  $('inspect-button').addEventListener(
    'click',
    (event) => {
      if (
        state.inspectorTarget === 'wire' &&
        ($('inspector').hidden || $('inspector').dataset.visibility === 'closing')
      ) {
        event.stopImmediatePropagation();
        inspectWire(state.wireKey);
      }
    },
    true,
  );
  $('run').addEventListener('click', renderQuick);
  inspectorContent();
  showPrefs();
  updateState();
})();
