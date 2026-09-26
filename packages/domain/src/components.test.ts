import { describe, expect, it } from 'vitest';
import { COMPONENT_DEFS } from './components';

describe('component learning descriptions', () => {
  it.each([
    ['push-button', /normally-open.*normally-closed.*latching/i],
    ['mcb', /educational overload estimate.*not standards-compliant.*trip timing/i],
    ['rcd', /Trips on .*earth leakage.*Type B.*residual type/i],
    ['rcbo', /Trips on bolted short.*earth leakage.*only Type B sees smooth DC/i],
    ['afdd', /arc-fault.*BS EN 62606.*only.*detects.*arc/i],
    ['contactor', /without coil terminals.*coil logic.*auxiliary contacts/i],
    ['bell', /visual pulse.*does not play audio/i],
  ])('%s description matches its modelled behaviour', (type, limitation) => {
    expect(COMPONENT_DEFS[type]?.description).toMatch(limitation);
  });
});
