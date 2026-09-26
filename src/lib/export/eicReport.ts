/** Printable educational schedule; never a certificate or field measurement. */

import { getStandard } from '@electrasim/domain/standards';
import type { Circuit } from '@electrasim/domain/types';
import {
  ZE_DEFAULT_OHMS,
  type ZsAssessment,
  type ZsContext,
  type ZsEarthArrangement,
  runZsChecks,
} from '@electrasim/domain/zsCheck';
import { emojiDataUri } from '../emoji/emojiSvg';

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
  verdict: 'WITHIN MODEL' | 'MARGIN LOW' | 'EXCEEDS MODEL' | 'NOT ASSESSED';
}

export interface EicReportData {
  generatedIso: string;
  earthing: ZsEarthArrangement;
  zeOhms: number | null;
  supplyVoltage: number;
  frequencyHz: number;
  reference: string;
  rows: EicCircuitRow[];
  wireCount: number;
  componentCount: number;
  totalRunMeters: number;
  anyEstimatedLength: boolean;
}

const fmt = (n: number | null, digits = 2) =>
  n !== null && Number.isFinite(n) ? n.toFixed(digits) : '—';

function rowFromZs(result: ZsAssessment, index: number): EicCircuitRow {
  if (result.status === 'not-assessed')
    return {
      ref: result.deviceLabel,
      description: result.reason,
      device: result.deviceLabel,
      curve: '—',
      ratingAmps: 0,
      residual: '—',
      cableMm2: '—',
      runMeters: '—',
      r1r2Ohms: '—',
      zeOhms: '—',
      zsOhms: '—',
      maxZsOhms: '—',
      pfcAmps: '—',
      disconnection: 'Not assessed',
      verdict: 'NOT ASSESSED',
    };
  return {
    ref: result.deviceLabel || `Circuit ${index + 1}`,
    description: result.furthestComponentLabel
      ? `Radial to ${result.furthestComponentLabel}`
      : 'Radial circuit',
    device: result.deviceLabel,
    curve: result.curve,
    ratingAmps: result.ratingAmps,
    residual: result.rcdType
      ? `${result.residualMilliAmps ?? 'Unknown'} mA Type ${result.rcdType}`
      : '—',
    cableMm2: `${result.smallestCableMm2}/${result.cpcMm2} T&E`,
    runMeters: result.runLengthEstimated
      ? `~${fmt(result.runLengthMeters, 0)}`
      : fmt(result.runLengthMeters, 0),
    r1r2Ohms: fmt(result.r1r2Ohms, 3),
    zeOhms: fmt(result.zeOhms),
    zsOhms: fmt(result.zsOhms, 3),
    maxZsOhms: fmt(result.maxZsOhms),
    pfcAmps: String(Math.round(result.prospectiveFaultCurrentAmps)),
    disconnection: result.passHot ? `Model ≤ ${result.disconnectionSeconds} s` : 'Not established',
    verdict: result.passCold ? 'WITHIN MODEL' : result.passHot ? 'MARGIN LOW' : 'EXCEEDS MODEL',
  };
}

export function buildEicReportData(
  circuit: Circuit,
  context: ZsContext,
  now: Date = new Date(),
): EicReportData {
  const checks = runZsChecks(circuit, context);
  return {
    generatedIso: now.toISOString(),
    earthing: context.earthing,
    zeOhms:
      context.earthing === 'TT' ? null : (context.zeOhms ?? ZE_DEFAULT_OHMS[context.earthing]),
    supplyVoltage: circuit.globalVoltage ?? getStandard(context.standard).nominalVoltage,
    frequencyHz: getStandard(context.standard).frequencyHz,
    reference: getStandard(context.standard).citation,
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
  // Twemoji printer pictograph as a self-contained data URI — the printable
  // report must not depend on the visitor's emoji font.
  const printerIcon = emojiDataUri('printer', 14) ?? '';

  const bodyRows = data.rows.length
    ? data.rows
        .map(
          (r, i) => `
        <tr class="${r.verdict === 'EXCEEDS MODEL' ? 'fail' : ''}">
          <td>${i + 1}</td>
          <td>${e(r.ref)}<div class="muted">${e(r.description)}</div></td>
          <td>${e(r.curve)}${r.ratingAmps || ''}</td>
          <td>${e(r.residual)}</td>
          <td>${e(r.cableMm2)}</td>
          <td>${e(r.runMeters)}</td>
          <td>${e(r.r1r2Ohms)}</td>
          <td>${e(r.zsOhms)}</td>
          <td>${e(r.maxZsOhms)}</td>
          <td>${e(r.pfcAmps)}</td>
          <td>${e(r.disconnection)}</td>
          <td class="verdict ${r.verdict === 'EXCEEDS MODEL' ? 'no' : r.verdict === 'WITHIN MODEL' ? 'yes' : 'muted'}">${r.verdict}</td>
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
    <button type="button" onclick="window.print()"><img src="${printerIcon}" width="14" height="14" alt="" style="vertical-align:-0.15em;margin-right:5px">Print / Save as PDF</button>
  </div>

  <span class="badge">EDUCATIONAL SIMULATION OUTPUT — NOT A CERTIFICATE</span>
  <h1>MINI ELECTRICAL INSTALLATION CERTIFICATE</h1>
  <div class="sub">Styled on the BS 7671 Appendix 6 model form · generated by ElectraSim on ${e(dateLine)}</div>

  <h2>Part 1 — Installation &amp; supply details</h2>
  <div class="grid">
    <div class="field"><label>Client / occupier</label></div>
    <div class="field"><label>Installation address</label></div>
    <div class="field"><label>Selected supply: ${e(fmt(data.supplyVoltage, 0))} V; profile ${data.frequencyHz} Hz (simulated)</label></div>
    <div class="field"><label>Earthing arrangement: ${e(data.earthing)} — assumed Ze ${e(fmt(data.zeOhms))} Ω</label></div>
  </div>

  <h2>Part 2 — Teaching estimates · ${e(data.reference)}</h2>
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
    <strong>Method and scope.</strong> Only supported UK TN final-circuit cases use the
    existing copper T&amp;E model: Zs = Ze + (R1+R2) at 20 °C, U0 = 230 V line-to-earth,
    magnetic thresholds B/C/D = 5/10/20 × rating, and model factors 0.95 and 0.8.
    These assumptions and a result within the model limit do not verify CPC continuity,
    device coordination or installation compliance. Unsupported cases are <strong>NOT ASSESSED</strong>.
    TT is not assessed from RCD presence alone. Ze is an assumed design input, not a measurement.
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
