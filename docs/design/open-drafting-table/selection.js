/* Canvas arrangement for the standalone design, independent of production state. */
(() => {
  const P = DesignPreview;
  let selected = [];
  let layout = {};
  const groups = () => [...document.querySelectorAll('.circuit .part')];
  const compact = () => matchMedia('(max-width:800px)').matches;
  const size = () => (compact() ? [460, 550] : [1000, 540]);
  const defaults = () =>
    compact()
      ? { supply: [40, 95], switch: [286, 95], lamp: [160, 345] }
      : { supply: [115, 183], switch: [452, 183], lamp: [785, 183] };
  const dimensions = (id) => [120, id === 'supply' ? 158 : 120];
  function position(id) {
    const [w, h] = size();
    const [x, y] = defaults()[id];
    const item = layout[id] || {};
    return { x: x + (item.dx || 0) * w, y: y + (item.dy || 0) * h, angle: item.angle || 0 };
  }
  function rotatedPoint(id, x, y) {
    const [w, h] = dimensions(id);
    const a = (position(id).angle * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return {
      x: w / 2 + (x - w / 2) * c - (y - h / 2) * s,
      y: h / 2 + (x - w / 2) * s + (y - h / 2) * c,
    };
  }
  function bounds(id) {
    const [w, h] = dimensions(id);
    const points = [
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
    ].map(([x, y]) => rotatedPoint(id, x, y));
    const p = position(id);
    return {
      left: p.x + Math.min(...points.map((p) => p.x)),
      right: p.x + Math.max(...points.map((p) => p.x)),
      top: p.y + Math.min(...points.map((p) => p.y)),
      bottom: p.y + Math.max(...points.map((p) => p.y)),
    };
  }
  function port(id, x, y) {
    const p = position(id);
    const r = rotatedPoint(id, x, y);
    return { x: p.x + r.x, y: p.y + r.y };
  }
  const route = (a, b, lane) => `M${a.x} ${a.y}V${lane}H${b.x}V${b.y}`;
  function paint() {
    if (!Object.keys(layout).length) P.resetDrawing();
    groups().forEach((group) => {
      const id = group.dataset.part;
      const p = position(id);
      const [w, h] = dimensions(id);
      let body = group.querySelector('.layout-body');
      if (!body) {
        body = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        body.classList.add('layout-body');
        [...group.children]
          .filter((child) => child.matches('.part-device,.part-symbol,.port,.port-label'))
          .forEach((child) => body.append(child));
        group.prepend(body);
      }
      group.setAttribute('transform', `translate(${p.x} ${p.y})`);
      body.setAttribute('transform', `rotate(${p.angle} ${w / 2} ${h / 2})`);
      const b = bounds(id);
      const local = {
        left: b.left - p.x,
        right: b.right - p.x,
        top: b.top - p.y,
        bottom: b.bottom - p.y,
      };
      const outline = group.querySelector('.selection');
      Object.entries({
        x: local.left - 14,
        y: local.top - 14,
        width: local.right - local.left + 28,
        height: local.bottom - local.top + 28,
      }).forEach(([key, value]) => outline.setAttribute(key, value));
      for (const [className, offset] of [
        ['part-label', 34],
        ['part-note', 55],
      ]) {
        const label = group.querySelector(`.${className}`);
        label.setAttribute('x', w / 2);
        label.setAttribute('y', local.bottom + offset);
      }
      const badge = group.querySelector('.part-symbol-badge');
      badge.setAttribute('x', local.right - 29);
      badge.setAttribute('y', local.top - 20);
      group.classList.toggle('is-selected', selected.includes(id));
      group.setAttribute('aria-pressed', String(selected.includes(id)));
    });
    if (Object.keys(layout).length) {
      const s = port('supply', 120, 55);
      const i = port('switch', 0, 55);
      const o = port('switch', 120, 55);
      const l = port('lamp', 0, 55);
      const middle = (s.x + i.x) / 2;
      const next = (o.x + l.x) / 2;
      document
        .querySelector('.wire.live')
        .setAttribute(
          'd',
          `M${s.x} ${s.y}H${middle}V${i.y}H${i.x}M${o.x} ${o.y}H${next}V${l.y}H${l.x}`,
        );
      const n = port('supply', 120, 105);
      const ln = port('lamp', 120, 55);
      const e = port('supply', 120, 145);
      const le = port('lamp', 60, 131);
      document
        .querySelector('.wire.neutral')
        .setAttribute('d', route(n, ln, Math.max(n.y, ln.y) + 70));
      document
        .querySelector('.wire.earth')
        .setAttribute('d', route(e, le, Math.max(e.y, le.y) + 75));
    }
  }
  function select(id, add = false) {
    if (add) {
      selected = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id];
    } else selected = id ? [id] : [];
    paint();
  }
  function selectTarget(id) {
    if (!selected.includes(id)) select(id);
  }
  function move(id, dx, dy) {
    const [w, h] = size();
    const item = layout[id] || {};
    layout[id] = { ...item, dx: (item.dx || 0) + dx / w, dy: (item.dy || 0) + dy / h };
  }
  function align(axis) {
    if (selected.length < 2) return false;
    const boxes = selected.map((id) => ({ id, ...bounds(id) }));
    const minX = Math.min(...boxes.map((b) => b.left));
    const maxX = Math.max(...boxes.map((b) => b.right));
    const minY = Math.min(...boxes.map((b) => b.top));
    const maxY = Math.max(...boxes.map((b) => b.bottom));
    boxes.forEach((b) => {
      let dx = 0;
      let dy = 0;
      if (axis === 'left') dx = minX - b.left;
      if (axis === 'right') dx = maxX - b.right;
      if (axis === 'center-h') dx = (minX + maxX - b.left - b.right) / 2;
      if (axis === 'top') dy = minY - b.top;
      if (axis === 'bottom') dy = maxY - b.bottom;
      if (axis === 'center-v') dy = (minY + maxY - b.top - b.bottom) / 2;
      move(b.id, dx, dy);
    });
    paint();
    return true;
  }
  function distribute(axis) {
    if (selected.length < 3) return false;
    const horizontal = axis === 'horizontal';
    const key = horizontal ? 'x' : 'y';
    const items = selected.map((id) => ({ id, ...position(id) })).sort((a, b) => a[key] - b[key]);
    const first = items[0][key];
    const gap = (items.at(-1)[key] - first) / (items.length - 1);
    items.forEach((item, i) =>
      move(
        item.id,
        horizontal ? first + i * gap - item.x : 0,
        horizontal ? 0 : first + i * gap - item.y,
      ),
    );
    paint();
    return true;
  }
  function rotate(degrees) {
    if (!selected.length) return false;
    selected.forEach((id) => {
      layout[id] = {
        ...(layout[id] || {}),
        angle: (((position(id).angle + degrees) % 360) + 360) % 360,
      };
    });
    paint();
    return true;
  }
  const icons = {
    left: 'M4 3v18M7 6h11v4H7ZM7 14h7v4H7Z',
    'center-h': 'M12 3v18M6 6h12v4H6ZM8 14h8v4H8Z',
    right: 'M20 3v18M6 6h11v4H6ZM10 14h7v4h-7Z',
    top: 'M3 4h18M6 7h4v11H6ZM14 7h4v7h-4Z',
    'center-v': 'M3 12h18M6 6h4v12H6ZM14 8h4v8h-4Z',
    bottom: 'M3 20h18M6 6h4v11H6ZM14 10h4v7h-4Z',
    horizontal: 'M3 4v16M21 4v16M7 8h3v8H7ZM14 8h3v8h-3Z',
    vertical: 'M4 3h16M4 21h16M8 7h8v3H8ZM8 14h8v3H8Z',
    cw: 'M19 9a7 7 0 1 0 0 7M19 3v6h-6',
    ccw: 'M5 9a7 7 0 1 1 0 7M5 3v6h6',
  };
  const iconButton = (name, action, value, icon, disabled = false) =>
    `<button type="button" class="context-icon" data-action="${action}" data-value="${value}" aria-label="${name}" title="${name}" ${disabled ? 'disabled' : ''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[icon]}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
  function controls(locked = false) {
    if (!selected.length) return '';
    const alignLocked = locked || selected.length < 2;
    const distributeLocked = locked || selected.length < 3;
    return `<section class="context-section" aria-label="Arrange selected components"><div class="context-section-heading"><span>Align</span><small>${selected.length < 2 ? 'Select 2+' : `${selected.length} selected`}</small></div><div class="context-icon-row" role="group" aria-label="Align">${[
      ['left', 'Align left'],
      ['center-h', 'Align horizontal centres'],
      ['right', 'Align right'],
      ['top', 'Align top'],
      ['center-v', 'Align vertical centres'],
      ['bottom', 'Align bottom'],
    ]
      .map(([value, name]) => iconButton(name, 'align', value, value, alignLocked))
      .join(
        '',
      )}</div><div class="context-section-heading"><span>Distribute</span><small>${selected.length < 3 ? 'Select 3+' : ''}</small></div><div class="context-icon-row short" role="group" aria-label="Distribute">${iconButton(
      'Distribute horizontally',
      'distribute',
      'horizontal',
      'horizontal',
      distributeLocked,
    )}${iconButton('Distribute vertically', 'distribute', 'vertical', 'vertical', distributeLocked)}</div><div class="context-section-heading"><span>Rotate</span><small>90°</small></div><div class="context-icon-row short" role="group" aria-label="Rotate">${iconButton('Rotate anticlockwise 90°', 'rotate', '-90', 'ccw', locked)}${iconButton('Rotate clockwise 90°', 'rotate', '90', 'cw', locked)}</div><p class="context-selection-hint">Shift-click to select more</p></section>`;
  }
  window.SelectionLayout = {
    paint,
    select,
    selectTarget,
    align,
    distribute,
    rotate,
    controls,
    bounds,
    get selected() {
      return [...selected];
    },
    snapshot: () => structuredClone(layout),
    restore(value) {
      layout = structuredClone(value || {});
      paint();
    },
  };
  window.addEventListener('resize', paint);
  paint();
})();
