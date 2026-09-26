import { describe, expect, it } from 'vitest';
import { validateCircuit } from './circuitValidation';
import { runComplianceChecks } from './compliance';
import type { Circuit } from './types';

const radial = (type = 'bulb'): Circuit => ({
  globalVoltage: 230,
  components: [
    { id: 's', type: 'live-terminal', x: 0, y: 0, state: {} },
    { id: 'b', type: 'mcb', x: 0, y: 0, state: { on: true } },
    { id: 'l', type, x: 0, y: 0, state: { customPowerWatts: 2300, customVoltage: 400 } },
  ],
  wires: [
    {
      id: 'a',
      fromComponentId: 's',
      fromPortIndex: 0,
      toComponentId: 'b',
      toPortIndex: 0,
      controlPoints: [],
      lengthMeters: 1,
      customCableMm2: 2.5,
    },
    {
      id: 'z',
      fromComponentId: 'b',
      fromPortIndex: 1,
      toComponentId: 'l',
      toPortIndex: 0,
      controlPoints: [],
      lengthMeters: 49,
      customCableMm2: 2.5,
    },
  ],
});

describe('limited compliance checks', () => {
  it('uses actual supply for P/V and drop percentage, not the component voltage rating', () => {
    // 2300/230 = 10 A; 18 mV/A/m × 50 m × 10 A = 9 V = 3.913%.
    const report = runComplianceChecks(radial(), 'uk');
    expect(report.issues.find((i) => i.id === 'vdrop_l')?.title).toContain('3.9%');
    const shorter = radial();
    shorter.wires[1].lengthMeters = 9;
    expect(runComplianceChecks(shorter, 'uk').issues.some((i) => i.id === 'vdrop_l')).toBe(false);
  });
  it('does not turn an empty issue list into a compliance pass', () => {
    expect(runComplianceChecks({ components: [], wires: [] }, 'us').status).toBe('not-assessed');
    expect(runComplianceChecks({ components: [], wires: [] }, 'uk').status).toBe('limited-model');
  });
  it('does not mandate C-curve protection for an EV charger', () => {
    expect(
      runComplianceChecks(radial('ev-charger'), 'uk').issues.some((i) =>
        i.id.startsWith('motorcurve'),
      ),
    ).toBe(false);
  });
  it('leaves basic residual protection warnings visible under the US profile', () => {
    const report = runComplianceChecks(radial('socket-us'), 'us');
    expect(report.status).toBe('not-assessed');
    expect(report.issues.some((i) => i.id === 'socket_rcd_l')).toBe(true);
    expect(report.issues.some((i) => i.id === 'vdrop_l')).toBe(false);
  });
});

it('never emits a blanket regulation-compliance passed check in validation', () => {
  const report = validateCircuit(radial());
  expect(report.passedChecks.some((check) => check.id === 'pass_compliance')).toBe(false);
  expect(report.issues.some((issue) => issue.id === 'standards_coverage')).toBe(true);
});
