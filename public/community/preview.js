// This island owns only temporary DOM and memory. No editor, circuit writes or storage.
export function enablePreview(root) {
  if (root.dataset.enabled) return;
  root.dataset.enabled = 'true';
  const viewport = root.querySelector('.preview-viewport');
  const status = root.querySelector('#preview-status');
  const run = root.querySelector('#run-preview');
  const inspection = root.querySelector('#preview-inspection');
  const controls = [...root.querySelectorAll('[data-switch]')];
  const initial = viewport.innerHTML;
  const defaults = controls.map((c) => c.checked);
  const originalBox = viewport
    .querySelector('svg')
    .getAttribute('viewBox')
    .split(/\s+/)
    .map(Number);
  let box = [...originalBox];
  let active = false;
  let state;
  let nextDelta = 0.25;
  let generation = 0;
  let request;
  let timer;
  let expiry;
  let drag;
  let currentSvg;
  let unavailable = false;
  const svg = () => viewport.querySelector('svg');
  const applyView = () => svg()?.setAttribute('viewBox', box.join(' '));
  function prepareSvg() {
    currentSvg = svg();
    if (!currentSvg) return;
    currentSvg.setAttribute('tabindex', '0');
    currentSvg.setAttribute('role', 'group');
    currentSvg.setAttribute(
      'aria-label',
      'Read-only schematic. Arrow keys pan; plus and minus zoom.',
    );
    for (const node of currentSvg.querySelectorAll('[data-component-id]')) {
      node.setAttribute('tabindex', '0');
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', `Inspect ${node.dataset.componentId}`);
    }
    applyView();
  }
  function clearSimulation(message = 'Simulation paused. Published schematic restored.') {
    active = false;
    generation++;
    request?.abort();
    clearTimeout(timer);
    clearTimeout(expiry);
    state = undefined;
    nextDelta = 0.25;
    run.textContent = 'Start simulation';
    if (unavailable)
      viewport.textContent =
        'Preview changed or is unavailable. Reload this page before continuing.';
    else {
      viewport.innerHTML = initial;
      prepareSvg();
    }
    status.textContent = message;
  }
  function zoom(factor) {
    const width = Math.max(originalBox[2] / 8, Math.min(originalBox[2] * 4, box[2] * factor));
    const ratio = width / box[2];
    const height = box[3] * ratio;
    box = [box[0] + (box[2] - width) / 2, box[1] + (box[3] - height) / 2, width, height];
    applyView();
  }
  function inspect(id) {
    const node = [...(svg()?.querySelectorAll('[data-component-id]') ?? [])].find(
      (n) => n.dataset.componentId === id,
    );
    if (!node) return;
    for (const el of svg().querySelectorAll('[data-inspected]'))
      el.removeAttribute('data-inspected');
    node.setAttribute('data-inspected', 'true');
    inspection.textContent =
      node.querySelector('[data-component-hitbox]')?.getAttribute('aria-label') || id;
  }
  async function step(token) {
    if (!active || token !== generation) return;
    request = new AbortController();
    try {
      const response = await fetch(
        `/api/community/publications/${encodeURIComponent(root.dataset.slug)}/preview/simulate`,
        {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          signal: request.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            versionId: root.dataset.version,
            switches: Object.fromEntries(controls.map((c) => [c.dataset.switch, c.checked])),
            ...(state ? { simulationState: state, deltaSeconds: nextDelta } : {}),
          }),
        },
      );
      const data = await response.json();
      if (token !== generation || !active) return;
      if (!response.ok) {
        if (response.status === 404 || response.status === 409) {
          unavailable = true;
          run.disabled = true;
          root.querySelector('#reset-preview').disabled = true;
          controls.forEach((control) => {
            control.disabled = true;
          });
        }
        clearSimulation(data.error || 'Simulation unavailable. Try again.');
        return;
      }
      if (data.versionId !== root.dataset.version)
        throw new Error('Preview version changed; reload this page');
      const focused = viewport.contains(document.activeElement)
        ? document.activeElement.closest('[data-component-id]')?.dataset.componentId || 'svg'
        : null;
      viewport.innerHTML = data.svg;
      prepareSvg();
      if (focused) {
        const target =
          focused === 'svg'
            ? svg()
            : [...svg().querySelectorAll('[data-component-id]')].find(
                (node) => node.dataset.componentId === focused,
              );
        target?.focus({ preventScroll: true });
      }
      state = data.simulationState || undefined;
      nextDelta = 0.25;
      status.textContent = `Simulation running · ${data.energizedComponents} energized components · ${Number(data.elapsedSeconds).toFixed(2)} s. Temporary results, not certification.${data.diagnostics.length ? ` ${data.diagnostics[0].message}` : ''}`;
      clearTimeout(expiry);
      if (data.nextChangeAt)
        expiry = setTimeout(
          () => clearSimulation('Membership changed or expired. Start again to recheck access.'),
          Math.max(0, data.nextChangeAt - Date.now()),
        );
      if (data.calculationStatus !== 'converged') {
        active = false;
        run.textContent = 'Start simulation';
        status.textContent = `Calculation unavailable. ${data.diagnostics.map((d) => d.message).join(' ')} No fresh assessment.`;
        return;
      }
      timer = setTimeout(() => step(token), 250);
    } catch (error) {
      if (token !== generation || error.name === 'AbortError') return;
      clearSimulation(error.message || 'Simulation unavailable. Try again.');
    }
  }
  root.querySelector('.preview-toolbar').hidden = false;
  root.querySelector('.preview-controls').hidden = false;
  prepareSvg();
  status.textContent = 'Interactive preview ready. Simulating Pro components requires membership.';
  root.querySelectorAll('[data-view]').forEach((button) =>
    button.addEventListener('click', () => {
      if (button.dataset.view === 'fit') {
        box = [...originalBox];
        applyView();
      } else zoom(button.dataset.view === 'in' ? 0.8 : 1.25);
    }),
  );
  viewport.addEventListener('keydown', (event) => {
    const node = event.target.closest('[data-component-id]');
    if (node && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      inspect(node.dataset.componentId);
      return;
    }
    const direction = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    }[event.key];
    if (direction) {
      event.preventDefault();
      box[0] += (direction[0] * box[2]) / 10;
      box[1] += (direction[1] * box[3]) / 10;
      applyView();
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoom(0.8);
    } else if (event.key === '-') {
      event.preventDefault();
      zoom(1.25);
    }
  });
  viewport.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    drag = {
      x: event.clientX,
      y: event.clientY,
      box: [...box],
      inverse: svg()?.getScreenCTM()?.inverse(),
      moved: false,
    };
    viewport.setPointerCapture(event.pointerId);
  });
  viewport.addEventListener('pointermove', (event) => {
    if (!drag?.inverse) return;
    const delta = new DOMPoint(event.clientX - drag.x, event.clientY - drag.y).matrixTransform(
      drag.inverse,
    );
    const zero = new DOMPoint(0, 0).matrixTransform(drag.inverse);
    if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 4) drag.moved = true;
    box[0] = drag.box[0] - (delta.x - zero.x);
    box[1] = drag.box[1] - (delta.y - zero.y);
    applyView();
  });
  viewport.addEventListener('pointerup', (event) => {
    if (!drag?.moved) {
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('[data-component-id]');
      if (target) inspect(target.dataset.componentId);
    }
    drag = undefined;
  });
  viewport.addEventListener('pointercancel', () => {
    drag = undefined;
  });
  document
    .querySelectorAll('[data-inspect]')
    .forEach((button) => button.addEventListener('click', () => inspect(button.dataset.inspect)));
  for (const control of controls)
    control.addEventListener('change', () => {
      const restart = active;
      const previousState = state;
      clearSimulation('Temporary switch changed. Published circuit unchanged.');
      if (restart) {
        state = previousState;
        nextDelta = 0;
        active = true;
        run.textContent = 'Pause simulation';
        step(generation);
      }
    });
  run.addEventListener('click', () => {
    if (active) {
      clearSimulation();
      return;
    }
    active = true;
    run.textContent = 'Pause simulation';
    status.textContent = 'Checking access and calculating…';
    step(++generation);
  });
  root.querySelector('#reset-preview').addEventListener('click', () => {
    clearSimulation('Preview reset. Published circuit unchanged.');
    controls.forEach((c, i) => {
      c.checked = defaults[i];
    });
    box = [...originalBox];
    applyView();
    inspection.textContent = '';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) clearSimulation();
  });
  window.addEventListener('blur', () => {
    if (active)
      clearSimulation(
        'Simulation paused while this page was inactive. Start again to recheck access.',
      );
  });
  window.addEventListener('pagehide', () => clearSimulation());
}
