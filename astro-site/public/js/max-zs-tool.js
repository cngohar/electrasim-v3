/**
 * max-zs-tool.js
 * ElectraSim Electrical Toolbox — Max Zs Disconnection Time Client Engine
 * Pure Vanilla JavaScript • Zero Dependencies • BS 7671 Amendment 4
 */

(() => {
  const ZS_U0 = 230;
  const ZS_CMIN = 0.95;
  const COLD_FACTOR = 0.8;

  const MAX_ZS_TABLE = {
    'mcb-b': {
      6: 7.28,
      10: 4.37,
      16: 2.73,
      20: 2.19,
      25: 1.75,
      32: 1.37,
      40: 1.09,
      50: 0.87,
      63: 0.69,
    },
    'mcb-c': {
      6: 3.64,
      10: 2.19,
      16: 1.37,
      20: 1.09,
      25: 0.87,
      32: 0.68,
      40: 0.55,
      50: 0.44,
      63: 0.35,
    },
    'mcb-d': {
      6: 1.82,
      10: 1.09,
      16: 0.68,
      20: 0.55,
      25: 0.44,
      32: 0.34,
      40: 0.27,
      50: 0.22,
      63: 0.17,
    },
    bs88: { 6: 8.5, 10: 4.9, 16: 2.65, 20: 1.88, 25: 1.43, 32: 1.04, 40: 0.77, 50: 0.57, 63: 0.42 },
    bs1361: { 5: 10.45, 15: 3.28, 20: 1.7, 30: 1.15, 45: 0.6, 60: 0.38 },
    'rcd-30ma': {
      6: 1667,
      10: 1667,
      16: 1667,
      20: 1667,
      25: 1667,
      32: 1667,
      40: 1667,
      50: 1667,
      63: 1667,
    },
  };

  const COPPER_RES = {
    1.0: 18.1,
    1.5: 12.1,
    2.5: 7.41,
    4.0: 4.61,
    6.0: 3.08,
    10.0: 1.83,
    16.0: 1.15,
    25.0: 0.727,
  };

  const ZE_DEFAULTS = {
    'TN-C-S': 0.35,
    'TN-S': 0.8,
    TT: 21.0,
  };

  function runCalculation() {
    const devType = document.getElementById('zs-device-type')?.value || 'mcb-b';
    const rating = Number.parseInt(document.getElementById('zs-rating')?.value, 10) || 32;
    const earthing = document.getElementById('zs-earthing')?.value || 'TN-C-S';
    const zeInput = document.getElementById('zs-ze');
    const ze = Number.parseFloat(zeInput?.value) || ZE_DEFAULTS[earthing] || 0.35;
    const lineMm2 = Number.parseFloat(document.getElementById('zs-line-size')?.value) || 2.5;
    const cpcMm2 = Number.parseFloat(document.getElementById('zs-cpc-size')?.value) || 1.5;
    const length = Math.max(
      1,
      Number.parseFloat(document.getElementById('zs-length')?.value) || 20,
    );
    const tempAdj = document.getElementById('zs-temp-adj')?.checked ?? true;

    // Table limit
    const table = MAX_ZS_TABLE[devType] || MAX_ZS_TABLE['mcb-b'];
    const maxZs =
      table[rating] ??
      (ZS_U0 * ZS_CMIN) /
        (devType === 'mcb-d' ? 20 * rating : devType === 'mcb-c' ? 10 * rating : 5 * rating);

    const coldLimit = maxZs * COLD_FACTOR;

    const r1 = (COPPER_RES[lineMm2] || 18.1 / lineMm2) / 1000;
    const r2 = (COPPER_RES[cpcMm2] || 18.1 / cpcMm2) / 1000;
    const tempFactor = tempAdj ? 1.2 : 1.0;

    const r1r2PerM = (r1 + r2) * tempFactor;
    const r1r2Total = r1r2PerM * length;
    const zs = ze + r1r2Total;

    const pfc = (ZS_U0 * ZS_CMIN) / Math.max(0.01, zs);
    const ia =
      devType === 'mcb-d'
        ? 20 * rating
        : devType === 'mcb-c'
          ? 10 * rating
          : devType === 'mcb-b'
            ? 5 * rating
            : (ZS_U0 * ZS_CMIN) / maxZs;

    const passHot = zs <= maxZs;
    const passCold = zs <= coldLimit;

    // DOM Elements
    const outZs = document.getElementById('zs-out-zs');
    const outMax = document.getElementById('zs-out-max');
    const outCold = document.getElementById('zs-out-cold');
    const outZe = document.getElementById('zs-out-ze');
    const outR1R2 = document.getElementById('zs-out-r1r2');
    const outIa = document.getElementById('zs-out-ia');
    const outPfc = document.getElementById('zs-out-pfc');
    const badge = document.getElementById('zs-status-badge');
    const summary = document.getElementById('zs-summary-text');
    const heroCard = document.getElementById('zs-hero-card');
    const barFill = document.getElementById('zs-bar-fill');
    const marginText = document.getElementById('zs-margin-text');

    if (outZs) outZs.textContent = zs.toFixed(2);
    if (outMax) outMax.textContent = `${maxZs.toFixed(2)} Ω`;
    if (outCold) outCold.textContent = `${coldLimit.toFixed(2)} Ω`;
    if (outZe) outZe.textContent = `${ze.toFixed(2)} Ω`;
    if (outR1R2) outR1R2.textContent = `${r1r2Total.toFixed(2)} Ω`;
    if (outIa) outIa.textContent = `${Math.round(ia)} A`;
    if (outPfc) outPfc.textContent = `${Math.round(pfc)} A`;

    const pctOfMax = Math.min(100, Math.max(0, (zs / maxZs) * 100));
    if (barFill) {
      barFill.style.width = `${pctOfMax}%`;
      barFill.style.background = passCold ? '#10b981' : passHot ? '#f59e0b' : '#ef4444';
    }

    if (marginText) {
      const margin = Math.round(100 - pctOfMax);
      marginText.textContent =
        margin > 0 ? `${margin}% Margin to Max Zs Limit` : 'EXCEEDED CEILING';
    }

    if (badge && summary && heroCard) {
      if (passCold) {
        badge.textContent = 'Compliant';
        badge.style.background = '#10b981';
        heroCard.style.background = 'linear-gradient(135deg, #065f46 0%, #10b981 100%)';
        summary.textContent = `Compliant: Zs of ${zs.toFixed(2)} Ω is well within both the GN3 80% test limit (${coldLimit.toFixed(2)} Ω) and statutory maximum (${maxZs.toFixed(2)} Ω). Guaranteed disconnection in ≤ 0.4s.`;
      } else if (passHot) {
        badge.textContent = 'Marginal (Warm)';
        badge.style.background = '#f59e0b';
        heroCard.style.background = 'linear-gradient(135deg, #92400e 0%, #d97706 100%)';
        summary.textContent = `Marginal: Zs of ${zs.toFixed(2)} Ω complies with hot 70°C ceiling (${maxZs.toFixed(2)} Ω) but exceeds cold 80% rule limit (${coldLimit.toFixed(2)} Ω). Consider upsizing CPC if length increases.`;
      } else {
        badge.textContent = 'Non-Compliant';
        badge.style.background = '#ef4444';
        heroCard.style.background = 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)';
        summary.textContent = `Fail: Zs (${zs.toFixed(2)} Ω) exceeds maximum disconnection threshold (${maxZs.toFixed(2)} Ω). Fault current (${Math.round(pfc)}A) cannot guarantee 0.4s disconnection. Increase CPC or fit 30mA RCD.`;
      }
    }
  }

  function init() {
    const form = document.getElementById('max-zs-form');
    if (!form) return;

    form.querySelectorAll('input, select').forEach((el) => {
      el.addEventListener('input', runCalculation);
      el.addEventListener('change', runCalculation);
    });

    // Earthing default auto-fill
    document.getElementById('zs-earthing')?.addEventListener('change', (e) => {
      const val = e.target.value;
      const zeInput = document.getElementById('zs-ze');
      if (zeInput && ZE_DEFAULTS[val] !== undefined) {
        zeInput.value = ZE_DEFAULTS[val];
      }
      runCalculation();
    });

    // Presets
    document.querySelectorAll('.preset-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const p = chip.getAttribute('data-preset');
        const dev = document.getElementById('zs-device-type');
        const rating = document.getElementById('zs-rating');
        const line = document.getElementById('zs-line-size');
        const cpc = document.getElementById('zs-cpc-size');
        const length = document.getElementById('zs-length');

        if (p === 'b32') {
          if (dev) dev.value = 'mcb-b';
          if (rating) rating.value = '32';
          if (line) line.value = '2.5';
          if (cpc) cpc.value = '1.5';
          if (length) length.value = '22';
        } else if (p === 'b6') {
          if (dev) dev.value = 'mcb-b';
          if (rating) rating.value = '6';
          if (line) line.value = '1.5';
          if (cpc) cpc.value = '1.0';
          if (length) length.value = '30';
        } else if (p === 'c16') {
          if (dev) dev.value = 'mcb-c';
          if (rating) rating.value = '16';
          if (line) line.value = '2.5';
          if (cpc) cpc.value = '1.5';
          if (length) length.value = '18';
        } else if (p === 'b40') {
          if (dev) dev.value = 'mcb-b';
          if (rating) rating.value = '40';
          if (line) line.value = '6.0';
          if (cpc) cpc.value = '2.5';
          if (length) length.value = '15';
        }
        runCalculation();
      });
    });

    runCalculation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
