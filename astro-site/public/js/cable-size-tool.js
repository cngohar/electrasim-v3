/**
 * cable-size-tool.js
 * ElectraSim Electrical Toolbox — Cable Size Calculator Client Engine
 * Pure Vanilla JavaScript • Zero Runtime Dependencies • Scene-driven
 *
 * Same calculation, three surfaces fed from one result object:
 *   1. the numeric readout (unchanged ids),
 *   2. the cutaway scene (heat, layers, specimen, size ladder, crossover chart),
 *   3. the ampacity gauge + "why this size?" waterfall in the top HUD.
 *
 * The scene is *derived*: `paintScene()` only writes CSS custom properties and
 * data attributes from the computed result, so the drawing and the numbers can
 * never disagree, and the 3D view (loaded on demand) reads the same attributes.
 */

(() => {
  const REDUCED_MOTION = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener() {}, removeEventListener() {} };

  /**
   * Conductor data comes from `cable-tables.js` (window.ElectraCableTables), the
   * browser mirror of `src/lib/tools/cable-sizing/tables.ts`. If that file has not
   * loaded (stale cache, offline copy), fall back to the inline constants below so
   * the tool still works — a consistency test keeps the two in step.
   */
  const T = window.ElectraCableTables || {};

  const STANDARD_RATINGS = T.STANDARD_RATINGS || [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
  const STANDARD_SIZES = T.STANDARD_SIZES || [
    1.0, 1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0, 35.0, 50.0, 70.0, 95.0,
  ];
  const CPC_MAP = T.CPC_MAP || {
    1.0: 1.0,
    1.5: 1.0,
    2.5: 1.5,
    4.0: 1.5,
    6.0: 2.5,
    10.0: 4.0,
    16.0: 6.0,
    25.0: 10.0,
    35.0: 16.0,
    50.0: 25.0,
    70.0: 35.0,
    95.0: 50.0,
  };
  const AMPACITY = T.AMPACITY || {
    A: {
      1: 11.5,
      1.5: 14.5,
      2.5: 20,
      4: 26,
      6: 34,
      10: 46,
      16: 61,
      25: 80,
      35: 99,
      50: 119,
      70: 151,
      95: 182,
    },
    B: {
      1: 13.5,
      1.5: 17.5,
      2.5: 24,
      4: 32,
      6: 41,
      10: 57,
      16: 76,
      25: 101,
      35: 125,
      50: 151,
      70: 192,
      95: 232,
    },
    C: {
      1: 16,
      1.5: 20,
      2.5: 27,
      4: 37,
      6: 47,
      10: 65,
      16: 87,
      25: 114,
      35: 141,
      50: 182,
      70: 234,
      95: 284,
    },
    D: {
      1: 18,
      1.5: 22,
      2.5: 29,
      4: 38,
      6: 47,
      10: 63,
      16: 83,
      25: 110,
      35: 135,
      50: 165,
      70: 210,
      95: 255,
    },
    E: {
      1: 17,
      1.5: 22,
      2.5: 30,
      4: 40,
      6: 52,
      10: 71,
      16: 96,
      25: 128,
      35: 157,
      50: 196,
      70: 249,
      95: 302,
    },
  };

  /** mV/A/m (single-phase loop). Above 16 mm² the tabulated value already folds in reactance. */
  const VDROP_MV = T.VDROP_MV || {
    1: 44,
    1.5: 29,
    2.5: 18,
    4: 11,
    6: 7.3,
    10: 4.4,
    16: 2.8,
    25: 1.75,
    35: 1.25,
    50: 0.93,
    70: 0.65,
    95: 0.49,
  };

  /** Kept in step with `src/lib/tools/cable-sizing/tables.ts` (Tables 4B1 / 4C1 / Reg 523.9). */
  const getCa =
    T.getCa ||
    ((t) => {
      if (t <= 25) return 1.03;
      if (t <= 30) return 1.0;
      if (t <= 35) return 0.94;
      if (t <= 40) return 0.87;
      if (t <= 45) return 0.79;
      if (t <= 50) return 0.71;
      if (t <= 55) return 0.61;
      if (t <= 60) return 0.5;
      return 0.35;
    });

  const getCg =
    T.getCg ||
    ((n) => {
      if (n <= 1) return 1.0;
      if (n === 2) return 0.8;
      if (n === 3) return 0.7;
      if (n === 4) return 0.65;
      if (n === 5) return 0.6;
      if (n === 6) return 0.57;
      if (n === 7) return 0.54;
      if (n === 8) return 0.52;
      if (n >= 9) return 0.5;
      return 1.0;
    });

  const getCi =
    T.getCi ||
    ((mm) => {
      if (mm === 50) return 0.89;
      if (mm === 100) return 0.81;
      if (mm === 200) return 0.5;
      return 1.0;
    });

  /** Table 4A1 note: a BS 3036 semi-enclosed fuse derates the cable further. */
  const BS3036_FACTOR = T.BS3036_FACTOR || 0.725;
  const ALUMINIUM_AMPACITY_FACTOR = T.ALUMINIUM_AMPACITY_FACTOR || 0.78;
  const ALUMINIUM_MV_RATIO = T.ALUMINIUM_MV_RATIO || 1.64;

  const METHOD_INFO = {
    A: {
      name: 'Method A',
      blurb:
        'Enclosed in thermal insulation — almost no airflow, so heat piles up around the cable.',
    },
    B: {
      name: 'Method B',
      blurb: 'In conduit or trunking on a wall: the enclosed air warms with every circuit inside.',
    },
    C: {
      name: 'Method C',
      blurb: 'Clipped direct to a surface — the reference case, with the best natural cooling.',
    },
    D: {
      name: 'Method D',
      blurb: 'Buried in ground: heat has to conduct through soil, assumed at 20 °C and 1.0 K·m/W.',
    },
    E: {
      name: 'Method E',
      blurb:
        'Free air or on a perforated tray: airflow is high, so spacing between circuits pays off.',
    },
  };

  // Regional standards: identical harmonized ampacity/drop data (BS 7671
  // Appendix 4 ≡ IEC 60364-5-52 Table B.52.4); only limits & citations differ.
  const CS_STANDARDS = {
    'uk-bs7671': {
      label: 'BS 7671:2018+A4:2026',
      region: 'United Kingdom',
      lightingPct: 3,
      powerPct: 5,
      citation:
        'Results calculated per BS 7671:2018+A4:2026 (IET Wiring Regulations) — Appendix 4 Tables 4D5/4B1/4C1, Reg 525.1 limits of 3% lighting / 5% other uses.',
      echo: 'Result verified against <strong>BS 7671:2018+A4:2026 (UK)</strong> — Appendix 4 Tables 4D5/4B1/4C1 and Reg 525.1 voltage-drop limits.',
    },
    'iec-60364': {
      label: 'IEC 60364',
      region: 'International (IEC)',
      lightingPct: 3,
      powerPct: 5,
      citation:
        'Results calculated per IEC 60364 international metric rules — IEC 60364-5-52 Table B.52.4 ampacity and Annex G (Table G.52.1) 3% lighting / 5% other-circuits voltage-drop guidance (6% / 8% on a private LV supply; +0.005% per metre over 100 m, capped at +0.5%).',
      echo: 'Result verified against <strong>IEC 60364 (International)</strong> — IEC 60364-5-52 Table B.52.4 with Annex G Table G.52.1 3%/5% voltage-drop guidance.',
    },
  };

  /* Scene geometry that must mirror CableSizingScene.astro */
  const STAGE_BASE = { width: 1280, height: 760 };
  /**
   * The informative region of the cutaway (stack, cable, specimen). The fit keeps
   * this box inside the band between the floating panels, while sky and heat
   * glow are free to run underneath them. Mirrors CableSizingScene.astro.
   */
  const SCENE_CONTENT = { x0: 292, x1: 1032, y0: 170, y1: 718 };
  // mirrors CHART in CableSizingPanels.astro (the chart is a panel graphic now,
  // not part of the stage, so nothing important sits under a floating panel)
  const CHART = { x: 12, y: 10, w: 296, h: 78 };

  function currentStandard() {
    const raw = document.getElementById('cs-standard')?.value;
    return CS_STANDARDS[raw] ? raw : 'uk-bs7671';
  }

  /* ─────────────────────────────────────────────────────────────────────
   * Controls: segmented buttons and sliders drive hidden native inputs, so
   * the engine (and shared-link restore) keeps one source of truth.
   * ──────────────────────────────────────────────────────────────────── */

  function setGroupValue(groupId, value) {
    const group = document.querySelector(`[data-cs-group="${groupId}"]`);
    if (!group) return;
    for (const btn of group.querySelectorAll('[data-cs-value]')) {
      const on = btn.getAttribute('data-cs-value') === String(value);
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-checked', on ? 'true' : 'false');
      btn.setAttribute('tabindex', on ? '0' : '-1');
    }
  }

  function readValue(id, fallback) {
    const el = document.getElementById(id);
    if (!el) return fallback;
    const n = Number.parseFloat(el.value);
    return Number.isFinite(n) ? n : fallback;
  }

  /** Keep typed values inside the same bounds advertised by the native controls.
   * Browsers do not clamp number inputs, so an out-of-range shared URL or a
   * pasted value could previously produce a result that did not match the field
   * the user was looking at. */
  function boundedValue(id, fallback, min, max) {
    return Math.min(max, Math.max(min, readValue(id, fallback)));
  }

  function normaliseNumericInputs() {
    const bounds = [
      ['cs-voltage', 230, 12, 1000],
      ['cs-power', 7.2, 0.1, 500],
      ['cs-pf', 1, 0.5, 1],
      ['cs-temp', 30, 10, 60],
      ['cs-grouping', 1, 1, 20],
      ['cs-length', 18, 1, 200],
    ];
    for (const [id, fallback, min, max] of bounds) {
      const el = document.getElementById(id);
      if (el) el.value = String(boundedValue(id, fallback, min, max));
    }
  }

  /** Reflect the hidden inputs back into the visual pickers. */
  function syncControls() {
    const method = document.getElementById('cs-install-method')?.value || 'C';
    const insulation = document.getElementById('cs-insulation')?.value || '0';
    const system = document.getElementById('cs-system-type')?.value || 'single-phase';
    setGroupValue('method', method);
    setGroupValue('insulation', insulation);
    setGroupValue('system', system);

    const methodNote = document.getElementById('cs-method-note');
    if (methodNote) methodNote.textContent = (METHOD_INFO[method] || METHOD_INFO.C).blurb;

    const lengthOut = document.getElementById('cs-length-out');
    if (lengthOut) lengthOut.textContent = `${boundedValue('cs-length', 18, 1, 200)} m`;
    const tempOut = document.getElementById('cs-temp-out');
    if (tempOut) tempOut.textContent = `${boundedValue('cs-temp', 30, 10, 60)} °C`;
    const groupingOut = document.getElementById('cs-grouping-out');
    if (groupingOut) {
      const n = boundedValue('cs-grouping', 1, 1, 20);
      groupingOut.textContent = n <= 1 ? '1 circuit' : `${n} circuits`;
    }
    const powerHint = document.getElementById('cs-power-hint');
    if (powerHint) {
      const v = boundedValue('cs-voltage', 230, 12, 1000);
      const kw = boundedValue('cs-power', 7.2, 0.1, 500);
      const pf = boundedValue('cs-pf', 1, 0.5, 1);
      const systemNow = document.getElementById('cs-system-type')?.value || 'single-phase';
      const divisor =
        systemNow === 'three-phase' ? Math.sqrt(3) * v * pf : systemNow === 'dc' ? v : v * pf;
      const ib = divisor > 0 ? (kw * 1000) / divisor : 0;
      powerHint.textContent = `${kw} kW ≈ ${ib.toFixed(1)} A at ${v} V`;
    }
  }

  /**
   * Wire one control group.
   *
   * The controls are addressed by `data-cs-group` on the wrapper and
   * `data-cs-value` on each option, and the scene reports its own state on
   * `data-method` / `data-insulation` / `data-system`. Those namespaces must stay
   * apart: `document.querySelector('[data-method]')` used to resolve to the *scene
   * root* (which precedes the panels in the document), so the click listener was
   * bound to the scene frame and every Method A–E chip was silently dead — no
   * error, nothing to see in the console, the answer just never moved.
   */
  const SYSTEM_DEFAULTS = {
    'single-phase': { voltage: 230, power: 7.2, pf: 1 },
    'three-phase': { voltage: 400, power: 22, pf: 0.99 },
    dc: { voltage: 48, power: 2.4, pf: 1 },
  };

  function applySystemDefaults(system) {
    const values = SYSTEM_DEFAULTS[system];
    if (!values) return;
    for (const [id, value] of [
      ['cs-voltage', values.voltage],
      ['cs-power', values.power],
      ['cs-pf', values.pf],
    ]) {
      const el = document.getElementById(id);
      if (el) el.value = String(value);
    }
  }

  function bindGroup(groupId, targetId) {
    const group = document.querySelector(`[data-cs-group="${groupId}"]`);
    if (!group) return;
    group.addEventListener('click', (e) => {
      const btn = e.target?.closest?.('[data-cs-value]');
      if (!btn || !group.contains(btn)) return;
      const input = document.getElementById(targetId);
      if (!input) return;
      input.value = btn.getAttribute('data-cs-value');
      if (groupId === 'system') applySystemDefaults(input.value);
      releasePreset();
      syncControls();
      runSizing();
    });
    group.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        return;
      }
      const items = Array.from(group.querySelectorAll('[data-cs-value]'));
      const index = items.indexOf(document.activeElement);
      if (index < 0) return;
      e.preventDefault();
      let next;
      if (e.key === 'Home') next = items[0];
      else if (e.key === 'End') next = items[items.length - 1];
      else {
        const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1;
        next = items[(index + delta + items.length) % items.length];
      }
      next.focus();
      next.click();
    });
  }

  /* ─────────────────────────────────────────────────────────────────────
   * Shareable URLs
   * ──────────────────────────────────────────────────────────────────── */

  const ENUM_BINDINGS = [
    ['standard', 'cs-standard'],
    ['system', 'cs-system-type'],
    ['circuit', 'cs-circuit-type'],
    ['material', 'cs-material'],
    ['method', 'cs-install-method'],
    ['insulation', 'cs-insulation'],
    ['load', 'cs-load'],
  ];
  const NUMERIC_BINDINGS = [
    ['voltage', 'cs-voltage'],
    ['power', 'cs-power'],
    ['pf', 'cs-pf'],
    ['length', 'cs-length'],
    ['temp', 'cs-temp'],
    ['grouping', 'cs-grouping'],
  ];
  const BOOL_BINDINGS = [['fuse', 'cs-fuse-cc']];

  let urlArmed = false;

  /** `?preset=` is applied after the rest of the state, so it wins on conflicts. */
  let presetParam = null;

  function restoreFromUrl() {
    const S = window.ToolShare;
    if (!S) return;
    const params = S.readParams();
    if (![...params.keys()].length) return;
    urlArmed = true;
    presetParam = params.get('preset');

    for (const [key, id] of ENUM_BINDINGS) {
      const raw = params.get(key);
      const el = document.getElementById(id);
      if (raw === null || raw === '' || !el) continue;
      if (el.tagName === 'SELECT') {
        // Selects reject values that are not one of their options ✓ whitelist.
        el.value = raw;
      } else {
        el.value = raw;
      }
      // A hidden input accepts anything: re-check it against the allowed set.
      if (el.type === 'hidden') {
        const allowed =
          key === 'method'
            ? Object.keys(METHOD_INFO)
            : key === 'insulation'
              ? ['0', '50', '100', '200']
              : null;
        if (allowed && !allowed.includes(el.value)) el.value = key === 'method' ? 'C' : '0';
      }
    }
    for (const [key, id] of NUMERIC_BINDINGS) {
      const el = document.getElementById(id);
      if (!el) continue;
      const n = S.numParam(params, key, { min: 0.01, max: 100000 });
      if (n !== undefined) el.value = String(n);
    }
    for (const [key, id] of BOOL_BINDINGS) {
      const el = document.getElementById(id);
      if (!el) continue;
      const raw = params.get(key);
      if (raw === '1') el.checked = true;
      else if (raw === '0') el.checked = false;
    }
  }

  function syncUrl() {
    const S = window.ToolShare;
    if (!S || !urlArmed) return;
    const entries = {};
    for (const [, id] of ENUM_BINDINGS) {
      const el = document.getElementById(id);
      if (el) entries[ENUM_BINDINGS.find(([, i]) => i === id)[0]] = el.value;
    }
    for (const [key, id] of NUMERIC_BINDINGS) {
      const el = document.getElementById(id);
      if (el) entries[key] = el.value;
    }
    for (const [key, id] of BOOL_BINDINGS) {
      const el = document.getElementById(id);
      if (el) entries[key] = el.checked ? 1 : 0;
    }
    if (activePreset) entries.preset = activePreset;
    S.pushParams(entries);
  }

  /* ─────────────────────────────────────────────────────────────────────
   * Sizing engine
   * ──────────────────────────────────────────────────────────────────── */

  function mvFor(size, systemType, material) {
    let mv = VDROP_MV[size] || 44;
    if (systemType === 'three-phase') mv *= Math.sqrt(3) / 2;
    if (material === 'aluminum') mv *= ALUMINIUM_MV_RATIO;
    return mv;
  }

  function setCableValidation(message, fields = []) {
    const notice = document.getElementById('cs-validation-notice');
    const text = document.getElementById('cs-validation-message');
    if (notice) notice.hidden = !message;
    if (text) text.textContent = message || '';
    for (const id of ['cs-voltage', 'cs-power', 'cs-pf', 'cs-length', 'cs-temp', 'cs-grouping']) {
      const el = document.getElementById(id);
      if (el) el.toggleAttribute('aria-invalid', fields.includes(id));
    }
  }

  function validateCableInputs() {
    const rules = [
      ['cs-voltage', 'Voltage', 12, 1000, 'V'],
      ['cs-power', 'Load power', 0.1, 500, 'kW'],
      ['cs-pf', 'Power factor', 0.5, 1, ''],
      ['cs-length', 'Run length', 1, 200, 'm'],
      ['cs-temp', 'Ambient temperature', 10, 60, '°C'],
      ['cs-grouping', 'Grouped circuits', 1, 20, ''],
    ];
    const errors = [];
    const fields = [];
    for (const [id, label, min, max, unit] of rules) {
      const raw = document.getElementById(id)?.value.trim() ?? '';
      const value = Number.parseFloat(raw);
      if (raw === '' || !Number.isFinite(value)) {
        errors.push(`Enter ${label.toLowerCase()}.`);
        fields.push(id);
      } else if (value < min || value > max) {
        errors.push(`${label} must be between ${min} and ${max}${unit ? ` ${unit}` : ''}.`);
        fields.push(id);
      }
    }
    return { errors, fields };
  }

  function runSizing() {
    const validation = validateCableInputs();
    setCableValidation(
      validation.errors.length
        ? `${validation.errors.join(' ')} The calculation preview uses the nearest safe value until you finish editing.`
        : '',
      validation.fields,
    );
    // Calculation uses boundedValue below, so an in-progress empty field remains
    // editable while the live answer stays safe. Values are canonicalised on
    // change and during initial shared-link restore.
    syncUrl();

    const stdId = currentStandard();
    const std = CS_STANDARDS[stdId];
    const systemType = document.getElementById('cs-system-type')?.value || 'single-phase';
    const v = boundedValue('cs-voltage', 230, 12, 1000);
    const powerKw = boundedValue('cs-power', 7.2, 0.1, 500);
    const powerWatts = powerKw * 1000;
    const pf = boundedValue('cs-pf', 1.0, 0.5, 1.0);
    const length = boundedValue('cs-length', 18, 1, 200);
    const circuitType = document.getElementById('cs-circuit-type')?.value || 'power';
    const method = document.getElementById('cs-install-method')?.value || 'C';
    const material = document.getElementById('cs-material')?.value || 'copper';
    const temp = boundedValue('cs-temp', 30, 10, 60);
    const grouping = boundedValue('cs-grouping', 1, 1, 20);
    const insulation = readValue('cs-insulation', 0);
    const fuseCc = Boolean(document.getElementById('cs-fuse-cc')?.checked);

    // Design current Ib. An in-progress empty field is clamped, never zeroed:
    // a 0 A design current would silently size a circuit for nothing.
    let ib = 0;
    if (systemType === 'three-phase') ib = powerWatts / (Math.sqrt(3) * v * pf);
    else if (systemType === 'dc') ib = powerWatts / v;
    else ib = powerWatts / (v * pf);
    if (!Number.isFinite(ib)) ib = 0;
    ib = Math.max(0.1, ib);

    // Protective device rating In (next standard ≥ Ib)
    let inRating = STANDARD_RATINGS[STANDARD_RATINGS.length - 1];
    for (const r of STANDARD_RATINGS) {
      if (r >= ib) {
        inRating = r;
        break;
      }
    }

    // Derating: Ca · Cg · Ci · Cc — factors multiply, they never add
    const ca = getCa(temp);
    const cg = getCg(grouping);
    const ci = getCi(insulation);
    const cc = fuseCc ? BS3036_FACTOR : 1.0;
    const totalFactor = Math.max(0.05, ca * cg * ci * cc);
    const itRequired = inRating / totalFactor;

    // IEC 60364-5-52 Annex G raises the ceiling by 0.005 %/m past 100 m (cap
    // +0.5 %); BS 7671 Table 4Ab has no such allowance. Mirrors
    // `longRunDropAllowancePct` in calculation.ts.
    const IEC = CS_STANDARDS['iec-60364'];
    const longRunAllowance =
      stdId === 'iec-60364' && length > 100 ? Math.min(0.5, (length - 100) * 0.005) : 0;
    const maxVdropPct =
      (circuitType === 'lighting' ? std.lightingPct : std.powerPct) + longRunAllowance;
    const maxVdropV = (v * maxVdropPct) / 100;

    const methodTable = AMPACITY[method] || AMPACITY.C;
    const largestSize = STANDARD_SIZES[STANDARD_SIZES.length - 1];
    let selectedSize = largestSize;
    let selectedAmpacity = 0;
    let selectedVdropV = 0;
    let selectedVdropPct = 0;
    // True only when a tabulated size clears both gates.
    let compliant = false;
    // Which gate forced this size: 'voltage-drop' when a smaller cable was big
    // enough thermally but could not hold the voltage.
    let dropWasBinding = false;
    // The two gates, kept separate so the crossover chart can draw both lines.
    let thermalOnlySize = largestSize;
    let dropOnlySize = largestSize;
    const ampacityOf = (size) =>
      (methodTable[size] || 0) * (material === 'aluminum' ? ALUMINIUM_AMPACITY_FACTOR : 1);
    for (const size of STANDARD_SIZES) {
      if (ampacityOf(size) >= itRequired) {
        thermalOnlySize = size;
        break;
      }
    }
    for (const size of STANDARD_SIZES) {
      if ((mvFor(size, systemType, material) * ib * length) / 1000 <= maxVdropV) {
        dropOnlySize = size;
        break;
      }
    }

    for (const size of STANDARD_SIZES) {
      const iz = ampacityOf(size);
      const thermalOk = iz >= itRequired;
      const vDrop = (mvFor(size, systemType, material) * ib * length) / 1000;
      const vDropOk = vDrop <= maxVdropV;

      if (thermalOk && !vDropOk) dropWasBinding = true;
      if (thermalOk && vDropOk) {
        selectedSize = size;
        selectedAmpacity = iz;
        selectedVdropV = vDrop;
        selectedVdropPct = (vDrop / v) * 100;
        compliant = true;
        break;
      }
    }

    if (!compliant) {
      // Nothing on the ladder passes both gates. Keep the largest size as the
      // *reference* the scene draws (the fattest cable), but the verdict below
      // must not present it as a real answer.
      selectedAmpacity = ampacityOf(largestSize);
      selectedVdropV = (mvFor(largestSize, systemType, material) * ib * length) / 1000;
      selectedVdropPct = (selectedVdropV / v) * 100;
    }

    const limitingConstraint = dropWasBinding ? 'voltage-drop' : 'thermal';
    const cpc = CPC_MAP[selectedSize] || selectedSize;
    const thermalPass = selectedAmpacity >= itRequired;
    const vdropPass = selectedVdropPct <= maxVdropPct + 1e-9;

    /* ── numeric readout ─────────────────────────────────────────────── */
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    set('cs-out-size', selectedSize.toFixed(1));
    set('cs-out-cpc', `${cpc.toFixed(1)} mm²`);
    set('cs-out-ib', `${ib.toFixed(1)} A`);
    set('cs-out-in', `${inRating} A`);
    set('cs-out-it', `${itRequired.toFixed(1)} A`);
    set('cs-out-iz', `${selectedAmpacity.toFixed(1)} A`);
    set('cs-out-vdrop-v', `${selectedVdropV.toFixed(1)} V`);
    set('cs-out-vdrop-pct', `${selectedVdropPct.toFixed(2)}%`);
    set('cs-factor-ca', ca.toFixed(2));
    set('cs-factor-cg', cg.toFixed(2));
    set('cs-factor-ci', ci.toFixed(2));
    set('cs-factor-total', totalFactor.toFixed(2));

    const note = document.getElementById('cs-standard-note');
    if (note) note.textContent = std.citation;
    const echo = document.getElementById('cs-standard-echo');
    if (echo) echo.innerHTML = std.echo;
    const lightingOption = document.getElementById('cs-lighting-option');
    if (lightingOption) {
      lightingOption.textContent =
        stdId === 'iec-60364' ? 'Lighting (3% — IEC Annex G)' : 'Lighting (3% — BS 7671 Reg 525.1)';
    }
    const chipDrop = document.getElementById('cs-chip-drop');
    if (chipDrop) chipDrop.textContent = `${selectedVdropPct.toFixed(2)}%`;
    const chipCeiling = document.getElementById('cs-chip-ceiling');
    if (chipCeiling) chipCeiling.textContent = `${maxVdropPct}%`;
    const chipDerate = document.getElementById('cs-chip-derate');
    if (chipDerate) chipDerate.textContent = totalFactor.toFixed(2);

    // Compare percentages with percentages. The previous expression compared
    // selectedVdropPct (%) with maxVdropV (volts), making the "Marginal" state
    // depend on supply voltage rather than proximity to the drop limit.
    const status = compliant
      ? thermalPass && vdropPass
        ? selectedVdropPct > maxVdropPct * 0.85
          ? 'warning'
          : 'pass'
        : 'fail'
      : 'fail';
    const badge = document.getElementById('cs-status-badge');
    const hero = document.getElementById('cs-hero-card');
    const heroValue = document.getElementById('cs-out-size');
    const summary = document.getElementById('cs-summary-text');
    if (badge) {
      badge.textContent =
        status === 'pass' ? 'Compliant' : status === 'warning' ? 'Marginal' : 'Limits Exceeded';
    }
    if (hero) hero.dataset.state = status;
    if (heroValue) {
      // The hero must never present the reference size as a real answer.
      heroValue.textContent = compliant ? selectedSize.toFixed(1) : '—';
    }
    if (summary) {
      const methodLabel = (METHOD_INFO[method] || METHOD_INFO.C).name;
      if (!compliant) {
        summary.textContent = `No compliant size per ${std.label}: even the largest tabulated ${largestSize.toFixed(
          1,
        )} mm² only carries ${selectedAmpacity.toFixed(0)} A after derating (It ${itRequired.toFixed(
          1,
        )} A needed) with ${selectedVdropPct.toFixed(
          2,
        )}% volt drop against the ${maxVdropPct.toFixed(1)}% ceiling at ${length} m in ${methodLabel}. Shorten the run, split the circuit into branches, or improve how the cable is fixed.`;
      } else if (status === 'fail') {
        summary.textContent = `Non-compliant per ${std.label}: run exceeds conductor limits at ${length} m in ${methodLabel} (It ${itRequired.toFixed(
          1,
        )} A needed). Upsize the cable route, reduce run length, or split circuit branches.`;
      } else if (status === 'warning') {
        summary.textContent = `Marginal: ${selectedSize.toFixed(1)} mm² meets ${std.label}, but volt drop is at ${selectedVdropPct.toFixed(
          2,
        )}% of the ${maxVdropPct}% ceiling — one extra socket or a longer tap later would breach it.`;
      } else {
        summary.textContent = `Compliant per ${std.label}: ${selectedSize.toFixed(1)} mm² carries ${selectedAmpacity.toFixed(
          0,
        )} A after derating (It ${itRequired.toFixed(1)} A needed) with ${selectedVdropPct.toFixed(2)}% volt drop against a ${maxVdropPct}% ceiling.`;
      }
    }

    /* ── scene + gauge ───────────────────────────────────────────────── */
    paintScene({
      method,
      insulation,
      grouping,
      temp,
      material,
      systemType,
      circuitType,
      fuseCc,
      ib,
      inRating,
      itRequired,
      iz: selectedAmpacity,
      size: selectedSize,
      cpc,
      vdropPct: selectedVdropPct,
      maxVdropPct,
      totalFactor,
      factors: { ca, cg, ci, cc },
      limitingConstraint,
      status,
      compliant,
      stdLabel: std.label,
      stdId,
      powerKw,
      pf,
      thermalOnlySize,
      dropOnlySize,
      length,
      methodTable,
      materialFactor: material === 'aluminum' ? ALUMINIUM_AMPACITY_FACTOR : 1,
      systemTypeForCurve: systemType,
      v,
    });

    updateMobileSummary({
      size: selectedSize,
      iz: selectedAmpacity,
      vdropPct: selectedVdropPct,
      ceiling: maxVdropPct,
      status,
      constraint: limitingConstraint,
      compliant,
    });

    populatePrintSheet({
      method,
      insulation,
      grouping,
      temp,
      material,
      systemType,
      fuseCc,
      ib,
      inRating,
      itRequired,
      iz: selectedAmpacity,
      size: selectedSize,
      cpc,
      vdropPct: selectedVdropPct,
      maxVdropPct,
      totalFactor,
      limitingConstraint,
      status,
      compliant,
      stdLabel: std.label,
      stdId,
      powerKw,
      pf,
      length,
      v,
    });

    // Tell the (possibly loaded) 3D view that the data changed.
    document.dispatchEvent(new CustomEvent('cs:scene-painted'));
  }

  /* ─────────────────────────────────────────────────────────────────────
   * Scene painting: numbers in, CSS custom properties out.
   * ──────────────────────────────────────────────────────────────────── */

  /**
   * Which appliance stands at the far end of the run. `auto` follows the circuit
   * function; a preset sets it explicitly; and the picker in the panel lets you
   * look at the same cable feeding a bulb or a motor without changing a number.
   */
  function sceneLoadFor(model) {
    const picked = document.getElementById('cs-load')?.value || 'auto';
    if (picked !== 'auto') return picked;
    return model.circuitType === 'lighting' ? 'lighting' : 'socket';
  }

  function paintScene(model) {
    const root = document.getElementById('cs-scene-root');
    const paint = window.ElectraStage?.paint;

    // How hard heat is trying to get out, and how well it can:
    //  - containment + insulation + grouping + hot air all reduce "cool"
    //  - load current against the cable's own capacity drives "heat"
    const containmentPenalty =
      model.method === 'C' || model.method === 'E' ? 0 : model.method === 'B' ? 0.22 : 0.34;
    const insulationPenalty = (model.insulation / 200) * 0.3;
    const groupingPenalty = Math.min(0.3, (Math.max(0, model.grouping - 1) / 12) * 0.3);
    const ambientPenalty = Math.max(0, Math.min(0.24, ((model.temp - 30) / 30) * 0.24));
    const cool = Math.max(
      0.06,
      Math.min(1, 1 - containmentPenalty - insulationPenalty - groupingPenalty - ambientPenalty),
    );
    const utilisation =
      model.iz > 0 ? Math.max(0, Math.min(1.4, model.itRequired / model.iz)) : 1.4;
    const heat = Math.max(0.08, Math.min(1, 0.22 + utilisation * 0.62));
    const coreFraction = (size) => {
      const min = Math.sqrt(STANDARD_SIZES[0]);
      const max = Math.sqrt(STANDARD_SIZES[STANDARD_SIZES.length - 1]);
      const t = (Math.sqrt(size) - min) / (max - min);
      return (0.3 + Math.max(0, Math.min(1, t)) * 0.34).toFixed(3);
    };

    if (root) {
      if (paint) {
        paint(
          root,
          {
            '--heat': heat.toFixed(3),
            '--cool': cool.toFixed(3),
            '--core': coreFraction(model.size),
            '--insul': (model.insulation / 200).toFixed(3),
          },
          {
            method: model.method,
            status: model.status,
            constraint: model.limitingConstraint,
            material: model.material,
            neighbours: Math.min(Math.max(0, model.grouping - 1), 6),
            insulation: model.insulation,
            ambient: model.temp >= 45 ? 'hot' : model.temp >= 38 ? 'warm' : 'mild',
            selected: model.size,
          },
        );
      } else {
        // Defensive: the shared runtime did not load, so keep the data path alive.
        root.dataset.method = model.method;
        root.dataset.status = model.status;
      }

      // the results panel carries the ladder + chart, so it needs the material
      // hook too (aluminium greys the ladder dots like the specimen)
      const resultsHost = document.getElementById('cs-results-container');
      if (resultsHost) resultsHost.dataset.material = model.material;
      const chartCard = document.getElementById('cs-chart-card');
      if (chartCard) chartCard.dataset.constraint = model.limitingConstraint;

      // current flow speed tracks the load, mirroring the voltage-drop stage
      const durSec = Math.max(0.9, Math.min(6, 3.4 * (32 / Math.max(1, model.ib))));
      root.style.setProperty('--flow', `${durSec.toFixed(2)}s`);
      root.querySelectorAll('#cs-scene-root animateMotion, animateMotion').forEach((anim) => {
        anim.setAttribute('dur', `${durSec.toFixed(2)}s`);
      });
    }

    /* ── the story layer: source → cable → load ─────────────────────────
       Everything the drawing reacts to is derived from the same model, so the
       cable thickens, sags, glows and dims exactly as the numbers say it should. */
    paintRoute(model.method, model.length);
    const sizeT =
      (Math.sqrt(model.size) - Math.sqrt(STANDARD_SIZES[0])) /
      (Math.sqrt(STANDARD_SIZES[STANDARD_SIZES.length - 1]) - Math.sqrt(STANDARD_SIZES[0]));
    const dropRatio = Math.max(0, Math.min(1.6, model.vdropPct / Math.max(0.5, model.maxVdropPct)));
    const sagT = Math.max(0, Math.min(1, (model.length - 1) / 140));
    if (root) {
      if (paint) {
        paint(
          root,
          {
            '--size': Math.max(0, Math.min(1, sizeT)).toFixed(3),
            '--drop': dropRatio.toFixed(3),
            '--util': Math.max(0, Math.min(1.4, utilisation)).toFixed(3),
            '--sag': sagT.toFixed(3),
            // delivered voltage as a fraction of nominal, clipped to what the eye
            // can read: 100% is full brightness, 92% is visibly dim
            '--delivered': Math.max(0.55, Math.min(1, 1 - model.vdropPct / 100)).toFixed(3),
          },
          {
            load: sceneLoadFor(model),
            near:
              dropRatio > 0.97 || utilisation > 1
                ? 'over'
                : dropRatio > 0.8 || utilisation > 0.92
                  ? 'tight'
                  : 'ok',
            length: Math.round(model.length),
          },
        );
      } else {
        root.dataset.load = sceneLoadFor(model);
      }
    }

    // in-scene readouts: the labels that make the direction of power explicit
    const phaseTag =
      model.systemType === 'three-phase' ? '3-Φ' : model.systemType === 'dc' ? 'DC' : '1-Φ';
    const setText = (id, value) => {
      const node = document.getElementById(id);
      if (node && node.textContent !== value) node.textContent = value;
    };
    setText('cs-tag-source', `${model.v} V ${phaseTag}`);
    setText(
      'cs-tag-load',
      `${(model.v - (model.vdropPct * model.v) / 100).toFixed(1)} V · ${model.vdropPct.toFixed(2)}%`,
    );
    setText(
      'cs-tag-cable',
      model.compliant
        ? `${model.size.toFixed(1)} mm² ${model.material === 'aluminum' ? 'aluminium' : 'copper'} · ${model.length} m · ${model.cpc.toFixed(1)} mm² CPC`
        : `no compliant size · ${model.material === 'aluminum' ? 'aluminium' : 'copper'} · ${model.length} m · ${model.cpc.toFixed(1)} mm² CPC`,
    );
    const deviceKind = model.fuseCc ? 'BS 3036 fuse' : 'MCB';
    setText('cs-tag-device', `${model.inRating} A ${deviceKind}`);
    setText(
      'cs-tag-iz',
      model.compliant
        ? `Iz ${model.iz.toFixed(0)} A ≥ It ${model.itRequired.toFixed(1)} A`
        : `Iz ${model.iz.toFixed(0)} A < It ${model.itRequired.toFixed(1)} A — no compliant size`,
    );
    setText(
      'cs-tag-iz-readout',
      model.compliant
        ? `Iz ${model.iz.toFixed(0)} A ≥ It ${model.itRequired.toFixed(1)} A`
        : `Iz ${model.iz.toFixed(0)} A < It ${model.itRequired.toFixed(1)} A — no compliant size`,
    );
    setText(
      'cs-tag-gate',
      model.compliant
        ? model.limitingConstraint === 'voltage-drop'
          ? 'volt drop decides'
          : 'heat decides'
        : 'no compliant size',
    );
    const methodNames = {
      A: 'IN INSULATION',
      B: 'IN CONDUIT',
      C: 'CLIPPED DIRECT',
      D: 'BURIED IN GROUND',
      E: 'FREE AIR / TRAY',
    };
    setText(
      'cs-tag-method',
      `METHOD ${model.method} · ${methodNames[model.method] || 'INSTALLATION'}`,
    );
    setText('cs-tag-dim', `${model.length} m one-way`);
    setText(
      'cs-tag-gate-drop',
      `${model.vdropPct.toFixed(2)}% of the ${model.maxVdropPct}% ceiling`,
    );

    /* ── the ampacity gauge ── */
    const gauge = document.getElementById('cs-gauge');
    const fill = document.getElementById('cs-gauge-fill');
    const caption = document.getElementById('cs-gauge-caption');

    // The gauge spans 0 → max(Iz, It, In) × 1.12; every mark is a 0..1 fraction,
    // so CSS places them and the numbers never live in two places.
    const scaleMax = Math.max(model.iz, model.itRequired, model.inRating, 1) * 1.12;
    const frac = (n) => Math.max(0, Math.min(1, n / scaleMax)).toFixed(3);
    if (gauge) {
      // keep the In / It / Ib labels inside the panel: at the far edge a centred
      // label is clipped by the panel's rounded corners, so it hangs the other way
      const marks = [model.ib, model.itRequired, model.inRating].map((n) => n / scaleMax);
      const crowdedRight = Math.max(...marks) > 0.84;
      const crowdedLeft = Math.min(...marks) < 0.1;
      gauge.dataset.edge =
        crowdedRight && !crowdedLeft ? 'right' : crowdedLeft && !crowdedRight ? 'left' : 'center';
      gauge.style.setProperty('--gauge', frac(model.iz));
      gauge.style.setProperty('--load-mark', frac(model.ib));
      gauge.style.setProperty('--rating-mark', frac(model.inRating));
      gauge.style.setProperty('--need-mark', frac(model.itRequired));
      gauge.dataset.state = model.status;
    }
    if (fill) fill.setAttribute('aria-hidden', 'true');
    if (caption) {
      const spare = model.iz > 0 ? ((model.iz - model.itRequired) / model.iz) * 100 : 0;
      caption.textContent = model.compliant
        ? model.iz >= model.itRequired
          ? `${model.size.toFixed(1)} mm² sheds its heat at ${model.iz.toFixed(0)} A and needs to cover ${model.itRequired.toFixed(
              1,
            )} A after derating — ${spare.toFixed(0)}% spare capacity.`
          : `Even the largest ladder size only sheds ${model.iz.toFixed(0)} A here, short of the ${model.itRequired.toFixed(
              1,
            )} A that ${model.method === 'A' ? 'the insulation' : 'these conditions'} demand.`
        : `No tabulated size clears both gates: the largest ${model.size.toFixed(1)} mm² sheds ${model.iz.toFixed(
            0,
          )} A but ${model.itRequired.toFixed(1)} A is needed — shorten the run or split the circuit.`;
    }

    const chip = document.getElementById('cs-constraint-chip');
    if (chip) {
      chip.textContent =
        model.limitingConstraint === 'voltage-drop'
          ? 'volt drop sets this size'
          : 'heat sets this size';
      chip.dataset.constraint = model.limitingConstraint;
    }

    /* ── the "why this size?" waterfall ── */
    const bars = document.getElementById('cs-why-bars');
    const whyText = document.getElementById('cs-why-text');
    if (bars) {
      const steps = [
        { label: 'tabulated', value: model.iz / Math.max(0.0001, model.totalFactor), tone: 'base' },
        {
          label: `Ca ${model.factors.ca.toFixed(2)}`,
          value: (model.iz / model.totalFactor) * model.factors.ca,
          tone: 'step',
        },
        {
          label: `Cg ${model.factors.cg.toFixed(2)}`,
          value: (model.iz / model.totalFactor) * model.factors.ca * model.factors.cg,
          tone: 'step',
        },
        {
          label: `Ci ${model.factors.ci.toFixed(2)}`,
          value:
            (model.iz / model.totalFactor) * model.factors.ca * model.factors.cg * model.factors.ci,
          tone: 'step',
        },
        { label: `Iz ${model.iz.toFixed(0)}`, value: model.iz, tone: 'step' },
        { label: 'needed It', value: model.itRequired, tone: 'need' },
      ].filter((s) => Number.isFinite(s.value) && s.value > 0);
      const max = Math.max(...steps.map((s) => s.value), 1);
      bars.innerHTML = steps
        .map(
          (s) =>
            `<span class="cs-bar cs-bar--${s.tone}"><span class="cs-bar-fill" style="--h:${(
              s.value / max
            ).toFixed(
              3,
            )}"></span><span class="cs-bar-value">${s.value.toFixed(0)} A</span><span class="cs-bar-label">${s.label}</span></span>`,
        )
        .join('');
    }
    if (whyText) {
      const methodNote = (METHOD_INFO[model.method] || METHOD_INFO.C).name;
      whyText.textContent = `${methodNote}, ${model.temp} °C air, ${model.grouping} grouped circuit${
        model.grouping === 1 ? '' : 's'
      }, ${model.insulation > 0 ? `${model.insulation} mm insulation` : 'no thermal insulation'}${
        model.factors.cc < 1 ? ', BS 3036 fuse' : ''
      } — multiplied together that is ×${model.totalFactor.toFixed(2)} on the tabulated ampacity. ${
        model.limitingConstraint === 'voltage-drop'
          ? `Heat was satisfied sooner: it is the ${model.vdropPct.toFixed(2)}% volt drop at ${
              model.length
            } m that pushed this size up.`
          : 'Ampacity is the binding gate here, so the run length is not yet the problem.'
      }`;
    }

    /* ── size ladder highlight ── */
    document.querySelectorAll('.cs-rung').forEach((rung) => {
      const size = Number.parseFloat(rung.getAttribute('data-size'));
      // when nothing on the ladder is compliant, no rung is "the answer"
      rung.classList.toggle('is-selected', model.compliant && Math.abs(size - model.size) < 1e-6);
      // mark the sizes that would fail: everything below the answer (or every
      // rung, when even the largest cannot clear the gates)
      rung.classList.toggle('is-short', !model.compliant || size < model.size - 1e-6);
      // The ladder is a live proof, not a decorative copper-only legend.
      const amp = (model.methodTable[size] || 0) * model.materialFactor;
      const ampNode = rung.querySelector('.cs-rung-amp');
      if (ampNode) ampNode.textContent = `${amp.toFixed(0)} A`;
    });
    const ladderTitle = document.getElementById('cs-ladder-title');
    if (ladderTitle) {
      ladderTitle.textContent = `Size ladder · method ${model.method} · ${model.material === 'aluminum' ? 'aluminium' : 'copper'}`;
    }
    const ladder = document.querySelector('.cs-ladder');
    if (ladder) {
      ladder.setAttribute(
        'aria-label',
        model.compliant
          ? `Standard conductor sizes for method ${model.method}, ${model.material === 'aluminum' ? 'aluminium' : 'copper'}; ${model.size.toFixed(1)} mm² is selected`
          : `Standard conductor sizes for method ${model.method}, ${model.material === 'aluminum' ? 'aluminium' : 'copper'}; no size is compliant at this load`,
      );
    }

    /* ── crossover chart ── */
    paintCrossover(model);
  }

  /** Rebuild the two step-lines and the crossover marker from live inputs. */
  function paintCrossover(model) {
    const thermal = model.thermalOnlySize;
    const lengths = Array.from({ length: 40 }, (_, i) => (i + 1) * 3);
    const sizeIndex = (mm2) => Math.max(0, STANDARD_SIZES.indexOf(mm2));
    const x = (len) => CHART.x + (Math.min(120, Math.max(0, len)) / 120) * CHART.w;
    const y = (mm2) => CHART.y + CHART.h - ((sizeIndex(mm2) + 1) / STANDARD_SIZES.length) * CHART.h;

    const thermalD = `M${x(lengths[0]).toFixed(1)} ${y(thermal).toFixed(1)} L${x(lengths[lengths.length - 1]).toFixed(1)} ${y(thermal).toFixed(1)}`;
    const points = lengths.map((len) => {
      let size = STANDARD_SIZES[STANDARD_SIZES.length - 1];
      for (const candidate of STANDARD_SIZES) {
        const vDrop =
          (mvFor(candidate, model.systemTypeForCurve, model.material) * model.ib * len) / 1000;
        if (vDrop <= (model.v * model.maxVdropPct) / 100) {
          size = candidate;
          break;
        }
      }
      return { len, size };
    });

    let dropD = `M${x(points[0].len).toFixed(1)} ${y(points[0].size).toFixed(1)}`;
    points.forEach((p, i) => {
      if (i === 0) return;
      const prevY = y(points[i - 1].size);
      const curY = y(p.size);
      if (Math.abs(prevY - curY) > 0.5) dropD += ` L${x(p.len).toFixed(1)} ${prevY.toFixed(1)}`;
      dropD += ` L${x(p.len).toFixed(1)} ${curY.toFixed(1)}`;
    });

    const thermalPath = document.querySelector('.cs-line--thermal');
    const dropPath = document.querySelector('.cs-line--drop');
    if (thermalPath) thermalPath.setAttribute('d', thermalD);
    if (dropPath) dropPath.setAttribute('d', dropD);

    const cross = points.find(
      (p, i) => p.size > thermal && !(i > 0 && points[i - 1].size > thermal),
    );
    const group = document.querySelector('.cs-cross');
    if (group && cross) {
      group.setAttribute('transform', `translate(${x(cross.len).toFixed(1)} 0)`);
      group.removeAttribute('hidden');
      const dot = group.querySelector('.cs-cross-dot');
      if (dot) dot.setAttribute('cy', y(thermal).toFixed(1));
      // the panel chart labels the crossover in its footer rather than drawing a
      // second text layer over the lines
      const foot = document.querySelector('.cs-chart-foot');
      if (foot) foot.textContent = `~${Math.round(cross.len)} m`;
    } else if (group) {
      group.setAttribute('hidden', '');
    }
    const foot = document.querySelector('.cs-chart-foot');
    if (foot && !cross) foot.textContent = 'heat governs';

    // the field's own title tracks the method, since that is what the row is about
    // (the specimen caption is written once, in paintScene, from the same model)
    const methodLabel = document.getElementById('cs-method-label');
    if (methodLabel) {
      methodLabel.textContent = `${(METHOD_INFO[model.method] || METHOD_INFO.C).name} · ${model.systemType === 'three-phase' ? '3-Φ' : model.systemType === 'dc' ? 'DC' : '1-Φ'} ${model.v} V`;
    }
  }

  /* ─────────────────────────────────────────────────────────────────────
   * Presets — realistic starting points, incl. how the cable is fixed
   * ──────────────────────────────────────────────────────────────────── */

  /*
   * The preset *answers* live in CableSizingPanels.astro, which renders both the
   * chips and a JSON field payload from one table (`PRESETS`). The client
   * therefore has no second copy of anyone's shower current to fall out of step
   * with — it applies fields, and the engine does the rest.
   */
  let presetFields = null;

  function presetData() {
    if (presetFields) return presetFields;
    const node = document.getElementById('cs-preset-data');
    try {
      presetFields = node ? JSON.parse(node.textContent) : {};
    } catch {
      presetFields = {};
    }
    return presetFields;
  }

  let activePreset = null;

  /** Which preset (if any) the current inputs still match. */
  function syncPresetButtons(name) {
    activePreset = name || null;
    document.querySelectorAll('[data-preset]').forEach((chip) => {
      const on = chip.getAttribute('data-preset') === name;
      chip.classList.toggle('active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  /** Editing any field means it is no longer the preset — say so out loud. */
  function releasePreset() {
    if (!activePreset) return;
    syncPresetButtons(null);
  }

  function applyPreset(name) {
    const fields = presetData()[name];
    if (!fields) return false;
    urlArmed = true;
    for (const [id, value] of Object.entries(fields)) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (el.type === 'checkbox') el.checked = value === '1';
      else el.value = value;
    }
    activePreset = name;
    syncPresetButtons(name);
    syncControls();
    runSizing();
    // let the eye follow the change
    const sceneRoot = document.getElementById('cs-scene-root');
    if (sceneRoot && !REDUCED_MOTION.matches) {
      sceneRoot.classList.add('cs-scene--pulse');
      setTimeout(() => sceneRoot.classList.remove('cs-scene--pulse'), 650);
    }
    return true;
  }

  /* ─────────────────────────────────────────────────────────────────────
   * The pinned handle: when the layout folds the panels into a drawer, the bar at
   * the bottom of the screen is the only thing between the scene and the settings,
   * so it carries the answer itself. Closed drawer, complete verdict.
   * ──────────────────────────────────────────────────────────────────── */

  function updateMobileSummary(model) {
    const bar = document.getElementById('cs-mobile-bar');
    const size = document.getElementById('cs-mobile-size');
    // the handle must never present the reference size as a real answer either
    if (size) size.textContent = model.compliant ? `${model.size.toFixed(1)} mm²` : 'no size';
    const drop = document.getElementById('cs-mobile-drop');
    if (drop) {
      drop.textContent = model.compliant
        ? model.status === 'fail'
          ? 'limits exceeded'
          : `${model.vdropPct.toFixed(2)}% of ${model.ceiling}%`
        : 'no compliant size';
    }
    if (bar) {
      bar.setAttribute('data-status', model.status);
      bar.setAttribute('data-constraint', model.constraint || '');
    }
    const dot = document.getElementById('cs-mobile-dot');
    if (dot) dot.setAttribute('data-status', model.status);
  }

  /* ─────────────────────────────────────────────────────────────────────
   * Print / PDF summary. The sheet is rendered from the same model object
   * that paints the scene and the panels, so what the installer prints is
   * exactly what the screen showed (one source of truth).
   * ──────────────────────────────────────────────────────────────────── */

  function populatePrintSheet(model) {
    const sheet = document.getElementById('cs-print-sheet');
    if (!sheet) return;
    const t = (id) => sheet.querySelector(`[data-print="${id}"]`);
    const set = (id, value) => {
      const node = t(id);
      if (node) node.textContent = value;
    };
    const fmt = (n, digits = 1) => (Number.isFinite(n) ? n.toFixed(digits) : '—');

    set(
      'date',
      new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
    );
    set('standard', model.stdLabel);
    set(
      'system',
      `${model.systemType === 'three-phase' ? '3-Φ' : model.systemType === 'dc' ? 'DC' : '1-Φ'} ${model.v} V`,
    );
    set('power', `${fmt(model.powerKw, 1)} kW`);
    set('pf', fmt(model.pf, 2));
    set('length', `${fmt(model.length, 0)} m`);
    set('method', (METHOD_INFO[model.method] || METHOD_INFO.C).name);
    set('material', model.material === 'aluminum' ? 'Aluminium' : 'Copper');
    set('temp', `${fmt(model.temp, 0)} °C`);
    set('grouping', `${model.grouping} circuit${model.grouping === 1 ? '' : 's'}`);
    set('insulation', model.insulation > 0 ? `${model.insulation} mm` : 'None');
    set('fuse', model.fuseCc ? 'BS 3036 (0.725)' : 'None');

    const size = t('size');
    if (size)
      size.textContent = model.compliant ? `${fmt(model.size, 1)} mm²` : 'No compliant size';
    const cpc = t('cpc');
    if (cpc) cpc.textContent = model.compliant ? `${fmt(model.cpc, 1)} mm²` : '—';
    set('ib', `${fmt(model.ib, 1)} A`);
    set('in', `${fmt(model.inRating, 0)} A`);
    set('it', `${fmt(model.itRequired, 1)} A`);
    set('iz', `${fmt(model.iz, 1)} A`);
    set('derate', fmt(model.totalFactor, 2));
    set('vdrop', `${fmt(model.vdropPct, 2)}% of ${fmt(model.maxVdropPct, 1)}%`);
    set(
      'constraint',
      model.compliant
        ? model.limitingConstraint === 'voltage-drop'
          ? 'Volt drop sets this size'
          : 'Heat (ampacity) sets this size'
        : 'No compliant size',
    );
    const verdict = t('verdict');
    if (verdict) {
      verdict.textContent =
        model.status === 'pass'
          ? 'Compliant'
          : model.status === 'warning'
            ? 'Marginal'
            : 'Limits exceeded';
    }
    const summary = t('summary');
    if (summary) {
      summary.textContent = document.getElementById('cs-summary-text')?.textContent || '';
    }
    const citation = t('citation');
    if (citation) citation.textContent = CS_STANDARDS[model.stdId]?.citation || '';
  }

  /* ─────────────────────────────────────────────────────────────────────
   * Drawer: on the touch layout the two panels are bottom sheets. Open them from
   * the pinned handle; close with the grabber, the ×, the scrim, Escape, or by
   * dragging down. Drag up and the sheet takes the whole column, which is how you
   * read the ladder and the crossover chart on a phone.
   * ──────────────────────────────────────────────────────────────────── */

  const SHEETS = {
    inputs: { panel: 'cs-inputs-container', trigger: 'cs-mob-inputs' },
    results: { panel: 'cs-results-container', trigger: 'cs-mob-results' },
  };
  let openSheetKey = null;

  function stageEl() {
    return document.getElementById('interactive-stage');
  }

  function drawerMode() {
    const stage = stageEl();
    if (stage?.dataset.layout) return stage.dataset.layout === 'drawer';
    return window.ElectraStage?.layout ? window.ElectraStage.layout() === 'drawer' : false;
  }

  function closeSheet(opts) {
    const options = opts || {};
    for (const key of Object.keys(SHEETS)) {
      const el = document.getElementById(SHEETS[key].panel);
      if (!el) continue;
      el.classList.remove('sheet-open', 'is-expanded', 'is-dragging');
      el.style.removeProperty('transform');
      el.inert = true;
    }
    const scrim = document.getElementById('cs-scrim');
    if (scrim) scrim.hidden = true;
    stageEl()?.classList.remove('sheet-peeking');
    document.body.style.overflow = '';
    const wasOpen = openSheetKey;
    openSheetKey = null;
    // a drawer only exists on the touch layout; elsewhere the panels are plain
    // blocks in the page and must never be inert
    if (wasOpen && !drawerMode()) setSheetsInert(false);
    const back =
      options.trigger || (wasOpen ? document.getElementById(SHEETS[wasOpen].trigger) : null);
    if (options.focus !== false && back instanceof HTMLElement) back.focus();
    if (window.ElectraStage?.attach) {
      // the free band between panels changed, so the scene fit has to be re-measured
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    }
  }

  function openSheet(key, trigger) {
    const spec = SHEETS[key];
    const el = spec && document.getElementById(spec.panel);
    if (!el) return;
    for (const other of Object.keys(SHEETS)) {
      if (other !== key)
        document.getElementById(SHEETS[other].panel)?.classList.remove('sheet-open', 'is-expanded');
    }
    openSheetKey = key;
    el.inert = false;
    el.classList.add('sheet-open');
    // the sheet is viewport-anchored (that is what a sheet is), so make sure the
    // stage it belongs to is on screen too — otherwise a tall pane shows a drawer
    // opening somewhere the reader is not looking
    stageEl()?.scrollIntoView({ block: 'nearest' });
    el.style.removeProperty('transform');
    const scrim = document.getElementById('cs-scrim');
    if (scrim) scrim.hidden = false;
    stageEl()?.classList.add('sheet-peeking');
    document.body.style.overflow = 'hidden';
    // focus the sheet, not its first control: focusing a number field on a phone
    // would pop the keyboard over the very thing the visitor came to look at
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    el.scrollTop = 0;
    updateScrollAffordance(spec.panel, key === 'inputs' ? 'cs-inputs-body' : 'cs-results-body');
  }

  function toggleSheetsInertForLayout() {
    // Hidden-but-focusable sheets would leak tab stops into the page on desktop.
    setSheetsInert(drawerMode() && !openSheetKey);
  }

  function setSheetsInert(inert) {
    for (const key of Object.keys(SHEETS)) {
      const el = document.getElementById(SHEETS[key].panel);
      if (el) el.inert = Boolean(inert);
    }
  }

  /**
   * Drag the grabber: pull down to dismiss, push up to grow the sheet. Dragging
   * changes the sheet's height (it is bottom-anchored, so it grows upwards) which
   * is what a drawer feels like; a transform would only slide it off the screen.
   */
  function wireSheetDrag(key) {
    const panel = document.getElementById(SHEETS[key].panel);
    const grabber = panel?.querySelector('.ts-sheet-grabber');
    if (!grabber || !panel) return;
    let startY = 0;
    let startH = 0;
    let dy = 0;
    let pointerId = null;

    const maxH = () => Math.max(200, window.innerHeight - 74);

    const finish = (commit) => {
      panel.classList.remove('is-dragging');
      panel.style.removeProperty('transform');
      panel.style.removeProperty('height');
      if (pointerId === null) return;
      try {
        grabber.releasePointerCapture(pointerId);
      } catch {
        /* the pointer is already gone: nothing to release */
      }
      pointerId = null;
      if (!commit) return;
      if (dy > 88) {
        panel.classList.remove('is-expanded');
        closeSheet({ trigger: document.getElementById(SHEETS[key].trigger) });
        return;
      }
      panel.classList.toggle('is-expanded', -dy > 72);
      if (panel.classList.contains('is-expanded')) {
        // let the CSS own the resting height once the gesture ends
        panel.style.removeProperty('height');
      }
    };

    grabber.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      panel.dataset.wasExpanded = panel.classList.contains('is-expanded') ? '1' : '0';
      startY = e.clientY;
      startH = panel.getBoundingClientRect().height;
      dy = 0;
      pointerId = e.pointerId;
      panel.classList.add('is-dragging');
      try {
        grabber.setPointerCapture(e.pointerId);
      } catch {
        /* capture is a nicety: the gesture still works without it */
      }
    });

    grabber.addEventListener('pointermove', (e) => {
      if (pointerId === null) return;
      dy = e.clientY - startY;
      if (dy >= 0) {
        panel.style.transform = `translateY(${dy.toFixed(1)}px)`;
        panel.style.height = `${panel.dataset.wasExpanded === '1' ? maxH() : startH}px`;
        return;
      }
      panel.style.transform = 'translateY(0px)';
      panel.style.height = `${Math.min(maxH(), startH - dy).toFixed(1)}px`;
    });

    ['pointerup', 'pointercancel'].forEach((evt) =>
      grabber.addEventListener(evt, () => finish(true)),
    );
    grabber.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        panel.classList.toggle('is-expanded');
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        closeSheet({ trigger: document.getElementById(SHEETS[key].trigger) });
      }
    });
    // a plain tap on the handle flips between peek and full height
    grabber.addEventListener('dblclick', () => panel.classList.toggle('is-expanded'));
  }

  /* ─────────────────────────────────────────────────────────────────────
   * The route. Method decides *where* the cable goes (loft, conduit, wall
   * clips, trench, tray) and length decides how far it hangs between fixings,
   * so the picture physically changes shape as those two move.
   *
   * `src/lib/tools/stage-spec.ts` builds the same path for the server render;
   * the client is the only writer after load, so a mismatch self-corrects on the
   * first paint rather than leaving a stale drawing.
   * ──────────────────────────────────────────────────────────────────── */

  const RUN = {
    source: { x: 455, y: 452 },
    load: { x: 843, y: 470 },
    loftY: 232,
    trayY: 300,
    wallY: 372,
    floorY: 556,
    trenchY: 618,
    maxSag: 46,
    sagGive: { A: 0.34, B: 0.06, C: 1, D: 0.1, E: 0.72 },
  };

  function routePoints(method, lengthMeters) {
    // full sag at 140 m and beyond — the same clamped fraction as
    // `CABLE_ROUTE_SAG_METRES` in src/lib/tools/stage-spec.ts
    const t = Math.max(0, Math.min(1, (lengthMeters - 1) / 140));
    const sag = (give) => RUN.maxSag * give * t;
    const mid = (RUN.source.x + RUN.load.x) / 2;
    if (method === 'A') {
      const s = sag(0.34);
      return [
        RUN.source,
        { x: RUN.source.x, y: RUN.loftY },
        { x: mid - 84, y: RUN.loftY + 8 + s },
        { x: mid + 96, y: RUN.loftY + 6 + s },
        { x: RUN.load.x, y: RUN.loftY },
        RUN.load,
      ];
    }
    if (method === 'B') {
      return [
        RUN.source,
        { x: RUN.source.x, y: RUN.wallY },
        { x: mid, y: RUN.wallY + sag(0.06) },
        { x: RUN.load.x, y: RUN.wallY },
        RUN.load,
      ];
    }
    if (method === 'D') {
      return [
        RUN.source,
        { x: RUN.source.x - 6, y: RUN.trenchY },
        { x: mid, y: RUN.trenchY + sag(0.1) },
        { x: RUN.load.x + 6, y: RUN.trenchY },
        RUN.load,
      ];
    }
    if (method === 'E') {
      const s = sag(0.72);
      return [
        RUN.source,
        { x: RUN.source.x, y: RUN.trayY },
        { x: mid - 118, y: RUN.trayY + 10 + s },
        { x: mid + 118, y: RUN.trayY + 10 + s },
        { x: RUN.load.x, y: RUN.trayY },
        RUN.load,
      ];
    }
    // C (and anything unexpected): clipped direct, the freely sagging case
    return [
      RUN.source,
      { x: mid - 96, y: (RUN.source.y + RUN.load.y) / 2 + sag(1) * 0.62 },
      { x: mid + 96, y: (RUN.source.y + RUN.load.y) / 2 + sag(1) },
      RUN.load,
    ];
  }

  /** Catmull-Rom → cubic Bézier, matching `smoothPath()` in stage-spec.ts. */
  function smoothPath(points, tension) {
    const k = tension === undefined ? 0.5 : tension;
    if (!points.length) return '';
    if (points.length === 1) return `M${points[0].x} ${points[0].y}`;
    const f = (n) => Number(n.toFixed(1));
    const parts = [`M${f(points[0].x)} ${f(points[0].y)}`];
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1.x + ((p2.x - p0.x) / 6) * k * 2;
      const c1y = p1.y + ((p2.y - p0.y) / 6) * k * 2;
      const c2x = p2.x - ((p3.x - p1.x) / 6) * k * 2;
      const c2y = p2.y - ((p3.y - p1.y) / 6) * k * 2;
      parts.push(`C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`);
    }
    return parts.join(' ');
  }

  function paintRoute(method, lengthMeters) {
    const d = smoothPath(routePoints(method, lengthMeters));
    const path = document.getElementById('cs-run-path');
    if (path && path.getAttribute('d') !== d) path.setAttribute('d', d);
    document.querySelectorAll('#cs-scene-root animateMotion').forEach((motion) => {
      if (motion.getAttribute('path') !== d) motion.setAttribute('path', d);
    });
    return d;
  }

  /* ─────────────────────────────────────────────────────────────────────
   * Preset cards. Pressing a preset chip first *shows* the run it stands for —
   * the real circuit, what it draws, why the regulations land where they do — and
   * the card's Apply button loads it. The prose is server-rendered in
   * CableSizingPanels.astro (so it is readable without JS and crawlable); the
   * numbers in the card are computed by the same library that runs the calculator.
   * ──────────────────────────────────────────────────────────────────── */

  let presetCardFor = null;

  function openPresetCard(name) {
    const tpl = document.getElementById(`cs-preset-tpl-${name}`);
    const body = document.getElementById('cs-preset-body');
    const backdrop = document.getElementById('cs-preset-backdrop');
    if (!tpl || !body || !backdrop) {
      applyPreset(name);
      return;
    }
    body.replaceChildren(tpl.content.cloneNode(true));
    const title = document.getElementById('cs-preset-title');
    if (title) title.textContent = tpl.getAttribute('data-title') || 'Real-world preset';
    const apply = document.getElementById('cs-preset-apply');
    if (apply) {
      apply.setAttribute('data-preset-name', name);
      const active = document.querySelector(`[data-preset="${name}"].active`);
      const label = apply.querySelector('[data-preset-apply-label]');
      if (label) label.textContent = active ? 'Re-apply this run' : 'Load this circuit';
    }
    backdrop.hidden = false;
    presetCardFor = name;
    // The card is a child of the stage, and the stage clips its own stacking
    // context: while a dialog is up the stage has to outrank the page, or the
    // header (z 30) and the reference crawl would sit on top of the card.
    stageEl()?.setAttribute('data-modal', 'open');
    window.ElectraChrome?.pushOverlay?.(
      backdrop,
      document.querySelector(`[data-preset="${name}"]`),
      document.getElementById('cs-preset-apply'),
    );
  }

  function closePresetCard() {
    const backdrop = document.getElementById('cs-preset-backdrop');
    if (!backdrop || backdrop.hidden) return;
    backdrop.hidden = true;
    presetCardFor = null;
    stageEl()?.removeAttribute('data-modal');
    window.ElectraChrome?.popOverlay?.(backdrop);
  }

  /* ─────────────────────────────────────────────────────────────────────
   * Wiring
   * ──────────────────────────────────────────────────────────────────── */

  /**
   * Fit the cutaway to the stage through the shared runtime (falls back to the
   * authored viewBox if scene-stage.js did not load).
   */
  function fitTarget() {
    // prefer the scene frame: in the stacked layout it is a banner, not the stage
    return document.getElementById('scene-frame') || document.getElementById('interactive-stage');
  }

  let stageHandle = null;

  function fitStage() {
    const svg = document.getElementById('cs-cutaway-svg');
    if (!svg) return;
    // the shared runtime owns the fit (it knows the panel padding); only step in
    // when it is missing, so two writers can never fight over the viewBox
    if (stageHandle && typeof stageHandle.fit === 'function') {
      stageHandle.fit();
      return;
    }
    const stage = fitTarget();
    const helper = window.ElectraStage;
    if (!stage || !helper) return;
    const rect = stage.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    // same inputs the runtime would use, so the fallback looks identical
    const box = helper.viewBoxFor(rect, STAGE_BASE.width, STAGE_BASE.height, {
      pad: helper.panelPadding ? helper.panelPadding(stage, '#panel-wrap .ts-panel') : null,
      content: SCENE_CONTENT,
    });
    svg.setAttribute(
      'viewBox',
      `${box.x.toFixed(1)} ${box.y.toFixed(1)} ${box.width.toFixed(1)} ${box.height.toFixed(1)}`,
    );
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  }

  function updateScrollAffordance(panelId, bodyId) {
    const panel = document.getElementById(panelId);
    const body = document.getElementById(bodyId);
    if (!panel || !body) return;
    const scrollable = body.scrollHeight - body.clientHeight;
    const atTop = body.scrollTop <= 1;
    const atBottom = scrollable - body.scrollTop <= 1;
    panel.classList.toggle('can-scroll-down', scrollable > 4 && !atBottom);
    panel.classList.toggle('can-scroll-up', scrollable > 4 && !atTop);
  }

  /** Every field's shipped default, so "reset" means the same here as elsewhere. */
  const DEFAULT_FIELD_VALUES = [
    ['cs-standard', 'uk-bs7671'],
    ['cs-system-type', 'single-phase'],
    ['cs-voltage', '230'],
    ['cs-power', '7.2'],
    ['cs-pf', '1.00'],
    ['cs-length', '18'],
    ['cs-circuit-type', 'power'],
    ['cs-install-method', 'C'],
    ['cs-material', 'copper'],
    ['cs-temp', '30'],
    ['cs-grouping', '1'],
    ['cs-insulation', '0'],
    ['cs-load', 'auto'],
  ];

  function init() {
    // Native fields. Bound on the inputs form when it exists, otherwise on the
    // panel body — either way the scene repaints on every keystroke and slide.
    const scope =
      document.getElementById('cable-sizing-form') || document.getElementById('cs-inputs-body');
    if (scope) {
      scope.querySelectorAll('input, select').forEach((el) => {
        const handler = (event) => {
          urlArmed = true;
          releasePreset();
          // Do not rewrite an input while the user is clearing/replacing it;
          // that makes number fields frustrating to edit. The bounded calculation
          // handles the transient value, while change canonicalises it.
          if (event.type === 'change') normaliseNumericInputs();
          syncControls();
          runSizing();
          updateScrollAffordance('cs-inputs-container', 'cs-inputs-body');
        };
        el.addEventListener('input', handler);
        el.addEventListener('change', handler);
      });
      if (scope.tagName === 'FORM') {
        // nothing to submit: the answer is already on screen
        scope.addEventListener('submit', (e) => e.preventDefault());
      }
    }

    // segmented pickers + method grid
    bindGroup('method', 'cs-install-method');
    bindGroup('insulation', 'cs-insulation');
    bindGroup('system', 'cs-system-type');

    // collapse
    const wireCollapse = (btnId, bodyId, panelId) => {
      const btn = document.getElementById(btnId);
      const body = document.getElementById(bodyId);
      if (!btn || !body) return;
      btn.addEventListener('click', () => {
        // inside a drawer the body already scrolls, so "collapse" would only
        // leave an empty sheet: the toggle is hidden by CSS and ignored here
        if (drawerMode()) return;
        const collapsed = !body.hidden;
        body.hidden = collapsed;
        btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        updateScrollAffordance(panelId, bodyId);
      });
    };
    wireCollapse('cs-collapse-inputs', 'cs-inputs-body', 'cs-inputs-container');
    wireCollapse('cs-collapse-results', 'cs-results-body', 'cs-results-container');

    // "why this size?"
    const whyBtn = document.getElementById('cs-why-btn');
    const whyPop = document.getElementById('cs-why-pop');
    if (whyBtn && whyPop) {
      whyBtn.addEventListener('click', () => {
        const open = whyPop.hidden;
        whyPop.hidden = !open;
        whyBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    // scene: animate toggle, explode slider, sheet choreography
    const pauseBtn = document.getElementById('cs-scene-pause');
    const sceneRoot = document.getElementById('cs-scene-root');
    if (pauseBtn && sceneRoot) {
      pauseBtn.addEventListener('click', () => {
        const paused = sceneRoot.classList.toggle('scene-paused');
        pauseBtn.setAttribute('aria-pressed', paused ? 'false' : 'true');
        pauseBtn.classList.toggle('active', !paused);
        const label = pauseBtn.querySelector('span');
        if (label) label.textContent = paused ? 'Paused' : 'Animate';
      });
    }
    const explode = document.getElementById('cs-explode');
    if (explode && sceneRoot) {
      const apply = () => {
        const v = Number.parseFloat(explode.value) || 0;
        // unitless 0..1: the scene multiplies it into a real distance, so the
        // insulation thickness still adds on top of the user's preferred gap
        sceneRoot.style.setProperty('--explode', (v / 100).toFixed(3));
      };
      explode.addEventListener('input', apply);
      apply();
    }

    // drawer: the pinned handle opens a sheet, everything else closes it
    for (const key of Object.keys(SHEETS)) {
      const spec = SHEETS[key];
      const trigger = document.getElementById(spec.trigger);
      trigger?.addEventListener('click', () => {
        if (openSheetKey === key) closeSheet({ trigger });
        else openSheet(key, trigger);
      });
      const panel = document.getElementById(spec.panel);
      panel?.querySelectorAll('.ts-sheet-close').forEach((btn) => {
        btn.addEventListener('click', () => closeSheet({ trigger }));
      });
      wireSheetDrag(key);
    }
    document.getElementById('cs-scrim')?.addEventListener('click', () => closeSheet());

    // preset chips show their card; the card's Apply button loads the circuit
    document.querySelectorAll('[data-preset]').forEach((chip) => {
      chip.addEventListener('click', () => {
        openPresetCard(chip.getAttribute('data-preset'));
      });
    });
    document.getElementById('cs-preset-apply')?.addEventListener('click', (e) => {
      const name = e.currentTarget.getAttribute('data-preset-name') || presetCardFor;
      closePresetCard();
      if (name) applyPreset(name);
      // the answer belongs to the scene, not to a sheet that just closed
      if (drawerMode()) {
        document.getElementById('interactive-stage')?.scrollIntoView({
          behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth',
          block: 'start',
        });
      }
    });
    document.getElementById('cs-preset-close')?.addEventListener('click', closePresetCard);
    document.getElementById('cs-preset-backdrop')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closePresetCard();
    });

    // Escape unwinds one layer at a time: card, then drawer, then the popover
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (presetCardFor) {
        e.preventDefault();
        closePresetCard();
        return;
      }
      if (openSheetKey) {
        e.preventDefault();
        closeSheet();
        return;
      }
      if (whyPop && !whyPop.hidden) {
        whyPop.hidden = true;
        whyBtn?.setAttribute('aria-expanded', 'false');
      }
    });

    // a rotate or a dragged browser window can leave the drawer on a desktop
    document.addEventListener('electra:layout', (e) => {
      if (e.detail?.layout !== 'drawer') closeSheet({ focus: false });
      toggleSheetsInertForLayout();
    });

    // body scroll listeners keep the fade hints honest
    ['cs-inputs-body', 'cs-results-body'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('scroll', () => {
        updateScrollAffordance(
          id === 'cs-inputs-body' ? 'cs-inputs-container' : 'cs-results-container',
          id,
        );
      });
    });

    // Hand the tool-specific commands to the shared chrome (drawer + palette).
    // Anything not registered here is hidden by chrome rather than left inert.
    const api = window.ElectraChrome;
    if (api) {
      api.register('reset', () => {
        for (const [id, value] of DEFAULT_FIELD_VALUES) {
          const el = document.getElementById(id);
          if (el) el.value = value;
        }
        const fuse = document.getElementById('cs-fuse-cc');
        if (fuse) fuse.checked = false;
        syncPresetButtons(null);
        syncControls();
        runSizing();
      });
      api.register('3d', () => document.getElementById('cs-3d-toggle')?.click());
      api.register('animate', () => document.getElementById('cs-scene-pause')?.click());
    }

    // shared stage runtime: fit once here, then let it own all later resizing
    fitStage();
    if (window.ElectraStage?.attach) {
      stageHandle = window.ElectraStage.attach({
        // measure the frame the artwork actually occupies, so the fit stays
        // correct when the layout stacks and the frame becomes a banner
        stage:
          document.getElementById('scene-frame') || document.getElementById('interactive-stage'),
        svgId: 'cs-cutaway-svg',
        baseWidth: STAGE_BASE.width,
        baseHeight: STAGE_BASE.height,
        // the stack, the cable and the specimen are what must never end up under
        // a floating panel; sky, glow and plate tips are free to run beneath one
        content: SCENE_CONTENT,
        // the run's band sits right of the canvas centre (the load is the end of
        // the story), so keep honouring it in the banner layouts too — that is what
        // stops a phone showing a thin strip of scene with dead room above it
        fitContentInBanner: true,
        panelSelector: '#panel-wrap .ts-panel',
      });
    } else {
      window.addEventListener('resize', fitStage);
      window.addEventListener('orientationchange', () => setTimeout(fitStage, 120));
    }

    toggleSheetsInertForLayout();

    // restore shared-link state (if any), then compute and paint
    restoreFromUrl();
    if (presetParam && presetData()[presetParam]) applyPreset(presetParam);
    normaliseNumericInputs();
    syncControls();
    runSizing();
    updateScrollAffordance('cs-inputs-container', 'cs-inputs-body');
    updateScrollAffordance('cs-results-container', 'cs-results-body');

    const copyBtn = document.getElementById('cs-copy-link');
    copyBtn?.addEventListener('click', (e) => {
      window.ToolShare?.copyCurrentUrl(e.currentTarget);
    });

    // print / PDF summary: the sheet is kept live by every runSizing()
    document.getElementById('cs-print-btn')?.addEventListener('click', () => {
      window.print();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
