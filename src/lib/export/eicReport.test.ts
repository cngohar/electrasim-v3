/**
 * eicReport.test.ts — the mini-EIC builder stays honest: values come from the
 * zsCheck engine (already table-locked), markup is escaped, and the verdict
 * vocabulary matches the panel.
 */

import type { Circuit, ComponentInstance, WireInstance } from '@electrasim/domain/types';
import { describe, expect, it } from 'vitest';
import { buildEicReportData as buildReport, escapeHtml, renderEicHtml } from './eicReport';

function buildEicReportData(circuit: Circuit, earthing: 'TN-C-S' | 'TN-S' = 'TN-C-S', now?: Date) {
  return buildReport(circuit, { standard: 'uk', earthing }, now);
}

let nextId = 0;
const uid = (prefix: string) => `${prefix}${++nextId}`;

const C = (type: string, state: ComponentInstance['state'] = {}): ComponentInstance => ({
  id: uid(`${type.replace(/[^a-z]/gi, '').slice(0, 4)}-`),
  type,
  x: 0,
  y: 0,
  state,
});

const W = (
  from: { c: ComponentInstance; p: number },
  to: { c: ComponentInstance; p: number },
  lengthMeters?: number,
): WireInstance => ({
  id: uid('w-'),
  fromComponentId: from.c.id,
  fromPortIndex: from.p,
  toComponentId: to.c.id,
  toPortIndex: to.p,
  controlPoints: [],
  ...(lengthMeters ? { lengthMeters } : {}),
});

function rcboCircuit() {
  const l = C('live-terminal');
  const n = C('neutral-terminal');
  const rcbo = C('rcbo', { on: true });
  const bulb = C('bulb');
  const wires = [
    W({ c: l, p: 0 }, { c: rcbo, p: 0 }, 10),
    W({ c: n, p: 0 }, { c: rcbo, p: 1 }, 10),
    W({ c: rcbo, p: 2 }, { c: bulb, p: 0 }, 10),
    W({ c: rcbo, p: 3 }, { c: bulb, p: 1 }, 10),
  ];
  return { components: [l, n, rcbo, bulb], wires } as Circuit;
}

describe('eicReport — data assembly', () => {
  it('schedules one row per overcurrent device with zsCheck-derived values', () => {
    const data = buildEicReportData(rcboCircuit(), 'TN-C-S', new Date('2026-08-15T12:00:00Z'));

    expect(data.rows).toHaveLength(1);
    const row = data.rows[0];
    expect(row.curve).toBe('B');
    expect(row.ratingAmps).toBe(32);
    expect(row.residual).toBe('30 mA Type A');
    expect(row.maxZsOhms).toBe('1.37');
    // 10 m live run, 2.5/1.5 T&E: R1+R2 = 19.51×10/1000 = 0.1951, Zs = 0.35 + 0.1951 ≈ 0.545
    expect(row.r1r2Ohms).toBe('0.195');
    expect(row.zsOhms).toBe('0.545');
    expect(row.verdict).toBe('WITHIN MODEL');
    expect(data.earthing).toBe('TN-C-S');
    expect(data.zeOhms).toBe(0.35);
  });

  it('marks verdict FAIL when the run exceeds the table maximum', () => {
    const circuit = rcboCircuit();
    const longWires = circuit.wires.map((w) => ({ ...w, lengthMeters: 200 }));
    const data = buildEicReportData({ ...circuit, wires: longWires });
    expect(data.rows[0].verdict).toBe('EXCEEDS MODEL');
  });

  it('flags estimated lengths when any wire lacks one', () => {
    const data = buildEicReportData(rcboCircuit());
    expect(data.anyEstimatedLength).toBe(false);
    const withoutLengths = rcboCircuit();
    const dirty = buildEicReportData({
      ...withoutLengths,
      wires: withoutLengths.wires.map((w) => {
        const { lengthMeters: _omit, ...rest } = w as WireInstance & { lengthMeters?: number };
        return rest;
      }),
    });
    expect(dirty.anyEstimatedLength).toBe(true);
    expect(dirty.rows[0].runMeters.startsWith('~')).toBe(true);
  });
});

describe('eicReport — HTML rendering', () => {
  it('renders the certificate structure with the schedule row', () => {
    const html = renderEicHtml(
      buildEicReportData(rcboCircuit(), 'TN-S', new Date('2026-08-15T12:00:00Z')),
    );
    expect(html).toContain('MINI ELECTRICAL INSTALLATION CERTIFICATE');
    expect(html).toContain('BS 7671 Appendix 6');
    expect(html).toContain('TN-S');
    expect(html).toContain('0.80'); // Ze in Part 1
    expect(html).toContain('RCBO (32A 30mA)');
    expect(html).toContain('window.print()');
    expect(html).toContain('EDUCATIONAL SIMULATION OUTPUT');
  });

  it('escapes user-controlled labels (no markup injection into the report)', () => {
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe('&lt;img src=x onerror=alert(1)&gt;');
    expect(escapeHtml('a"b\'c&d')).toBe('a&quot;b&#39;c&amp;d');

    const circuit = rcboCircuit();
    circuit.components[2].state.autoLabel = '<script>alert(1)</script>';
    const html = renderEicHtml(buildEicReportData(circuit));
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});

it('exports unsupported supply/profile/TT as unassessed without a green verdict', () => {
  for (const context of [
    { standard: 'us' as const, earthing: 'TN-C-S' as const },
    { standard: 'uk' as const, earthing: 'TT' as const },
  ]) {
    const data = buildReport({ ...rcboCircuit(), globalVoltage: 120 }, context);
    expect(data.rows.every((r) => r.verdict === 'NOT ASSESSED')).toBe(true);
    const html = renderEicHtml(data);
    expect(html).toContain('Selected supply: 120 V');
    expect(html).not.toContain('class="verdict yes"');
  }
});

it('does not claim a disconnection time for a failed estimate', () => {
  const c = rcboCircuit();
  c.wires.forEach((w) => {
    w.lengthMeters = 500;
  });
  expect(buildEicReportData(c).rows[0].disconnection).toBe('Not established');
});
