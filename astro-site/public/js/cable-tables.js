/**
 * cable-tables.js — browser copy of the cable-sizing conductor data tables.
 *
 * The authoritative copy lives in `src/lib/tools/cable-sizing/tables.ts` (used by
 * the server engine and the server-rendered panels). This file publishes the same
 * numbers on `window.ElectraCableTables` so the browser engine
 * (`cable-size-tool.js`) walks one shared dataset instead of a second inline
 * copy. `cable-size-tool.js` falls back to its own constants if this file has not
 * loaded (e.g. a stale cached page), so the two can never drift silently — and a
 * consistency unit test keeps them in step.
 *
 * Load before `cable-size-tool.js` (both are `defer` in ToolWorkspace.astro, so
 * document order is honoured).
 */
(() => {
  window.ElectraCableTables = {
    STANDARD_RATINGS: [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125],
    STANDARD_SIZES: [1.0, 1.5, 2.5, 4.0, 6.0, 10.0, 16.0, 25.0, 35.0, 50.0, 70.0, 95.0],
    CPC_MAP: {
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
    },
    // BS 7671 Table 4D5A-family: 70 °C thermoplastic copper, amps per method.
    AMPACITY: {
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
    },
    // mV/A/m (single-phase loop). Above 16 mm² the tabulated value already folds in reactance.
    VDROP_MV: {
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
    },
    // Tables 4B1 / 4C1 / Reg 523.9 (kept in step with tables.ts).
    getCa(t) {
      if (t <= 25) return 1.03;
      if (t <= 30) return 1.0;
      if (t <= 35) return 0.94;
      if (t <= 40) return 0.87;
      if (t <= 45) return 0.79;
      if (t <= 50) return 0.71;
      if (t <= 55) return 0.61;
      if (t <= 60) return 0.5;
      return 0.35;
    },
    getCg(n) {
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
    },
    getCi(mm) {
      if (mm === 50) return 0.89;
      if (mm === 100) return 0.81;
      if (mm === 200) return 0.5;
      return 1.0;
    },
    BS3036_FACTOR: 0.725,
    ALUMINIUM_AMPACITY_FACTOR: 0.78,
    ALUMINIUM_MV_RATIO: 1.64,
  };
})();
