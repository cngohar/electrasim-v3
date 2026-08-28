/**
 * voltage-drop-tool.js
 * ElectraSim Electrical Toolbox — Voltage Drop Calculator Client Engine
 * Pure Vanilla JavaScript • Zero Runtime Dependencies • Lightweight & Fast
 */

(() => {
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
  const MOBILE_VIEWPORT = window.matchMedia('(max-width: 768px)');
  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  // Overlay stack for focus trapping: dialogs push/pop as they open/close,
  // and Tab is cycled within whichever dialog is on top of the stack.
  const overlayStack = [];

  function pushOverlay(el, trigger, initialFocus) {
    if (!el) return;
    overlayStack.push({ el, trigger: trigger || document.activeElement });
    const target = initialFocus || el.querySelector(FOCUSABLE_SELECTOR);
    if (target) target.focus();
  }

  function popOverlay(el) {
    const idx = overlayStack.findIndex((o) => o.el === el);
    if (idx === -1) return;
    const entry = overlayStack.splice(idx, 1)[0];
    if (overlayStack.length === 0 && entry.trigger instanceof HTMLElement) {
      entry.trigger.focus();
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || overlayStack.length === 0) return;
    const topEl = overlayStack[overlayStack.length - 1].el;
    const items = Array.from(topEl.querySelectorAll(FOCUSABLE_SELECTOR));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!topEl.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  });

  // Conductor Constants
  const MATERIALS = {
    copper: { rho20: 0.0172, alpha: 0.00393 },
    aluminum: { rho20: 0.0282, alpha: 0.00403 },
  };
  const DEFAULT_REACTANCE = 8e-5; // 0.08 mΩ/m

  // Regional limit banding. Physics is identical (resistivity-based); only the
  // compliance ceilings and citations switch between standards.
  const VD_STANDARDS = {
    'uk-bs7671': {
      label: 'BS 7671:2018+A4:2026',
      region: 'United Kingdom',
      goodPct: 3,
      hardPct: 5,
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
      goodPct: 4,
      hardPct: 5,
      goodDesc:
        'The voltage drop is within the IEC 60364-5-52 Annex G 4% guidance (public LV supply, lighting).',
      warningDesc:
        'Voltage drop is between 4% and 5%. Within IEC 60364-5-52 Annex G guidance for other circuits, but close to limit.',
      excessiveDesc:
        'Voltage drop exceeds the IEC 60364-5-52 Annex G 5% guidance. Conductor is undersized or run is too long. Upsize cable cross-section.',
      citation:
        'Results calculated per IEC 60364-5-52 Annex G, Table G.52.1 — 4% lighting / 5% other circuits (public LV supply; 6%/8% private).',
      echo: 'Verified against <strong>IEC 60364 (International)</strong> — Annex G limits: 4% lighting / 5% other circuits.',
    },
  };

  // Educational Tips Carousel
  const TIPS = [
    'Green particles show the flow of electricity. Some voltage is lost along the cable due to its resistance.',
    'Larger cables (higher mm²) have lower resistance, which reduces the voltage drop.',
    'Doubling the cable length doubles the voltage drop and increases the physical cable sag.',
    'BS 7671 uses a 3% voltage-drop guideline for lighting and 5% for most other final circuits.',
    'Aluminum conductors have about 65% more resistance than copper of the same cross-section.',
    'Resistivity increases with conductor temperature — under heavy load, cables heat up and drop more voltage.',
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
    animate: true,
    showValues: true,
    showLegend: true,
    showTips: true,
    threeD: false,
    parallax: { x: 0, y: 0 },
    tipIndex: 0,
  };

  // Shareable calculation URLs: state is mirrored into the query string on
  // every change (history.replaceState) so a copied link replays the exact
  // scenario — voltage, current, run, size, material, pf, temp, standard.
  let urlArmed = false;

  function syncUrl() {
    const S = window.ToolShare;
    if (!S || !urlArmed) return;
    S.pushParams({
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

    // Limit banding follows the selected regional standard
    // (BS 7671: 3%/5% — IEC 60364-5-52 Annex G: 4%/5%).
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
      errorNotices: [],
    };
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
  // TOAST NOTIFICATIONS
  // ─────────────────────────────────────────────────────────────
  let toastTimer = null;
  function showToast(message, icon = 'ℹ️', durationMs = 4000) {
    const elToast = document.getElementById('tool-toast-banner');
    const elIcon = document.getElementById('tool-toast-icon');
    const elText = document.getElementById('tool-toast-text');

    if (!elToast || !elText) return;

    if (toastTimer) clearTimeout(toastTimer);

    if (elIcon) elIcon.textContent = icon;
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
      if (elMobileSummary) elMobileSummary.textContent = showNoticeCard ? '⚠️ Check Inputs' : '…';
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
      elSvgDrop.textContent = res.valid
        ? `${res.voltageDrop.toFixed(2)} V (${res.dropPct.toFixed(2)}%)`
        : '⚠️ Check Inputs';
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
  function handleResize() {
    const stage = document.getElementById('interactive-stage');
    const scaler = document.getElementById('scene-scaler');
    if (!stage || !scaler) return;

    const rect = stage.getBoundingClientRect();
    const targetW = 1440;
    const targetH = 810;

    const scale = Math.max(0.25, Math.min(rect.width / targetW, rect.height / targetH) * 1.05);
    scaler.style.transform = `translate(-50%, -50%) scale(${scale})`;
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
        showToast(`Compliance limits switched to ${VD_STANDARDS[state.standard].label}.`, '📐');
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
          showToast('Long cable run (>1000m) entered. Industrial transmission rules apply.', 'ℹ️');
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
        showToast('Restored standard circuit parameters.', '✅');
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
      });
    }

    // 4. Panel Collapsing
    const btnColInputs = document.getElementById('btn-collapse-inputs');
    const elInputsBody = document.getElementById('inputs-body');
    if (btnColInputs && elInputsBody) {
      btnColInputs.addEventListener('click', () => {
        const isCollapsed = elInputsBody.hidden;
        elInputsBody.hidden = !isCollapsed;
        btnColInputs.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
      });
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
        if (!state.threeD) {
          sceneWrapper.style.transform = 'none';
        }
      });
    }

    const btnResetView = document.getElementById('btn-reset-view');
    if (btnResetView) {
      btnResetView.addEventListener('click', () => {
        resetToDefaults();
        showToast('Reset all parameters to default values.', '🔄');
      });
    }

    // 7. Tool Switcher Dropdown in Header
    const btnSwitcher = document.getElementById('tool-switcher-btn');
    const menuSwitcher = document.getElementById('tool-switcher-menu');
    if (btnSwitcher && menuSwitcher) {
      btnSwitcher.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = menuSwitcher.hidden;
        menuSwitcher.hidden = !isHidden;
        btnSwitcher.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
      });
      document.addEventListener('click', (e) => {
        if (!menuSwitcher.contains(e.target) && e.target !== btnSwitcher) {
          menuSwitcher.hidden = true;
          btnSwitcher.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // 8. Tool Drawer Sidebar (Hamburger)
    const btnDrawerOpen = document.getElementById('tool-drawer-btn');
    const btnDrawerClose = document.getElementById('tool-drawer-close');
    const drawerBackdrop = document.getElementById('tool-drawer-backdrop');
    const drawerAside = document.getElementById('tool-drawer-menu');
    const drawerSearch = document.getElementById('tool-drawer-search');

    function openDrawer() {
      if (!drawerAside || !drawerBackdrop) return;
      drawerAside.hidden = false;
      drawerBackdrop.hidden = false;
      if (btnDrawerOpen) btnDrawerOpen.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
      pushOverlay(drawerAside, btnDrawerOpen, drawerSearch);
    }

    function closeDrawer() {
      if (!drawerAside || !drawerBackdrop) return;
      if (drawerAside.hidden) return;
      drawerAside.hidden = true;
      drawerBackdrop.hidden = true;
      if (btnDrawerOpen) btnDrawerOpen.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
      popOverlay(drawerAside);
    }

    if (btnDrawerOpen) btnDrawerOpen.addEventListener('click', openDrawer);
    if (btnDrawerClose) btnDrawerClose.addEventListener('click', closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

    if (drawerSearch) {
      drawerSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const items = document.querySelectorAll('#drawer-tools-list .drawer-item');
        items.forEach((it) => {
          const name = it.getAttribute('data-tool-name') || '';
          it.style.display = name.includes(query) ? '' : 'none';
        });
      });
    }

    // 9. Command Palette Modal
    const cmdBackdrop = document.getElementById('cmd-palette-backdrop');
    const cmdInput = document.getElementById('cmd-palette-input');
    const cmdTrigger = document.getElementById('cmd-palette-trigger');
    const cmdOpenFromSwitcher = document.getElementById('open-cmd-palette-btn');

    function openCmdPalette(trigger) {
      if (!cmdBackdrop) return;
      cmdBackdrop.hidden = false;
      document.body.style.overflow = 'hidden';
      pushOverlay(cmdBackdrop, trigger, cmdInput);
      filterPalette('');
      closeDrawer();
      if (menuSwitcher) {
        menuSwitcher.hidden = true;
        if (btnSwitcher) btnSwitcher.setAttribute('aria-expanded', 'false');
      }
    }

    function closeCmdPalette() {
      if (!cmdBackdrop || cmdBackdrop.hidden) return;
      cmdBackdrop.hidden = true;
      document.body.style.overflow = '';
      popOverlay(cmdBackdrop);
    }

    if (cmdTrigger) cmdTrigger.addEventListener('click', (e) => openCmdPalette(e.currentTarget));
    if (cmdOpenFromSwitcher) {
      cmdOpenFromSwitcher.addEventListener('click', (e) => openCmdPalette(e.currentTarget));
    }
    if (cmdBackdrop) {
      cmdBackdrop.addEventListener('click', (e) => {
        if (e.target === cmdBackdrop) closeCmdPalette();
      });
    }

    function setSelectedCmd(item) {
      document.querySelectorAll('#cmd-results-list .cmd-item').forEach((it) => {
        const selected = it === item;
        it.classList.toggle('selected', selected);
        it.setAttribute('aria-selected', selected ? 'true' : 'false');
      });
      if (cmdInput) {
        if (item?.id) {
          cmdInput.setAttribute('aria-activedescendant', item.id);
        } else {
          cmdInput.removeAttribute('aria-activedescendant');
        }
      }
    }

    function setGroupLabelVisibility(group, visible) {
      const label = document.querySelector(
        `#cmd-results-list .cmd-group-label[data-group="${group}"]`,
      );
      if (label) label.style.display = visible ? '' : 'none';
    }

    function filterPalette(query) {
      const items = Array.from(document.querySelectorAll('#cmd-results-list .cmd-item'));
      let firstVisible = null;
      items.forEach((item) => {
        const title = (item.getAttribute('data-title') || '').toLowerCase();
        const match = title.includes(query.toLowerCase());
        item.style.display = match ? '' : 'none';
        if (match && !firstVisible) {
          firstVisible = item;
        }
      });
      setGroupLabelVisibility(
        'tools',
        items.some((i) => i.getAttribute('data-type') === 'tool' && i.style.display !== 'none'),
      );
      setGroupLabelVisibility(
        'commands',
        items.some((i) => i.getAttribute('data-type') === 'cmd' && i.style.display !== 'none'),
      );
      const emptyEl = document.getElementById('cmd-empty-state');
      if (emptyEl) emptyEl.hidden = Boolean(firstVisible);
      setSelectedCmd(firstVisible);
    }

    if (cmdInput) {
      cmdInput.addEventListener('input', (e) => {
        filterPalette(e.target.value);
      });
    }

    function executePaletteItem(item) {
      if (!item) return;
      const type = item.getAttribute('data-type');
      if (type === 'tool') {
        const route = item.getAttribute('data-route');
        if (route) window.location.href = route;
      } else if (type === 'cmd') {
        const action = item.getAttribute('data-action');
        closeCmdPalette();
        if (action === 'home') window.location.href = '/tools/';
        else if (action === 'app') window.location.href = '/app/';
        else if (action === 'reset') {
          resetToDefaults();
          showToast('Reset all parameters to default values.', '🔄');
        } else if (action === 'help') openHelp();
        else if (action === 'theme') document.getElementById('tool-theme-toggle')?.click();
        else if (action === '3d') {
          if (btn3d) btn3d.click();
        } else if (action === 'animate') {
          if (btnAnimate) btnAnimate.click();
        }
      }
    }

    const cmdList = document.getElementById('cmd-results-list');
    if (cmdList) {
      cmdList.addEventListener('click', (e) => {
        const item = e.target.closest('.cmd-item');
        if (item) executePaletteItem(item);
      });
    }

    // Drawer Commands Wiring
    const cmdReset = document.getElementById('drawer-cmd-reset');
    const cmdHelp = document.getElementById('drawer-cmd-help');
    const cmdTheme = document.getElementById('drawer-cmd-theme');

    if (cmdReset) {
      cmdReset.addEventListener('click', () => {
        resetToDefaults();
        closeDrawer();
        showToast('Reset all parameters to default values.', '🔄');
      });
    }
    if (cmdHelp) {
      cmdHelp.addEventListener('click', () => {
        openHelp();
        closeDrawer();
      });
    }
    if (cmdTheme) {
      cmdTheme.addEventListener('click', () => {
        document.getElementById('tool-theme-toggle')?.click();
        closeDrawer();
      });
    }

    // 10. Help Modal
    const helpBackdrop = document.getElementById('tool-help-backdrop');
    const btnHelp = document.getElementById('tool-help-btn');
    const btnHelpClose = document.getElementById('tool-help-close');
    const btnHelpGotIt = document.getElementById('tool-help-confirm');

    function openHelp(trigger) {
      if (!helpBackdrop) return;
      helpBackdrop.hidden = false;
      document.body.style.overflow = 'hidden';
      pushOverlay(helpBackdrop, trigger, btnHelpGotIt);
    }

    function closeHelp() {
      if (!helpBackdrop || helpBackdrop.hidden) return;
      helpBackdrop.hidden = true;
      document.body.style.overflow = '';
      popOverlay(helpBackdrop);
    }

    if (btnHelp) btnHelp.addEventListener('click', (e) => openHelp(e.currentTarget));
    if (btnHelpClose) btnHelpClose.addEventListener('click', closeHelp);
    if (btnHelpGotIt) btnHelpGotIt.addEventListener('click', closeHelp);
    if (helpBackdrop) {
      helpBackdrop.addEventListener('click', (e) => {
        if (e.target === helpBackdrop) closeHelp();
      });
    }

    // 11. Theme toggle: handled globally by theme.js via [data-theme-toggle].

    // 12. Fullscreen Toggle
    const btnFullscreen = document.getElementById('tool-fullscreen-btn');
    const fsEnterIcon = document.querySelector('.fs-icon-enter');
    const fsExitIcon = document.querySelector('.fs-icon-exit');

    function toggleFullscreen() {
      const docEl = document.documentElement;
      if (!document.fullscreenElement) {
        const request =
          docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
        if (typeof request !== 'function') {
          showToast("Fullscreen isn't supported on this browser or device.", '⚠️');
          return;
        }
        try {
          // Standard API returns a promise; legacy webkit/ms APIs return void.
          Promise.resolve(request.call(docEl))
            .then(() => showToast('Press Esc to exit fullscreen.', 'ℹ️', 2500))
            .catch(() => showToast('Fullscreen was blocked by the browser.', '⚠️'));
        } catch (_) {
          showToast("Fullscreen isn't available here.", '⚠️');
        }
      } else {
        (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
      }
    }

    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', toggleFullscreen);
      document.addEventListener('fullscreenchange', () => {
        const isFs = Boolean(document.fullscreenElement);
        if (fsEnterIcon) fsEnterIcon.style.display = isFs ? 'none' : 'block';
        if (fsExitIcon) fsExitIcon.style.display = isFs ? 'block' : 'none';
      });
    }

    // 13. Tips Carousel & Toggle
    const switchTips = document.getElementById('switch-tips');
    const tipsKnob = document.getElementById('tips-pill-knob');
    const tipsBar = document.getElementById('tips-bar');
    const tipsText = document.getElementById('tips-text');

    if (switchTips && tipsBar) {
      switchTips.addEventListener('click', () => {
        state.showTips = !state.showTips;
        tipsBar.hidden = !state.showTips;
        switchTips.setAttribute('aria-checked', state.showTips ? 'true' : 'false');
        if (tipsKnob) tipsKnob.classList.toggle('active', state.showTips);
      });
    }

    setInterval(() => {
      if (!state.showTips || !tipsText || document.hidden || REDUCED_MOTION.matches) return;
      state.tipIndex = (state.tipIndex + 1) % TIPS.length;
      if (REDUCED_MOTION.matches) {
        tipsText.textContent = TIPS[state.tipIndex];
        return;
      }
      tipsText.style.opacity = '0';
      setTimeout(() => {
        tipsText.textContent = TIPS[state.tipIndex];
        tipsText.style.opacity = '1';
      }, 200);
    }, 7000);

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

    // 15. Global Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.shiftKey && e.code === 'Space') {
        const target = e.target;
        const isTypingContext =
          e.isComposing ||
          (target &&
            (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)));
        if (isTypingContext) return;
        e.preventDefault();
        if (cmdBackdrop && !cmdBackdrop.hidden) {
          closeCmdPalette();
        } else {
          openCmdPalette();
        }
        return;
      }

      if (e.key === 'Escape') {
        closeCmdPalette();
        closeDrawer();
        closeHelp();
        closeMobilePanels();
        if (menuSwitcher) {
          menuSwitcher.hidden = true;
          if (btnSwitcher) btnSwitcher.setAttribute('aria-expanded', 'false');
        }
        return;
      }

      if (cmdBackdrop && !cmdBackdrop.hidden) {
        const visibleItems = Array.from(
          document.querySelectorAll('#cmd-results-list .cmd-item'),
        ).filter((it) => it.style.display !== 'none');
        if (!visibleItems.length) return;

        const currentIdx = visibleItems.findIndex((it) => it.classList.contains('selected'));

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = visibleItems[(currentIdx + 1) % visibleItems.length];
          setSelectedCmd(next);
          next.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = visibleItems[(currentIdx - 1 + visibleItems.length) % visibleItems.length];
          setSelectedCmd(prev);
          prev.scrollIntoView({ block: 'nearest' });
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (currentIdx >= 0) {
            executePaletteItem(visibleItems[currentIdx]);
          }
        }
      }
    });

    // 16. Window resize & mouse move (debounced / rAF-batched)
    let resizeFrame = null;
    window.addEventListener('resize', () => {
      if (resizeFrame !== null) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        handleResize();
      });
    });

    const stage = document.getElementById('interactive-stage');
    let parallaxFrame = null;
    let parallaxCoords = null;
    function applyParallax() {
      parallaxFrame = null;
      if (!parallaxCoords) return;
      const wrapper = document.getElementById('scene-perspective-wrapper');
      if (!wrapper) return;
      wrapper.style.transform = `perspective(1200px) rotateY(${(parallaxCoords.x * 6).toFixed(2)}deg) rotateX(${(-parallaxCoords.y * 4).toFixed(2)}deg)`;
    }
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
  function resetToDefaults() {
    urlArmed = true;
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
    state.standard = 'uk-bs7671';

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
  function init() {
    setupEvents();
    handleResize();

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
