import { type Circuit, createInjectedFault } from '@electrasim/domain';
import { describe, expect, it } from 'vitest';
import { circuitRequirements } from './circuit';

const circuit: Circuit = {
  components: [{ id: 'lamp', type: 'bulb', x: 0, y: 0, state: {} }],
  wires: [],
};
describe('content access policy', () => {
  it('cannot waive a simulated advanced fault with a client resolution flag', () => {
    const fault = {
      ...createInjectedFault('arc-fault', { type: 'component', id: 'lamp' }),
      resolved: true,
    };
    expect(circuitRequirements({ ...circuit, faults: [fault] })).toEqual(['advanced_faults']);
  });
  it('deduplicates legacy mirrors but charges for multiple deliberate faults', () => {
    const fault = createInjectedFault('open-circuit', { type: 'component', id: 'lamp' });
    expect(
      circuitRequirements({
        ...circuit,
        components: [{ ...circuit.components[0], state: { fault: 'open-circuit' } }],
        faults: [fault],
      }),
    ).toEqual([]);
    expect(
      circuitRequirements({
        ...circuit,
        faults: [fault, createInjectedFault('earth-fault', { type: 'component', id: 'lamp' })],
      }),
    ).toEqual(['advanced_faults']);
    expect(circuitRequirements({ ...circuit, faults: [{ ...fault, type: 'arc-fault' }] })).toEqual([
      'advanced_faults',
    ]);
  });
  it('does not classify natural hazards or local display mode as benefits', () => {
    expect(
      circuitRequirements({
        ...circuit,
        components: [
          { ...circuit.components[0], state: { customVoltage: 100, customPowerWatts: 10000 } },
        ],
      }),
    ).toEqual([]);
  });
});
