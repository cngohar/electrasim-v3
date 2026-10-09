import { COMPONENT_DEFS, type ComponentInstance } from '@electrasim/domain';
import { render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../../store';
import { labGlassLight } from '../theme';
import { ComponentNode } from './ComponentNode';

afterEach(() => useSettingsStore.setState({ componentAppearance: 'icons' }));
it('keeps canonical rotated terminals and the device frame identical in every appearance', () => {
  for (const type of ['bulb', 'single-way-switch', 'ac-three-phase-supply', 'relay-dpdt']) {
    for (const rotation of [0, 90, 180, 270]) {
      const component: ComponentInstance = {
        id: 'device',
        type,
        x: 100,
        y: 120,
        rotation,
        state: { on: true },
      };
      const before = structuredClone(component);
      const node = (
        <svg role="img" aria-label="Terminal invariance">
          <ComponentNode
            component={component}
            componentsById={new Map([[component.id, component]])}
            theme={labGlassLight}
            selected
            energized={false}
            error={false}
            wireMode={false}
            pendingFrom={null}
            customPathFrom={null}
            activeLoadEffects={false}
            reducedDetails={false}
            onPointerDown={vi.fn()}
            onPortClick={vi.fn()}
            onHoverChange={vi.fn()}
            onContextMenu={vi.fn()}
          />
        </svg>
      );
      let expected: string[] | undefined;
      for (const appearance of ['icons', 'symbols', 'both'] as const) {
        useSettingsStore.setState({ componentAppearance: appearance });
        const view = render(node);
        const ports = [...view.container.querySelectorAll('[data-port-touch-target]')].map(
          (el) => el.outerHTML,
        );
        expect(ports.length).toBe(COMPONENT_DEFS[type].ports.length);
        if (expected) expect(ports).toEqual(expected);
        else expected = ports;
        expect(view.container.querySelector('[data-component-id]')?.getAttribute('transform')).toBe(
          `translate(50 85) rotate(${rotation} 50 35)`,
        );
        expect(component).toEqual(before);
        view.unmount();
      }
    }
  }
});
