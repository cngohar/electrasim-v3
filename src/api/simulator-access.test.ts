import { exportJSON, importJSON } from '@electrasim/domain/circuitFormat';
import { describe, expect, it } from 'vitest';
import { catalogueProfileAcceptanceCircuits } from '../../packages/domain/src/core/catalogueProfileFixtures';
import { readCircuit } from './simulator-access';

describe('HTTP circuit validation and schema-3 profiles', () => {
  it.each(Object.entries(catalogueProfileAcceptanceCircuits()))(
    '%s accepts the same raw circuit as a schema-3 import',
    (_name, circuit) => {
      const persisted = importJSON(exportJSON(circuit));
      expect(readCircuit(persisted, true)).toEqual(persisted);
    },
  );
  it('rejects malformed profiles before normalizing them', () => {
    const c = importJSON(exportJSON(catalogueProfileAcceptanceCircuits().bulb!));
    c.components[1]!.state.electronicLoadProfile!.inputPowerWatts = -1;
    expect(() => readCircuit(c)).toThrow();
  });
});
