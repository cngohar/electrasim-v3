/* Representative device silhouettes, not manufacturer drawings or certified symbols.
   Explicit type mapping keeps unrelated products from inheriting a generic icon. */
(() => {
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  const rect = (x, y, w, h, r = 3, fill = 'var(--paper)') =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>`;
  const circle = (x, y, r, fill = 'none') =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
  const path = (d) => `<path d="${d}" fill="none"/>`;
  const label = (s, x = 24, y = 28, size = 6) =>
    `<text x="${x}" y="${y}" text-anchor="middle" stroke="none" fill="currentColor" font-family="system-ui,sans-serif" font-size="${size}" font-weight="600">${esc(s)}</text>`;
  const screws = (xs = [13, 35], ys = [10, 38]) =>
    xs.map((x) => ys.map((y) => circle(x, y, 1.3)).join('')).join('');
  const slots = (count, y = 9) =>
    Array.from({ length: count }, (_, i) =>
      rect(9 + (i * 30) / count, y, 4, 4, 1, 'var(--soft)'),
    ).join('');
  const plate = () => rect(6, 5, 36, 38, 5) + screws([10, 38], [24]);
  const vent = (x, y, n = 5) =>
    Array.from({ length: n }, (_, i) => path(`M${x} ${y + i * 3}h20`)).join('');
  const socket = (style, x = 24, y = 25) => {
    if (style === 'us')
      return (
        path(`M${x - 5} ${y - 6}v7M${x + 5} ${y - 6}v7`) +
        path(`M${x - 2} ${y + 8}v-2a2 2 0 0 1 4 0v2Z`)
      );
    if (style === 'au')
      return path(`M${x - 7} ${y - 6}l4 5M${x + 7} ${y - 6}l-4 5M${x} ${y + 5}v5`);
    if (style === 'round')
      return (
        circle(x, y, 12) +
        circle(x - 5, y, 1.8, 'currentColor') +
        circle(x + 5, y, 1.8, 'currentColor') +
        path(`M${x} ${y - 12}v3M${x} ${y + 9}v3`)
      );
    if (style === 'bs546')
      return circle(x, y - 7, 2) + circle(x - 7, y + 4, 2) + circle(x + 7, y + 4, 2);
    if (style === '2pin') return circle(x - 6, y, 2) + circle(x + 6, y, 2);
    return path(`M${x} ${y - 9}v6M${x - 9} ${y + 4}h5M${x + 4} ${y + 4}h5`);
  };
  const blades = (x = 24, y = 24) =>
    circle(x, y, 3, 'var(--soft)') +
    [0, 120, 240]
      .map(
        (a) =>
          `<path d="M24 21C10 5 35 2 28 20Z" fill="var(--soft)" transform="rotate(${a} ${x} ${y})"/>`,
      )
      .join('');
  const shapes = {
    rocker: (o) =>
      plate() +
      Array.from(
        { length: o.n || 1 },
        (_, i) =>
          rect(15 + i * 12, 11, o.n ? 9 : 18, 26, 3, 'var(--soft)') +
          path(`M${18 + i * 12} 18h${o.n ? 3 : 10}`),
      ).join('') +
      (o.tag ? label(o.tag, 24, 39, 5) : ''),
    push: () => plate() + circle(24, 24, 11, 'var(--soft)') + circle(24, 24, 8),
    rotary: (o) =>
      plate() +
      circle(24, 24, 11, 'var(--soft)') +
      path('M24 24l7-8') +
      (o.tag ? label(o.tag, 24, 40, 5) : ''),
    cooker: () =>
      plate() +
      rect(11, 12, 13, 25, 2, 'var(--soft)') +
      circle(32, 18, 3, '#d17a67') +
      label('45A', 31, 34, 5),
    bulb: (o) =>
      path('M17 31C17 25 10 24 10 16A14 14 0 0 1 38 16C38 24 31 25 31 31Z') +
      rect(17, 31, 14, 8, 1, 'var(--soft)') +
      path('M18 35h12M21 42h6') +
      (o.tag ? label(o.tag, 24, 20, 6) : path('M19 22l5-5 5 5')),
    halogen: () =>
      path('M7 8h34L31 30H17ZM17 30v7h14v-7M20 37v6M28 37v6') + path('M10 12h28M17 18h14'),
    cfl: () =>
      path('M16 29V9a3 3 0 0 1 6 0v16M26 25V9a3 3 0 0 1 6 0v20') +
      rect(15, 29, 18, 8) +
      path('M19 37v5h10v-5'),
    downlight: () =>
      `<ellipse cx="24" cy="25" rx="21" ry="11" fill="var(--paper)"/><ellipse cx="24" cy="24" rx="15" ry="7" fill="var(--soft)"/>${path('M10 16l4-8h20l4 8')}`,
    tube: () =>
      rect(3, 18, 42, 12, 4, 'var(--soft)') +
      path('M8 18v12M40 18v12M3 21H1M3 27H1M45 21h2M45 27h2'),
    breaker: (o) =>
      rect(o.wide ? 7 : 14, 4, o.wide ? 34 : 20, 40, 3) +
      slots(o.wide ? 3 : 1, 7) +
      rect(o.wide ? 13 : 17, 18, o.wide ? 22 : 14, 12, 2, 'var(--soft)') +
      path('M20 23h8') +
      label(o.tag || 'B16', 24, 37, 5) +
      (o.test ? circle(34, 34, 2, 'var(--blue)') : ''),
    fuse: () =>
      rect(5, 17, 38, 14, 3) +
      rect(5, 17, 8, 14, 2, 'var(--soft)') +
      rect(35, 17, 8, 14, 2, 'var(--soft)') +
      path('M15 24h18'),
    board: (o) =>
      rect(4, 5, 40, 38, 3) +
      rect(8, 10, 32, 9, 1, 'var(--soft)') +
      Array.from(
        { length: o.n || 4 },
        (_, i) => rect(9 + i * 7, 24, 5, 12, 1) + path(`M${10 + i * 7} 28h3`),
      ).join(''),
    spur: () =>
      plate() +
      rect(12, 12, 11, 24, 2, 'var(--soft)') +
      rect(27, 20, 9, 12, 1) +
      label('F', 31, 28, 5),
    outlet: (o) =>
      (o.double
        ? `${rect(2, 11, 44, 28, 4)}<g transform="translate(1 10) scale(.62)">${socket(o.style, 19, 22) + socket(o.style, 54, 22)}</g>`
        : plate() + socket(o.style)) +
      (o.usb ? rect(13, 36, 8, 3, 1) + rect(27, 36, 8, 3, 1) : '') +
      (o.switched ? rect(29, 9, 7, 8, 1, 'var(--soft)') : ''),
    gfci: () =>
      plate() +
      socket('us', 24, 17) +
      rect(19, 27, 10, 4, 1, 'var(--soft)') +
      rect(19, 34, 10, 4, 1),
    industrial: () =>
      rect(12, 5, 24, 38, 4) +
      circle(24, 28, 12, 'var(--soft)') +
      [
        [-5, -3],
        [5, -3],
        [0, 6],
      ]
        .map(([x, y]) => circle(24 + x, 28 + y, 2))
        .join('') +
      path('M12 12h24'),
    shaver: () => plate() + label('115 / 230', 24, 15, 5) + socket('2pin', 24, 29),
    ceiling: () => path('M24 3v8') + blades(),
    extractor: (o) => rect(4, 4, 40, 40, o.round ? 1 : 5) + circle(24, 24, 16) + blades(),
    deskfan: () =>
      `${circle(24, 18, 15)}<g transform="translate(8 2) scale(.66)">${blades()}</g>${path('M21 33v7h-8v4h22v-4h-8v-7')}`,
    motor: (o) =>
      rect(8, 13, 29, 24, 5, 'var(--soft)') +
      path('M13 16v18M18 16v18M23 16v18M28 16v18M37 23h8v5h-8M10 37l-3 5h31l-3-5') +
      rect(18, 7, 12, 6, 1) +
      (o.tag ? label(o.tag, 23, 29, 5) : ''),
    bell: () => path('M9 34h30l-5-7V18a10 10 0 0 0-20 0v9ZM20 39a4 4 0 0 0 8 0M24 5v3'),
    tank: () =>
      rect(12, 3, 24, 38, 10) +
      circle(24, 14, 3) +
      path('M18 41v5M30 41v5') +
      label('HOT', 24, 29, 5),
    heater: (o) =>
      rect(4, 11, 40, 28, 4) +
      vent(10, 18, 5) +
      path('M10 39v4M38 39v4') +
      (o.tag ? label(o.tag, 24, 9, 5) : ''),
    aircon: () =>
      rect(3, 9, 42, 25, 5) +
      path('M6 25h36M8 29h32M12 38v5M24 37v7M36 38v5') +
      circle(38, 16, 1, 'var(--blue)'),
    hob: () =>
      rect(4, 4, 40, 40, 5) +
      [14, 33].map((x) => [14, 32].map((y) => circle(x, y, 7)).join('')).join(''),
    charger: () =>
      rect(7, 4, 24, 38, 4) +
      rect(12, 10, 14, 11, 2, 'var(--soft)') +
      path('M18 24l-3 6h5l-2 6M31 14h7v22a3 3 0 0 0 6 0V22h-4v-6'),
    shower: () =>
      rect(5, 8, 23, 34, 5) + circle(16, 21, 5) + path('M28 32h4V9h8M36 7h8v5h-8M37 16v3M41 16v3'),
    element: (o) =>
      path(
        o.floor
          ? 'M8 8h32v6H8v7h32v7H8v7h32v7H8'
          : 'M8 39V12a5 5 0 0 1 10 0v22a5 5 0 0 0 10 0V12a5 5 0 0 1 10 0v27',
      ) + path('M5 39h6M35 39h6'),
    hood: () => rect(18, 4, 12, 16, 1) + path('M18 20 4 34h40L30 20Z') + path('M8 39h32'),
    heatpump: () =>
      rect(3, 9, 42, 30, 4) +
      circle(19, 24, 11) +
      path('M19 13v22M8 24h22M34 15h7M34 21h7M34 27h7M34 33h7'),
    washer: (o) =>
      rect(7, 3, 34, 42, 4) +
      path('M7 12h34') +
      circle(34, 8, 1.5) +
      circle(24, 28, 12) +
      circle(24, 28, 8) +
      label(o.tag || 'W', 24, 30, 5),
    dishwasher: () =>
      rect(7, 3, 34, 42, 4) + path('M7 12h34M19 8h10M12 20h24M14 20v16M20 20v16M26 20v16M32 20v16'),
    fridge: () => rect(11, 3, 26, 42, 3) + path('M11 27h26M16 11v9M16 32v8'),
    pir: () =>
      rect(9, 5, 30, 37, 6) +
      path('M12 19h24') +
      circle(24, 28, 9, 'var(--soft)') +
      path('M17 25h14M17 30h14'),
    thermostat: (o) =>
      plate() +
      (o.round
        ? circle(24, 24, 12) + path('M24 24l7-6')
        : rect(11, 12, 26, 15, 2, 'var(--soft)') +
          label('21°', 24, 23, 9) +
          path('M14 34h4M28 34h6')),
    photocell: () =>
      path('M13 41V15a11 11 0 0 1 22 0v26Z') +
      rect(17, 10, 14, 12, 4, 'var(--soft)') +
      path('M9 41h30'),
    smartrelay: () =>
      rect(6, 8, 36, 31, 4) +
      slots(3, 32) +
      path('M15 18a14 14 0 0 1 18 0M19 22a7 7 0 0 1 10 0') +
      circle(24, 26, 1.4, 'var(--blue)'),
    terminal: (o) =>
      rect(13, 4, 22, 40, 3, 'var(--soft)') + screws([24], [12, 36]) + label(o.tag, 24, 27, 8),
    mains: (o) =>
      rect(7, 5, 34, 38, 4) +
      rect(12, 10, 24, 17, 2, 'var(--soft)') +
      label(o.tag || 'AC', 24, 22, 8) +
      slots(o.n || 3, 34),
    battery: () =>
      rect(5, 12, 38, 31, 4) +
      rect(10, 6, 8, 6, 1) +
      rect(30, 6, 8, 6, 1) +
      path('M12 22h8M16 18v8M30 22h8'),
    solar: () => path('M10 5h28l7 30H3ZM24 5v30M7 15h34M5 25h38M15 35l-3 8M33 35l3 8M9 43h30'),
    generator: () =>
      rect(4, 10, 40, 29, 4) +
      rect(8, 15, 17, 17, 2, 'var(--soft)') +
      circle(16, 23, 5) +
      circle(34, 20, 3) +
      path('M29 28h10M10 39v4M38 39v4'),
    meter: () =>
      rect(10, 3, 28, 42, 4) +
      rect(14, 10, 20, 12, 2, 'var(--soft)') +
      label('kWh', 24, 18, 5) +
      circle(24, 31, 6) +
      path('M17 41h14'),
    rod: () => path('M22 5h4v37l-2 4-2-4ZM14 14h20M14 11v6M34 11v6') + label('PE', 36, 33, 6),
    junction: () =>
      rect(6, 6, 36, 36, 6) +
      rect(11, 11, 26, 26, 4, 'var(--soft)') +
      screws([14, 34], [14, 34]) +
      path('M21 2h6v4M21 42v4h6v-4M2 21h4v6H2M42 21h4v6h-4'),
    strip: () =>
      rect(3, 14, 42, 21, 2) +
      [9, 19, 29, 39]
        .map((x) => circle(x, 21, 3) + path(`M${x - 2} 19l4 4M${x - 5} 14v21`))
        .join(''),
    wago: () =>
      rect(5, 10, 38, 30, 4) +
      [10, 21, 32].map((x) => rect(x, 13, 6, 15, 1, '#de995c') + circle(x + 3, 34, 2)).join(''),
    timer: (o) =>
      rect(10, 3, 28, 42, 4) +
      slots(2, 6) +
      (o.clock
        ? circle(24, 23, 11) + path('M24 15v8l6 3')
        : rect(14, 16, 20, 13, 2, 'var(--soft)') + label(o.tag || '7D', 24, 25, 7)) +
      slots(2, 37),
    transformer: (o) =>
      rect(5, 11, 38, 29, 2) +
      rect(10, 15, 28, 19, 1, 'var(--soft)') +
      path('M17 15v19M21 15v19M27 15v19M31 15v19') +
      label(o.tag || '24V', 24, 9, 6) +
      slots(3, 37),
    relay: (o) =>
      rect(10, 4, 28, 31, 3) +
      rect(14, 8, 20, 23, 2, 'var(--soft)') +
      rect(17, 17, 7, 10, 1) +
      path('M28 26V12l5 5M13 35v9M20 35v9M28 35v9M35 35v9') +
      label(o.tag || '8 PIN', 24, 13, 4),
    contactor: (o) =>
      rect(6, 5, 36, 38, 3) +
      slots(o.n || 3, 8) +
      slots(o.n || 3, 36) +
      rect(13, 18, 22, 13, 2, 'var(--soft)') +
      label(`${o.n || 3}P`, 24, 27, 7),
    probe: () =>
      path('M10 43V27a5 5 0 0 1 10 0v9a6 6 0 0 0 12 0V20') + rect(28, 3, 8, 19, 4, 'var(--soft)'),
    door: () => rect(8, 5, 15, 38, 3) + rect(29, 5, 10, 38, 3) + screws([15], [10, 38]),
    buzzer: () =>
      circle(24, 24, 18) +
      Array.from({ length: 5 }, (_, i) => path(`M14 ${16 + i * 4}h20`)).join(''),
    chime: () => rect(9, 4, 30, 40, 5) + vent(14, 12, 5) + circle(24, 36, 2, 'var(--soft)'),
    siren: () => path('M7 18h11L38 7v34L18 30H7ZM18 18v12M11 30v10h14') + path('M43 15v18'),
    smoke: () =>
      circle(24, 24, 20) +
      circle(24, 24, 13) +
      vent(14, 18, 4) +
      circle(24, 36, 1.5, 'var(--blue)'),
    alarm: () =>
      rect(6, 4, 36, 40, 4) +
      rect(11, 9, 26, 10, 2, 'var(--soft)') +
      [25, 31, 37].map((y) => [16, 24, 32].map((x) => circle(x, y, 1.5)).join('')).join(''),
    pump: () =>
      rect(5, 18, 24, 19, 4, 'var(--soft)') +
      circle(35, 27, 9) +
      path('M32 18V7h10M8 37v5h30M9 21v12M14 21v12M19 21v12'),
  };
  const mapping = {};
  const assign = (family, entries) =>
    Object.entries(entries).forEach(([type, options]) => {
      mapping[type] = { family, ...options };
    });
  assign('rocker', {
    'single-way-switch': {},
    'two-way-switch': { tag: '2 WAY' },
    'intermediate-switch': { tag: 'INTER' },
    'double-pole-switch': { tag: 'DP' },
    'double-gang-switch': { n: 2 },
  });
  assign('rotary', {
    'rotary-selector-switch': {},
    'isolator-switch': { tag: 'ISOLATE' },
    'fan-dimmer': { tag: 'FAN' },
    'dimmer-switch': { tag: 'DIM' },
  });
  assign('bulb', {
    bulb: { tag: 'LED' },
    'bulb-incandescent': {},
    'bulb-smart-rgb': { tag: 'RGB' },
  });
  assign('breaker', {
    mcb: { tag: 'B16' },
    'mcb-type-c': { tag: 'C32' },
    'mcb-type-d': { tag: 'D63' },
    mccb: { tag: '100A', wide: true },
    rcd: { tag: 'RCD', wide: true, test: true },
    rcbo: { tag: 'RCBO', test: true },
    afdd: { tag: 'AFDD', wide: true, test: true },
    spd: { tag: 'SPD' },
    'main-switch': { tag: 'MAIN', wide: true },
  });
  assign('outlet', {
    'socket-2pin': { style: '2pin' },
    'socket-3pin': {},
    'double-socket': { double: true },
    'socket-usb': { usb: true },
    'socket-us': { style: 'us' },
    'double-socket-us': { style: 'us', double: true },
    'socket-schuko': { style: 'round' },
    'socket-schuko-double': { style: 'round', double: true },
    'socket-as3112': { style: 'au' },
    'socket-as3112-double': { style: 'au', double: true },
    'socket-bs546': { style: 'bs546' },
    'socket-bs546-double': { style: 'bs546', double: true },
    'switched-socket': { switched: true },
  });
  assign('board', {
    'distribution-board': {},
    'distribution-box': { n: 3 },
    'distribution-board-3phase': { n: 4 },
  });
  assign('extractor', { 'extractor-fan': {}, 'industrial-exhaust-fan': { round: true } });
  assign('motor', { motor: {}, 'motor-3phase': { tag: '3~' } });
  assign('heater', { 'space-heater': {}, 'storage-heater': { tag: 'STORE' } });
  assign('washer', { 'washing-machine': { tag: 'W' }, 'tumble-dryer': { tag: 'DRY' } });
  assign('element', {
    'immersion-heater': {},
    'heating-element': {},
    'underfloor-heating': { floor: true },
  });
  assign('thermostat', {
    thermostat: {},
    'heating-thermostat': {},
    'room-thermostat': { round: true },
  });
  assign('terminal', {
    'live-terminal': { tag: 'L' },
    'neutral-terminal': { tag: 'N' },
    'earth-terminal': { tag: 'PE' },
  });
  assign('mains', {
    'ac-mains-supply': { tag: 'AC' },
    'ac-three-phase-supply': { tag: '3~', n: 5 },
  });
  assign('timer', {
    'timer-switch': { clock: true },
    'digital-weekly-timer': { tag: '7D' },
    'staircase-timer': { tag: 'DELAY' },
    'countdown-timer': { tag: '00:30' },
    'delay-timer': { tag: 'ON/OFF' },
  });
  assign('transformer', {
    'transformer-8v': { tag: '8V' },
    'transformer-12v': { tag: '12V' },
    'transformer-24v': { tag: '24V' },
    'step-up-down-transformer': { tag: '110/230' },
  });
  assign('relay', {
    'relay-spst': { tag: 'SPST' },
    'relay-spdt': { tag: 'SPDT' },
    'relay-dpdt': { tag: 'DPDT' },
    'control-relay': { tag: '8 PIN' },
  });
  assign('contactor', {
    contactor: { n: 3 },
    'contactor-1p': { n: 1 },
    'contactor-2p': { n: 2 },
    'contactor-3p': { n: 3 },
    'contactor-4p': { n: 4 },
  });
  const singles = {
    'push-button': 'push',
    'cooker-unit': 'cooker',
    'bulb-halogen': 'halogen',
    'bulb-cfl': 'cfl',
    'led-downlight': 'downlight',
    'tube-light': 'tube',
    fuse: 'fuse',
    'fused-spur': 'spur',
    'socket-gfci': 'gfci',
    'socket-industrial': 'industrial',
    'shaver-socket': 'shaver',
    'ceiling-fan': 'ceiling',
    'table-fan': 'deskfan',
    bell: 'bell',
    'water-heater': 'tank',
    'air-conditioner': 'aircon',
    'induction-hob': 'hob',
    'ev-charger': 'charger',
    'electric-shower': 'shower',
    'extractor-hood': 'hood',
    'heat-pump': 'heatpump',
    dishwasher: 'dishwasher',
    'fridge-freezer': 'fridge',
    'pir-sensor': 'pir',
    'photocell-sensor': 'photocell',
    'smart-relay': 'smartrelay',
    'dc-battery-12v': 'battery',
    'solar-pv-panel': 'solar',
    'diesel-generator': 'generator',
    'kwh-meter': 'meter',
    'earth-rod': 'rod',
    'junction-box': 'junction',
    'terminal-strip': 'strip',
    'wago-connector': 'wago',
    'temperature-sensor': 'probe',
    'door-sensor': 'door',
    'electric-buzzer': 'buzzer',
    'wireless-doorbell': 'chime',
    'alarm-siren': 'siren',
    'smoke-alarm': 'smoke',
    'burglar-alarm': 'alarm',
    'water-pump': 'pump',
  };
  Object.entries(singles).forEach(([type, family]) => {
    mapping[type] = { family };
  });
  const baseTypes = {
    supply: 'ac-mains-supply',
    switch: 'single-way-switch',
    lamp: 'bulb',
    socket: 'socket-3pin',
    breaker: 'mcb',
    relay: 'control-relay',
    motor: 'motor',
    junction: 'junction-box',
  };
  function device(type) {
    const def = mapping[type];
    if (!def) throw Error(`Missing artwork: ${type}`);
    return `<g stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${shapes[def.family](def)}</g>`;
  }
  function symbol(type) {
    const def = DesignCatalog.catalog.find((d) => d.type === type);
    const f = mapping[type].family;
    if (f === 'transformer')
      return path(
        'M4 8h8q10 5 0 10q10 5 0 10q10 5 0 10H4M44 8h-8q-10 5 0 10q-10 5 0 10q-10 5 0 10h8M23 5v38M26 5v38',
      );
    if (['terminal', 'rod', 'junction', 'strip', 'wago'].includes(f))
      return '<use href="#s-junction"/>';
    if (['relay', 'contactor', 'smartrelay'].includes(f)) return '<use href="#s-relay"/>';
    if (['motor', 'pump', 'ceiling', 'extractor', 'deskfan', 'heatpump'].includes(f))
      return '<use href="#s-motor"/>';
    if (['bell', 'buzzer', 'chime', 'siren', 'smoke', 'alarm'].includes(f))
      return path('M4 18h10l14-8v28l-14-8H4ZM34 14q12 10 0 20M30 20q4 4 0 8');
    if (f === 'solar') return circle(24, 24, 15) + path('M3 24h6M39 24h6M18 18h12M18 26h4M26 26h4');
    if (def.category === 'supply')
      return f === 'battery'
        ? path('M3 24h13M16 10v28M23 16v16M30 10v28M37 16v16M37 24h8')
        : '<use href="#s-supply"/>';
    const id = {
      switch: 'switch',
      lighting: 'lamp',
      protection: 'breaker',
      socket: 'socket',
      fan: 'motor',
      motor: 'motor',
      timer: 'switch',
      control: 'switch',
      thermostat: 'switch',
      sensor: 'switch',
    }[def.category];
    return id
      ? `<use href="#s-${id}"/>`
      : rect(10, 17, 28, 14, 0, 'none') + path('M2 24h8M38 24h8');
  }
  function markup(type) {
    return `<span class="icon-pair" data-art-family="${mapping[type].family}"><svg class="device-preview" viewBox="0 0 48 48" aria-hidden="true">${device(type)}</svg><svg class="symbol-preview" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6">${symbol(type)}</svg></span>`;
  }
  window.DeviceArtwork = { mapping, baseTypes, device, symbol, markup };
})();
