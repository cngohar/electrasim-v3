/**
 * nec-voltage-drop-tool.js
 * ElectraSim Electrical Toolbox — US NEC Voltage Drop Calculator Client Engine
 *
 * Mirror of src/lib/tools/nec-voltage-drop.ts (the unit-tested source of truth).
 * Conductor resistance: NEC Chapter 9, Table 8 (stranded, 75 °C).
 * Limits: NEC 210.19(A) IN No. 4 & 215.2(A)(1) IN No. 2 (3% / 5%, advisory).
 * Pure Vanilla JavaScript • Zero Runtime Dependencies
 */

(() => {
  // NEC Chapter 9, Table 8 — DC Ω/kFT, stranded, 75 °C
  // [mm², copper Ω/kFT, aluminum Ω/kFT (null = not published)]
  const NEC_CONDUCTORS = [
    { awg: '14', mm2: 2.08, cu: 3.14, al: null },
    { awg: '12', mm2: 3.31, cu: 1.98, al: 3.25 },
    { awg: '10', mm2: 5.26, cu: 1.24, al: 2.04 },
    { awg: '8', mm2: 8.37, cu: 0.778, al: 1.28 },
    { awg: '6', mm2: 13.3, cu: 0.491, al: 0.808 },
    { awg: '4', mm2: 21.2, cu: 0.308, al: 0.508 },
    { awg: '3', mm2: 26.7, cu: 0.245, al: null },
    { awg: '2', mm2: 33.6, cu: 0.194, al: 0.319 },
    { awg: '1', mm2: 42.4, cu: 0.154, al: 0.253 },
    { awg: '1/0', mm2: 53.5, cu: 0.122, al: 0.201 },
    { awg: '2/0', mm2: 67.4, cu: 0.0967, al: 0.159 },
    { awg: '3/0', mm2: 85.0, cu: 0.0766, al: 0.126 },
    { awg: '4/0', mm2: 107.2, cu: 0.0608, al: 0.1 },
    { awg: '250 kcmil', mm2: 127, cu: 0.0515, al: 0.0848 },
    { awg: '300 kcmil', mm2: 152, cu: 0.0429, al: 0.0707 },
    { awg: '350 kcmil', mm2: 177, cu: 0.0367, al: 0.0605 },
    { awg: '400 kcmil', mm2: 203, cu: 0.0321, al: 0.0529 },
    { awg: '500 kcmil', mm2: 253, cu: 0.0258, al: 0.0424 },
  ];

  const TEMP_CONSTANT = { copper: 234.5, aluminum: 228.1 };
  const REF_TEMP_C = 75; // NEC Table 8 reference temperature
  const REACTANCE_OHMS_PER_KFT = 0.045; // NEC Ch.9 Table 9 typical (PVC conduit)

  const STATES = {
    good: {
      badge: 'Within NEC Guidance',
      badgeColor: '#10b981',
      summary: (vd, pct, limit, supply) =>
        `Within guidance: ${vd.toFixed(2)} V drop (${pct.toFixed(2)}%) is under the 3% NEC advisory limit (${limit.toFixed(2)} V on this ${supply}). NEC 210.19(A) Informational Note No. 4 & 215.2(A)(1) IN No. 2.`,
    },
    warning: {
      badge: 'Marginal',
      badgeColor: '#f59e0b',
      summary: (vd, pct) =>
        `Marginal: ${vd.toFixed(2)} V drop (${pct.toFixed(2)}%) exceeds the 3% advisory for a single feeder/branch circuit. Acceptable only if combined feeder + branch stays within 5% total. Consider one AWG size up.`,
    },
    excessive: {
      badge: 'Excessive',
      badgeColor: '#ef4444',
      summary: (vd, pct) =>
        `Excessive: ${vd.toFixed(2)} V drop (${pct.toFixed(2)}%) is beyond the 5% combined NEC advisory ceiling. Upsize the conductor (larger AWG/kcmil) or shorten the run — motors and electronics will starve.`,
    },
    invalid: {
      badge: 'Check Inputs',
      badgeColor: '#ef4444',
      summary: () => 'Enter a valid voltage, current, run length and conductor to calculate.',
    },
  };

  const $ = (id) => document.getElementById(id);

  // Shareable calculation URLs (inputs ride in the query string; the URL is
  // rewritten with replaceState on every change so a copied link reproduces
  // the same US-circuit scenario exactly).
  const URL_BINDINGS = [
    ['system', 'nec-system'],
    ['voltage', 'nec-voltage'],
    ['current', 'nec-current'],
    ['length', 'nec-length'],
    ['awg', 'nec-awg'],
    ['material', 'nec-material'],
    ['temp', 'nec-temp'],
    ['pf', 'nec-pf'],
  ];
  let urlArmed = false;

  function restoreFromUrl() {
    const S = window.ToolShare;
    if (!S) return;
    const params = S.readParams();
    if (![...params.keys()].length) return;
    urlArmed = true;
    for (const [key, id] of URL_BINDINGS) {
      const el = $(id);
      if (!el) continue;
      const raw = params.get(key);
      if (raw === null || raw === '') continue;
      if (el.tagName === 'SELECT') {
        // Skip conductor options unavailable for the selected material instead
        // of silently producing an invalid combo.
        const opt = [...el.options].find((o) => o.value === raw && !o.disabled);
        if (opt) el.value = raw;
      } else {
        const n = S.numParam(params, key, { min: 0, max: 100000 });
        if (n !== undefined) el.value = String(n);
      }
    }
    const rx = $('nec-reactance');
    const reactance = params.get('reactance');
    if (rx && (reactance === '0' || reactance === '1')) rx.checked = reactance === '1';
  }

  function syncUrl() {
    const S = window.ToolShare;
    if (!S || !urlArmed) return;
    const entries = {};
    for (const [key, id] of URL_BINDINGS) {
      const el = $(id);
      if (el) entries[key] = el.value;
    }
    const rx = $('nec-reactance');
    if (rx) entries.reactance = rx.checked ? '1' : '0';
    S.pushParams(entries);
  }

  function readInputs() {
    const system = $('nec-system')?.value || 'single';
    const voltage = Number.parseFloat($('nec-voltage')?.value) || 0;
    const current = Number.parseFloat($('nec-current')?.value) || 0;
    const lengthFeet = Number.parseFloat($('nec-length')?.value) || 0;
    const awg = $('nec-awg')?.value || '12';
    const material = $('nec-material')?.value === 'aluminum' ? 'aluminum' : 'copper';
    const tempC = Number.parseFloat($('nec-temp')?.value) || REF_TEMP_C;
    const pf =
      system === 'dc' ? 1 : Math.min(1, Math.max(0.1, Number.parseFloat($('nec-pf')?.value) || 1));
    const includeReactance = Boolean($('nec-reactance')?.checked) && system !== 'dc';
    return { system, voltage, current, lengthFeet, awg, material, tempC, pf, includeReactance };
  }

  function entryFor(awg) {
    return NEC_CONDUCTORS.find((c) => c.awg === awg) || null;
  }

  /** Ω/kFT at conductor operating temperature (NEC Table 8 @75 °C + correction) */
  function resistanceOhmsPerKft(entry, material, tempC) {
    if (!entry) return null;
    const at75 = material === 'copper' ? entry.cu : entry.al;
    if (at75 === null || at75 === undefined) return null;
    const k = TEMP_CONSTANT[material];
    const clamped = Math.min(150, Math.max(-40, tempC));
    return at75 * ((k + clamped) / (k + REF_TEMP_C));
  }

  function calculate(inp) {
    const errors = [];
    if (!(inp.voltage > 0)) errors.push('System voltage must be greater than 0 V.');
    if (inp.current < 0) errors.push('Load current cannot be negative.');
    if (!(inp.lengthFeet > 0)) errors.push('One-way run length must be greater than 0 ft.');

    const entry = entryFor(inp.awg);
    const ohmsKft = resistanceOhmsPerKft(entry, inp.material, inp.tempC);
    if (ohmsKft === null) {
      errors.push(
        inp.material === 'aluminum'
          ? `Aluminum is not published for ${inp.awg} in NEC Ch. 9 Table 8 — picked next available size.`
          : `Unknown conductor size "${inp.awg}".`,
      );
    }
    if (errors.length > 0) {
      return { valid: false, errors };
    }

    const rFt = ohmsKft / 1000;
    const oneWayR = rFt * inp.lengthFeet;
    const xFt = inp.includeReactance ? REACTANCE_OHMS_PER_KFT / 1000 : 0;
    const sinPhi = inp.system === 'dc' ? 0 : Math.sqrt(Math.max(0, 1 - inp.pf * inp.pf));

    const mult = inp.system === 'three' ? Math.sqrt(3) : 2;
    const effZ = rFt * inp.pf + xFt * sinPhi;
    const voltageDrop = mult * inp.current * inp.lengthFeet * effZ;
    const dropPct = inp.voltage > 0 ? (voltageDrop / inp.voltage) * 100 : 0;
    const loadVoltage = Math.max(0, inp.voltage - voltageDrop);
    const conductorCount = inp.system === 'three' ? 3 : 2;
    const powerLoss = inp.current * inp.current * conductorCount * oneWayR;

    let severity = 'good';
    if (dropPct > 5.0 + 1e-9) severity = 'excessive';
    else if (dropPct > 3.0 + 1e-9) severity = 'warning';

    return {
      valid: true,
      entry,
      ohmsKft,
      oneWayR,
      voltageDrop,
      dropPct,
      loadVoltage,
      powerLoss,
      severity,
      advisoryLimitVolts: inp.voltage * 0.03,
    };
  }

  function filterConductorOptions() {
    const material = $('nec-material')?.value || 'copper';
    const select = $('nec-awg');
    if (!select) return;
    let firstEnabled = null;
    let selectedStillValid = false;
    for (const option of select.options) {
      const alVal = option.getAttribute('data-al');
      const enabled = material === 'copper' || (alVal !== null && alVal !== '');
      option.disabled = !enabled;
      option.hidden = !enabled;
      if (enabled) {
        if (!firstEnabled) firstEnabled = option;
        if (option.selected) selectedStillValid = true;
      }
    }
    if (!selectedStillValid && firstEnabled) {
      select.value = firstEnabled.value;
    }
  }

  function setValidation(message, fields = []) {
    const notice = $('nec-validation-notice');
    const text = $('nec-validation-message');
    if (notice) notice.hidden = !message;
    if (text) text.textContent = message || '';
    for (const id of ['nec-voltage', 'nec-current', 'nec-length', 'nec-pf']) {
      const el = $(id);
      if (el) el.toggleAttribute('aria-invalid', fields.includes(id));
    }
  }

  function validateInputs() {
    const rules = [
      ['nec-voltage', 'System voltage', 1, 1000],
      ['nec-current', 'Load current', 0, 1200],
      ['nec-length', 'One-way run length', 1, 10000],
      ['nec-pf', 'Power factor', 0.1, 1],
    ];
    const errors = [];
    const fields = [];
    for (const [id, label, min, max] of rules) {
      const raw = $(id)?.value.trim() ?? '';
      const value = Number.parseFloat(raw);
      if (raw === '' || !Number.isFinite(value)) {
        errors.push(`Enter ${label.toLowerCase()}.`); fields.push(id);
      } else if (value < min || value > max) {
        errors.push(`${label} must be between ${min} and ${max}${id === 'nec-voltage' ? ' V' : id === 'nec-length' ? ' ft' : id === 'nec-pf' ? '' : ' A'}.`); fields.push(id);
      }
    }
    return { errors, fields };
  }

  function updateUi() {
    filterConductorOptions();
    syncUrl();
    const validation = validateInputs();
    if (validation.errors.length) {
      setValidation(`${validation.errors.join(' ')} Check the unit shown beside each field, then try again.`, validation.fields);
      const summary = $('nec-summary-text');
      if (summary) summary.textContent = 'We cannot calculate voltage drop yet. Correct the highlighted values and the result will update automatically.';
      const badge = $('nec-status-badge');
      if (badge) badge.textContent = 'Check Inputs';
      return;
    }
    setValidation();
    const inp = readInputs();
    const res = calculate(inp);

    const heroCard = $('nec-hero-card');
    const badge = $('nec-status-badge');
    const summaryBox = $('nec-summary-box');
    const summary = $('nec-summary-text');
    const outDropV = $('nec-out-drop-v');
    const outDropPct = $('nec-out-drop-pct');
    const outLoadV = $('nec-out-load-v');
    const outPct2 = $('nec-out-pct2');
    const outLimit = $('nec-out-limit');
    const outLoss = $('nec-out-loss');
    const outOhmsKft = $('nec-out-ohms-kft');
    const outRes = $('nec-out-res');
    const outMm2 = $('nec-out-mm2');

    if (!res.valid) {
      const s = STATES.invalid;
      if (badge) {
        badge.textContent = s.badge;
        badge.style.background = s.badgeColor;
      }
      if (summary) summary.textContent = res.errors.join(' ') || s.summary();
      if (summaryBox) summaryBox.className = 'compliance-summary-box excessive';
      if (heroCard) heroCard.style.background = 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)';
      for (const el of [outDropV, outDropPct, outLoadV, outPct2, outLoss, outOhmsKft, outRes]) {
        if (el) el.textContent = '—';
      }
      const limit = $('nec-out-limit');
      if (limit && inp.voltage > 0) limit.textContent = `${(inp.voltage * 0.03).toFixed(2)} V`;
      return;
    }

    const s = STATES[res.severity];
    const supply = inp.system === 'three' ? 'feeder' : 'branch circuit';

    if (outDropV) outDropV.textContent = res.voltageDrop.toFixed(2);
    if (outDropPct) outDropPct.textContent = res.dropPct.toFixed(2);
    if (outLoadV) outLoadV.textContent = `${res.loadVoltage.toFixed(1)} V`;
    if (outPct2) outPct2.textContent = `${res.dropPct.toFixed(2)}%`;
    if (outLimit) outLimit.textContent = `${res.advisoryLimitVolts.toFixed(2)} V`;
    if (outLoss)
      outLoss.textContent =
        res.powerLoss >= 1000
          ? `${(res.powerLoss / 1000).toFixed(2)} kW`
          : `${res.powerLoss.toFixed(1)} W`;
    if (outOhmsKft) outOhmsKft.textContent = res.ohmsKft.toFixed(3);
    if (outRes) outRes.textContent = `${res.oneWayR.toFixed(3)} Ω`;
    if (outMm2) outMm2.textContent = `${res.entry.mm2} mm²`;

    if (badge) {
      badge.textContent = s.badge;
      badge.style.background = s.badgeColor;
    }
    if (summary)
      summary.textContent = s.summary(res.voltageDrop, res.dropPct, res.advisoryLimitVolts, supply);
    if (summaryBox)
      summaryBox.className = `compliance-summary-box ${res.severity === 'good' ? '' : res.severity}`;

    if (heroCard) {
      heroCard.style.background =
        res.severity === 'good'
          ? 'linear-gradient(135deg, #065f46 0%, #10b981 100%)'
          : res.severity === 'warning'
            ? 'linear-gradient(135deg, #92400e 0%, #d97706 100%)'
            : 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)';
    }
  }

  function init() {
    const form = $('nec-vd-form');
    if (!form) return;

    form.querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('input', () => {
        urlArmed = true;
        updateUi();
      });
      el.addEventListener('change', () => {
        urlArmed = true;
        updateUi();
      });
    });

    // Voltage preset chips (also flip the system type to sensible mode)
    document.querySelectorAll('.preset-chip[data-preset-volts]').forEach((chip) => {
      chip.addEventListener('click', () => {
        urlArmed = true;
        const volts = chip.getAttribute('data-preset-volts');
        const system = chip.getAttribute('data-preset-system');
        const vInput = $('nec-voltage');
        const sysInput = $('nec-system');
        if (vInput && volts) vInput.value = volts;
        if (sysInput && system) {
          // 208 V is commonly used as 3-Ø; presets carry the intended system.
          sysInput.value = system;
          toggleDcPresets();
        }
        updateUi();
      });
    });

    // DC preset row visibility
    function toggleDcPresets() {
      const dcRow = $('nec-dc-presets');
      const sysInput = $('nec-system');
      if (dcRow && sysInput) dcRow.hidden = sysInput.value !== 'dc';
    }
    $('nec-system')?.addEventListener('change', toggleDcPresets);

    // Restore a shared link (if any), then compute + sync the URL
    restoreFromUrl();
    toggleDcPresets();
    updateUi();

    // "Copy calculation link" button
    $('nec-copy-link')?.addEventListener('click', (e) => {
      window.ToolShare?.copyCurrentUrl(e.currentTarget);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
