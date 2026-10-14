(() => {
  const { cases, catalogue, states } = window.FaultDesignData;
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) =>
    String(value).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const state = {
    caseId: 'break',
    step: 0,
    playing: false,
    speed: 1,
    view: 'inside',
    tab: 'explain',
    inspectorOpen: true,
    active: false,
    capture: false,
    replaying: false,
    cleared: false,
    breaker: 'closed',
    damaged: false,
    stale: false,
    blocked: false,
    empty: false,
    terminal: false,
    compare: false,
    motion: true,
    filter: 'All',
    query: '',
    consoleFilter: 'All',
    consoleCleared: false,
    extraFault: false,
  };
  const history = [];
  const workspace = $('#workspace');
  const dialog = $('#dialog');
  let playbackTimer;
  let closeTimer;
  let toastTimer;
  let physicsFrame;
  let physicsEngine;
  let lastFocus;
  let dialogKind;
  let loose = { left: [428, 228], right: [480, 228] };
  const reduced = () => !state.motion || media.matches;
  const scene = () => cases[state.caseId];
  const snapshot = () =>
    JSON.stringify({
      active: state.active,
      cleared: state.cleared,
      breaker: state.breaker,
      damaged: state.damaged,
      extraFault: state.extraFault,
    });
  const remember = (label) => history.push({ label, before: snapshot() });

  function notify(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    toastTimer = setTimeout(() => {
      $('#toast').hidden = true;
    }, 3500);
  }

  function stopPhysics() {
    cancelAnimationFrame(physicsFrame);
    if (physicsEngine && window.Matter) {
      window.Matter.Composite.clear(physicsEngine.world, false);
      window.Matter.Engine.clear(physicsEngine);
    }
    physicsEngine = null;
    workspace.dataset.physicsBodies = '0';
  }

  function startPhysics() {
    stopPhysics();
    if (
      reduced() ||
      !state.playing ||
      state.compare ||
      state.view !== 'inside' ||
      document.hidden ||
      dialog.open ||
      state.caseId === 'short' ||
      state.step < 1 ||
      (state.caseId === 'overload' && state.step < 3) ||
      !window.Matter
    )
      return;
    const { Bodies, Composite, Constraint, Engine } = window.Matter;
    physicsEngine = Engine.create({ enableSleeping: true });
    physicsEngine.gravity.y = 0.2;
    const engine = physicsEngine;
    const left = Bodies.circle(...loose.left, 2, {
      frictionAir: 0.15,
      collisionFilter: { mask: 0 },
    });
    const right = Bodies.circle(...loose.right, 2, {
      frictionAir: 0.15,
      collisionFilter: { mask: 0 },
    });
    Composite.add(engine.world, [
      left,
      right,
      Constraint.create({
        pointA: { x: 400, y: 228 },
        bodyB: left,
        length: 30,
        stiffness: 0.25,
        damping: 0.2,
      }),
      Constraint.create({
        pointA: { x: 508, y: 228 },
        bodyB: right,
        length: 30,
        stiffness: 0.25,
        damping: 0.2,
      }),
    ]);
    workspace.dataset.physicsBodies = '2';
    let frames = 0;
    let last = 0;
    const loop = (now) => {
      if (engine !== physicsEngine || !state.playing || reduced() || document.hidden)
        return stopPhysics();
      if (now - last >= 1000 / 30) {
        last = now;
        Engine.update(engine, 1000 / 60);
        Engine.update(engine, 1000 / 60);
        const clamp = (n, base) => Math.max(base - 34, Math.min(base + 34, n));
        loose = {
          left: [clamp(left.position.x, 428), clamp(left.position.y, 228)],
          right: [clamp(right.position.x, 480), clamp(right.position.y, 228)],
        };
        $('#loose-left')?.setAttribute(
          'd',
          `M400 228 Q415 ${loose.left[1]} ${loose.left.join(' ')}`,
        );
        $('#loose-right')?.setAttribute(
          'd',
          `M508 228 Q493 ${loose.right[1]} ${loose.right.join(' ')}`,
        );
        if (++frames >= 60) return stopPhysics();
      }
      physicsFrame = requestAnimationFrame(loop);
    };
    physicsFrame = requestAnimationFrame(loop);
  }

  function pause() {
    clearTimeout(playbackTimer);
    state.playing = false;
    stopPhysics();
  }
  function invalidateCapture() {
    pause();
    state.capture = false;
    state.stale = true;
    state.replaying = false;
    state.compare = false;
  }
  function setStep(index) {
    state.step = Math.max(0, Math.min(5, index));
    paint();
  }
  function schedule() {
    clearTimeout(playbackTimer);
    if (!state.playing || document.hidden || dialog.open) return;
    playbackTimer = setTimeout(() => {
      if (state.step >= 5) {
        pause();
        paint();
        return;
      }
      setStep(state.step + 1);
      schedule();
    }, 1600 / state.speed);
  }
  function play() {
    if (!state.capture || state.stale || state.blocked || state.empty || !state.active) return;
    if (state.step === 5) {
      state.step = 0;
      state.replaying = true;
    }
    state.playing = true;
    paint();
    schedule();
  }
  function runSample() {
    if (state.blocked || state.empty || !state.stale) return;
    pause();
    state.capture = true;
    state.stale = false;
    state.replaying = state.active;
    state.step = 0;
    if (state.active && state.caseId === 'short') state.breaker = 'tripped';
    if (state.active && state.caseId === 'overload') state.damaged = true;
    paint();
    notify('Illustrative response ready · this preview does not run the electrical model');
  }
  function choose(id) {
    pause();
    Object.assign(state, {
      caseId: id,
      step: 0,
      active: false,
      capture: false,
      replaying: false,
      cleared: false,
      breaker: 'closed',
      damaged: false,
      stale: false,
      blocked: false,
      empty: false,
      terminal: false,
      compare: false,
      extraFault: false,
    });
    loose = { left: [428, 228], right: [480, 228] };
    history.length = 0;
    paint();
  }

  const device = (type, x, y, size = 55) =>
    `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="var(--ink)" stroke-width="1.5">${window.DeviceArtwork.device(type)}</svg>`;
  const targetArtwork = (type) =>
    type === 'cable'
      ? '<svg viewBox="0 0 48 48" role="img" aria-label="Copper cable"><path d="M5 24h38" stroke="#987452" stroke-width="13" stroke-linecap="round"/><path d="M7 20h34M7 24h34M7 28h34" stroke="#cc925c" stroke-width="1.8" stroke-linecap="round"/><path d="M5 24h38" stroke="#e8c18c" stroke-width=".8" stroke-dasharray="2 3"/></svg>'
      : `<svg viewBox="0 0 48 48" fill="none">${window.DeviceArtwork.device(type)}</svg>`;
  const text = (x, y, value, cls = 'svg-label', anchor = 'middle') =>
    `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(value)}</text>`;
  const flow = (d) =>
    `<path d="${d}" fill="none" stroke="var(--paper)" stroke-width="2" class="current-flow" opacity=".7"/>`;
  const wire = (d, colour = '#aa6a43', width = 9) =>
    `<path d="${d}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-linecap="round"/>`;

  function circuitDrawing(faultVisible, interrupted) {
    const broken = state.caseId !== 'short' && faultVisible;
    const bridge = state.caseId === 'short' && faultVisible;
    const closed = !interrupted;
    return `<rect x="48" y="50" width="804" height="280" rx="19" fill="var(--paper)" stroke="var(--line)"/>
      ${wire('M155 175H300')} ${wire(broken ? 'M360 175H470M495 175H720' : 'M360 175H720')}
      ${wire('M155 235H745V175', '#6084b7', 8)}
      ${device('live-terminal', 92, 135, 66)} ${device('mcb', 294, 141, 64)} ${device('bulb-incandescent', 715, 134, 67)}
      ${bridge ? `${wire('M520 175V235', '#d49352', 6)}<circle cx="520" cy="205" r="24" fill="#e9b575" opacity=".14"/>` : ''}
      ${!closed ? '<rect x="315" y="164" width="23" height="23" fill="var(--paper)"/><path d="M315 175l23-15" stroke="var(--warm)" stroke-width="4"/>' : ''}
      ${closed && !broken ? flow('M170 175H290M365 175H710') : ''}
      ${text(125, 275, 'Source')} ${text(327, 275, 'Q1 · protection')} ${text(580, 145, 'W1 · branch')} ${text(750, 275, 'L1 · lamp')}
      ${text(450, 370, 'Circuit view keeps the same devices, connections and fault target.', 'svg-small')}`;
  }

  function cableDrawing(faultVisible, interrupted) {
    const overload = state.caseId === 'overload';
    const broken = faultVisible && (!overload || state.step >= 3);
    const warm = overload && faultVisible;
    const copper = warm ? '#c68442' : '#bc8354';
    const jacket = warm ? '#a66b45' : '#967053';
    const leftEnd = broken ? 410 : 470;
    const rightStart = broken ? 505 : 465;
    return `${text(450, 55, state.terminal ? 'Terminal L · exact connection' : 'W1 · inside the conductor', 'svg-title svg-strong')}
      <line x1="450" y1="67" x2="450" y2="112" stroke="var(--line)"/>
      ${device('live-terminal', 64, 187, 68)} ${device('bulb-incandescent', 770, 187, 68)}
      ${wire('M122 228H238')} ${wire('M684 228H785')}
      <rect x="235" y="199" width="${leftEnd - 235}" height="58" rx="19" fill="${jacket}"/>
      <rect x="${rightStart}" y="199" width="${685 - rightStart}" height="58" rx="19" fill="${jacket}"/>
      <path d="M250 208H${leftEnd - 15}M${rightStart + 15} 208H670" stroke="#ffffff35" stroke-width="3" stroke-linecap="round"/>
      ${[216, 222, 228, 234, 240].map((y) => wire(`M245 ${y}H${leftEnd + 10}M${rightStart - 10} ${y}H675`, copper, 3)).join('')}
      ${broken ? `${wire(`M400 228 Q415 ${loose.left[1]} ${loose.left.join(' ')}`, copper, 5).replace('<path ', '<path id="loose-left" ')}${wire(`M508 228 Q493 ${loose.right[1]} ${loose.right.join(' ')}`, copper, 5).replace('<path ', '<path id="loose-right" ')}<path d="M455 182v18m0 56v18" stroke="var(--warm)" stroke-width="2" stroke-dasharray="3 3"/>` : ''}
      ${!interrupted && !broken ? flow('M145 228H755') : ''}
      ${warm && !broken ? '<rect x="268" y="178" width="370" height="97" rx="48" fill="#c57b36" opacity=".08"/>' : ''}
      <g data-part="target" role="button" tabindex="0" aria-label="Inspect the sample fault target"><rect class="part-highlight" x="245" y="160" width="420" height="130" rx="20" fill="var(--accent)"/><rect x="246" y="163" width="418" height="123" rx="20" fill="transparent"/></g>
      ${text(112, 310, 'Supply side', 'svg-strong svg-label')} ${text(112, 332, 'Potential can remain', 'svg-small')}
      ${text(803, 310, interrupted || broken ? 'Lamp off' : 'Lamp supplied', 'svg-strong svg-label')}
      ${text(450, 140, broken ? 'Separated conducting path' : warm ? 'Illustrative stress progression' : 'Continuous copper strands', 'svg-small')}
      ${text(450, 354, broken ? 'Visible separation · static fallback retains the same state' : 'Representative insulation and strands · not a manufacturer drawing', 'svg-small')}`;
  }

  function breakerDrawing(faultVisible, interrupted) {
    const open = state.compare
      ? false
      : state.replaying
        ? state.step >= 3
        : state.breaker !== 'closed';
    return `${text(450, 49, 'Q1 · inside the protective device', 'svg-title svg-strong')}
      <rect x="266" y="87" width="280" height="235" rx="18" fill="var(--soft)" stroke="var(--line)"/>
      <rect x="279" y="100" width="254" height="209" rx="12" fill="var(--paper)" stroke="var(--line)"/>
      ${wire('M126 228H335')} ${wire('M445 228H774')}
      ${wire('M310 228V166l10-9 10 18 10-18 10 18 10-18 10 18 10-9V228', '#aa6a43', 5)}
      <circle cx="350" cy="228" r="7" fill="#b88854"/><circle cx="438" cy="228" r="7" fill="#b88854"/>
      <path d="M350 228L${open ? '416 179' : '438 228'}" stroke="#b88854" stroke-width="7" stroke-linecap="round"/>
      <path d="M350 228L395 268" stroke="var(--muted)" stroke-width="3"/><rect x="381" y="260" width="40" height="25" rx="7" fill="${open ? 'var(--warm)' : 'var(--ink)'}"/>
      ${faultVisible ? `${wire('M637 228V310', '#c48a4e', 6)}<g class="spark-accent"><circle cx="637" cy="269" r="25" fill="#d5a268" opacity=".10"/><path d="M629 245l12 15-11 8 15 13" fill="none" stroke="#d1a05f" stroke-width="2"/></g>` : ''}
      ${wire('M124 310H802V245', '#6084b7', 7)}
      ${device('live-terminal', 65, 192, 63)} ${device('bulb-incandescent', 770, 192, 63)}
      ${!open ? flow('M146 228H305M451 228H766') : ''}
      ${text(401, 129, 'Declared protection model', 'svg-small')}
      ${text(402, 342, open ? 'Contacts open · latch retained' : 'Contacts closed', 'svg-strong svg-label')}
      ${text(636, 351, faultVisible ? 'J1 · introduced bridge' : 'J1 · cause cleared', 'svg-small')}
      ${text(104, 367, 'Source side', 'svg-small')} ${text(799, 367, interrupted || open ? 'Branch interrupted' : 'Branch supplied', 'svg-small')}
      <g data-part="target" role="button" tabindex="0" aria-label="Inspect the protective device"><rect class="part-highlight" x="269" y="91" width="273" height="226" rx="17"/></g>`;
  }

  function conditions() {
    const visible =
      !state.compare && ((state.active && state.step > 0) || (state.replaying && state.step > 0));
    const damageVisible =
      state.replaying && state.caseId === 'overload' ? state.step >= 3 : state.damaged;
    const interrupted =
      !state.compare &&
      (state.caseId === 'short'
        ? state.replaying
          ? state.step >= 3
          : state.breaker !== 'closed'
        : (visible && (state.caseId === 'break' || state.step >= 3)) || damageVisible);
    return { visible, interrupted };
  }

  function readings() {
    const { visible, interrupted } = conditions();
    return `<h3>${state.stale ? 'Await a fresh response' : state.compare ? 'Healthy reference' : 'Cause and response'}</h3><p>Compare the source, affected branch and protection separately.</p><dl class="reading-list">
      ${[
        ['Source', state.stale ? 'Unavailable' : 'Present'],
        ['Branch path', state.stale ? 'Unavailable' : interrupted ? 'Interrupted' : 'Conducting'],
        ['Load response', state.stale ? 'Unavailable' : interrupted ? 'Not supplied' : 'Supplied'],
        [
          'Protection',
          state.stale
            ? 'Unavailable'
            : state.compare && state.caseId === 'short'
              ? 'Closed · healthy reference'
              : state.caseId === 'short'
                ? state.replaying
                  ? state.step >= 3
                    ? 'Tripped · captured stage'
                    : 'Closed · before trip'
                  : state.breaker === 'tripped'
                    ? 'Tripped · latched'
                    : state.breaker === 'off'
                      ? 'Reset · OFF'
                      : 'Closed'
                : 'No trip implied',
        ],
        [
          'Damage',
          state.compare
            ? 'None · healthy reference'
            : state.replaying && state.caseId === 'overload'
              ? state.step >= 3
                ? 'Budget crossed · captured stage'
                : 'None before budget'
              : state.damaged
                ? 'Replacement needed'
                : 'None implied',
        ],
        [
          'Injected cause',
          state.compare
            ? 'None · healthy reference'
            : visible && state.caseId !== 'overload'
              ? 'Present in view'
              : state.active && state.caseId !== 'overload'
                ? 'Introduced'
                : 'None',
        ],
      ]
        .map(
          ([key, value]) =>
            `<div class="reading-row"><dt>${key}</dt><dd class="${interrupted ? 'warm' : ''}">${value}</dd></div>`,
        )
        .join('')}
      </dl><p class="sample-note">These are qualitative design fixtures. Production readings will use accepted current results and retain unavailable or unassessed values.</p>`;
  }

  function repairContent() {
    const canRepair = state.caseId === 'overload' ? state.damaged : state.active;
    return `<h3>${esc(scene().repair)}</h3><p>${state.caseId === 'short' ? 'Treat the injected cause, trip latch and damage as separate states.' : state.caseId === 'overload' ? 'A cleared cause does not undo irreversible damage. Replacement preserves unrelated faults and connections.' : 'Restore the affected connection, then verify the circuit response. The source and device ratings remain unchanged.'}</p>
      ${state.stale ? '<div class="warning-state">Verification waits for fresh results. Editing the circuit invalidated the captured response.</div>' : ''}
      <button type="button" data-action="repair" ${state.blocked || !canRepair ? 'disabled' : ''}>${esc(scene().action)}</button>
      ${state.caseId === 'short' ? `<button type="button" data-action="reset" ${state.breaker !== 'tripped' || state.blocked ? 'disabled' : ''}>Reset breaker to OFF</button><button type="button" data-action="operate" ${state.breaker !== 'off' || state.active || state.blocked ? 'disabled' : ''}>Switch breaker ON</button>` : ''}
      <button type="button" class="quiet" data-action="history">Review edit history</button><h4>After the edit</h4><p>${state.cleared ? (state.breaker === 'tripped' ? 'Cause cleared. The breaker remains tripped until a separate reset.' : state.breaker === 'off' ? 'Breaker reset to OFF. Switching ON remains a deliberate operation.' : 'The sample repair is applied; its Undo restores the previous fault state.') : 'Each repair is one deliberate operation. A replay never performs a repair or clears a live fault.'}</p>`;
  }

  function explainContent() {
    if (state.empty)
      return '<h3>Select a target</h3><p>Pick a component, a conductor or one named terminal. The library will show applicable faults and why other choices are unavailable.</p><button type="button" data-action="select-target">Select sample conductor</button>';
    if (state.blocked)
      return '<h3>Editing is unavailable</h3><p>This review state represents a read-only circuit or a lost entitlement. Existing work and its original backup remain available.</p><button type="button" data-action="original-export">Export original circuit</button><button type="button" data-action="basic-copy">Create a basic copy</button><p class="sample-note">Design actions only; this prototype does not access saved user circuits.</p>';
    if (state.stale)
      return '<h3>The circuit has changed</h3><p>The previous capture no longer describes the current circuit. Replay is paused and consequence claims are withheld.</p><button type="button" data-action="refresh">Refresh sample response</button><div class="callout">A fresh response is needed before this view can explain a new trip or damage state.</div>';
    return `<h3>${esc(state.compare ? 'Healthy reference' : state.cleared ? 'Separate the cause from its consequences' : scene().steps[state.step][1])}</h3><p>${esc(scene().why)}</p><div class="callout">${esc(state.replaying ? 'You are viewing the stored demonstration. Replay does not change the current circuit.' : state.cleared ? (state.breaker === 'tripped' ? 'The bridge is gone. The protective device is still latched.' : state.damaged ? 'Damage remains until a separate replacement.' : 'The sample edit restored the affected state.') : scene().steps[state.step][2])}</div><h4>What to inspect</h4><ul><li>The exact affected connection and conductor role.</li><li>The branch response, not just the appearance of the device.</li><li>Protection and permanent damage as separate outcomes.</li></ul><button type="button" class="quiet" data-tab="readings">Compare response →</button>`;
  }

  function paint() {
    stopPhysics();
    const currentScene = scene();
    workspace.dataset.paused = String(!state.playing);
    workspace.dataset.inspectorOpen = String(state.inspectorOpen);
    workspace.dataset.motion = reduced() ? 'off' : 'subtle';
    workspace.dataset.case = state.caseId;
    workspace.dataset.step = String(state.step);
    workspace.dataset.faultActive = String(state.active);
    workspace.dataset.breaker = state.breaker;
    $('#case-select').value = state.caseId;
    $('#status-dot').classList.toggle(
      'fault',
      state.active || state.damaged || state.breaker === 'tripped',
    );
    $('#scene-status').textContent = state.empty
      ? 'No selected target'
      : state.stale
        ? 'Response out of date'
        : state.blocked
          ? 'Read-only circuit'
          : state.compare
            ? 'Healthy reference · current state kept'
            : state.replaying
              ? 'Stored demonstration · replay'
              : state.damaged
                ? 'Saved damage · replacement needed'
                : state.breaker === 'tripped'
                  ? 'Protection tripped · latch retained'
                  : state.active
                    ? state.caseId === 'overload'
                      ? 'Stress demonstration'
                      : 'Fault introduced'
                    : state.breaker === 'off'
                      ? 'Protection reset · OFF'
                      : state.cleared
                        ? 'Cause repaired'
                        : 'Healthy circuit';
    $('#target-summary').textContent = state.empty
      ? 'Choose a target'
      : state.terminal
        ? 'J1 · named terminal L'
        : currentScene.target;
    $('#target-name').textContent = state.empty
      ? 'No target selected'
      : state.terminal
        ? 'Terminal L · J1'
        : currentScene.targetName;
    $('#target-kind').textContent = state.empty
      ? 'Component, wire or terminal'
      : state.terminal
        ? 'Port · exact connection'
        : currentScene.targetKind;
    $('#target-art').innerHTML = targetArtwork(currentScene.art);
    $('#console-count').textContent = state.consoleCleared ? '0' : state.stale ? '2' : '1';
    const { visible, interrupted } = conditions();
    const svg = $('#scene-svg');
    svg.setAttribute(
      'aria-label',
      `${currentScene.label}: ${state.compare ? 'healthy reference' : currentScene.steps[state.step][1]}`,
    );
    svg.innerHTML = state.empty
      ? text(450, 210, 'Choose a component, conductor or terminal.', 'svg-title svg-strong')
      : state.view === 'circuit'
        ? circuitDrawing(visible, interrupted)
        : state.caseId === 'short'
          ? breakerDrawing(visible, interrupted)
          : cableDrawing(visible, interrupted);
    $('#step-number').textContent = String(state.step + 1).padStart(2, '0');
    $('#step-title').textContent = state.empty
      ? 'Choose the target first'
      : currentScene.steps[state.step][1];
    $('#step-summary').textContent = state.empty
      ? 'The fault library follows the selected target and its declared model.'
      : currentScene.steps[state.step][2];
    $('#steps').innerHTML = currentScene.steps
      .map(
        ([label], i) =>
          `<button type="button" data-step="${i}" class="${i === state.step ? 'current' : i < state.step ? 'past' : ''}" aria-current="${i === state.step ? 'step' : 'false'}" ${!state.capture || state.stale || state.blocked || state.empty || !state.active ? 'disabled' : ''}>${esc(label)}</button>`,
      )
      .join('');
    $('#introduce').textContent = state.active
      ? state.caseId === 'overload'
        ? state.capture
          ? 'Stress response captured'
          : 'Stress model applied'
        : state.capture
          ? 'Fault response captured'
          : 'Fault applied'
      : state.caseId === 'overload'
        ? 'Run stress demonstration'
        : 'Introduce fault';
    $('#introduce').disabled =
      state.active || state.blocked || state.stale || state.empty || state.damaged;
    $('#run-sample').disabled = !state.stale || state.blocked || state.empty;
    $('#play').innerHTML = state.playing ? 'Ⅱ <span>Pause</span>' : '▶ <span>Play</span>';
    $('#play').setAttribute('aria-label', state.playing ? 'Pause sequence' : 'Play sequence');
    for (const action of ['play', 'previous', 'next', 'replay'])
      $(`[data-action="${action}"]`).disabled =
        !state.capture || state.stale || state.blocked || state.empty || !state.active;
    $('#playback-label').textContent =
      `${state.playing ? 'Playing' : 'Paused'} · ${state.step + 1} / 6`;
    $('#fault-count').textContent = String(
      (state.active && currentScene.fault ? 1 : 0) + Number(state.extraFault),
    );
    document
      .querySelectorAll('[data-view]')
      .forEach((button) =>
        button.setAttribute('aria-pressed', String(state.view === button.dataset.view)),
      );
    document.querySelectorAll('.evidence-tabs [data-tab]').forEach((button) => {
      const active = state.tab === button.dataset.tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    $('#evidence-content').setAttribute('aria-labelledby', `tab-${state.tab}`);
    $('#fault-inspector').inert = !state.inspectorOpen;
    $('#fault-inspector').setAttribute('aria-hidden', String(!state.inspectorOpen));
    $('[data-action="inspector"]').setAttribute('aria-expanded', String(state.inspectorOpen));
    $('#evidence-content').innerHTML =
      state.tab === 'readings'
        ? readings()
        : state.tab === 'repair'
          ? repairContent()
          : explainContent();
    $('#coverage-pill').textContent = state.stale
      ? 'Fresh response required'
      : state.blocked
        ? 'Editing blocked'
        : 'Model scope shown';
    $('[data-action="compare"]').setAttribute('aria-pressed', String(state.compare));
    $('[data-action="compare"]').disabled =
      !state.capture || state.stale || state.blocked || state.empty;
    $('[data-action="motion"]').setAttribute('aria-pressed', String(!state.motion));
    startPhysics();
  }

  function openWindow(title, content, footer = '', eyebrow = 'FAULT LAB', kind = 'other') {
    pause();
    paint();
    clearTimeout(closeTimer);
    if (!dialog.open) lastFocus = document.activeElement;
    dialogKind = kind;
    dialog.classList.remove('closing');
    dialog.removeAttribute('aria-hidden');
    dialog.inert = false;
    $('#dialog-title').textContent = title;
    $('#dialog-eyebrow').textContent = eyebrow;
    $('#dialog-content').innerHTML = content;
    $('#dialog-footer').innerHTML = footer;
    if (!dialog.open) dialog.showModal();
    requestAnimationFrame(() => {
      (
        dialog.querySelector('input, select, button:not(.close-button)') ||
        dialog.querySelector('.close-button')
      ).focus();
    });
  }
  function closeWindow(after) {
    clearTimeout(closeTimer);
    dialog.classList.add('closing');
    dialog.inert = true;
    dialog.setAttribute('aria-hidden', 'true');
    closeTimer = setTimeout(
      () => {
        dialog.close();
        dialog.classList.remove('closing');
        dialog.inert = false;
        dialog.removeAttribute('aria-hidden');
        if (lastFocus?.isConnected) lastFocus.focus();
        if (after) after();
      },
      reduced() ? 0 : 160,
    );
  }

  const button = (label, action, primary = false) =>
    `<button type="button" data-action="${action}" class="${primary ? 'primary' : ''}">${label}</button>`;
  function draft() {
    openWindow(
      state.caseId === 'overload' ? 'Configure the stress demonstration' : 'Introduce this fault?',
      `<p>Review the exact target before applying. Cancelling leaves the sample circuit unchanged.</p><div class="draft-fields"><label>Target<input value="${esc(state.terminal ? 'J1 · terminal L' : scene().target)}" readonly/></label><label>Fault / condition<input value="${esc(scene().label)}" readonly/></label></div><div class="warning-state"><strong>Model scope</strong><p>${esc(scene().scope)}</p></div><p class="sample-note">The standalone design uses illustrative states. It does not calculate a fault current or a trip time.</p>`,
      button('Cancel', 'close-dialog') + button('Apply sample edit', 'apply', true),
      'REVIEW THE CHANGE',
      'draft',
    );
  }

  function showCatalogue() {
    state.filter = 'All';
    state.query = '';
    openWindow(
      'Choose a fault',
      '<p>Select by the affected connection. Coverage remains visible even when a visual demonstration is available.</p><input id="fault-search" class="search-field" placeholder="Search faults or conductor roles" aria-label="Search faults"/><div class="filter-row" id="filters"></div><div class="fault-grid" id="fault-grid"></div>',
      '',
      'FAULT LIBRARY · 14 REGISTRY TYPES',
      'catalogue',
    );
    filterCatalogue();
  }
  function filterCatalogue() {
    $('#filters').innerHTML = ['All', 'Conductor', 'Polarity', 'Leakage', 'Protection']
      .map(
        (group) =>
          `<button type="button" data-filter="${group}" aria-pressed="${state.filter === group}">${group}</button>`,
      )
      .join('');
    const matches = catalogue.filter(
      (entry) =>
        (state.filter === 'All' || entry[2] === state.filter) &&
        entry.slice(0, 5).join(' ').toLowerCase().includes(state.query.toLowerCase()),
    );
    $('#fault-grid').innerHTML = matches.length
      ? matches
          .map(
            ([id, label, category, description, coverage, demo]) =>
              `<button type="button" class="fault-choice" data-fault="${id}" data-demo="${demo || ''}"><span class="tiny-label ${coverage === 'Unassessed' ? 'not-assessed' : ''}">${esc(category)} · ${esc(coverage)}</span><strong>${esc(label)}</strong><span>${esc(description)}</span><span>${demo ? 'Explore the sequence →' : 'Review target and model scope →'}</span></button>`,
          )
          .join('')
      : '<p>No matching faults. Try a conductor role or a shorter search.</p>';
  }

  function showFaults() {
    const entries = [];
    if (state.active && scene().fault)
      entries.push(
        `<li><div><strong>${esc(scene().label)}</strong><small>${esc(scene().target)}</small></div><div class="row-actions">${button('Focus', 'focus')}${button('Replay', 'replay-fault')}${button('Clear', 'clear')}</div></li>`,
      );
    if (state.extraFault)
      entries.push(
        `<li><div><strong>Disconnected terminal</strong><small>J2 · terminal N · separate sample target</small></div><div class="row-actions">${button('Focus', 'focus-extra')}${button('Clear', 'clear-extra')}</div></li>`,
      );
    openWindow(
      'Active faults',
      entries.length
        ? `<ul class="flat-list">${entries.join('')}</ul><p>Clear removes the selected injected cause. Protection latches and permanent damage are preserved.</p>`
        : '<div class="empty-state"><h3>No injected faults</h3><p>Derived overload and saved damage are separate states. Choose a target to introduce a fault.</p></div>',
      entries.length
        ? button('Clear all injected causes', 'clear-all')
        : button('Browse library', 'catalogue'),
      'CURRENT CIRCUIT',
      'faults',
    );
  }

  function historyWindow() {
    openWindow(
      'Edit history',
      history.length
        ? `<ul class="flat-list">${history.map((entry, i) => `<li><div><strong>${esc(entry.label)}</strong><small>Sample edit ${i + 1} · independent of playback</small></div></li>`).join('')}</ul><p>Undo restores the last sample edit, not an unrelated timeline stage.</p>`
        : '<div class="empty-state"><h3>No edits yet</h3><p>Introduce a fault, clear its cause, reset protection or replace a damaged item to see separate edits.</p></div>',
      history.length ? button('Undo last edit', 'undo', true) : '',
      'TRANSACTION HISTORY',
      'history',
    );
  }

  function modelWindow() {
    openWindow(
      'What this model assesses',
      `<div class="dialog-grid"><section><h3>Electrical response</h3><p>${esc(scene().scope)}</p></section><section><h3>Visual explanation</h3><p>Cutaway geometry, loose ends and contact motion explain a state. Physical movement does not alter saved electrical connections.</p></section><section><h3>Available evidence</h3><p>Implementation must use accepted current source/branch results, declared model events and persisted damage. Unknown values remain unavailable.</p></section><section><h3>Limits</h3><p>Material temperature, flame propagation, arc energy and real manufacturer mechanics require separate validated models.</p></section></div><p>This design retains a visible model-scope entry on every case. All 14 current fault types remain covered by the catalogue, including unassessed types.</p>`,
      button('Understood', 'close-dialog'),
      'EVIDENCE & LIMITS',
      'details',
    );
  }

  function referenceWindow() {
    const image = scene().photo
      ? `<img class="reference-image" src="../../../src/assets/images/${esc(scene().photo)}" alt="${esc(scene().photoLabel)}"/><p class="photo-caption">${esc(scene().photoLabel)}</p>`
      : '<div class="photo-unavailable"><strong>No direct product photo</strong><span>The model target is a cable segment.</span></div>';
    openWindow(
      'Representative hardware',
      `${image}<p>${esc(scene().photoNote)}</p><p class="sample-note">The cutaway is an explanation of the selected model target. A related hardware photo does not represent the exact faulted item.</p>`,
      button('Close reference', 'close-dialog'),
      'REFERENCE PHOTO',
      'photo',
    );
  }

  function consoleWindow() {
    const entries = state.consoleCleared
      ? []
      : [
          ...(state.stale
            ? [
                {
                  level: 'Error',
                  title: 'Captured response is out of date',
                  detail:
                    'Circuit edits require a fresh accepted response before playback or consequence claims.',
                  target: 'W1 · sample target',
                },
              ]
            : []),
          {
            level: 'Warning',
            title: 'Arc-fault detection is unassessed',
            detail: 'A visual arc does not establish a supported detection result.',
            target: 'Model coverage',
          },
          {
            level: 'Info',
            title: 'Playback is presentation only',
            detail: 'Sequence speed does not change protection timing or circuit state.',
            target: 'Fault Lab timeline',
          },
        ];
    const visible = entries.filter(
      (entry) => state.consoleFilter === 'All' || entry.level === state.consoleFilter,
    );
    const counts = ['Error', 'Warning', 'Info'].map(
      (level) => `${level} ${entries.filter((entry) => entry.level === level).length}`,
    );
    openWindow(
      'Console',
      `<p class="sample-note">Illustrative Console entries · sample only, not live simulator output.</p><div class="console-counts" role="group" aria-label="Filter console messages">${['All', 'Error', 'Warning', 'Info'].map((level, index) => `<button type="button" data-severity="${level}" aria-pressed="${state.consoleFilter === level}">${index === 0 ? `All ${entries.length}` : counts[index - 1]}</button>`).join('')}</div>${visible.length ? `<ul class="console-list">${visible.map((entry) => `<li class="console-${entry.level.toLowerCase()}"><span class="console-level">${entry.level}</span><div><strong>${esc(entry.title)}</strong><p>${esc(entry.detail)}</p><small>${esc(entry.target)}</small></div>${entry.level === 'Error' ? button('Review', 'console-review') : ''}</li>`).join('')}</ul>` : '<div class="empty-state"><h3>No messages</h3><p>There are no messages in this sample view.</p></div>'}`,
      `${button('Clear messages', 'console-clear')}${state.consoleCleared ? button('Restore sample messages', 'console-restore') : ''}`,
      'ERRORS · WARNINGS · INFORMATION',
      'console',
    );
  }

  function stateWindow() {
    openWindow(
      'Review the complete experience',
      `<p>Jump to a workflow or edge state. These controls change only this standalone sample.</p><div class="state-grid">${states.map(([id, title, detail]) => `<button type="button" data-state="${id}">${esc(title)}<small>${esc(detail)}</small></button>`).join('')}</div><div class="review-links"><a href="../../../docs/plans/FAULT_LAB_REDESIGN_PLAN.md">Phase plan</a><a href="SCREENS.md">Screen inventory</a><a href="DIAGNOSIS_RETIREMENT_REVIEW.md">Retirement scope</a></div>`,
      '',
      'DESIGN REVIEW · 21 STATES',
      'states',
    );
  }

  function applyState(id) {
    closeWindow(() => {
      if (['break', 'short', 'overload', 'healthy'].includes(id)) {
        choose(id === 'healthy' ? 'break' : id);
        if (id !== 'healthy') {
          state.active = true;
          state.capture = true;
          state.replaying = id !== 'break';
          if (id === 'short') state.breaker = 'tripped';
          if (id === 'overload') state.damaged = true;
          setStep(id === 'break' ? 3 : 4);
        }
        return;
      }
      if (id === 'empty') {
        choose('break');
        state.empty = true;
        state.tab = 'explain';
        paint();
      } else if (id === 'terminal') {
        choose('break');
        state.terminal = true;
        paint();
        draft();
      } else if (id === 'catalogue') showCatalogue();
      else if (id === 'draft') {
        choose('break');
        draft();
      } else if (id === 'paused') {
        choose('break');
        state.active = true;
        state.capture = true;
        setStep(2);
      } else if (id === 'readings') {
        state.tab = 'readings';
        paint();
      } else if (id === 'repair') {
        choose('short');
        state.active = true;
        state.capture = true;
        state.breaker = 'tripped';
        state.tab = 'repair';
        setStep(4);
      } else if (id === 'multiple') {
        choose('break');
        state.active = true;
        state.capture = true;
        state.extraFault = true;
        setStep(3);
        showFaults();
      } else if (id === 'stale') {
        choose('break');
        state.active = true;
        state.stale = true;
        state.tab = 'explain';
        paint();
      } else if (id === 'blocked') {
        state.blocked = true;
        state.tab = 'explain';
        paint();
      } else if (id === 'unsupported') unsupported('arc-fault');
      else if (id === 'history') historyWindow();
      else if (id === 'console') consoleWindow();
      else if (id === 'settings') settingsWindow();
      else if (id === 'leave') leaveWindow();
      else if (id === 'photo') referenceWindow();
      else if (id === 'help') helpWindow();
    });
  }

  function unsupported(id) {
    const entry = catalogue.find((item) => item[0] === id);
    openWindow(
      entry[1],
      `<div class="warning-state"><strong>${esc(entry[4])}</strong><p>${esc(entry[3])}</p></div><p>The catalogue keeps the target requirements and coverage visible. This prototype has full sequences for the two initial fault flows and the damage-budget flow; additional sequences require their own model/visual review.</p><p>A dramatic animation cannot establish an assessed electrical outcome.</p>`,
      button('Back to library', 'catalogue'),
      'TARGET & COVERAGE',
      'unsupported',
    );
  }
  function settingsWindow() {
    openWindow(
      'Animation preferences',
      `<div class="dialog-grid"><section><h3>Interface motion</h3><p>Subtle entry and retained exit. Operating-system reduced motion always takes precedence.</p><button type="button" data-action="motion">${state.motion ? 'Reduce motion' : 'Enable subtle motion'}</button></section><section><h3>Detailed effects</h3><p>Physical movement follows the displayed state. Static separation, contact position and labels remain when motion is off.</p></section></div><p>Pause, hidden-page suspension and disposal stop decorative physics. Presentation speed leaves electrical model parameters untouched.</p>`,
      button('Done', 'close-dialog'),
      'DISPLAY PREFERENCES',
      'settings',
    );
  }
  function leaveWindow() {
    openWindow(
      'Leave Fault Lab?',
      '<p>Stop playback before returning to the circuit. Keep the current sample edits, or explicitly restore the snapshot from before the demonstration.</p>',
      button('Stay here', 'close-dialog') +
        button('Restore sample snapshot', 'restore') +
        button('Keep edits & return', 'keep', true),
      'PRESERVE YOUR CIRCUIT',
      'leave',
    );
  }
  function helpWindow() {
    openWindow(
      'Explore a fault',
      '<div class="dialog-grid"><section><h3>1 · Choose the connection</h3><p>Select the component, wire or exact terminal, then review applicable faults.</p></section><section><h3>2 · Follow the response</h3><p>Pause or inspect a stage. Switch between circuit and cutaway views without losing context.</p></section><section><h3>3 · Read the evidence</h3><p>Compare source and branch states. Unsupported or stale results stay explicit.</p></section><section><h3>4 · Put it right</h3><p>Clear the cause, reset protection or replace damage as separate edits. Verify afterwards.</p></section></div>',
      button('Start exploring', 'close-dialog', true),
      'ONE COMPLETE WORKFLOW',
      'help',
    );
  }

  function clearCause() {
    remember('Clear injected cause');
    invalidateCapture();
    state.active = false;
    state.cleared = true;
    state.tab = 'repair';
    paint();
    notify(
      state.breaker === 'tripped'
        ? 'Cause cleared · breaker latch retained'
        : state.damaged
          ? 'Cause cleared · damage retained'
          : 'Injected cause cleared',
    );
  }
  const actions = {
    states: stateWindow,
    inspector: () => {
      state.inspectorOpen = !state.inspectorOpen;
      paint();
    },
    console: consoleWindow,
    'console-clear': () => {
      state.consoleCleared = true;
      consoleWindow();
    },
    'console-restore': () => {
      state.consoleCleared = false;
      state.consoleFilter = 'All';
      consoleWindow();
    },
    'console-review': () => {
      closeWindow(() => {
        invalidateCapture();
        state.tab = 'explain';
        paint();
      });
    },
    catalogue: showCatalogue,
    faults: showFaults,
    history: historyWindow,
    details: modelWindow,
    reference: referenceWindow,
    introduce: draft,
    'close-dialog': () => closeWindow(),
    apply: () =>
      closeWindow(() => {
        remember(
          state.caseId === 'overload' ? 'Start declared stress demonstration' : 'Introduce fault',
        );
        state.active = true;
        state.capture = false;
        state.cleared = false;
        state.replaying = false;
        state.stale = true;
        state.step = 0;
        paint();
        notify('Sample edit applied · run for a response');
      }),
    run: runSample,
    play: () => {
      if (state.playing) {
        pause();
        paint();
      } else play();
    },
    previous: () => {
      pause();
      setStep(state.step - 1);
    },
    next: () => {
      pause();
      setStep(state.step + 1);
    },
    replay: () => {
      pause();
      state.replaying = true;
      state.step = 0;
      play();
    },
    'replay-fault': () =>
      closeWindow(() => {
        state.replaying = true;
        state.step = 0;
        play();
      }),
    compare: () => {
      pause();
      state.compare = !state.compare;
      paint();
    },
    repair: () => {
      if (state.blocked) return;
      if (state.caseId === 'short') clearCause();
      else {
        remember(
          state.caseId === 'overload' ? 'Replace damaged sample cable' : 'Restore sample conductor',
        );
        pause();
        state.active = false;
        state.damaged = false;
        state.cleared = true;
        invalidateCapture();
        state.tab = 'repair';
        paint();
        notify('Sample repair applied · one Undo');
      }
    },
    reset: () => {
      remember('Reset breaker to OFF');
      invalidateCapture();
      state.breaker = 'off';
      paint();
      notify('Reset to OFF · switching ON is separate');
    },
    operate: () => {
      remember('Switch breaker ON');
      invalidateCapture();
      state.breaker = 'closed';
      paint();
      notify('Sample breaker switched ON');
    },
    clear: () => {
      clearCause();
      closeWindow();
    },
    'clear-extra': () => {
      remember('Clear separate terminal fault');
      invalidateCapture();
      state.extraFault = false;
      closeWindow(() => {
        paint();
        showFaults();
      });
    },
    'clear-all': () => {
      remember('Clear all injected causes');
      invalidateCapture();
      state.active = false;
      state.extraFault = false;
      state.cleared = true;
      closeWindow(() => {
        paint();
        notify('Injected causes cleared · trip and damage states retained');
      });
    },
    focus: () =>
      closeWindow(() => {
        state.tab = 'explain';
        paint();
      }),
    'focus-extra': () => closeWindow(() => notify('Sample focus: J2 · terminal N')),
    undo: () => {
      const entry = history.pop();
      if (!entry) return;
      invalidateCapture();
      Object.assign(state, JSON.parse(entry.before));
      closeWindow(() => {
        paint();
        notify(`Undid: ${entry.label}`);
      });
    },
    empty: () => {
      pause();
      state.empty = true;
      state.tab = 'explain';
      paint();
    },
    'select-target': () => {
      state.empty = false;
      paint();
    },
    refresh: runSample,
    motion: () => {
      state.motion = !state.motion;
      paint();
      if (dialogKind === 'settings' && dialog.open) settingsWindow();
    },
    theme: () => {
      const dark = document.documentElement.dataset.theme !== 'dark';
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      $('[data-action="theme"]').setAttribute(
        'aria-label',
        dark ? 'Switch to light theme' : 'Switch to dark theme',
      );
      try {
        localStorage.setItem('fault-lab-design-theme', dark ? 'dark' : 'light');
      } catch {}
    },
    canvas: leaveWindow,
    lab: () => {
      state.view = 'inside';
      paint();
    },
    restore: () =>
      closeWindow(() => {
        choose('break');
        state.view = 'circuit';
        paint();
        notify('Sample snapshot restored · production circuit untouched');
      }),
    keep: () =>
      closeWindow(() => {
        state.view = 'circuit';
        paint();
        notify('Sample edits kept · circuit view');
      }),
    'original-export': () =>
      notify('Review state: original-circuit export remains available in production'),
    'basic-copy': () => {
      state.blocked = false;
      paint();
      notify('Review state: an explicit basic copy permits supported edits');
    },
  };

  document.addEventListener('click', (event) => {
    const control = event.target.closest(
      '[data-action], [data-tab], [data-view], [data-step], [data-filter], [data-fault], [data-state], [data-severity], [data-part]',
    );
    if (!control || control.disabled) return;
    if (control.dataset.action) actions[control.dataset.action]?.();
    else if (control.dataset.severity) {
      state.consoleFilter = control.dataset.severity;
      consoleWindow();
    } else if (control.dataset.tab) {
      state.tab = control.dataset.tab;
      paint();
    } else if (control.dataset.view) {
      state.view = control.dataset.view;
      paint();
    } else if (control.dataset.step) {
      pause();
      setStep(Number(control.dataset.step));
    } else if (control.dataset.filter) {
      state.filter = control.dataset.filter;
      filterCatalogue();
    } else if (control.dataset.state) applyState(control.dataset.state);
    else if (control.dataset.fault) {
      if (control.dataset.demo)
        closeWindow(() => {
          choose(control.dataset.demo);
          state.terminal = control.dataset.fault === 'terminal-disconnect';
          paint();
          draft();
        });
      else unsupported(control.dataset.fault);
    } else if (control.dataset.part) {
      state.tab = 'explain';
      paint();
      $('#tab-explain').focus();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('[role="button"][data-part]') && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      event.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    if (
      event.target.matches('.evidence-tabs [role="tab"]') &&
      ['ArrowLeft', 'ArrowRight'].includes(event.key)
    ) {
      event.preventDefault();
      const names = ['explain', 'readings', 'repair'];
      state.tab = names[(names.indexOf(state.tab) + (event.key === 'ArrowRight' ? 1 : 2)) % 3];
      paint();
      $(`#tab-${state.tab}`).focus();
    }
  });
  $('#case-select').addEventListener('change', (event) => choose(event.target.value));
  $('#speed').addEventListener('change', (event) => {
    state.speed = Number(event.target.value);
    schedule();
  });
  document.addEventListener('input', (event) => {
    if (event.target.id === 'fault-search') {
      state.query = event.target.value;
      filterCatalogue();
    }
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeWindow();
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      closeWindow();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause();
      paint();
    }
  });
  media.addEventListener('change', () => {
    paint();
  });
  window.addEventListener('pagehide', () => {
    pause();
    stopPhysics();
    clearTimeout(closeTimer);
    clearTimeout(toastTimer);
  });
  $('#case-select').innerHTML = Object.entries(cases)
    .map(([id, entry]) => `<option value="${id}">${entry.label}</option>`)
    .join('');
  $('#shelf-parts').innerHTML = [
    ['live-terminal', 'Supply'],
    ['mcb', 'Breaker'],
    ['junction-box', 'Junction'],
    ['bulb-incandescent', 'Lamp'],
    ['socket-3pin', 'Socket'],
  ]
    .map(
      ([type, label]) =>
        `<button type="button" class="shelf-part" data-action="canvas">${device(type, 0, 0, 32)}<span>${label}</span></button>`,
    )
    .join('');
  try {
    const savedTheme = localStorage.getItem('fault-lab-design-theme');
    if (savedTheme === 'dark' || savedTheme === 'light')
      document.documentElement.dataset.theme = savedTheme;
  } catch {}
  $('[data-action="theme"]').setAttribute(
    'aria-label',
    document.documentElement.dataset.theme === 'dark'
      ? 'Switch to light theme'
      : 'Switch to dark theme',
  );
  paint();
})();
