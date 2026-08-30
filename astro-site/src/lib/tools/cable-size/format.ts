/**
 * format.ts — display formatting for the Cable Size Calculator.
 *
 * The shared voltage-drop formatters are deliberately engineering-grade
 * (fixed decimals everywhere). Load figures read better rounded to how an
 * electrician would say them: "100 W", "3 kW", "2.2 kW" — not "100.0 W" or
 * "3.00 kW".
 *
 * These are presentation only; nothing in the domain depends on them.
 */

/** Load power the way it would be said out loud. */
export function formatLoadPower(watts: number): string {
  if (!Number.isFinite(watts)) return '—';
  const w = Math.abs(watts);
  if (w >= 1000) {
    const kw = w / 1000;
    return `${Number.isInteger(kw) ? kw.toFixed(0) : kw.toFixed(1)} kW`;
  }
  if (w >= 10) return `${Math.round(w)} W`;
  if (w >= 1) return `${w.toFixed(1)} W`;
  return `${w.toFixed(2)} W`;
}

/** Cable cross-section, e.g. "4 mm²". */
export function formatCableSize(sizeMm2: number): string {
  if (!Number.isFinite(sizeMm2)) return '—';
  return `${sizeMm2} mm²`;
}

/** Material name as it appears beside a size, e.g. "Copper". */
export function formatMaterial(material: 'copper' | 'aluminium'): string {
  return material === 'copper' ? 'Copper' : 'Aluminium';
}
