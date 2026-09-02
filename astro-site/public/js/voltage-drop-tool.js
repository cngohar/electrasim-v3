/**
 * voltage-drop-tool.js
 * ElectraSim Electrical Toolbox — Voltage Drop Calculator Client Engine
 * Pure Vanilla JavaScript • Zero Runtime Dependencies • Lightweight & Fast
 */

(() => {
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
  const MOBILE_VIEWPORT = window.matchMedia('(max-width: 768px)');
  // Chrome (drawer, command palette, help dialog, fullscreen, focus trapping)
  // is shared by every tool page and lives in public/js/tool-chrome.js. This
  // engine only registers the actions that make sense for voltage drop.
  const chrome = () => window.ElectraChrome;
  function pushOverlay(el, trigger, initialFocus) {
    chrome()?.pushOverlay(el, trigger, initialFocus);
  }
  function popOverlay(el) {
    chrome()?.popOverlay(el);
  }

  // Conductor Constants
  const MATERIALS = {
    copper: { rho20: 0.0172, alpha: 0.00393 },
    aluminum: { rho20: 0.0282, alpha: 0.00403 },
  };
  const DEFAULT_REACTANCE = 8e-5; // 0.08 mΩ/m

  // Regional limit banding. Physics is identical (resistivity-based); only the
  // compliance ceilings and citations switch between standards.
  // Verified against the published texts (2026-08 audit):
  //   BS 7671:2018+A4:2026 Reg 525.1 / Appendix 4 Table 4Ab
  //     public LV supply: 3 % lighting, 5 % other uses; private LV supply: 6 % / 8 %.
  //   IEC 60364-5-52 Annex G, Table G.52.1 (informative)
  //     public LV network: 3 % lighting, 5 % other uses; private LV supply: 6 % / 8 %;
  //     long runs may add 0.005 % per metre beyond 100 m, capped at +0.5 %.
  // Both sets share the same ceilings for public supplies — IEC keeps its own band
  // because of the long-run allowance and the national-annex variations it defers to.
  const VD_STANDARDS = {
    'uk-bs7671': {
      label: 'BS 7671:2018+A4:2026',
      region: 'United Kingdom',
      goodPct: 3,
      hardPct: 5,
      privateGoodPct: 6,
      privateHardPct: 8,
      goodDesc:
        'The voltage drop is within the BS 7671 3% lighting-circuit guideline (6.9 V at 230 V).',
      warningDesc:
        'Voltage drop is between 3% and 5%. Acceptable for general power circuits per BS 7671 Appendix 4, but close to limit.',
      excessiveDesc:
        'Voltage drop exceeds the BS 7671 5% ceiling. Conductor is undersized or run is too long. Upsize cable cross-section.',
      citation:
        'Results calculated per BS 7671:2018+A4:2026 — Appendix 4 limits: 3% lighting / 5% power circuits from a public LV supply origin.',
      echo: 'Verified against <strong>BS 7671:2018+A4:2026 (UK)</strong> — Appendix 4 limits: 3% lighting / 5% power circuits.',
    },
    'iec-60364': {
      label: 'IEC 60364',
      region: 'International (IEC)',
      goodPct: 3,
      hardPct: 5,
      privateGoodPct: 6,
      privateHardPct: 8,
      goodDesc:
        'The voltage drop is within the IEC 60364-5-52 Annex G 3% lighting ceiling (5% for other uses) on a public LV supply.',
      warningDesc:
        'Voltage drop is between 3% and 5%. Acceptable for other uses under Annex G Table G.52.1, but over the lighting ceiling.',
      excessiveDesc:
        'Voltage drop exceeds the IEC 60364-5-52 Annex G 5% guidance for public supplies. Upsize the conductor or shorten the run.',
      citation:
        'Results calculated per IEC 60364-5-52 Annex G, Table G.52.1 — 3% lighting / 5% other uses from a public LV supply; 6% / 8% from a private LV supply. Informative guidance: national annexes may vary.',
      echo: 'Verified against <strong>IEC 60364 (International)</strong> — Annex G limits: 3% lighting / 5% other circuits, 6%/8% on private supplies.',
    },
  };

  // Educational Tips Carousel
  // Field notes. Every figure here was checked against the published sources:
  // BS 7671 Appendix 4 / Reg 525.1, IEC 60364-5-52 Annex G, IET GN3, EN 50160
  // and the resistivity constants (IEC 60228 / 60889).
  const TIPS = [
    'Green particles show the flow of electricity. Some voltage is lost along the cable because the conductor has resistance.',
    'Larger cables (higher mm²) have lower resistance: doubling the cross-section halves the volt drop.',
    'Doubling the route length doubles the voltage drop — and it also doubles the I²R heating of the cable.',
    'BS 7671 Reg 525.1 allows 3% for lighting and 5% for other final circuits, measured from the origin of the installation, not from the consumer unit.',
    'Aluminum has ~64% more resistance than copper of the same size, so an aluminum run needs roughly two sizes up to match the drop.',
    'Resistance climbs about 0.39% per °C for copper: a PVC cable at its 70 °C design temperature drops ~20% more than the same cable cold at 20 °C.',
    'The mV/A/m figures in BS 7671 Appendix 4 already assume the conductor is at its maximum operating temperature — compare like for like.',
    'For ring final circuits, current reaches the load from both ends: use the distance to the furthest socket along one path, not the whole ring length.',
    'The 3%/5% allowance covers the installation only. EN 50160 lets the DNO sit at -6%/+10% of 230 V on top of that, so budget the worst case.',
    'Motors are the exception: a direct-on-line start pulls 6-8x full-load current, so check the drop at start too — 10-15% momentary is the usual limit.',
    'For DC (battery, solar, EV) only resistance matters: reactance is zero, but the round trip is 2x the one-way length.',
    'Three-phase wins on long runs: a balanced 400 V circuit needs only sqrt(3) x I x L x Z instead of the 2 x round trip of single-phase.',
    'Terminals add up: a loose or corroded connection can cost more volts than 30 m of cable. Torque every joint before blaming the run.',
    'Voltage drop is wasted energy. A 5% drop on a 32 A circuit that runs 3000 h a year burns roughly £180 of electricity at 27p/kWh.',
    'Sub-main budgets: allow ~0.5% for the consumer mains, 1.5-2% for a submain, and leave the rest for the final circuit. The limits are cumulative.',
    'Switch on the reactance option for cables 16 mm² and above, or for large motor feeders — that is where X starts to matter.',
    'Harmonics inflate the drop: BS 7671 says the calculated voltage drop must include the effects of harmonic current, and neutral conductors can need upsizing.',
    'LED drivers and dimmers dislike undervoltage more than lamps do: flicker and buzz appear long before the 3% lighting limit is breached.',
  ];

  // Real-world circuit presets — typical UK/international installs with the
  // cable an electrician would actually reach for (size checked against the
  // BS 7671 current-carrying capacity and voltage-drop tables).
  const PRESETS = [
    {
      id: 'domestic-lighting',
      name: 'House lighting radial',
      blurb:
        '1.5 mm² T&E on a 10 A MCB feeding LED downlights 45 m from the board. At the 70 °C design temperature this run lands just over the 3% lighting ceiling, so 2.5 mm² is the usual fix.',
      values: {
        systemType: 'single',
        voltage: 230,
        current: 6,
        length: 45,
        size: 1.5,
        material: 'copper',
        pf: 0.98,
        temp: 70,
        standard: 'uk-bs7671',
      },
    },
    {
      id: 'kitchen-radial',
      name: 'Kitchen radial socket',
      blurb:
        '32 A radial for a kitchen ring spur area in 6 mm² T&E, 20 m of run with appliances, kettle included. Comfortably inside the 5% power ceiling.',
      values: {
        systemType: 'single',
        voltage: 230,
        current: 32,
        length: 20,
        size: 6,
        material: 'copper',
        pf: 0.95,
        temp: 70,
        standard: 'uk-bs7671',
      },
    },
    {
      id: 'ev-7kw',
      name: 'EV charger 7 kW',
      blurb:
        'Single-phase 32 A wall-box on a 25 m run of 10 mm². This is the sizing most installers use to keep the drop under 2% so the charger never derates.',
      values: {
        systemType: 'single',
        voltage: 230,
        current: 32,
        length: 25,
        size: 10,
        material: 'copper',
        pf: 1,
        temp: 70,
        standard: 'uk-bs7671',
      },
    },
    {
      id: 'ev-11kw',
      name: 'EV charger 11 kW (3-Φ)',
      blurb:
        'Three-phase 16 A per phase on 4 mm² over 30 m. Splitting the load across three phases is why an 11 kW charger needs a smaller cable than a 7 kW single-phase one.',
      values: {
        systemType: 'three',
        voltage: 400,
        current: 16,
        length: 30,
        size: 4,
        material: 'copper',
        pf: 0.99,
        temp: 70,
        standard: 'uk-bs7671',
      },
    },
    {
      id: 'shower',
      name: 'Electric shower 9.5 kW',
      blurb:
        '41 A shower on a 12 m run of 10 mm² — the classic "short but heavy" circuit, where ampacity rather than volt drop sets the size.',
      values: {
        systemType: 'single',
        voltage: 230,
        current: 41,
        length: 12,
        size: 10,
        material: 'copper',
        pf: 1,
        temp: 70,
        standard: 'uk-bs7671',
      },
    },
    {
      id: 'shed-submain',
      name: 'Garden office submain',
      blurb:
        '32 A three-phase submain to an outbuilding — 120 m of 10 mm² XLPE/SWA (90 °C conductor). Long enough that the IEC Annex G relief for runs over 100 m comes into play, which the note under the verdict quotes.',
      values: {
        systemType: 'three',
        voltage: 400,
        current: 32,
        length: 120,
        size: 10,
        material: 'copper',
        pf: 0.9,
        temp: 90,
        standard: 'iec-60364',
      },
    },
    {
      id: 'long-shed',
      name: 'Long shed run (fails)',
      blurb:
        '16 A workshop consumer fed 85 m on 2.5 mm² — a very common DIY shortcut. It works out at 21.27 V (9.25%), well outside both standards; 6 mm² brings it to 3.9% and 10 mm² to 2.3%.',
      values: {
        systemType: 'single',
        voltage: 230,
        current: 16,
        length: 85,
        size: 2.5,
        material: 'copper',
        pf: 0.95,
        temp: 70,
        standard: 'uk-bs7671',
      },
    },
    {
      id: 'battery-dc',
      name: '48 V battery link (DC)',
      blurb:
        '100 A from a lithium bank to the inverter over 4 m of 25 mm². On low-voltage DC the cable length is the whole story — this is why battery cables are short and fat.',
      values: {
        systemType: 'dc',
        voltage: 48,
        current: 100,
        length: 4,
        size: 25,
        material: 'copper',
        pf: 1,
        temp: 30,
        standard: 'iec-60364',
      },
    },
    {
      id: 'motor',
      name: 'Workshop motor 5.5 kW',
      blurb:
        '400 V three-phase 5.5 kW motor (11 A) on 2.5 mm², 35 m. Fine running, but a direct-on-line start at 6x current momentarily multiplies the drop — check the torque too.',
      values: {
        systemType: 'three',
        voltage: 400,
        current: 11,
        length: 35,
        size: 2.5,
        material: 'copper',
        pf: 0.86,
        temp: 70,
        standard: 'uk-bs7671',
      },
    },
    {
      id: 'aluminium-feed',
      name: 'Aluminum submain',
      blurb:
        'Same 32 A load on 16 mm² aluminum instead of 10 mm² copper, 60 m — the classic trade-off on long agricultural and industrial feeders.',
      values: {
        systemType: 'three',
        voltage: 400,
        current: 32,
        length: 60,
        size: 16,
        material: 'aluminum',
        pf: 0.9,
        temp: 70,
        standard: 'iec-60364',
      },
    },
  ];

  // Default State
  const state = {
    systemType: 'single', // 'dc' | 'single' | 'three'
    voltage: 230,
    standard: 'uk-bs7671', // 'uk-bs7671' | 'iec-60364'
    voltsUnit: 'V', // 'V' | 'kV'
    current: 40,
    length: 50,
    size: 10,
    material: 'copper',
    pf: 0.92,
    temp: 20,
    reactance: false,
    preset: '',
    animate: true,
    showValues: true,
    showLegend: true,
    showTips: true,
    threeD: false,
    parallax: { x: 0, y: 0 },
    tipIndex: Math.floor(Math.random() * (typeof TIPS !== 'undefined' ? TIPS.length : 18)),
  };

  // Shareable calculation URLs: state is mirrored into the query string on
  // every change (history.replaceState) so a copied link replays the exact
  // scenario — voltage, current, run, size, material, pf, temp, standard.
  let urlArmed = false;

  function syncUrl() {
    const S = window.ToolShare;
    if (!S || !urlArmed) return;
    S.pushParams({
      preset: state.preset || undefined,
      standard: state.standard,
      system: state.systemType,
      voltage: state.voltage,
      voltsunit: state.voltsUnit,
      current: state.current,
      length: state.length,
      size: state.size,
      material: state.material,
      pf: state.pf,
      temp: state.temp,
      reactance: state.reactance ? 1 : 0,
    });
  }

  const SYSTEM_DEFAULTS = {
    single: { voltage: 230, current: 40, length: 50, size: 10, pf: 0.92, temp: 20 },
    three: { voltage: 400, current: 16, length: 50, size: 6, pf: 0.92, temp: 20 },
    dc: { voltage: 48, current: 50, length: 5, size: 16, pf: 1, temp: 20 },
  };

  function applySystemDefaults(type) {
    const values = SYSTEM_DEFAULTS[type];
    if (!values) return;
    Object.assign(state, values, { voltsUnit: 'V', preset: '' });
    const fields = {
      voltage: 'input-voltage',
      current: 'input-current',
      length: 'input-length',
      size: 'input-size',
      pf: 'input-pf',
      temp: 'input-temp',
    };
    for (const [key, id] of Object.entries(fields)) {
      const el = document.getElementById(id);
      if (el) el.value = String(values[key]);
    }
    const unit = document.getElementById('select-voltage-unit');
    if (unit) unit.value = 'V';
  }

  function syncSegmentedButtons(type) {
    document.querySelectorAll('.seg-btn').forEach((b) => {
      const on = b.getAttribute('data-system-type') === type;
      b.classList.toggle('active', on);
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.setAttribute('tabindex', on ? '0' : '-1');
    });
  }

  function restoreFromUrl() {
    const S = window.ToolShare;
    if (!S) return;
    const p = S.readParams();
    if (![...p.keys()].length) return;
    urlArmed = true;

    const $id = (id) => document.getElementById(id);

    // A shared preset is applied first, then any explicit field params on top.
    const presetId = p.get('preset');
    if (presetId) applyPreset(presetId, { silent: true });
    const setField = (key, id, bounds, targetKey) => {
      const n = S.numParam(p, key, bounds);
      if (n === undefined) return;
      state[targetKey] = String(n);
      const el = $id(id);
      if (el) el.value = String(n);
    };

    const std = p.get('standard');
    if (std === 'uk-bs7671' || std === 'iec-60364') {
      state.standard = std;
      const sel = $id('input-standard');
      if (sel) sel.value = std;
    }
    const sys = p.get('system');
    if (sys === 'dc' || sys === 'single' || sys === 'three') {
      state.systemType = sys;
      syncSegmentedButtons(sys);
    }
    const unit = p.get('voltsunit');
    if (unit === 'kV' || unit === 'V') {
      state.voltsUnit = unit;
      const selU = $id('select-voltage-unit');
      if (selU) selU.value = unit;
    }
    const maxVoltTyped = state.voltsUnit === 'kV' ? 1000 : 1000000;
    setField('voltage', 'input-voltage', { min: 0.0001, max: maxVoltTyped }, 'voltage');
    setField('current', 'input-current', { min: 0, max: 50000 }, 'current');
    setField('length', 'input-length', { min: 0.01, max: 50000 }, 'length');
    setField('size', 'input-size', { min: 0.5, max: 2500 }, 'size');
    const mat = p.get('material');
    if (mat === 'copper' || mat === 'aluminum') {
      state.material = mat;
      const sm = $id('select-material');
      if (sm) sm.value = mat;
    }
    if (state.systemType !== 'dc') {
      setField('pf', 'input-pf', { min: 0.1, max: 1 }, 'pf');
    }
    setField('temp', 'input-temp', { min: -50, max: 250 }, 'temp');
    const rx = p.get('reactance');
    if (rx === '0' || rx === '1') {
      state.reactance = rx === '1';
      const sw = $id('switch-reactance');
      if (sw) sw.setAttribute('aria-checked', state.reactance ? 'true' : 'false');
    }
  }

  // Toast/status pictographs as inline vectors. These mirror the shapes in
  // `src/lib/emoji-icons.ts` (which the Astro components render) — public/ JS is
  // shipped verbatim and cannot import that module, so the handful needed at
  // runtime are kept here. Emoji were removed on purpose: their appearance
  // depends on whichever emoji font the visitor's OS happens to ship.
  const SVG_OPEN =
    '<svg class="emoji-icon emoji-icon--fixed" viewBox="0 0 128 128" width="18" height="18" role="presentation" aria-hidden="true" focusable="false">';
  const ICON_SHAPES = {
    info: '<circle cx="64" cy="64" r="52" fill="#1D9BF0"/><circle cx="64" cy="38" r="9" fill="#fff"/><rect x="56" y="54" width="16" height="42" rx="8" fill="#fff"/>',
    warning:
      '<path d="M64 12 122 116H6z" fill="#FFCC4D" stroke="#F4900C" stroke-width="9" stroke-linejoin="round"/><rect x="57" y="52" width="14" height="36" rx="7" fill="#fff"/><circle cx="64" cy="100" r="8" fill="#fff"/>',
    success:
      '<rect x="8" y="8" width="112" height="112" rx="26" fill="#17BF63"/><path d="M34 66 55 87l39-45" fill="none" stroke="#fff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>',
    reset:
      '<g fill="none" stroke="#1D9BF0" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"><path d="M104 60a40 40 0 1 1-12-28"/><path d="M100 12v24H76"/></g>',
    ruler:
      '<path d="M14 114 114 114 14 18z" fill="#A6D7F0" stroke="#1D9BF0" stroke-width="9" stroke-linejoin="round"/><path d="M14 92h16M22 78v16M34 66h16M42 52v16" stroke="#1D9BF0" stroke-width="7" stroke-linecap="round"/>',
    link: '<g fill="none" stroke="#66757F" stroke-width="13" stroke-linecap="round"><rect x="12" y="46" width="54" height="36" rx="18" transform="rotate(-45 39 64)"/><rect x="62" y="46" width="54" height="36" rx="18" transform="rotate(-45 89 64)"/></g>',
    bulb: '<path d="M64 12c-20 0-36 15-36 34 0 12 6 20 13 27 4 4 5 8 5 12h36c0-4 1-8 5-12 7-7 13-15 13-27 0-19-16-34-36-34z" fill="#FFD422"/><path d="M50 98h28v9H50zM53 111h22a9 9 0 0 1-9 8h-4a9 9 0 0 1-9-8z" fill="#8899A6"/>',
  };
  /** Full inline SVG for an icon key (falls back to the info sign). */
  function iconSvg(key) {
    return `${SVG_OPEN}${ICON_SHAPES[key] || ICON_SHAPES.info}</svg>`;
  }

  // Severity colors
  const SEVERITY_COLORS = {
    good: { stroke: '#10b981', fill: '#d9f99d', glow: '#22c55e', text: '#16a34a' },
    warning: { stroke: '#f59e0b', fill: '#fed7aa', glow: '#fb923c', text: '#d97706' },
    excessive: { stroke: '#ef4444', fill: '#fecaca', glow: '#ef4444', text: '#dc2626' },
    invalid: { stroke: '#ef4444', fill: '#fee2e2', glow: '#ef4444', text: '#dc2626' },
  };

  // ─────────────────────────────────────────────────────────────
  // INPUT VALIDATION & FRIENDLY ERROR HANDLING
  // ─────────────────────────────────────────────────────────────

  /**
   * Errors are only painted for fields the user has left (blur) or after an
   * explicit "Calculate" press. While typing, invalid intermediate states stay
   * silent so the form never scolds mid-entry.
   */
  const FIELD_IDS = ['voltage', 'current', 'length', 'size', 'pf', 'temp'];
  const touchedFields = new Set();
  let displayedFieldErrorCount = 0;

  function validateAllInputs() {
    const errors = {};
    const errorNotices = [];

    // 1. Voltage validation
    const rawV = Number.parseFloat(state.voltage);
    const voltageInVolts = state.voltsUnit === 'kV' ? rawV * 1000 : rawV;

    if (Number.isNaN(rawV) || state.voltage === '' || state.voltage === null) {
      errors.voltage = 'Please enter a system voltage.';
      errorNotices.push('System voltage is missing.');
    } else if (voltageInVolts <= 0) {
      errors.voltage = 'Voltage must be greater than 0 V.';
      errorNotices.push('Voltage cannot be zero or negative.');
    } else if (voltageInVolts > 1_000_000) {
      errors.voltage = 'Voltage cannot exceed 1,000 kV.';
      errorNotices.push('Voltage exceeds maximum limit of 1,000 kV.');
    }

    // 2. Current validation
    const rawI = Number.parseFloat(state.current);
    if (Number.isNaN(rawI) || state.current === '' || state.current === null) {
      errors.current = 'Please enter load current.';
      errorNotices.push('Load current is missing.');
    } else if (rawI < 0) {
      errors.current = 'Load current cannot be negative.';
      errorNotices.push('Current cannot be negative.');
    } else if (rawI > 50_000) {
      errors.current = 'Current cannot exceed 50,000 A.';
      errorNotices.push('Current exceeds maximum limit of 50,000 A.');
    }

    // 3. Length validation
    const rawL = Number.parseFloat(state.length);
    if (Number.isNaN(rawL) || state.length === '' || state.length === null) {
      errors.length = 'Please enter one-way cable length.';
      errorNotices.push('Cable run length is missing.');
    } else if (rawL <= 0) {
      errors.length = 'Cable length must be greater than 0 m.';
      errorNotices.push('Cable length must be greater than 0 meters.');
    } else if (rawL > 50_000) {
      errors.length = 'Length cannot exceed 50,000 m.';
      errorNotices.push('Cable length exceeds maximum limit of 50,000 m.');
    }

    // 4. Cable Size validation
    const rawSize = Number.parseFloat(state.size);
    if (Number.isNaN(rawSize) || state.size === '' || state.size === null) {
      errors.size = 'Please enter cable cross-section (mm²).';
      errorNotices.push('Cable size is missing.');
    } else if (rawSize < 0.5) {
      errors.size = 'Minimum conductor size is 0.5 mm².';
      errorNotices.push('Cable cross-section is too small (minimum 0.5 mm²).');
    } else if (rawSize > 2_500) {
      errors.size = 'Cable size cannot exceed 2,500 mm².';
      errorNotices.push('Cable size exceeds maximum limit of 2,500 mm².');
    }

    // 5. Power Factor validation (AC only)
    if (state.systemType !== 'dc') {
      const rawPf = Number.parseFloat(state.pf);
      if (Number.isNaN(rawPf) || state.pf === '' || state.pf === null) {
        errors.pf = 'Please enter power factor (0.1 to 1.0).';
        errorNotices.push('Power factor is missing.');
      } else if (rawPf < 0.1 || rawPf > 1.0) {
        errors.pf = 'Power factor must be between 0.10 and 1.00.';
        errorNotices.push('Power factor must be between 0.10 and 1.00.');
      }
    }

    // 6. Conductor Temperature validation
    const rawTemp = Number.parseFloat(state.temp);
    if (Number.isNaN(rawTemp) || state.temp === '' || state.temp === null) {
      errors.temp = 'Please enter conductor temperature.';
      errorNotices.push('Conductor temperature is missing.');
    } else if (rawTemp < -50 || rawTemp > 250) {
      errors.temp = 'Temperature must be between -50 °C and 250 °C.';
      errorNotices.push('Temperature must be between -50 °C and 250 °C.');
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      errorNotices,
      voltageInVolts,
      current: rawI,
      length: rawL,
      size: rawSize,
      pf: state.systemType === 'dc' ? 1.0 : Number.parseFloat(state.pf) || 0.92,
      temp: rawTemp,
    };
  }

  function displayFieldErrors(errors) {
    const fields = [
      { id: 'voltage', wrap: 'wrap-voltage', err: 'err-voltage', input: 'input-voltage' },
      { id: 'current', wrap: 'wrap-current', err: 'err-current', input: 'input-current' },
      { id: 'length', wrap: 'wrap-length', err: 'err-length', input: 'input-length' },
      { id: 'size', wrap: 'wrap-size', err: 'err-size', input: 'input-size' },
      { id: 'pf', wrap: 'wrap-pf', err: 'err-pf', input: 'input-pf' },
      { id: 'temp', wrap: 'wrap-temp', err: 'err-temp', input: 'input-temp' },
    ];

    displayedFieldErrorCount = 0;

    fields.forEach(({ id, wrap, err, input }) => {
      const elWrap = document.getElementById(wrap);
      const elErr = document.getElementById(err);
      const elInput = document.getElementById(input);
      const errMsg = touchedFields.has(id) ? errors[id] : undefined;

      if (errMsg) {
        displayedFieldErrorCount += 1;
        if (elWrap) elWrap.classList.add('has-error');
        if (elInput) elInput.setAttribute('aria-invalid', 'true');
        if (elErr) {
          elErr.textContent = errMsg;
          elErr.hidden = false;
        }
      } else {
        if (elWrap) elWrap.classList.remove('has-error');
        if (elInput) elInput.removeAttribute('aria-invalid');
        if (elErr) {
          elErr.textContent = '';
          elErr.hidden = true;
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CALCULATION ENGINE
  // ─────────────────────────────────────────────────────────────
  function calculate() {
    const val = validateAllInputs();

    displayFieldErrors(val.errors);

    if (!val.isValid) {
      return {
        valid: false,
        voltageDrop: 0,
        dropPct: 0,
        loadVoltage: 0,
        powerLoss: 0,
        severity: 'invalid',
        statusTitle: 'Invalid Inputs',
        statusDesc:
          'Please correct the highlighted fields on the left panel to calculate voltage drop.',
        errorNotices: val.errorNotices,
      };
    }

    const { voltageInVolts, current, length, size, pf, temp } = val;
    const std = VD_STANDARDS[state.standard] || VD_STANDARDS['uk-bs7671'];
    const mat = MATERIALS[state.material] || MATERIALS.copper;
    const rhoT = Math.max(0, mat.rho20 * (1 + mat.alpha * (temp - 20)));
    const r = rhoT / size; // Ω/m
    const x = state.systemType !== 'dc' && state.reactance ? DEFAULT_REACTANCE : 0;
    const sinPhi = state.systemType === 'dc' ? 0 : Math.sqrt(Math.max(0, 1 - pf * pf));

    const roundTripMult = state.systemType === 'three' ? Math.sqrt(3) : 2;
    const powerLossMult = state.systemType === 'three' ? 3 : 2;

    const effectiveImpedance = r * pf + x * sinPhi;
    const voltageDrop = roundTripMult * current * length * effectiveImpedance;
    const dropPct = voltageInVolts > 0 ? (voltageDrop / voltageInVolts) * 100 : 0;
    const loadVoltage = Math.max(0, voltageInVolts - voltageDrop);
    const powerLoss = current * current * (powerLossMult * r * length);

    // Limit banding follows the selected regional standard. Both metric
    // standards share 3% (lighting) / 5% (other uses) for a public LV supply;
    // the IEC profile additionally documents the 6%/8% private-supply and the
    // >100 m long-run allowances from Table G.52.1.
    let severity = 'good';
    if (dropPct > std.hardPct + 1e-9) {
      severity = 'excessive';
    } else if (dropPct > std.goodPct + 1e-9) {
      severity = 'warning';
    }

    let statusTitle = 'Good';
    let statusDesc = std.goodDesc;
    if (severity === 'warning') {
      statusTitle = 'Marginal';
      statusDesc = std.warningDesc;
    } else if (severity === 'excessive') {
      statusTitle = 'Excessive';
      statusDesc = std.excessiveDesc;
    }

    // ── Real-world cross-checks shown under the verdict ──────────────
    // (1) Design-temperature figure. Compliance tables (BS 7671 Appendix 4,
    //     IEC 60364-5-52) publish mV/A/m at the conductor's maximum operating
    //     temperature, so a calculation at 20 °C reads optimistic. Restate the
    //     same circuit at the 70 °C PVC design temperature for comparison.
    const designTempC = 70;
    const rhoDesign = Math.max(0, mat.rho20 * (1 + mat.alpha * (designTempC - 20)));
    const rDesign = rhoDesign / size;
    // Reactance is a geometry/insulation property, so only the resistive part
    // is re-evaluated at the design temperature.
    const designDrop = roundTripMult * current * length * (rDesign * pf + x * sinPhi);
    const designDropPct = voltageInVolts > 0 ? (designDrop / voltageInVolts) * 100 : 0;

    // (2) IEC Annex G long-run allowance: ceilings may be increased by
    //     0.005 % per metre beyond 100 m of cable system, capped at +0.5 %.
    const longRunAllowance = length > 100 ? Math.min(0.5, 0.005 * (length - 100)) : 0;

    const notes = [];
    if (
      Number.isFinite(temp) &&
      temp < designTempC - 0.5 &&
      Math.abs(designDropPct - dropPct) > 0.02
    ) {
      notes.push(
        `At the ${designTempC} °C design temperature the BS 7671 / IEC tables assume, this run is ${designDrop.toFixed(2)} V (${designDropPct.toFixed(2)}%) — tabulated mV/A/m values are quoted for a hot conductor, not a cold one.`,
      );
    }
    if (longRunAllowance > 0 && state.standard === 'iec-60364') {
      notes.push(
        `IEC 60364-5-52 Annex G permits +${longRunAllowance.toFixed(2)}% on a ${Math.round(length)} m run (0.005%/m beyond 100 m, max +0.5%), so the ceiling here could be read as ${(std.hardPct + longRunAllowance).toFixed(2)}%.`,
      );
    }
    if (state.systemType === 'three' && pf < 0.95 && !state.reactance && size >= 16) {
      notes.push(
        'Large cable plus a low power factor: switch on cable reactance — from 16 mm² upward X (≈0.08 mΩ/m) starts to move the answer.',
      );
    }
    if (severity === 'excessive') {
      const next = nextSizeUp(size);
      if (next) {
        const rNext = rhoT / next;
        const dropNext = roundTripMult * current * length * (rNext * pf + x * sinPhi);
        notes.push(
          `Next standard size up (${next} mm²) would give ${dropNext.toFixed(2)} V (${((dropNext / Math.max(voltageInVolts, 1e-9)) * 100).toFixed(2)}%).`,
        );
      }
    }

    return {
      valid: true,
      sourceVoltage: voltageInVolts,
      voltageDrop,
      dropPct,
      loadVoltage,
      powerLoss,
      severity,
      statusTitle,
      statusDesc,
      designDrop,
      designDropPct,
      designTempC,
      longRunAllowance,
      limitPct: std.hardPct,
      goodPct: std.goodPct,
      notes,
      errorNotices: [],
    };
  }

  /**
   * Next preferred conductor cross-section (IEC 60228 preferred sizes used by
   * the BS 7671 / IEC ampacity tables).
   */
  const PREFERRED_SIZES = [1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
  function nextSizeUp(size) {
    return PREFERRED_SIZES.find((s) => s > size + 1e-9);
  }

  // ─────────────────────────────────────────────────────────────
  // FORMATTING HELPERS
  // ─────────────────────────────────────────────────────────────
  function fmtVolts(volts) {
    if (!Number.isFinite(volts)) return '—';
    if (Math.abs(volts) >= 1000) {
      const kv = volts / 1000;
      return `${Number.isInteger(kv) ? kv.toFixed(0) : kv.toFixed(2)} kV`;
    }
    return `${Number.isInteger(volts) ? volts.toFixed(0) : volts.toFixed(1)} V`;
  }

  function fmtPower(watts) {
    if (!Number.isFinite(watts)) return '—';
    if (watts >= 1000) {
      return `${(watts / 1000).toFixed(2)} kW`;
    }
    return `${watts.toFixed(1)} W`;
  }

  // ─────────────────────────────────────────────────────────────
  // SCROLL AFFORDANCE (module scope: updateUI runs before setupEvents wires the
  // listeners, and the mobile sheet needs the same hint)
  // ─────────────────────────────────────────────────────────────
  function updateInputsScrollAffordance() {
    const body = document.getElementById('inputs-body');
    const panel = document.getElementById('inputs-panel');
    if (!body || !panel) return;
    const scrollable = body.scrollHeight - body.clientHeight;
    const atTop = body.scrollTop <= 1;
    const atBottom = scrollable - body.scrollTop <= 1;
    panel.classList.toggle('can-scroll-down', scrollable > 4 && !atBottom);
    panel.classList.toggle('can-scroll-up', scrollable > 4 && !atTop);
  }

  // ─────────────────────────────────────────────────────────────
  // TOAST NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────
  let toastTimer = null;
  function showToast(message, icon = 'info', durationMs = 4000) {
    const elToast = document.getElementById('tool-toast-banner');
    const elIcon = document.getElementById('tool-toast-icon');
    const elText = document.getElementById('tool-toast-text');

    if (!elToast || !elText) return;

    if (toastTimer) clearTimeout(toastTimer);

    if (elIcon) elIcon.innerHTML = iconSvg(icon);
    elText.textContent = message;
    elToast.hidden = false;

    toastTimer = setTimeout(() => {
      elToast.hidden = true;
    }, durationMs);
  }

  // ─────────────────────────────────────────────────────────────
  // DOM UPDATES & DYNAMIC PHYSICS SCENERY
  // ─────────────────────────────────────────────────────────────
  function updateUI() {
    syncUrl();
    const res = calculate();
    updateInputsScrollAffordance();
    const colors = SEVERITY_COLORS[res.severity] || SEVERITY_COLORS.good;

    // 1. Update Results Panel & Error Notice Card
    const elSourceV = document.getElementById('res-source-voltage');
    const elLoadV = document.getElementById('res-load-voltage');
    const elDropV = document.getElementById('res-voltage-drop');
    const elDropPct = document.getElementById('res-drop-percent');
    const elPower = document.getElementById('res-power-loss');
    const elStatusCard = document.getElementById('status-card');
    const elStatusTitle = document.getElementById('status-title');
    const elStatusDesc = document.getElementById('status-desc');
    const elMobileSummary = document.getElementById('mobile-summary-drop');

    const elErrorNoticeCard = document.getElementById('error-notice-card');
    const elErrorNoticeList = document.getElementById('error-notice-list');
    const elResultRowsGroup = document.getElementById('result-rows-group');

    if (!res.valid) {
      // Only swap results for the error card once errors are actually revealed
      // (field blurred or Calculate pressed). Mid-typing, keep the last layout.
      const showNoticeCard = displayedFieldErrorCount > 0;
      if (elErrorNoticeCard) {
        elErrorNoticeCard.hidden = !showNoticeCard;
      }
      if (elResultRowsGroup) {
        elResultRowsGroup.style.display = showNoticeCard ? 'none' : 'flex';
      }
      if (elErrorNoticeList && res.errorNotices && showNoticeCard) {
        elErrorNoticeList.innerHTML = res.errorNotices
          .map((notice) => `<li>${notice}</li>`)
          .join('');
      }
      if (elSourceV) elSourceV.textContent = '—';
      if (elLoadV) {
        elLoadV.textContent = '—';
        elLoadV.style.color = 'var(--text-mid)';
      }
      if (elDropV) {
        elDropV.textContent = '—';
        elDropV.style.color = 'var(--text-mid)';
      }
      if (elDropPct) {
        elDropPct.textContent = '—';
        elDropPct.style.color = 'var(--text-mid)';
      }
      if (elPower) elPower.textContent = '—';

      if (elStatusCard) {
        elStatusCard.className = 'status-card excessive';
      }
      if (elStatusTitle) elStatusTitle.textContent = 'Check Inputs';
      if (elStatusDesc) {
        elStatusDesc.textContent = showNoticeCard
          ? 'Fix the highlighted values to continue calculation.'
          : 'Finish editing to update the calculation.';
      }
      if (elMobileSummary) {
        elMobileSummary.innerHTML = showNoticeCard
          ? `${iconSvg('warning')}<span>Check Inputs</span>`
          : '<span>…</span>';
      }
    } else {
      // Inputs are valid - Display calculations
      if (elErrorNoticeCard) {
        elErrorNoticeCard.hidden = true;
      }
      if (elResultRowsGroup) {
        elResultRowsGroup.style.display = 'flex';
      }
      if (elSourceV) elSourceV.textContent = fmtVolts(res.sourceVoltage);
      if (elLoadV) {
        elLoadV.textContent = fmtVolts(res.loadVoltage);
        elLoadV.style.color = colors.text;
      }
      if (elDropV) {
        elDropV.textContent = `${res.voltageDrop.toFixed(2)} V`;
        elDropV.style.color = colors.text;
      }
      if (elDropPct) {
        elDropPct.textContent = `${res.dropPct.toFixed(2)}%`;
        elDropPct.style.color = colors.text;
      }
      if (elPower) elPower.textContent = fmtPower(res.powerLoss);

      if (elStatusCard) {
        elStatusCard.className = `status-card ${res.severity}`;
      }
      if (elStatusTitle) elStatusTitle.textContent = res.statusTitle;
      if (elStatusDesc) elStatusDesc.textContent = res.statusDesc;

      // Real-world advisories (design temperature, Annex G long-run allowance,
      // the next size up, reactance for big cables) as a vector-icon list.
      const elNotes = document.getElementById('vd-eng-notes');
      if (elNotes) {
        const list = (res.notes || []).filter(Boolean);
        if (list.length) {
          elNotes.hidden = false;
          elNotes.innerHTML = list
            .map((note) => `<li>${iconSvg('bulb')}<span>${note}</span></li>`)
            .join('');
        } else {
          elNotes.hidden = true;
          elNotes.innerHTML = '';
        }
      }

      if (elMobileSummary) {
        elMobileSummary.textContent = `${res.voltageDrop.toFixed(2)} V (${res.dropPct.toFixed(2)}%)`;
      }

      // Standards-of-verification trust surfaces
      const stdMeta = VD_STANDARDS[state.standard] || VD_STANDARDS['uk-bs7671'];
      const elStdNote = document.getElementById('vd-standard-note');
      if (elStdNote) elStdNote.textContent = stdMeta.citation;
      const elStdEcho = document.getElementById('vd-standard-echo');
      if (elStdEcho) elStdEcho.innerHTML = stdMeta.echo;
    }

    // 2. Dynamic Catenary Curve Sag Calculation
    const lengthVal = Math.max(5, Math.min(500, Number.parseFloat(state.length) || 50));
    const sagFactor = Math.min(1.0, lengthVal / 120);
    const sagY1 = 445 + sagFactor * 65;
    const sagY2 = 455 + sagFactor * 65;
    const midSagY = (sagY1 + sagY2) / 2 + 10;

    const catenaryPath = `M510 395 C 660 ${sagY1.toFixed(1)}, 880 ${sagY2.toFixed(1)}, 1032 428`;
    const highlightPath = `M510 392 C 660 ${(sagY1 - 3).toFixed(1)}, 880 ${(sagY2 - 3).toFixed(1)}, 1032 425`;

    const elCableOuter = document.getElementById('cable-outer-path');
    const elCableCore = document.getElementById('cable-core-path');
    const elCableHighlight = document.getElementById('cable-highlight-path');
    const elCableGlow = document.getElementById('cable-glow-path');
    const elCableThermal = document.getElementById('cable-thermal-path');
    const elParticleAnimates = document.querySelectorAll('#cable-particles animateMotion');

    if (elCableOuter) elCableOuter.setAttribute('d', catenaryPath);
    if (elCableCore) elCableCore.setAttribute('d', catenaryPath);
    if (elCableHighlight) elCableHighlight.setAttribute('d', highlightPath);
    if (elCableGlow) {
      elCableGlow.setAttribute('d', catenaryPath);
      elCableGlow.setAttribute('stroke', colors.glow);
      elCableGlow.setAttribute(
        'opacity',
        res.valid ? (res.severity === 'excessive' ? '0.9' : '0.65') : '0.2',
      );
    }

    // Dynamic Thermal Overheat Glow
    if (elCableThermal) {
      elCableThermal.setAttribute('d', catenaryPath);
      const isOverheated = res.valid && (res.powerLoss > 250 || res.severity === 'excessive');
      if (isOverheated) {
        elCableThermal.style.opacity = Math.min(
          0.85,
          0.3 + (res.powerLoss / 2000) * 0.55,
        ).toString();
        elCableThermal.classList.add('active');
      } else {
        elCableThermal.style.opacity = '0';
        elCableThermal.classList.remove('active');
      }
    }

    // Update particle paths
    elParticleAnimates.forEach((anim) => {
      anim.setAttribute('path', catenaryPath);
    });

    // 3. Update Mid-Span Drop Callout Position
    const elDropCalloutWrap = document.getElementById('drop-callout-wrap');
    const elDropPointerLine = document.getElementById('drop-pointer-line');
    const elDropPointerDot = document.getElementById('drop-pointer-dot');
    if (elDropCalloutWrap && elDropPointerLine && elDropPointerDot) {
      const calloutY = Math.min(390, midSagY - 110);
      const lineLen = midSagY - calloutY - 6;
      elDropCalloutWrap.setAttribute('transform', `translate(771, ${calloutY.toFixed(1)})`);
      elDropPointerLine.setAttribute('y2', lineLen.toFixed(1));
      elDropPointerDot.setAttribute('cy', lineLen.toFixed(1));
    }

    // 4. Update SVG Scenery Labels & Physics
    const elSvgSource = document.getElementById('source-voltage-label');
    const elSvgLoad = document.getElementById('load-voltage-label');
    const elSvgDrop = document.getElementById('drop-callout-text');
    const elSvgDropIcon = document.getElementById('drop-callout-icon');
    const elSvgLed = document.getElementById('source-led-bulb');
    const elFlowParticles = document.querySelectorAll('.flow-particle');

    if (elSvgSource) elSvgSource.textContent = res.valid ? fmtVolts(res.sourceVoltage) : '—';
    if (elSvgLoad) {
      elSvgLoad.textContent = res.valid ? fmtVolts(res.loadVoltage) : '—';
      elSvgLoad.setAttribute('fill', colors.text);
    }
    if (elSvgDrop) {
      // SVG <text> cannot host an inline SVG child, and a literal emoji here
      // would render in whatever emoji font the visitor has — plain words only.
      elSvgDrop.textContent = res.valid
        ? `${res.voltageDrop.toFixed(2)} V (${res.dropPct.toFixed(2)}%)`
        : 'Check Inputs';
    }
    if (elSvgDropIcon) {
      elSvgDropIcon.setAttribute('stroke', colors.stroke);
    }
    if (elSvgLed) {
      elSvgLed.setAttribute('fill', colors.stroke);
    }

    // Particle velocity & colors
    const currentVal = Number.parseFloat(state.current) || 0;
    const durSec =
      res.valid && currentVal > 0 ? Math.min(5.5, Math.max(0.7, 2.2 * (40 / currentVal))) : 6.0;

    elFlowParticles.forEach((p) => {
      p.setAttribute('fill', colors.fill);
      p.style.opacity = res.valid ? '1' : '0.2';
    });

    elParticleAnimates.forEach((anim) => {
      anim.setAttribute('dur', `${durSec.toFixed(2)}s`);
    });

    // 5. Dynamic House / Window Dimming
    const winGlasses = document.querySelectorAll('.win-glass');
    if (winGlasses.length) {
      let winColor = '#fde047';
      let winOpacity = '1.0';

      if (!res.valid) {
        winColor = '#94a3b8';
        winOpacity = '0.35';
      } else if (res.severity === 'warning') {
        winColor = '#f59e0b';
        winOpacity = '0.78';
      } else if (res.severity === 'excessive') {
        winColor = '#ea580c';
        winOpacity = '0.45';
      }

      // the light spilling onto the wall and lawn answers to the same verdict:
      // a glow that stayed bright while the windows dimmed would be a lie
      const spill = document.querySelector('.win-spill');
      if (spill) {
        const level = !res.valid
          ? 0.06
          : res.severity === 'excessive'
            ? 0.22
            : res.severity === 'warning'
              ? 0.5
              : 1;
        spill.setAttribute('opacity', String(level));
      }

      winGlasses.forEach((w) => {
        w.setAttribute('fill', winColor);
        w.style.opacity = winOpacity;
      });
    }

    // 6. System type specific field visibility
    const elPfGroup = document.getElementById('pf-group');
    const elReactanceGroup = document.getElementById('reactance-group');
    const elVoltageSublabel = document.getElementById('voltage-sublabel');

    if (elPfGroup) {
      elPfGroup.style.display = state.systemType === 'dc' ? 'none' : 'flex';
    }
    if (elReactanceGroup) {
      elReactanceGroup.style.display = state.systemType === 'dc' ? 'none' : 'flex';
    }
    if (elVoltageSublabel) {
      elVoltageSublabel.textContent =
        state.systemType === 'three'
          ? 'Nominal line-to-line voltage (RMS)'
          : 'Nominal voltage (RMS)';
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SCENE VIEWPORT & PARALLAX SCALING
  // ─────────────────────────────────────────────────────────────

  /**
   * The scenery is authored on a 1440×810 canvas. A hard `transform: scale()`
   * of that box left flat page background on both sides of wide and ultrawide
   * screens (the scale is limited by height, so a 3440×1440 display showed
   * ~400 px bars). Instead the SVG's viewBox is fitted to the stage: the
   * composition is always fully visible and *more landscape* fills the extra
   * area, so the drawing is edge-to-edge at every aspect ratio.
   */
  const SCENE_BASE_W = 1440;
  const SCENE_BASE_H = 810;
  /** How far the scenery may widen before the artwork starts zooming instead. */
  const SCENE_MAX_WIDE = 2.6;
  /** How far it may heighten before the sides start to be cropped. */
  const SCENE_MAX_TALL = 1.9;
  /** Never crop tighter than the source + load labels floating above the run. */
  const SCENE_MIN_CROP_W = 1040;

  function stageParts(stageRect) {
    const ratio = stageRect.width / stageRect.height;
    const baseRatio = SCENE_BASE_W / SCENE_BASE_H;
    let vbW;
    let vbH;

    if (ratio >= baseRatio) {
      // Wide / ultra-wide: hold the full 810-unit height and widen the landscape.
      vbW = Math.min(SCENE_BASE_H * ratio, SCENE_BASE_W * SCENE_MAX_WIDE);
      vbH = vbW / ratio;
    } else {
      // Tall / portrait: grow upwards and downwards first, then ease the sides in.
      vbH = Math.min(SCENE_BASE_W / ratio, SCENE_BASE_H * SCENE_MAX_TALL);
      vbW = Math.max(vbH * ratio, SCENE_MIN_CROP_W);
      vbH = vbW / ratio;
    }

    const vbX = (SCENE_BASE_W - vbW) / 2;
    // If the crop eats into the artwork (extreme ratios) keep the ground and the
    // buildings and give up sky; otherwise share the slack below the horizon.
    const vbY = vbH <= SCENE_BASE_H ? SCENE_BASE_H - vbH : -(vbH - SCENE_BASE_H) * 0.35;
    return { x: vbX, y: vbY, width: vbW, height: vbH };
  }

  /**
   * The fitting maths itself lives in the shared stage runtime so every tool
   * stage behaves identically; this local path is the fallback for when
   * `scene-stage.js` has not been served (older cached HTML, blocked asset).
   */
  function fittedViewBox(stageRect) {
    const helper = window.ElectraStage;
    const box = helper
      ? helper.viewBoxFor(stageRect, SCENE_BASE_W, SCENE_BASE_H)
      : stageParts(stageRect);
    return `${box.x.toFixed(1)} ${box.y.toFixed(1)} ${box.width.toFixed(1)} ${box.height.toFixed(1)}`;
  }

  function reapplyTilt() {
    // Let the 3D tilt overrun its own edges so rotation can never reveal the
    // flat page background behind the scene.
    const wrapper = document.getElementById('scene-perspective-wrapper');
    if (wrapper && wrapper.dataset.tilt === 'on') {
      wrapper.style.transform = 'none';
      applyParallax();
    }
  }

  // the live handle from ElectraStage.attach; when the shared runtime is present
  // it owns fitting, so nothing else may write the viewBox (a second, pad-less
  // writer used to re-crop the view under the floating panels)
  let stageHandle = null;

  function sceneFrame() {
    return document.getElementById('scene-frame') || document.getElementById('interactive-stage');
  }

  function syncSceneViewBox() {
    const svg = document.getElementById('voltage-drop-svg');
    if (!svg) return;
    if (stageHandle && typeof stageHandle.fit === 'function') {
      stageHandle.fit();
      return;
    }
    const stage = sceneFrame();
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const next = fittedViewBox(rect);
    if (svg.getAttribute('viewBox') !== next) svg.setAttribute('viewBox', next);
    // the markup ships `slice` so the pre-JS paint never shows page colour
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    reapplyTilt();
  }

  // ─────────────────────────────────────────────────────────────
  // SCENE TILT (3D parallax) — module scope so resize can re-apply it
  // ─────────────────────────────────────────────────────────────
  let parallaxFrame = null;
  let parallaxCoords = null;
  function applyParallax() {
    parallaxFrame = null;
    if (!parallaxCoords) return;
    const wrapper = document.getElementById('scene-perspective-wrapper');
    if (!wrapper) return;
    // scale(1.04) keeps the tilted artwork pasted over its own edges — without
    // it, rotating the plane exposes the flat background behind the scene.
    wrapper.style.transform = `perspective(1200px) rotateY(${(parallaxCoords.x * 6).toFixed(2)}deg) rotateX(${(-parallaxCoords.y * 4).toFixed(2)}deg) scale(1.04)`;
  }

  // ─────────────────────────────────────────────────────────────
  // REAL-WORLD SCENARIO PRESETS
  // ─────────────────────────────────────────────────────────────
  function findPreset(id) {
    return PRESETS.find((p) => p.id === id) || null;
  }

  function syncPresetButtons() {
    document.querySelectorAll('[data-preset-id]').forEach((btn) => {
      const on = btn.getAttribute('data-preset-id') === state.preset;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const caption = document.getElementById('preset-caption');
    if (caption) {
      const preset = findPreset(state.preset);
      if (preset) {
        caption.hidden = false;
        caption.innerHTML = `<strong>${preset.name}:</strong> ${preset.blurb}`;
      } else {
        caption.hidden = true;
        caption.textContent = '';
      }
    }
  }

  function writeField(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = String(value);
  }

  /**
   * Load a real-world scenario into the form. `opts.silent` skips the toast
   * (used while restoring a shared link, where the toast is not wanted).
   */
  function applyPreset(id, opts = {}) {
    const preset = findPreset(id);
    if (!preset) return false;
    urlArmed = true;
    const v = preset.values;

    if (v.standard && VD_STANDARDS[v.standard]) {
      state.standard = v.standard;
      writeField('input-standard', v.standard);
    }
    if (v.systemType) {
      state.systemType = v.systemType;
      syncSegmentedButtons(v.systemType);
    }
    if (v.voltage !== undefined) {
      state.voltsUnit = 'V';
      writeField('select-voltage-unit', 'V');
      state.voltage = v.voltage;
      writeField('input-voltage', v.voltage);
    }
    if (v.current !== undefined) {
      state.current = v.current;
      writeField('input-current', v.current);
    }
    if (v.length !== undefined) {
      state.length = v.length;
      writeField('input-length', v.length);
    }
    if (v.size !== undefined) {
      state.size = v.size;
      writeField('input-size', v.size);
    }
    if (v.material) {
      state.material = v.material;
      writeField('select-material', v.material);
    }
    if (v.pf !== undefined) {
      state.pf = v.pf;
      writeField('input-pf', v.pf);
    }
    if (v.temp !== undefined) {
      state.temp = v.temp;
      writeField('input-temp', v.temp);
    }
    // Deterministic scenarios: a preset owns the reactance switch too, so a
    // switch left over from a previous manual experiment cannot skew it.
    state.reactance = v.reactance === undefined ? false : Boolean(v.reactance);
    {
      const sw = document.getElementById('switch-reactance');
      if (sw) sw.setAttribute('aria-checked', state.reactance ? 'true' : 'false');
    }

    state.preset = id;
    touchedFields.clear();
    syncPresetButtons();
    updateUI();
    if (!opts.silent) {
      showToast(
        `Loaded “${preset.name}” — ${v.length} m of ${v.size} mm² ${v.material === 'aluminum' ? 'aluminum' : 'copper'} at ${v.temp} °C.`,
        'ruler',
      );
    }
    return true;
  }

  /** Any manual edit means the numbers are no longer the preset's numbers. */
  function releasePreset() {
    if (!state.preset) return;
    state.preset = '';
    syncPresetButtons();
  }

  // ── Preset detail dialog ─────────────────────────────────────
  // A preset is a circuit to understand, not a number to silently overwrite:
  // tapping a chip opens the dialog with the story, the full parameter set and
  // the predicted outcome; only the Apply button writes anything to the form.

  const SYSTEM_LABELS = { dc: 'DC', single: '1-Φ AC', three: '3-Φ AC' };
  const SEVERITY_TAGS = { good: 'Within limits', warning: 'Marginal', excessive: 'Excessive' };
  let presetModalFor = null;

  /**
   * Run the same maths as calculate() against a preset's stored values, so the
   * dialog can show the outcome the calculator itself will reproduce — the
   * preview and the applied result can never disagree.
   */
  function previewPreset(preset) {
    const v = preset.values;
    const std = VD_STANDARDS[v.standard] || VD_STANDARDS['uk-bs7671'];
    const mat = MATERIALS[v.material] || MATERIALS.copper;
    const temp = v.temp === undefined ? 20 : v.temp;
    const rhoT = Math.max(0, mat.rho20 * (1 + mat.alpha * (temp - 20)));
    const r = rhoT / v.size;
    const x = v.systemType !== 'dc' && v.reactance ? DEFAULT_REACTANCE : 0;
    const pf = v.pf === undefined ? 1 : v.pf;
    const sinPhi = v.systemType === 'dc' ? 0 : Math.sqrt(Math.max(0, 1 - pf * pf));
    const roundTripMult = v.systemType === 'three' ? Math.sqrt(3) : 2;
    const powerLossMult = v.systemType === 'three' ? 3 : 2;
    const effectiveImpedance = r * pf + x * sinPhi;
    const voltageDrop = roundTripMult * v.current * v.length * effectiveImpedance;
    const dropPct = v.voltage > 0 ? (voltageDrop / v.voltage) * 100 : 0;
    const loadVoltage = Math.max(0, v.voltage - voltageDrop);
    const powerLoss = v.current * v.current * (powerLossMult * r * v.length);
    let severity = 'good';
    if (dropPct > std.hardPct + 1e-9) severity = 'excessive';
    else if (dropPct > std.goodPct + 1e-9) severity = 'warning';
    return { voltageDrop, dropPct, loadVoltage, powerLoss, severity, std };
  }

  function openPresetModal(id) {
    const preset = findPreset(id);
    const backdrop = document.getElementById('vd-preset-backdrop');
    if (!preset || !backdrop) {
      // dialog missing (stale cached markup?): behave like the old one-tap flow
      applyPreset(id);
      return;
    }
    const body = document.getElementById('vd-preset-body');
    const title = document.getElementById('vd-preset-title');
    const apply = document.getElementById('vd-preset-apply');
    const clearBtn = document.getElementById('vd-preset-clear');
    const v = preset.values;
    const out = previewPreset(preset);
    const matName = v.material === 'aluminum' ? 'aluminium' : 'copper';

    if (title) title.textContent = preset.name;
    if (body) {
      const facts = [
        ['System', SYSTEM_LABELS[v.systemType] || v.systemType],
        ['Supply voltage', `${v.voltage} V`],
        ['Load current', `${v.current} A`],
        ['Cable length', `${v.length} m one-way`],
        ['Conductor', `${v.size} mm² ${matName}`],
        ['Power factor', v.systemType === 'dc' ? '— (DC)' : Number(v.pf).toFixed(2)],
        ['Conductor temp', `${v.temp === undefined ? 20 : v.temp} °C`],
        ['Standard', `${out.std.label} (${out.std.region})`],
      ];
      body.innerHTML = `
        <p class="vd-preset-story">${preset.blurb}</p>
        <dl class="vd-preset-facts">
          ${facts.map(([dt, dd]) => `<div><dt>${dt}</dt><dd>${dd}</dd></div>`).join('')}
        </dl>
        <div class="vd-preset-outcome">
          <div class="vd-preset-outcome-head">
            <span>What you would see</span>
            <span class="vd-preset-tag ${out.severity}">${SEVERITY_TAGS[out.severity]}</span>
          </div>
          <p class="vd-preset-outcome-line">
            Drop <strong>${out.voltageDrop.toFixed(2)} V (${out.dropPct.toFixed(2)}%)</strong> — the load
            receives <strong>${out.loadVoltage.toFixed(1)} V</strong>; losses
            <strong>${out.powerLoss.toFixed(0)} W</strong>.
          </p>
        </div>
        <p class="vd-preset-note">Applying writes all of these into the form, including the advanced options (power factor, conductor temperature, reactance). Edit any field afterwards and the form detaches from the preset.</p>
      `;
    }
    if (apply) {
      apply.setAttribute('data-preset-name', id);
      const label = apply.querySelector('[data-preset-apply-label]');
      if (label)
        label.textContent = state.preset === id ? 'Re-apply this preset' : 'Load this circuit';
    }
    if (clearBtn) clearBtn.hidden = state.preset !== id;

    backdrop.hidden = false;
    presetModalFor = id;
    document.body.style.overflow = 'hidden';
    pushOverlay(backdrop, document.querySelector(`[data-preset-id="${id}"]`), apply || clearBtn);
  }

  function closePresetModal() {
    const backdrop = document.getElementById('vd-preset-backdrop');
    if (!backdrop || backdrop.hidden) return;
    backdrop.hidden = true;
    presetModalFor = null;
    document.body.style.overflow = '';
    popOverlay(backdrop);
  }

  function setupPresetControls() {
    const grid = document.getElementById('preset-grid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-preset-id]');
        if (!btn) return;
        openPresetModal(btn.getAttribute('data-preset-id'));
      });
    }

    const backdrop = document.getElementById('vd-preset-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closePresetModal();
      });
    }
    document.getElementById('vd-preset-close')?.addEventListener('click', closePresetModal);

    document.getElementById('vd-preset-apply')?.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-preset-name') || presetModalFor;
      closePresetModal();
      if (id) applyPreset(id);
    });

    // Replaces the old "tap the active chip again to clear" shortcut.
    document.getElementById('vd-preset-clear')?.addEventListener('click', () => {
      closePresetModal();
      releasePreset();
      resetToDefaults({ keepStandard: true });
      showToast('Cleared the preset — back to manual entry.', 'reset');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closePresetModal();
    });

    syncPresetButtons();
  }

  // ─────────────────────────────────────────────────────────────
  // SETUP EVENT LISTENERS & WIRING
  // ─────────────────────────────────────────────────────────────
  function setupEvents() {
    // Arm URL sharing on any input-zone interaction (fields, segmented buttons,
    // switches) so untouched page loads keep a clean address bar.
    const inputZone = document.getElementById('inputs-panel-container');
    if (inputZone) {
      for (const evt of ['input', 'change', 'click']) {
        inputZone.addEventListener(
          evt,
          () => {
            urlArmed = true;
            // Typing detaches the form from a preset (the preset buttons set it
            // themselves, so 'click' only arms the URL sync).
            if (evt !== 'click') releasePreset();
          },
          { capture: true },
        );
      }
    }

    // 1. Input fields real-time change
    const inVoltage = document.getElementById('input-voltage');
    const selVoltageUnit = document.getElementById('select-voltage-unit');
    const inCurrent = document.getElementById('input-current');
    const inLength = document.getElementById('input-length');
    const inSize = document.getElementById('input-size');
    const selMaterial = document.getElementById('select-material');
    const inPf = document.getElementById('input-pf');
    const inTemp = document.getElementById('input-temp');
    const selStandard = document.getElementById('input-standard');
    const switchReactance = document.getElementById('switch-reactance');
    const btnCalculate = document.getElementById('btn-calculate');
    const btnAutofix = document.getElementById('btn-autofix-inputs');
    const btnToastClose = document.getElementById('tool-toast-close');
    const btnShare = document.getElementById('btn-share-calc');

    if (btnShare) {
      btnShare.addEventListener('click', () => {
        window.ToolShare?.copyCurrentUrl(btnShare);
      });
    }

    if (selStandard) {
      selStandard.addEventListener('change', (e) => {
        state.standard = VD_STANDARDS[e.target.value] ? e.target.value : 'uk-bs7671';
        updateUI();
        showToast(`Compliance limits switched to ${VD_STANDARDS[state.standard].label}.`, 'ruler');
      });
    }

    if (inVoltage) {
      inVoltage.addEventListener('input', (e) => {
        state.voltage = e.target.value;
        updateUI();
      });
    }

    if (selVoltageUnit) {
      selVoltageUnit.addEventListener('change', (e) => {
        const newUnit = e.target.value;
        const currentVal = Number.parseFloat(state.voltage);
        if (Number.isFinite(currentVal)) {
          if (state.voltsUnit === 'V' && newUnit === 'kV') {
            state.voltage = (currentVal / 1000).toString();
            if (inVoltage) inVoltage.value = state.voltage;
          } else if (state.voltsUnit === 'kV' && newUnit === 'V') {
            state.voltage = (currentVal * 1000).toString();
            if (inVoltage) inVoltage.value = state.voltage;
          }
        }
        state.voltsUnit = newUnit;
        updateUI();
      });
    }

    if (inCurrent) {
      inCurrent.addEventListener('input', (e) => {
        state.current = e.target.value;
        updateUI();
      });
    }

    if (inLength) {
      let longRunToastShown = false;
      inLength.addEventListener('input', (e) => {
        state.length = e.target.value;
        const lenNum = Number.parseFloat(e.target.value);
        const isLong = Number.isFinite(lenNum) && lenNum > 1000;
        if (isLong && !longRunToastShown) {
          showToast(
            'Long cable run (>1000 m): check the supply voltage at the far end, not just the cable.',
            'info',
          );
        }
        longRunToastShown = isLong;
        updateUI();
      });
    }

    if (inSize) {
      inSize.addEventListener('input', (e) => {
        state.size = e.target.value;
        updateUI();
      });
    }

    if (selMaterial) {
      selMaterial.addEventListener('change', (e) => {
        state.material = e.target.value;
        updateUI();
      });
    }

    if (inPf) {
      inPf.addEventListener('input', (e) => {
        state.pf = e.target.value;
        updateUI();
      });
    }

    if (inTemp) {
      inTemp.addEventListener('input', (e) => {
        state.temp = e.target.value;
        updateUI();
      });
    }

    if (switchReactance) {
      switchReactance.addEventListener('click', () => {
        state.reactance = !state.reactance;
        switchReactance.setAttribute('aria-checked', state.reactance ? 'true' : 'false');
        updateUI();
      });
    }

    if (btnCalculate) {
      btnCalculate.addEventListener('click', () => {
        FIELD_IDS.forEach((id) => touchedFields.add(id));
        updateUI();
        const elCard = document.getElementById('results-panel');
        if (elCard) {
          elCard.classList.remove('pop');
          void elCard.offsetWidth;
          elCard.classList.add('pop');
          if (MOBILE_VIEWPORT.matches) {
            openMobileResults(btnCalculate);
          } else {
            elCard.focus({ preventScroll: false });
          }
        }
      });
    }

    if (btnAutofix) {
      btnAutofix.addEventListener('click', () => {
        resetToDefaults();
        showToast('Restored standard circuit parameters.', 'success');
      });
    }

    if (btnToastClose) {
      btnToastClose.addEventListener('click', () => {
        const elToast = document.getElementById('tool-toast-banner');
        if (elToast) elToast.hidden = true;
      });
    }

    // Errors reveal on blur ("reward early, punish late"): while typing, an
    // invalid intermediate value stays silent; leaving the field judges it.
    const blurFieldIds = [
      ['inVoltage', 'voltage'],
      ['inCurrent', 'current'],
      ['inLength', 'length'],
      ['inSize', 'size'],
      ['inPf', 'pf'],
      ['inTemp', 'temp'],
    ];
    blurFieldIds.forEach(([handle, id]) => {
      const el = { inVoltage, inCurrent, inLength, inSize, inPf, inTemp }[handle];
      if (!el) return;
      el.addEventListener('blur', () => {
        touchedFields.add(id);
        updateUI();
      });
    });

    // 2. System Type Segmented Buttons (radio pattern: roving tabindex + arrows)
    const segButtons = Array.from(document.querySelectorAll('.seg-btn'));
    const syncSegTabindex = () => {
      segButtons.forEach((b) => {
        b.setAttribute('tabindex', b.classList.contains('active') ? '0' : '-1');
      });
    };
    segButtons.forEach((btn, index) => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-system-type');
        if (!type) return;
        state.systemType = type;
        applySystemDefaults(type);
        segButtons.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        syncSegTabindex();
        updateUI();
      });
      btn.addEventListener('keydown', (e) => {
        const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown';
        const backward = e.key === 'ArrowLeft' || e.key === 'ArrowUp';
        if (!forward && !backward) return;
        e.preventDefault();
        const offset = forward ? 1 : -1;
        const next = segButtons[(index + offset + segButtons.length) % segButtons.length];
        next.click();
        next.focus();
      });
    });
    syncSegTabindex();

    // 3. Advanced Options Accordion
    const advToggle = document.getElementById('btn-advanced-toggle');
    const advBody = document.getElementById('advanced-body');
    if (advToggle && advBody) {
      advToggle.addEventListener('click', () => {
        const isHidden = advBody.hidden;
        advBody.hidden = !isHidden;
        advToggle.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        if (!isHidden) {
          // The accordion grows the panel: bring the newly revealed fields into
          // view and re-measure the scroll hint instead of leaving them under the
          // pinned Calculate footer.
          requestAnimationFrame(() => {
            const firstField = advBody.querySelector('input, button[role="switch"]');
            if (firstField && typeof firstField.scrollIntoView === 'function') {
              firstField.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
            updateInputsScrollAffordance();
          });
        }
      });
    }

    // 4. Panel Collapsing
    const btnColInputs = document.getElementById('btn-collapse-inputs');
    const elInputsBody = document.getElementById('inputs-body');
    const elInputsFooter = document.querySelector('[data-panel-footer="inputs"]');

    if (btnColInputs && elInputsBody) {
      btnColInputs.addEventListener('click', () => {
        const isCollapsed = elInputsBody.hidden;
        elInputsBody.hidden = !isCollapsed;
        if (elInputsFooter) elInputsFooter.hidden = !isCollapsed;
        btnColInputs.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
        updateInputsScrollAffordance();
      });
    }
    if (elInputsBody) {
      elInputsBody.addEventListener('scroll', updateInputsScrollAffordance, { passive: true });
    }

    const btnColResults = document.getElementById('btn-collapse-results');
    const elResultsBody = document.getElementById('results-body');
    if (btnColResults && elResultsBody) {
      btnColResults.addEventListener('click', () => {
        const isCollapsed = elResultsBody.hidden;
        elResultsBody.hidden = !isCollapsed;
        btnColResults.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
      });
    }

    // 5. Top Controls (Animate, Values, Legend)
    const btnAnimate = document.getElementById('btn-toggle-animate');
    const svgScene = document.getElementById('voltage-drop-svg');
    if (btnAnimate && svgScene) {
      btnAnimate.addEventListener('click', () => {
        state.animate = !state.animate;
        btnAnimate.classList.toggle('active', state.animate);
        btnAnimate.setAttribute('aria-pressed', state.animate ? 'true' : 'false');
        svgScene.classList.toggle('scene-paused', !state.animate);

        if (state.animate) {
          if (typeof svgScene.unpauseAnimations === 'function') svgScene.unpauseAnimations();
        } else {
          if (typeof svgScene.pauseAnimations === 'function') svgScene.pauseAnimations();
        }
      });
    }

    const btnValues = document.getElementById('btn-toggle-values');
    const grpSourceLbl = document.getElementById('source-labels-group');
    const grpLoadLbl = document.getElementById('load-labels-group');
    const grpDropCallout = document.getElementById('drop-callout-wrap');
    if (btnValues) {
      btnValues.addEventListener('click', () => {
        state.showValues = !state.showValues;
        btnValues.classList.toggle('active', state.showValues);
        btnValues.setAttribute('aria-pressed', state.showValues ? 'true' : 'false');
        const displayVal = state.showValues ? '' : 'none';
        if (grpSourceLbl) grpSourceLbl.style.display = displayVal;
        if (grpLoadLbl) grpLoadLbl.style.display = displayVal;
        if (grpDropCallout) grpDropCallout.style.display = displayVal;
      });
    }

    const btnLegend = document.getElementById('btn-toggle-legend');
    const elLegendPanel = document.getElementById('legend-panel');
    if (btnLegend && elLegendPanel) {
      btnLegend.addEventListener('click', () => {
        state.showLegend = !state.showLegend;
        btnLegend.classList.toggle('active', state.showLegend);
        btnLegend.setAttribute('aria-pressed', state.showLegend ? 'true' : 'false');
        elLegendPanel.hidden = !state.showLegend;
      });
    }

    // 6. View Controls (3D & Reset)
    const btn3d = document.getElementById('btn-toggle-3d');
    const sceneWrapper = document.getElementById('scene-perspective-wrapper');
    if (btn3d && sceneWrapper) {
      btn3d.addEventListener('click', () => {
        state.threeD = !state.threeD;
        btn3d.classList.toggle('active', state.threeD);
        btn3d.setAttribute('aria-pressed', state.threeD ? 'true' : 'false');
        sceneWrapper.dataset.tilt = state.threeD ? 'on' : 'off';
        if (!state.threeD) {
          sceneWrapper.style.transform = 'none';
        } else {
          applyParallax();
        }
      });
    }

    const btnResetView = document.getElementById('btn-reset-view');
    if (btnResetView) {
      btnResetView.addEventListener('click', () => {
        resetToDefaults();
        showToast('Reset all parameters to default values.', 'reset');
      });
    }

    // 11. Theme toggle: handled globally by theme.js via [data-theme-toggle].

    // 13. Tips Carousel & Toggle
    const TIP_ROTATE_MS = 9000;
    let tipsRotation = 0;
    let tipsHold = false;
    const switchTips = document.getElementById('switch-tips');
    const tipsKnob = document.getElementById('tips-pill-knob');
    const tipsBar = document.getElementById('tips-bar');
    const tipsText = document.getElementById('tips-text');

    if (tipsBar) {
      tipsBar.addEventListener('mouseenter', () => {
        tipsHold = true;
      });
      tipsBar.addEventListener('mouseleave', () => {
        tipsHold = false;
      });
      tipsBar.addEventListener('focusin', () => {
        tipsHold = true;
      });
      tipsBar.addEventListener('focusout', () => {
        tipsHold = false;
      });
    }

    if (switchTips && tipsBar) {
      switchTips.addEventListener('click', () => {
        state.showTips = !state.showTips;
        tipsBar.hidden = !state.showTips;
        switchTips.setAttribute('aria-checked', state.showTips ? 'true' : 'false');
        if (tipsKnob) tipsKnob.classList.toggle('active', state.showTips);
      });
    }

    const tipsCount = document.getElementById('tips-count');
    const btnTipPrev = document.getElementById('btn-tip-prev');
    const btnTipNext = document.getElementById('btn-tip-next');

    function paintTip(animate = true) {
      if (!tipsText) return;
      const text = TIPS[state.tipIndex] || TIPS[0];
      if (tipsCount) tipsCount.textContent = `${state.tipIndex + 1}/${TIPS.length}`;
      if (!animate || REDUCED_MOTION.matches) {
        tipsText.textContent = text;
        return;
      }
      tipsText.style.opacity = '0';
      setTimeout(() => {
        tipsText.textContent = text;
        tipsText.style.opacity = '1';
      }, 200);
    }

    function stepTip(delta) {
      state.tipIndex = (state.tipIndex + delta + TIPS.length) % TIPS.length;
      tipsRotation = 0;
      paintTip();
    }

    if (btnTipPrev) btnTipPrev.addEventListener('click', () => stepTip(-1));
    if (btnTipNext) btnTipNext.addEventListener('click', () => stepTip(1));
    paintTip(false);

    // 14. Mobile Bottom Sheet Handlers
    const btnMobInputs = document.getElementById('btn-mobile-open-inputs');
    const btnMobResults = document.getElementById('btn-mobile-open-results');
    const panelInputsCont = document.getElementById('inputs-panel-container');
    const panelResultsCont = document.querySelector('.results-panel-container');
    const panelScrim = document.getElementById('inputs-panel-scrim');

    function openMobileInputs(trigger) {
      if (panelInputsCont && panelScrim) {
        panelInputsCont.classList.add('open');
        panelScrim.hidden = false;
        document.body.style.overflow = 'hidden';
        const firstField = panelInputsCont.querySelector(FOCUSABLE_SELECTOR);
        pushOverlay(panelInputsCont, trigger, firstField);
      }
    }

    function openMobileResults(trigger) {
      if (panelResultsCont && panelScrim) {
        panelResultsCont.classList.add('open');
        panelScrim.hidden = false;
        document.body.style.overflow = 'hidden';
        pushOverlay(panelResultsCont, trigger, panelResultsCont);
      }
    }

    function closeMobilePanels() {
      if (
        !panelInputsCont?.classList.contains('open') &&
        !panelResultsCont?.classList.contains('open')
      ) {
        return;
      }
      if (panelInputsCont) panelInputsCont.classList.remove('open');
      if (panelResultsCont) panelResultsCont.classList.remove('open');
      if (panelScrim) panelScrim.hidden = true;
      document.body.style.overflow = '';
      popOverlay(panelResultsCont);
      popOverlay(panelInputsCont);
    }

    if (btnMobInputs)
      btnMobInputs.addEventListener('click', (e) => openMobileInputs(e.currentTarget));
    if (btnMobResults)
      btnMobResults.addEventListener('click', (e) => openMobileResults(e.currentTarget));
    if (panelScrim) panelScrim.addEventListener('click', closeMobilePanels);

    // 16. Stage fitting is delegated to the shared runtime (window.ElectraStage)
    // so every tool scene reacts to resizes, browser zoom, split screen, the
    // mobile URL bar and orientation the same way. Without it, the local
    // listeners below keep the landscape fitted.
    const helper = window.ElectraStage;
    if (helper?.attach) {
      stageHandle = helper.attach({
        // the frame the artwork fills — identical to the stage here, and the
        // right box for any stage that later gains a stacked layout
        stage:
          document.getElementById('scene-frame') || document.getElementById('interactive-stage'),
        svgId: 'voltage-drop-svg',
        baseWidth: SCENE_BASE_W,
        baseHeight: SCENE_BASE_H,
        // source cabinet, both floating labels and the house: the parts that
        // carry information, kept clear of the panels at every window size
        content: { x0: 250, x1: 1310, y0: 200, y1: 700 },
        panelSelector: '#panel-wrap .inputs-panel-container, #panel-wrap .results-panel-container',
        // the tilt has to be re-applied after every fit, or rotation can expose
        // the stage background at the edges
        onFit: reapplyTilt,
      });
    } else {
      let resizeFrame = null;
      const scheduleSceneFit = () => {
        if (resizeFrame !== null) return;
        resizeFrame = requestAnimationFrame(() => {
          resizeFrame = null;
          syncSceneViewBox();
        });
      };
      window.addEventListener('resize', scheduleSceneFit);
      window.addEventListener('orientationchange', () => setTimeout(scheduleSceneFit, 120));
      if (window.visualViewport) window.visualViewport.addEventListener('resize', scheduleSceneFit);
      const stageEl = document.getElementById('interactive-stage');
      if (typeof ResizeObserver === 'function' && stageEl) {
        new ResizeObserver(scheduleSceneFit).observe(stageEl);
      }
    }

    const stage = document.getElementById('interactive-stage');
    if (stage) {
      stage.addEventListener('mousemove', (e) => {
        if (!state.threeD || REDUCED_MOTION.matches) return;
        const rect = stage.getBoundingClientRect();
        parallaxCoords = {
          x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
          y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
        };
        state.parallax.x = parallaxCoords.x;
        state.parallax.y = parallaxCoords.y;
        if (parallaxFrame === null) {
          parallaxFrame = requestAnimationFrame(applyParallax);
        }
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RESET TO STANDARD DEFAULTS
  // ─────────────────────────────────────────────────────────────
  function resetToDefaults(opts = {}) {
    urlArmed = true;
    if (!opts.keepStandard) state.standard = 'uk-bs7671';
    state.systemType = 'single';

    state.voltage = 230;
    state.voltsUnit = 'V';
    state.current = 40;
    state.length = 50;
    state.size = 10;
    state.material = 'copper';
    state.pf = 0.92;
    state.temp = 20;
    state.reactance = false;
    state.threeD = false;
    state.standard = opts.keepStandard ? state.standard : 'uk-bs7671';
    state.preset = '';
    syncPresetButtons();

    // Reset Form Inputs
    const inVoltage = document.getElementById('input-voltage');
    const selVoltageUnit = document.getElementById('select-voltage-unit');
    const inCurrent = document.getElementById('input-current');
    const inLength = document.getElementById('input-length');
    const inSize = document.getElementById('input-size');
    const selMaterial = document.getElementById('select-material');
    const inPf = document.getElementById('input-pf');
    const inTemp = document.getElementById('input-temp');
    const selStandard = document.getElementById('input-standard');
    const switchReactance = document.getElementById('switch-reactance');
    const btn3d = document.getElementById('btn-toggle-3d');
    const sceneWrapper = document.getElementById('scene-perspective-wrapper');

    if (inVoltage) inVoltage.value = '230';
    if (selVoltageUnit) selVoltageUnit.value = 'V';
    if (inCurrent) inCurrent.value = '40';
    if (inLength) inLength.value = '50';
    if (inSize) inSize.value = '10';
    if (selMaterial) selMaterial.value = 'copper';
    if (inPf) inPf.value = '0.92';
    if (inTemp) inTemp.value = '20';
    if (selStandard) selStandard.value = state.standard;
    if (switchReactance) switchReactance.setAttribute('aria-checked', 'false');
    if (btn3d) {
      btn3d.classList.remove('active');
      btn3d.setAttribute('aria-pressed', 'false');
    }
    if (sceneWrapper) sceneWrapper.style.transform = 'none';

    // Segmented Buttons reset
    const segButtons = document.querySelectorAll('.seg-btn');
    segButtons.forEach((b) => {
      const isSingle = b.getAttribute('data-system-type') === 'single';
      b.classList.toggle('active', isSingle);
      b.setAttribute('aria-checked', isSingle ? 'true' : 'false');
    });

    // Clear all field error notices
    touchedFields.clear();
    displayFieldErrors({});

    updateUI();
  }

  // ─────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────
  /**
   * Hand the tool-specific commands to the shared chrome. Palette/drawer entries
   * nobody registers are hidden by the chrome layer, so this list is also the
   * statement of what this tool can actually do.
   */
  function registerChromeActions() {
    const api = window.ElectraChrome;
    if (!api) return;
    api.setToastHandler((message, icon) => showToast(message, icon));
    api.register('reset', () => {
      resetToDefaults();
      showToast('Reset all parameters to default values.', 'reset');
    });
    api.register('3d', () => document.getElementById('btn-toggle-3d')?.click());
    api.register('animate', () => document.getElementById('btn-toggle-animate')?.click());
  }

  function init() {
    registerChromeActions();
    setupEvents();
    setupPresetControls();
    syncSceneViewBox();

    // Restore a shared link (if any) before the first paint-compute
    restoreFromUrl();

    // Honour OS reduced-motion: freeze SMIL particles and mark the toggle off.
    if (REDUCED_MOTION.matches) {
      state.animate = false;
      const svgSceneEl = document.getElementById('voltage-drop-svg');
      const animBtn = document.getElementById('btn-toggle-animate');
      if (svgSceneEl && typeof svgSceneEl.pauseAnimations === 'function') {
        svgSceneEl.pauseAnimations();
      }
      if (animBtn) {
        animBtn.classList.remove('active');
        animBtn.setAttribute('aria-pressed', 'false');
      }
    }

    updateUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
