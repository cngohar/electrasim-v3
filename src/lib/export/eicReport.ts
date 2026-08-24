/**
 * eicReport.ts — Mini Electrical Installation Certificate (print-HTML).
 *
 * Generates a self-contained, printable HTML certificate styled on the
 * BS 7671 Appendix 6 model form ("Mini EIC"), populated with values computed
 * by the Zs/disconnection checker (Reg 411.3, Tables 41.2–41.4 A4:2026
 * Cmin-corrected; R1+R2 per OSG Table I1). No dependencies — a plain string
 * document with inline print CSS plus a screen-only print button.
 *
 * Educational instrument: figures are COMPLIANCE ESTIMATES from the simulated
 * topology, not dead/live test measurements; the document states this on its
 * face and may never be used as an actual certificate.
 */

import type { Circuit } from '../../domain/types';
import {
  ZE_DEFAULT_OHMS,
  type ZsCheckResult,
  type ZsEarthArrangement,
  runZsChecks,
} from '../../domain/zsCheck';

export interface EicCircuitRow {
  ref: string;
  description: string;
  device: string;
  curve: string;
  ratingAmps: number;
  residual: string;
  cableMm2: string;
  runMeters: string;
  r1r2Ohms: string;
  zeOhms: string;
  zsOhms: string;
  maxZsOhms: string;
  pfcAmps: string;
  disconnection: string;
  verdict: 'PASS' | 'PASS*' | 'FAIL';
}

export interface EicReportData {
  generatedIso: string;
  earthing: ZsEarthArrangement;
  zeOhms: number;
  rows: EicCircuitRow[];
  wireCount: number;
  componentCount: number;
  totalRunMeters: number;
  anyEstimatedLength: boolean;
}

const fmt = (n: number, digits = 2) => (Number.isFinite(n) ? n.toFixed(digits) : '—');

function rowFromZs(result: ZsCheckResult, index: number): EicCircuitRow {
  return {
    ref: result.deviceLabel || `Circuit ${index + 1}`,
    description: result.furthestComponentLabel
      ? `Radial to ${result.furthestComponentLabel}`
      : 'Radial circuit',
    device: result.deviceLabel,
    curve: result.curve,
    ratingAmps: result.ratingAmps,
    residual: result.rcdType ? `30 mA Type ${result.rcdType}` : '—',
    cableMm2: `${result.smallestCableMm2}/${result.cpcMm2} T&E`,
    runMeters: result.runLengthEstimated
      ? `~${fmt(result.runLengthMeters, 0)}`
      : fmt(result.runLengthMeters, 0),
    r1r2Ohms: fmt(result.r1r2Ohms, 3),
    zeOhms: fmt(result.zeOhms),
    zsOhms: fmt(result.zsOhms, 3),
    maxZsOhms: fmt(result.maxZsOhms),
    pfcAmps: String(Math.round(result.prospectiveFaultCurrentAmps)),
    disconnection: `≤ ${result.disconnectionSeconds} s`,
    verdict: result.passCold ? 'PASS' : result.passHot ? 'PASS*' : 'FAIL',
  };
}

export function buildEicReportData(
  circuit: Circuit,
  earthing: ZsEarthArrangement = 'TN-C-S',
  now: Date = new Date(),
): EicReportData {
  const checks = runZsChecks(circuit, ZE_DEFAULT_OHMS[earthing]);
  return {
    generatedIso: now.toISOString(),
    earthing,
    zeOhms: ZE_DEFAULT_OHMS[earthing],
    rows: checks.map(rowFromZs),
    wireCount: circuit.wires.length,
    componentCount: circuit.components.length,
    totalRunMeters: circuit.wires.reduce((acc, w) => acc + (w.lengthMeters ?? 0), 0),
    anyEstimatedLength: circuit.wires.some((w) => !w.lengthMeters || w.lengthMeters <= 0),
  };
}

/** HTML-escape everything user-influenced (labels, refs) before interpolation. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const e = escapeHtml;

export function renderEicHtml(data: EicReportData): string {
  const dateLine = new Date(data.generatedIso).toLocaleString('en-GB', {
    dateStyle: 'full',
    timeStyle: 'short',
  });

  const bodyRows = data.rows.length
    ? data.rows
        .map(
          (r, i) => `
        <tr class="${r.verdict === 'FAIL' ? 'fail' : ''}">
          <td>${i + 1}</td>
          <td>${e(r.ref)}<div class="muted">${e(r.description)}</div></td>
          <td>${e(r.curve)}${r.ratingAmps}</td>
          <td>${e(r.residual)}</td>
          <td>${e(r.cableMm2)}</td>
          <td>${e(r.runMeters)}</td>
          <td>${e(r.r1r2Ohms)}</td>
          <td>${e(r.zsOhms)}</td>
          <td>${e(r.maxZsOhms)}</td>
          <td>${e(r.pfcAmps)}</td>
          <td>${e(r.disconnection)}</td>
          <td class="verdict ${r.verdict === 'FAIL' ? 'no' : 'yes'}">${r.verdict}</td>
        </tr>`,
        )
        .join('')
    : `
        <tr><td colspan="12" class="muted centre">No protective devices with an overcurrent curve guard a wired load — nothing to schedule.</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8" />
<title>ElectraSim Mini EIC — ${e(dateLine)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, Arial, sans-serif; color: #0f172a; margin: 24px; font-size: 11px; }
  h1 { font-size: 17px; margin: 0; letter-spacing: 0.4px; }
  h2 { font-size: 12.5px; margin: 18px 0 6px; border-bottom: 1.5px solid #0f172a; padding-bottom: 2px; }
  .sub { color: #475569; margin-top: 2px; }
  .badge { display: inline-block; border: 1.5px solid #b45309; color: #b45309; border-radius: 6px; padding: 2px 8px; font-weight: 700; font-size: 10px; letter-spacing: 0.6px; }
  table { border-collapse: collapse; width: 100%; margin-top: 4px; }
  th, td { border: 1px solid #94a3b8; padding: 4px 5px; text-align: left; vertical-align: top; }
  th { background: #e2e8f0; font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.4px; }
  td { font-size: 10px; }
  tr.fail td { background: #fef2f2; }
  .verdict.yes { font-weight: 800; color: #047857; }
  .verdict.no { font-weight: 800; color: #b91c1c; }
  .muted { color: #64748b; font-size: 9px; }
  .centre { text-align: center; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-top: 6px; }
  .field { border-bottom: 1px dotted #64748b; min-height: 16px; padding: 1px 2px; }
  .field label { font-size: 9px; color: #475569; display: block; }
  .note { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; margin-top: 8px; }
  #printbar { position: sticky; top: 0; background: #0f172a; color: #fff; padding: 8px 12px; margin: -24px -24px 16px; display: flex; justify-content: space-between; align-items: center; }
  #printbar button { background: #2563eb; color: #fff; border: 0; border-radius: 6px; padding: 6px 14px; font-weight: 700; cursor: pointer; }
  @media print { #printbar { display: none; } body { margin: 8mm; } }
</style>
</head>
<body>
  <div id="printbar">
    <span>ElectraSim — Mini Electrical Installation Certificate (print preview)</span>
    <button type="button" onclick="window.print()">🖨 Print / Save as PDF</button>
  </div>

  <span class="badge">EDUCATIONAL SIMULATION OUTPUT — NOT A CERTIFICATE</span>
  <h1>MINI ELECTRICAL INSTALLATION CERTIFICATE</h1>
  <div class="sub">Styled on the BS 7671 Appendix 6 model form · generated by ElectraSim on ${e(dateLine)}</div>

  <h2>Part 1 — Installation &amp; supply details</h2>
  <div class="grid">
    <div class="field"><label>Client / occupier</label></div>
    <div class="field"><label>Installation address</label></div>
    <div class="field"><label>Supply: 230 V, 1-phase, 50 Hz (simulated)</label></div>
    <div class="field"><label>Earthing arrangement: ${e(data.earthing)} — Ze taken as ${e(fmt(data.zeOhms))} Ω</label></div>
  </div>

  <h2>Part 2 — Schedule of circuit results (Reg 411.3 disconnection check)</h2>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Circuit</th><th>Device</th><th>RCD</th><th>Cable mm²</th>
        <th>Run m</th><th>R1+R2 Ω</th><th>Zs Ω</th><th>Max Zs Ω</th><th>PFC A</th>
        <th>Disc.</th><th>Verdict</th>
      </tr>
    </thead>
    <tbody>${bodyRows}
    </tbody>
  </table>
  <div class="note">
    <strong>Method.</strong> Zs = Ze + (R1+R2); R1+R2 computed at 20 °C from OSG Table I1 T&amp;E
    figures on a ${e(data.earthing)} supply (Ze ${e(fmt(data.zeOhms))} Ω). Max Zs = 230 V × 0.95
    (C<sub>min</sub>, BS 7671:2018+A4:2026) ÷ (upper magnetic threshold × rating) per Tables
    41.2–41.4 for 0.4 s disconnection. Verdict <strong>PASS</strong> also clears the GN3 80 % cold
    rule; <strong>PASS*</strong> meets the table maximum but not the 80 % margin (a cold on-site
    reading could fail); <strong>FAIL</strong> exceeds the table maximum.
    ${data.anyEstimatedLength ? '<br><strong>⚠ Some wires have no set length and were assumed 10 m each — set wire lengths in the Inspector before relying on these figures.</strong>' : ''}
    ${data.totalRunMeters > 0 ? `<br>Total wired run on canvas: ${e(fmt(data.totalRunMeters, 0))} m across ${data.wireCount} wires / ${data.componentCount} components.` : ''}
  </div>

  <h2>Part 3 — Declaration</h2>
  <div class="grid">
    <div class="field"><label>Designer — name / signature / date</label></div>
    <div class="field"><label>Constructor — name / signature / date</label></div>
    <div class="field"><label>Inspector — name / signature / date</label></div>
    <div class="field"><label>Test instruments used (model / serial)</label></div>
  </div>

  <div class="note muted">
    All values are computed from the simulated canvas (topology, cable sizes and lengths set in the
    Inspector) — not from instrument measurement. Real certification requires dead and live testing
    per BS 7671 Part 6 by a competent person. ElectraSim is a teaching simulator.
  </div>
</body>
</html>
`;
}
