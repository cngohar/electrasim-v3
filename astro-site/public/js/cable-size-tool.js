/**
 * cable-size-tool.js
 * ElectraSim Electrical Toolbox — Cable Sizing Client Engine
 * Pure Vanilla JavaScript • Zero Dependencies • Fast & Accessible
 */

(() => {
  const STANDARD_RATINGS = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];
  const STANDARD_SIZES = [1.0, 1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0, 35.0, 50.0, 70.0, 95.0];
  const CPC_MAP = {
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

  const AMPACITY = {
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

  const VDROP_MV = {
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

  function getCa(t) {
    if (t <= 25) return 1.03;
    if (t <= 30) return 1.0;
    if (t <= 35) return 0.94;
    if (t <= 40) return 0.87;
    if (t <= 45) return 0.79;
    if (t <= 50) return 0.71;
    if (t <= 55) return 0.61;
    return 0.5;
  }

  function getCg(n) {
    if (n <= 1) return 1.0;
    if (n === 2) return 0.8;
    if (n === 3) return 0.7;
    if (n === 4) return 0.65;
    if (n === 5) return 0.6;
    if (n <= 8) return 0.55;
    return 0.5;
  }

  function getCi(mm) {
    if (mm === 50) return 0.89;
    if (mm === 100) return 0.81;
    if (mm === 200) return 0.5;
    return 1.0;
  }

  function runSizing() {
    const systemType = document.getElementById('cs-system-type')?.value || 'single-phase';
    const v = Number.parseFloat(document.getElementById('cs-voltage')?.value) || 230;
    const powerKw = Number.parseFloat(document.getElementById('cs-power')?.value) || 7.2;
    const powerWatts = powerKw * 1000;
    const pf = Math.max(
      0.1,
      Math.min(1.0, Number.parseFloat(document.getElementById('cs-pf')?.value) || 1.0),
    );
    const length = Math.max(
      1,
      Number.parseFloat(document.getElementById('cs-length')?.value) || 15,
    );
    const circuitType = document.getElementById('cs-circuit-type')?.value || 'power';
    const method = document.getElementById('cs-install-method')?.value || 'C';
    const material = document.getElementById('cs-material')?.value || 'copper';
    const temp = Number.parseFloat(document.getElementById('cs-temp')?.value) || 30;
    const grouping = Number.parseInt(document.getElementById('cs-grouping')?.value, 10) || 1;
    const insulation = Number.parseInt(document.getElementById('cs-insulation')?.value, 10) || 0;

    // Design current Ib
    let ib = 0;
    if (systemType === 'three-phase') {
      ib = powerWatts / (Math.sqrt(3) * v * pf);
    } else if (systemType === 'dc') {
      ib = powerWatts / v;
    } else {
      ib = powerWatts / (v * pf);
    }

    // Protective device rating In
    let inRating = 125;
    for (const r of STANDARD_RATINGS) {
      if (r >= ib) {
        inRating = r;
        break;
      }
    }

    // Derating factors
    const ca = getCa(temp);
    const cg = getCg(grouping);
    const ci = getCi(insulation);
    const totalFactor = Math.max(0.05, ca * cg * ci);

    const itRequired = inRating / totalFactor;
    const maxVdropPct = circuitType === 'lighting' ? 3.0 : 5.0;
    const maxVdropV = (v * maxVdropPct) / 100;

    let selectedSize = STANDARD_SIZES[STANDARD_SIZES.length - 1];
    let selectedAmpacity = 0;
    let selectedVdropV = 0;
    let selectedVdropPct = 0;

    const methodTable = AMPACITY[method] || AMPACITY.C;

    for (const size of STANDARD_SIZES) {
      let iz = methodTable[size] || 0;
      if (material === 'aluminum') iz *= 0.78;

      let mv = VDROP_MV[size] || 44;
      if (systemType === 'three-phase') mv *= Math.sqrt(3) / 2;
      if (material === 'aluminum') mv *= 1.64;

      const vDrop = (mv * ib * length) / 1000;
      const vDropPct = (vDrop / v) * 100;

      if (iz >= itRequired && vDrop <= maxVdropV) {
        selectedSize = size;
        selectedAmpacity = iz;
        selectedVdropV = vDrop;
        selectedVdropPct = vDropPct;
        break;
      }
    }

    if (selectedAmpacity === 0) {
      selectedAmpacity = (methodTable[selectedSize] || 0) * (material === 'aluminum' ? 0.78 : 1);
      let mv = VDROP_MV[selectedSize] || 44;
      if (systemType === 'three-phase') mv *= Math.sqrt(3) / 2;
      if (material === 'aluminum') mv *= 1.64;
      selectedVdropV = (mv * ib * length) / 1000;
      selectedVdropPct = (selectedVdropV / v) * 100;
    }

    const cpc = CPC_MAP[selectedSize] || selectedSize;
    const thermalPass = selectedAmpacity >= itRequired;
    const vdropPass = selectedVdropPct <= maxVdropPct;

    // DOM Updates
    const outSize = document.getElementById('cs-out-size');
    const outCpc = document.getElementById('cs-out-cpc');
    const outIb = document.getElementById('cs-out-ib');
    const outIn = document.getElementById('cs-out-in');
    const outIt = document.getElementById('cs-out-it');
    const outIz = document.getElementById('cs-out-iz');
    const outVdropV = document.getElementById('cs-out-vdrop-v');
    const outVdropPct = document.getElementById('cs-out-vdrop-pct');
    const badge = document.getElementById('cs-status-badge');
    const summary = document.getElementById('cs-summary-text');
    const fCa = document.getElementById('cs-factor-ca');
    const fCg = document.getElementById('cs-factor-cg');
    const fCi = document.getElementById('cs-factor-ci');
    const fTot = document.getElementById('cs-factor-total');

    if (outSize) outSize.textContent = selectedSize.toFixed(1);
    if (outCpc) outCpc.textContent = `${cpc.toFixed(1)} mm²`;
    if (outIb) outIb.textContent = `${ib.toFixed(1)} A`;
    if (outIn) outIn.textContent = `${inRating} A`;
    if (outIt) outIt.textContent = `${itRequired.toFixed(1)} A`;
    if (outIz) outIz.textContent = `${selectedAmpacity.toFixed(1)} A`;
    if (outVdropV) outVdropV.textContent = `${selectedVdropV.toFixed(1)} V`;
    if (outVdropPct) outVdropPct.textContent = `${selectedVdropPct.toFixed(2)}%`;

    if (fCa) fCa.textContent = ca.toFixed(2);
    if (fCg) fCg.textContent = cg.toFixed(2);
    if (fCi) fCi.textContent = ci.toFixed(2);
    if (fTot) fTot.textContent = totalFactor.toFixed(2);

    if (badge && summary) {
      if (thermalPass && vdropPass) {
        badge.textContent = 'Compliant';
        badge.style.background = '#10b981';
        summary.textContent = `Compliant: ${selectedSize} mm² cable satisfies current capacity (${selectedAmpacity.toFixed(1)}A ≥ ${itRequired.toFixed(1)}A) and ${circuitType} voltage drop (${selectedVdropPct.toFixed(2)}% ≤ ${maxVdropPct}%).`;
      } else {
        badge.textContent = 'Limits Exceeded';
        badge.style.background = '#ef4444';
        summary.textContent = `Non-compliant: Run length (${length}m) or derating limits exceeded. Increase conductor cross-section or shorten run length.`;
      }
    }
  }

  function init() {
    const form = document.getElementById('cable-sizing-form');
    if (!form) return;

    form.querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('input', runSizing);
      el.addEventListener('change', runSizing);
    });

    // Presets
    document.querySelectorAll('.preset-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const p = chip.getAttribute('data-preset');
        const pwr = document.getElementById('cs-power');
        const pf = document.getElementById('cs-pf');
        const cType = document.getElementById('cs-circuit-type');
        const method = document.getElementById('cs-install-method');

        if (p === 'shower') {
          if (pwr) pwr.value = '8.5';
          if (pf) pf.value = '1.00';
          if (cType) cType.value = 'power';
          if (method) method.value = 'C';
        } else if (p === 'ev') {
          if (pwr) pwr.value = '7.4';
          if (pf) pf.value = '0.98';
          if (cType) cType.value = 'power';
          if (method) method.value = 'B';
        } else if (p === 'cooker') {
          if (pwr) pwr.value = '6.0';
          if (pf) pf.value = '1.00';
          if (cType) cType.value = 'power';
          if (method) method.value = 'C';
        } else if (p === 'lighting') {
          if (pwr) pwr.value = '0.8';
          if (pf) pf.value = '0.95';
          if (cType) cType.value = 'lighting';
          if (method) method.value = 'C';
        }
        runSizing();
      });
    });

    runSizing();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
