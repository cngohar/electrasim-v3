import { validateCircuit } from '@electrasim/domain/circuitValidation';
import { heaterFixture } from '@electrasim/domain/core/operatingPointFixtures';
import { simulate } from '@electrasim/domain/simulation';
import { describe, expect, it } from 'vitest';
import { validationSections } from './validationPresentation';

describe('bounded Circuit checks presentation', () => {
  it('distinguishes a recorded design check from a current calculation', () => {
    const circuit = heaterFixture();
    const pending = validationSections(validateCircuit(circuit));
    expect(pending.find((s) => s.id === 'calculation')).toMatchObject({ checked: 0, pending: 1 });
    const calculated = validationSections(validateCircuit(circuit, simulate(circuit)));
    expect(calculated.find((s) => s.id === 'calculation')).toMatchObject({
      checked: 1,
      pending: 0,
    });
    expect(calculated.find((s) => s.id === 'calculation')!.note).toContain('converged');
    expect(calculated.find((s) => s.id === 'teaching')!.pending).toBe(1);
  });
  it('keeps all four sections pending where an empty drawing has no assessment', () => {
    const sections = validationSections(
      validateCircuit({ components: [], wires: [], globalVoltage: 230 }),
    );
    expect(sections).toHaveLength(4);
    expect(sections.every((section) => section.checked === 0 && section.pending > 0)).toBe(true);
  });
});
