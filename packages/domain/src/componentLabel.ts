/**
 * Display names for component *instances*.
 *
 * `ComponentInstance` carries no label of its own — the display name lives in
 * `COMPONENT_DEFS[type].label`. Those catalogue labels often embed a *default*
 * rating ("MCB Type B (16A)", "RCBO (32A 30mA)"), while an instance's real
 * rating lives in `state.customMaxAmps`. Anywhere the two disagree, showing the
 * raw catalogue label tells the user something untrue about the circuit in
 * front of them.
 *
 * Hand-placed components leave `customMaxAmps` unset and so are unaffected;
 * this only bites on circuits that set a rating explicitly — most visibly the
 * generated Challenge Mode and Diagnosis Lab circuits, where a "RCBO (32A
 * 30mA)" node was being described in the brief as the 20 A device it actually
 * is.
 */

import { COMPONENT_DEFS } from './components';
import type { Circuit, ComponentInstance } from './types';

/** Trailing parenthetical quoting an amp figure, e.g. "(16A)" / "(32A 30mA)". */
export const RATING_SUFFIX = /\s*\([^()]*\d\s*A\b[^()]*\)\s*$/i;

/**
 * Display name for one instance, with this instance's actual rating attached.
 *
 * Falls back to the catalogue label (then the raw type) whenever the instance
 * carries no custom rating, so ordinary hand-placed components read exactly as
 * they always have.
 */
export function instanceLabel(component: ComponentInstance): string {
  const catalogue = COMPONENT_DEFS[component.type]?.label ?? component.type;
  const amps = component.state?.customMaxAmps;
  if (typeof amps !== 'number' || !Number.isFinite(amps)) return catalogue;
  const base = catalogue.replace(RATING_SUFFIX, '');
  return `${base} (${amps} A)`;
}

/** Same as {@link instanceLabel}, by id, with a safe fallback for stale ids. */
export function labelById(circuit: Circuit, id: string, fallback = 'unknown component'): string {
  const component = circuit.components.find((c) => c.id === id);
  return component ? instanceLabel(component) : fallback;
}
