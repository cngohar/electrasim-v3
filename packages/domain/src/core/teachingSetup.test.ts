import { expect, it } from 'vitest';
import { COMPONENT_DEFS } from '../components';
import { component as C } from '../simulation/auditFixtures';
import { compileCircuit } from './compile';
import { teachingSetup } from './teachingSetup';

for (const [type, def] of Object.entries(COMPONENT_DEFS)) {
  const setup = teachingSetup(type, def, {});
  if (setup)
    it(`${type} offers an explicit valid setup without editing ratings or terminal identity`, () => {
      expect(
        compileCircuit({ components: [C('device', type, setup.updates)], wires: [] }).status,
      ).toBe('compiled');
      expect(setup.description.length).toBeGreaterThan(30);
      expect(setup.updates.customMaxVolts).toBeUndefined();
      expect(teachingSetup(type, def, setup.updates)).toBeNull();
    });
}
