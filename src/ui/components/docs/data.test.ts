import { COMPONENT_DEFS } from '@electrasim/domain';
import { describe, expect, it } from 'vitest';
import { CATEGORY_ORDER, buildComponentGroups } from './data';

describe('documentation component groups', () => {
  it('lists every registered component once in stable category order', () => {
    const groups = buildComponentGroups();
    const listedTypes = groups.flatMap((group) => group.items.map((item) => item.type));

    expect(groups.map((group) => group.category)).toEqual(
      CATEGORY_ORDER.filter((category) =>
        Object.values(COMPONENT_DEFS).some((definition) => definition.category === category),
      ),
    );
    expect(new Set(listedTypes).size).toBe(listedTypes.length);
    expect(new Set(listedTypes)).toEqual(new Set(Object.keys(COMPONENT_DEFS)));
  });
});
