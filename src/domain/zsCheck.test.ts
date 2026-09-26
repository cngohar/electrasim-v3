/** Independent arithmetic fixtures for the limited UK TN teaching model. */

import { describe, expect, it } from 'vitest';
import type { Circuit, ComponentInstance, WireInstance } from './types';
import {
  type ZsContext,
  checkDeviceDisconnection as assessDevice,
  getMaxZsOhms,
  getR1R2MilliOhmPerMetre,
  runZsChecks,
} from './zsCheck';

const context: ZsContext = { standard: 'uk', earthing: 'TN-C-S' };
function checkDeviceDisconnection(device: ComponentInstance, circuit: Circuit) {
  const result = assessDevice(device, circuit, context);
  if (result?.status !== 'estimated')
    throw new Error(`Expected estimate: ${JSON.stringify(result)}`);
  return result;
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

const circuit = (components: ComponentInstance[], wires: WireInstance[]): Circuit => ({
  components,
  wires,
});

describe('zsCheck — R1+R2 tables (OSG Table I1, 20 °C)', () => {
  it.each([
    [1.0, 36.2, 1.0],
    [1.5, 30.2, 1.0],
    [2.5, 19.51, 1.5],
    [4.0, 16.71, 1.5],
    [6.0, 10.49, 2.5],
    [10.0, 6.44, 4.0],
    [16.0, 4.23, 6.0],
  ])('%i mm² line → %i mΩ/m with %i mm² CPC', (line, sum, cpc) => {
    const r = getR1R2MilliOhmPerMetre(line);
    expect(r.sum).toBeCloseTo(sum, 2);
    expect(r.cpcMm2).toBe(cpc);
  });
});

describe('zsCheck — maximum Zs (BS 7671 Tables 41.2–41.4, Cmin-corrected)', () => {
  it.each([
    ['B', 6, 7.283], // 218.5/30  → tabulated 7.28
    ['B', 16, 2.7313], // 218.5/80 = 2.73125 → tabulated 2.73
    ['B', 32, 1.3656], // 218.5/160 → tabulated 1.37
    ['B', 40, 1.0925], // tabulated 1.09
    ['B', 50, 0.874], // tabulated 0.87
    ['C', 32, 0.6828], // 218.5/320 → tabulated 0.68
    ['D', 32, 0.3414], // 218.5/640 → tabulated 0.34
    ['D', 16, 0.6828],
  ] as const)('Type %s %iA max Zs ≈ %f Ω', (curve, rating, expected) => {
    expect(getMaxZsOhms(curve, rating)).toBeCloseTo(expected, 3);
  });
});

describe('zsCheck — circuit disconnection check', () => {
  /** live → rcbo → bulb over explicit-length 2.5 mm² runs. */
  const build = (deviceType: 'rcbo' | 'mcb' | 'rcd', runMeters: number) => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const device = C(deviceType, { on: true });
    const bulb = C('bulb');
    const fourPole = deviceType !== 'mcb';
    const wires = fourPole
      ? [
          W({ c: l, p: 0 }, { c: device, p: 0 }, runMeters / 2),
          W({ c: n, p: 0 }, { c: device, p: 1 }, runMeters / 2),
          W({ c: device, p: 2 }, { c: bulb, p: 0 }, runMeters / 2),
          W({ c: device, p: 3 }, { c: bulb, p: 1 }, runMeters / 2),
        ]
      : [
          W({ c: l, p: 0 }, { c: device, p: 0 }, runMeters / 2),
          W({ c: device, p: 1 }, { c: bulb, p: 0 }, runMeters / 2),
          W({ c: n, p: 0 }, { c: bulb, p: 1 }, runMeters),
        ];
    return {
      device,
      result: checkDeviceDisconnection(device, circuit([l, n, device, bulb], wires)),
    };
  };

  it('passes a healthy 20 m run on a 32 A Type B RCBO and reports the numbers', () => {
    const { result } = build('rcbo', 20);
    expect(result).not.toBeNull();
    // run = device→bulb hop distance = 10 m (nearest half) ... live rail out is 10 m.
    expect(result!.runLengthMeters).toBeCloseTo(10, 5);
    expect(result!.runLengthEstimated).toBe(false);
    // 2.5/1.5 T&E: 19.51 mΩ/m × 10 m
    expect(result!.r1r2Ohms).toBeCloseTo(0.1951, 4);
    // TN-C-S Ze default 0.35 Ω
    expect(result!.zsOhms).toBeCloseTo(0.5451, 4);
    expect(result!.maxZsOhms).toBeCloseTo(1.366, 3);
    expect(result!.passHot).toBe(true);
    expect(result!.passCold).toBe(true);
    expect(result!.prospectiveFaultCurrentAmps).toBeCloseTo(218.5 / 0.5451, 1);
    expect(result!.assuredFaultCurrentAmps).toBe(160);
    expect(result!.disconnectionSeconds).toBe(0.4);
  });

  it('fails the table limit (and the 80% cold rule) on a very long undersized run', () => {
    const { result } = build('rcbo', 600); // 300 m live run, 2.5 mm²
    expect(result).not.toBeNull();
    expect(result!.r1r2Ohms).toBeCloseTo(19.51 * 0.3, 4);
    expect(result!.passHot).toBe(false);
    expect(result!.passCold).toBe(false);
  });

  it('in-between runs can pass the table yet fail the 80% cold-design rule', () => {
    // max Zs 1.366, cold limit 1.093; pick run so Ze+R1R2 ≈ 1.2 Ω
    // R1R2 needed ≈ 0.85 Ω → L = 850/19.51 ≈ 43.6 m live run.
    const { result } = build('rcbo', 88); // 44 m live run
    expect(result).not.toBeNull();
    expect(result!.passHot).toBe(true);
    expect(result!.passCold).toBe(false);
  });

  it('flags assumed 10 m runs when wires carry no length', () => {
    const { result } = build('rcbo', 0); // lengthMeters omitted → defaults
    expect(result).not.toBeNull();
    expect(result!.runLengthEstimated).toBe(true);
    expect(result!.runLengthMeters).toBe(10);
  });

  it('does not treat plain RCDs as an assessed overcurrent curve', () => {
    const device = C('rcd');
    expect(assessDevice(device, circuit([device], []), context)?.status).toBe('not-assessed');
  });

  it('runZsChecks covers every overcurrent device on the canvas', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const rcbo = C('rcbo', { on: true });
    const bulb = C('bulb');
    // isolated AFDD guards nothing → no row
    const afdd = C('afdd', { on: true });
    const wires = [
      W({ c: l, p: 0 }, { c: rcbo, p: 0 }, 5),
      W({ c: n, p: 0 }, { c: rcbo, p: 1 }, 5),
      W({ c: rcbo, p: 2 }, { c: bulb, p: 0 }, 5),
      W({ c: rcbo, p: 3 }, { c: bulb, p: 1 }, 5),
    ];
    const rows = runZsChecks(circuit([l, n, rcbo, bulb, afdd], wires), context);
    expect(rows.filter((r) => r.status === 'estimated').map((r) => r.deviceId)).toEqual([rcbo.id]);
    expect(rows.find((r) => r.deviceId === afdd.id)?.status).toBe('not-assessed');
  });

  it('respects a custom device rating when computing max Zs', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const mcb = C('mcb', { on: true, customMaxAmps: 16 });
    const bulb = C('bulb');
    const wires = [
      W({ c: l, p: 0 }, { c: mcb, p: 0 }, 5),
      W({ c: mcb, p: 1 }, { c: bulb, p: 0 }, 5),
      W({ c: n, p: 0 }, { c: bulb, p: 1 }, 10),
    ];
    const result = checkDeviceDisconnection(mcb, circuit([l, n, mcb, bulb], wires));
    expect(result!.maxZsOhms).toBeCloseTo(2.7313, 3);
  });
});

describe('Zs applicability boundaries', () => {
  const fixture = () => {
    const device = C('rcbo', { on: true });
    const load = C('bulb');
    const source = C('live-terminal');
    return {
      device,
      c: circuit(
        [source, device, load],
        [
          W({ c: source, p: 0 }, { c: device, p: 0 }, 1),
          W({ c: device, p: 2 }, { c: load, p: 0 }, 10),
        ],
      ),
    };
  };
  it.each(['us', 'eu', 'int'] as const)(
    'does not certify profile %s with UK tables',
    (standard) => {
      const { device, c } = fixture();
      const result = assessDevice(device, c, { ...context, standard });
      expect(result?.status).toBe('not-assessed');
      expect(result).not.toHaveProperty('passHot');
    },
  );
  it('does not pass TT merely because the circuit has an RCBO', () => {
    const { device, c } = fixture();
    expect(assessDevice(device, c, { ...context, earthing: 'TT' })?.status).toBe('not-assessed');
  });
  it('uses explicit U0 = 230 V for a 400 V line-to-line supply', () => {
    const { device, c } = fixture();
    c.globalVoltage = 400;
    expect(assessDevice(device, c, context)?.status).toBe('not-assessed');
    const r = assessDevice(device, c, { ...context, lineToEarthVoltage: 230 });
    expect(r?.status).toBe('estimated');
    if (r?.status !== 'estimated') throw new Error('Expected explicit U0 estimate');
    expect(r.maxZsOhms).toBeCloseTo(1.365625, 6);
    expect(assessDevice(device, c, { ...context, lineToEarthVoltage: 400 })?.status).toBe(
      'not-assessed',
    );
  });
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 120])(
    'does not assess unsupported supply %s',
    (globalVoltage) => {
      const { device, c } = fixture();
      expect(assessDevice(device, { ...c, globalVoltage }, context)?.status).toBe('not-assessed');
    },
  );
  it('rejects unsupported cable, trip rating, distribution and invalid Ze inputs', () => {
    const { device, c } = fixture();
    for (const patch of [
      { material: 'aluminum' as const },
      { gauge: 12 },
      { customCableMm2: 3 },
      { lengthMeters: -1 },
    ]) {
      expect(
        assessDevice(device, { ...c, wires: [{ ...c.wires[0], ...patch }] }, context)?.status,
      ).toBe('not-assessed');
    }
    expect(assessDevice({ ...device, state: { customMaxAmps: 63 } }, c, context)?.status).toBe(
      'not-assessed',
    );
    expect(assessDevice(device, c, { ...context, zeOhms: -1 })?.status).toBe('not-assessed');
    expect(assessDevice(device, c, { ...context, circuitKind: 'distribution' })?.status).toBe(
      'not-assessed',
    );
  });
});
