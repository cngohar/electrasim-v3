import { describe, expect, it } from 'vitest';
import { getComponentHelp } from '../componentHelp';
import { COMPONENT_DEFS } from '../components';
import type { ComponentInstance } from '../types';
import { componentReference } from './componentReference';
import { createEmptyCircuit } from './normalize';
import { assessmentPresentation } from './readinessPresentation';

describe('declared reference data', () => {
  it('covers all canonical entries without generic product-rating claims', () => {
    expect(Object.keys(COMPONENT_DEFS)).toHaveLength(116);
    for (const [type, def] of Object.entries(COMPONENT_DEFS)) {
      const reference = componentReference(type);
      expect(reference.family, type).not.toBe('unassessed');
      expect(
        reference.terminals.map((terminal) => terminal.label),
        type,
      ).toEqual(def.ports.map((port) => port.label));
      expect(getComponentHelp(type).overview, type).toBeTruthy();
    }
    const familyHelp = getComponentHelp('terminal-strip');
    expect(familyHelp.ipRating).toBeUndefined();
    expect(familyHelp.voltage).toBeUndefined();
    expect(familyHelp.regulationClauses).toBeUndefined();
    expect(familyHelp.standards).toContain('No product certification');
  });
  it.each([
    ['led-downlight', 12],
    ['tube-light', 36],
    ['motor', 750],
    ['water-heater', 2000],
  ] as const)('reconciles %s help to the declared default %s W', (type, watts) => {
    expect(getComponentHelp(type).powerWatts).toBe(watts);
    expect(
      componentReference(type)
        .groups.flatMap((group) => group.rows)
        .find((row) => row.label === 'Nominal consumption')?.value,
    ).toBe(`${watts} W`);
  });
  it('keeps actual instance consumption distinct from capacity and catalogue guidance', () => {
    const component: ComponentInstance = {
      id: 'heater',
      type: 'water-heater',
      x: 0,
      y: 0,
      state: { customPowerWatts: 1250, customMaxAmps: 10 },
    };
    const before = structuredClone(component);
    const reference = componentReference(component.type, component, createEmptyCircuit());
    expect(reference.scope).toBe('Selected instance');
    const rows = reference.groups[0]!.rows;
    expect(rows.find((row) => row.label === 'Nominal consumption')).toMatchObject({
      value: '1250 W',
      provenance: 'Saved instance',
    });
    expect(rows.find((row) => row.label === 'Contact / device capacity')).toMatchObject({
      value: '10 A',
      provenance: 'Saved instance',
    });
    expect(component).toEqual(before);
    const breaker = componentReference('mcb').groups[0]!.rows;
    expect(breaker.find((row) => row.label === 'Nominal consumption')?.value).toBe('Not declared');
    expect(breaker.find((row) => row.label === 'Contact / device capacity')?.value).toBe('16 A');
  });
});

it.each([
  ['missing-supply', 'Supply unknown', 'Connect'],
  ['multiple-sources', 'Multiple supplies', 'sources'],
  ['unsupported-model', 'Model unavailable', 'cannot be calculated'],
  ['unknown-rating', 'Ratings unknown', 'missing declarations'],
] as const)('explains %s without changing status', (code, label, action) => {
  const result = assessmentPresentation({
    status: 'unassessed',
    reasons: [{ code, severity: 'warning', basis: 'declared-model', message: `Reason: ${code}` }],
  });
  expect(result.label).toBe(label);
  expect(result.action).toContain(action);
});
