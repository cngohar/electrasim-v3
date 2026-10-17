/* Local design interactions only. No stores, solver, account or persistence. */
(() => {
  const $ = (selector) => document.querySelector(selector);
  const messages = [];
  let filter = 'all';
  let selected = 'LED bulb';
  let activeInspectorTab = 'properties';
  let wireExample = { size: 'awg12', material: 'copper', method: 'B1', length: 10 };
  const dialog = $('#detail');
  const parts = [
    ['ac-mains-supply', 'Supply'],
    ['single-way-switch', 'Switch'],
    ['bulb', 'LED bulb'],
    ['socket-3pin', 'Socket'],
    ['mcb', 'MCB'],
    ['rcbo', 'RCBO'],
    ['motor', 'Motor'],
    ['junction-box', 'Junction'],
  ];
  const art = (type) =>
    `<svg viewBox="0 0 48 48" aria-hidden="true">${window.DeviceArtwork.device(type)}</svg>`;
  document
    .querySelectorAll('[data-art]')
    .forEach((node) => node.insertAdjacentHTML('afterbegin', art(node.dataset.art)));
  const partButtons = () =>
    parts
      .map(
        ([type, name]) =>
          `<button type="button" class="part" data-select="${name}">${art(type)}<span>${name}</span></button>`,
      )
      .join('');
  $('#parts').innerHTML = partButtons();
  const setConsole = (open) => {
    $('#console').hidden = !open;
    $('#show-console').setAttribute('aria-expanded', String(open));
    if (open && innerWidth <= 640) $('#inspector').hidden = true;
  };
  const renderLogs = () => {
    const target = $('#console-entries');
    target.replaceChildren();
    const visible = messages.filter(
      (entry) =>
        filter === 'all' ||
        entry.type === filter ||
        (filter === 'info' && entry.type === 'success'),
    );
    if (!visible.length) target.textContent = 'No messages in this view.';
    for (const entry of visible) {
      const row = document.createElement('div');
      row.className = `log-row ${entry.type}`;
      const badge = document.createElement('b');
      badge.textContent = entry.type;
      const text = document.createElement('span');
      text.textContent = entry.message;
      row.append(badge, text);
      target.append(row);
    }
    $('#message-count').textContent = String(messages.length);
  };
  const samples = {
    error: [
      'Calculation unavailable',
      'Example: this component needs a declared electrical model.',
    ],
    warning: [
      'Rating needs review',
      'Example: the contact supply suitability has not been declared.',
    ],
    success: ['Settings updated', 'Example confirmation. The preview changes no real component.'],
    info: ['Workspace information', 'Example information. Open Console to review this later.'],
  };
  const notify = (type, custom) => {
    const [title, message] = custom ?? samples[type];
    messages.unshift({ type, message: `${title}. ${message}` });
    renderLogs();
    const lane = $('#notifications');
    if (lane.children.length >= 2) lane.firstElementChild.remove();
    const node = document.createElement('div');
    node.className = `toast ${type}`;
    const body = document.createElement('div');
    const heading = document.createElement('strong');
    heading.textContent = title;
    const text = document.createElement('p');
    text.textContent = message;
    body.append(heading, text);
    const view = document.createElement('button');
    view.type = 'button';
    view.textContent = 'View Console';
    view.onclick = () => {
      setConsole(true);
      node.remove();
    };
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Dismiss notification');
    close.onclick = () => node.remove();
    node.append(body, view, close);
    lane.append(node);
    let remaining = 5000;
    let started = 0;
    let timer = null;
    const pause = () => {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
      remaining = Math.max(0, remaining - (performance.now() - started));
    };
    const resume = () => {
      if (timer !== null || node.matches(':hover') || node.contains(document.activeElement)) return;
      started = performance.now();
      timer = setTimeout(() => node.remove(), remaining);
    };
    node.addEventListener('mouseenter', pause);
    node.addEventListener('mouseleave', resume);
    node.addEventListener('focusin', () => {
      if (!node.matches(':hover')) pause();
    });
    node.addEventListener('focusout', () => queueMicrotask(resume));
    resume();
  };
  const wireContent = () => {
    const sizes = { awg12: [3.31, '12 AWG'], awg14: [2.08, '14 AWG'], metric4: [4, 'Metric size'] };
    const [area, gauge] = sizes[wireExample.size];
    const aluminum = wireExample.material === 'aluminum';
    const material = aluminum ? 'Aluminium' : 'Copper';
    const symbol = aluminum ? 'Al' : 'Cu';
    const methods = { C: 'Clipped direct', B1: 'Conduit on wall', A: 'Thermal insulation' };
    const resistance = (((aluminum ? 0.0282 : 0.0175) * wireExample.length) / area).toFixed(4);
    if (activeInspectorTab === 'readings')
      return `<h3>Wire calculation</h3><dl><dt>Model resistance</dt><dd>${resistance} Ω</dd><dt>Current</dt><dd>Not calculated</dd><dt>Voltage drop</dt><dd>Not calculated</dd></dl><p>Resistance above follows the preview's declared size, material and length. Current and voltage drop require a current circuit solve.</p>`;
    if (activeInspectorTab === 'configure')
      return `<form id="wire-example-form"><p>Try a saved-property summary. These example controls affect this preview only.</p><label>Conductor size<select name="size" aria-label="Conductor size"><option value="awg12" ${wireExample.size === 'awg12' ? 'selected' : ''}>12 AWG · 3.31 mm²</option><option value="awg14" ${wireExample.size === 'awg14' ? 'selected' : ''}>14 AWG · 2.08 mm²</option><option value="metric4" ${wireExample.size === 'metric4' ? 'selected' : ''}>4 mm² · metric</option></select></label><label>Conductor material<select name="material" aria-label="Conductor material"><option value="copper" ${aluminum ? '' : 'selected'}>Copper · Cu</option><option value="aluminum" ${aluminum ? 'selected' : ''}>Aluminium · Al</option></select></label><label>Installation method<select name="method" aria-label="Installation method">${Object.entries(
        methods,
      )
        .map(
          ([id, name]) =>
            `<option value="${id}" ${wireExample.method === id ? 'selected' : ''}>Method ${id} · ${name}</option>`,
        )
        .join(
          '',
        )}</select></label><label>Physical length (m)<input name="length" aria-label="Physical length (m)" type="number" min="0.001" step="any" value="${wireExample.length}" required></label><button type="submit" class="primary">Apply wire preview</button></form>`;
    const installationDrawing =
      wireExample.method === 'C'
        ? '<path d="M5 32h54M22 32V20q10-9 20 0v12"/><circle cx="32" cy="22" r="5"/>'
        : wireExample.method === 'B1'
          ? '<path d="M5 32h54"/><rect x="17" y="7" width="30" height="24" rx="9"/><circle cx="32" cy="19" r="5"/>'
          : '<rect x="5" y="5" width="54" height="31" rx="3" fill="var(--soft)"/><path d="m8 8 7 8-7 8m48-16-7 8 7 8"/><circle cx="32" cy="20" r="8"/>';
    const capacity =
      area === 4
        ? `${aluminum ? { C: 29, B1: 25, A: 20 }[wireExample.method] : { C: 37, B1: 32, A: 25 }[wireExample.method]} A · teaching estimate`
        : 'Not assessed for this area';
    return `<h3>Lighting feed</h3><div class="wire-property"><svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="18" fill="var(--soft)"/><circle cx="22" cy="22" r="11" fill="${aluminum ? '#99a5b3' : '#b7794b'}"/></svg><div><strong>${gauge} · ${area} mm²</strong><small>${material} conductor · ${symbol}</small></div></div><div class="wire-property"><svg viewBox="0 0 64 42" aria-hidden="true">${installationDrawing}</svg><div><strong>Method ${wireExample.method}</strong><small>${methods[wireExample.method]}</small></div></div><dl><dt>Physical length</dt><dd>${wireExample.length} m</dd><dt>Derating</dt><dd>1.00 · default</dd><dt>Model resistance</dt><dd>${resistance} Ω</dd><dt>Capacity</dt><dd>${capacity}</dd><dt>Size / material / method</dt><dd>Declared in preview</dd></dl><p class="notice">${area === 4 ? 'Capacity is a teaching estimate. Aluminium uses the existing copper-table approximation.' : 'No ampacity table covers this AWG-derived area. Resistance is still calculable.'}</p><p>Canvas colour identifies conductor role. Metal and installation are shown here with labelled diagrams.</p><button type="button" class="text-action" data-wire-configure>Edit wire properties →</button>`;
  };
  const inspectorContent = () => {
    $('#component-name').textContent = selected;
    $('#selection-kind').textContent = selected === 'Wire' ? 'SELECTED WIRE' : 'SELECTED COMPONENT';
    if (selected === 'Wire') return wireContent();
    const led = selected === 'LED bulb';
    if (activeInspectorTab === 'readings')
      return '<h3>Current calculation</h3><p>No calculation runs in this design preview. Production readings must match the current circuit.</p><dl><dt>Terminal voltage</dt><dd>Not calculated</dd><dt>Current</dt><dd>Not calculated</dd><dt>Input power</dt><dd>Not calculated</dd></dl>';
    if (activeInspectorTab === 'configure')
      return `<h3>Quick settings</h3><p>Basic edits remain here. Detailed electrical settings open the model window.</p><label>Label<input value="${selected}"></label><button type="button" class="primary" data-notice="success">Preview Apply</button><button type="button" class="text-action" data-open="model">Detailed model settings →</button>`;
    return `<h3>Selected instance</h3><p>${led ? 'LED driver · declared teaching profile' : 'Reference and model details follow the selected component in production.'}</p><dl><dt>Design voltage</dt><dd>${led ? '230 V AC' : 'See model'}</dd><dt>Electrical input</dt><dd>${led ? '9 W' : 'See model'}</dd><dt>Data source</dt><dd>Teaching profile</dd></dl><details><summary>ⓘ Technical specifications</summary><p>Show selected-instance values, terminals and model provenance here. Keep representative product guidance in a separate reference section.</p><button type="button" class="text-action" data-open="specs">Open full reference</button></details><button type="button" class="text-action" data-open="model">Detailed model settings →</button><p class="notice">${led ? 'Example: operating band is a declared teaching assumption. It is not a damage threshold.' : 'Show the exact missing rating or connection, with an action to its editor.'}</p>`;
  };
  const renderInspector = () => {
    $('#inspector-content').innerHTML = inspectorContent();
    $('#inspector-content').scrollTop = 0;
  };
  const select = (name) => {
    selected = name;
    renderInspector();
    $('#inspector').hidden = false;
    if (innerWidth <= 640) setConsole(false);
  };
  const readiness =
    '<p>Connections and declared ratings are checked before a run. Calculation and teaching-rule checks have separate results.</p><div class="check-grid"><div><small>CONNECTIONS</small><strong>Connected</strong></div><div><small>RATINGS</small><strong class="status-label">1 needs review</strong></div><div><small>CALCULATION</small><strong>Not run</strong></div></div><div class="finding"><div><strong>Contact supply suitability not declared</strong><p>Example finding: Switch S1 has no declared AC/DC contact suitability. Its contact model can still be calculated.</p></div><button type="button" data-focus-model>Review model</button></div><p class="notice">An open switch can be intentional. “Connected” does not mean that operation or installation compliance has passed.</p>';
  const views = {
    readiness: [
      'Circuit',
      'Supply & readiness',
      `<div class="model-grid"><label>Document supply<select><option>230 V AC · 50 Hz</option><option>12 V AC · 50 Hz</option><option>12 V DC</option></select></label><p>Illustrative supply selection. Production keeps its existing review-before-apply flow and separate independent sources.</p></div>${readiness}<div class="dialog-actions"><button type="button" data-open="checks">All circuit checks →</button></div>`,
    ],
    checks: [
      'Circuit',
      'Circuit checks',
      `${readiness}<div class="finding"><div><strong>Teaching rules · not run</strong><p>Group findings by Wiring, Ratings, Calculation and Teaching rules. Show the affected component, explanation and next action.</p></div><button type="button" data-run-check>Preview check</button></div><p>No percentage safety score. Unchecked items stay visible; reports become stale after circuit edits.</p>`,
    ],
    model: [
      'Selected component',
      'Detailed model settings',
      '<p>Conditional tabs contain only the controls relevant to the selected component. Arrangement remains in canvas actions.</p><nav class="tabs model-tabs" aria-label="Model sections"><button type="button" data-model-tab="electrical" aria-pressed="true">ϟ Electrical</button><button type="button" data-model-tab="behaviour" aria-pressed="false">◷ Behaviour</button><button type="button" data-model-tab="installation" aria-pressed="false">⌁ Installation</button></nav><div id="model-section"></div><div class="dialog-actions"><button type="button" data-close>Cancel</button><button type="button" class="primary" data-apply>Preview Apply</button></div>',
    ],
    specs: [
      'Reference',
      'Technical specifications',
      '<p>Selected instance data comes first. General reference text never silently substitutes for declared model ratings.</p><dl><dt>Selected example</dt><dd>LED bulb · 9 W</dd><dt>Design voltage</dt><dd>230 V AC</dd><dt>Source</dt><dd>Declared teaching profile</dd><dt>Maximum voltage</dt><dd>Not declared</dd></dl><details open><summary>Terminal reference</summary><p>Use the actual component port definitions for names and roles. Add authored wiring notes per family.</p></details><details><summary>Learning and product reference</summary><p>Representative information is labelled separately from simulated values. Missing content is named explicitly.</p></details>',
    ],
    catalogue: [
      'Component library',
      'Choose or learn about a component',
      `<p>Useful components remain discoverable when a rating needs review. Technical information is available before placement.</p><div class="catalogue-list">${partButtons()}</div><button type="button" class="text-action" data-open="specs">Example reference preview →</button>`,
    ],
  };
  const modelSections = {
    electrical:
      '<div class="model-grid"><label>Design voltage (V)<input type="number" value="230"></label><label>Input power (W)<input type="number" value="9"></label><label>Supply suitability<select><option>Single-phase AC · declared profile</option></select></label><label>Data basis<select><option>Teaching assumption</option><option>User declaration</option></select></label></div><p class="notice">Example LED fields. Contact, winding, source and motor ratings use their own relevant controls.</p>',
    behaviour:
      '<div class="model-grid"><label>Load law<select><option>Regulated input power</option></select></label><label>Operating band basis<input value="Declared teaching profile" readonly></label></div><p class="notice">Use the selected model’s existing operating band and limits. Coil, motor, timer and protection controls appear only where supported.</p>',
    installation:
      '<h3>Connections and installation</h3><p>Keep physical installation metadata separate from the electrical load law. Refer to the connected wire for its length, size and material.</p><dl><dt>Terminal labels</dt><dd>L · N</dd><dt>Installation data</dt><dd>Not declared</dd></dl>',
  };
  const openView = (id) => {
    const view = views[id];
    if (!view) return;
    $('#detail-eyebrow').textContent = view[0];
    $('#detail-title').textContent = view[1];
    $('#detail-content').innerHTML = view[2];
    if (id === 'model') $('#model-section').innerHTML = modelSections.electrical;
    if (!dialog.open) dialog.showModal();
  };
  document.addEventListener('click', (event) => {
    const node = event.target.closest('button');
    if (!node) return;
    if (node.dataset.notice) notify(node.dataset.notice);
    if (node.dataset.open) openView(node.dataset.open);
    if (node.dataset.select) {
      if (dialog.open) dialog.close();
      select(node.dataset.select);
    }
    if (node.dataset.inspectorTab) {
      activeInspectorTab = node.dataset.inspectorTab;
      document
        .querySelectorAll('[data-inspector-tab]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === node)));
      renderInspector();
    }
    if (node.hasAttribute('data-wire-configure')) {
      activeInspectorTab = 'configure';
      document
        .querySelectorAll('[data-inspector-tab]')
        .forEach((button) =>
          button.setAttribute('aria-pressed', String(button.dataset.inspectorTab === 'configure')),
        );
      renderInspector();
    }
    if (node.dataset.filter) {
      filter = node.dataset.filter;
      document
        .querySelectorAll('[data-filter]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === node)));
      renderLogs();
    }
    if (node.dataset.modelTab) {
      document
        .querySelectorAll('[data-model-tab]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === node)));
      $('#model-section').innerHTML = modelSections[node.dataset.modelTab];
    }
    if (node.hasAttribute('data-close')) dialog.close();
    if (node.hasAttribute('data-apply')) {
      dialog.close();
      notify('success');
    }
    if (node.hasAttribute('data-focus-model')) {
      selected = 'Switch';
      renderInspector();
      openView('model');
    }
    if (node.hasAttribute('data-run-check')) {
      dialog.close();
      notify('warning', [
        'Check complete · 1 rating to review',
        'Example result. Review the persistent finding in Circuit checks.',
      ]);
    }
    if (node.dataset.tool) {
      document
        .querySelectorAll('[data-tool]')
        .forEach((b) => b.classList.toggle('selected', b === node));
    }
    if (node.closest('.categories')) {
      document
        .querySelectorAll('.categories button')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === node)));
      $('#parts').innerHTML = partButtons();
    }
  });
  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'wire-example-form') return;
    event.preventDefault();
    const data = new FormData(event.target);
    wireExample = {
      size: data.get('size'),
      material: data.get('material'),
      method: data.get('method'),
      length: Number(data.get('length')),
    };
    activeInspectorTab = 'properties';
    document
      .querySelectorAll('[data-inspector-tab]')
      .forEach((button) =>
        button.setAttribute('aria-pressed', String(button.dataset.inspectorTab === 'properties')),
      );
    renderInspector();
    notify('success', [
      'Wire properties updated',
      'Preview only. The summary now shows the chosen size, metal and installation.',
    ]);
  });
  $('#close-dialog').onclick = () => dialog.close();
  $('#inspect').onclick = () => select(selected);
  $('#close-inspector').onclick = () => {
    $('#inspector').hidden = true;
  };
  $('#show-console').onclick = () => setConsole($('#console').hidden);
  $('#close-console').onclick = () => setConsole(false);
  $('#clear-console').onclick = () => {
    messages.length = 0;
    renderLogs();
  };
  $('#run').onclick = () =>
    notify('info', [
      'Run requested',
      'Preview only. Production reports the accepted calculation outcome.',
    ]);
  $('#theme').onclick = () => {
    const dark = document.body.classList.toggle('dark');
    $('#theme').textContent = dark ? 'Light theme' : 'Dark theme';
  };
  renderLogs();
  renderInspector();
})();
