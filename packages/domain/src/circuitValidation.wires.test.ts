import { describe, expect, it } from 'vitest';
import { validateCircuit } from './circuitValidation';
import { heaterFixture } from './core/operatingPointFixtures';
import { component as C, wire as W } from './simulation/auditFixtures';

describe('wire recommendation provenance', () => {
  it('does not call explicit 6 mm2 runs undersized because the endpoint says 1 mm2', () => {
    const circuit = heaterFixture();
    circuit.components[1]!.state.customCableMm2 = 1;
    for (const wire of circuit.wires) wire.customCableMm2 = 6;
    expect(
      validateCircuit(circuit).issues.some((item) => item.id === 'undersized_cable_group'),
    ).toBe(false);
  });

  it('compares saved AWG through the shared resolver and offers no ineffective component-only fix', () => {
    const circuit = heaterFixture();
    for (const wire of circuit.wires) {
      wire.customCableMm2 = undefined;
      wire.gauge = 16;
    }
    const advice = validateCircuit(circuit).issues.find(
      (item) => item.id === 'undersized_cable_group',
    );
    expect(advice?.description).toContain('1.31 mm²');
    expect(advice?.wireId).toBeDefined();
    expect(advice?.quickFix).toBeUndefined();
    expect(advice?.description).toContain('does not establish cable capacity or safety');
  });

  it('does not award an unqualified cable-size pass to default or disconnected conductors', () => {
    const circuit = heaterFixture();
    for (const wire of circuit.wires) wire.customCableMm2 = undefined;
    expect(
      validateCircuit(circuit).passedChecks.some((item) => item.id === 'pass_cable_sizing'),
    ).toBe(false);
    circuit.wires = [];
    expect(
      validateCircuit(circuit).passedChecks.some((item) => item.id === 'pass_cable_sizing'),
    ).toBe(false);
  });

  it('does not assign a next-size ampacity or a protection pass to AWG conductors', () => {
    const circuit = heaterFixture();
    circuit.components.push(C('breaker', 'mcb'));
    circuit.wires[0] = { ...W('feed', 's', 0, 'breaker', 0), gauge: 16 };
    circuit.wires.push({ ...W('out', 'breaker', 1, 'heater', 0), gauge: 16 });
    const report = validateCircuit(circuit);
    expect(report.issues.some((item) => item.id === 'cable_capacity_unassessed')).toBe(true);
    expect(report.passedChecks.some((item) => item.id === 'pass_protection')).toBe(false);
  });
});
