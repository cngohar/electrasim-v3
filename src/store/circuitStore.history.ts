/**
 * Undo-history snapshot sanitiser.
 *
 * Split verbatim from the former monolithic `circuitStore.ts`. Leaf module:
 * imports nothing from the store, so the store can use it inside
 * `create()` without an import cycle.
 */

import { COMPONENT_DEFS, type ComponentInstance } from '@electrasim/domain';

const historyComponentCache = new WeakMap<ComponentInstance[], ComponentInstance[]>();

/** Undo snapshots must never turn a transient held contact into saved circuit state. */
export function componentsForHistory(components: ComponentInstance[]): ComponentInstance[] {
  const cached = historyComponentCache.get(components);
  if (cached) return cached;
  if (
    !components.some(
      (component) =>
        component.state.on === true && COMPONENT_DEFS[component.type]?.isMomentary === true,
    )
  ) {
    return components;
  }

  const sanitized = components.map((component) =>
    component.state.on && COMPONENT_DEFS[component.type]?.isMomentary
      ? { ...component, state: { ...component.state, on: false } }
      : component,
  );
  historyComponentCache.set(components, sanitized);
  return sanitized;
}
