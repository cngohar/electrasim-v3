import type { Circuit, ComponentDef, ComponentInstance } from '../types';
import { type CircuitIndex, portKey } from './indexing';
import { traverseSources } from './traversal';

/** Ideal rail-driven relays, not a coil-voltage or transient model. The graph is
 * solved to a bounded fixed point so chained controls work within one worker result.
 * An unwired coil retains manual bench testing; wiring either terminal opts into
 * automatic operation, including dropout when the other terminal is disconnected.
 */
export function resolveCoils(
  circuit: Circuit,
  index: CircuitIndex,
  defs: Record<string, ComponentDef>,
  liveSources: ComponentInstance[],
  neutralSources: ComponentInstance[],
) {
  const controlled = circuit.components.filter((c) =>
    defs[c.type]?.coilPorts?.some((p) => index.byPort.has(portKey(c.id, p))),
  );
  const coilStates = new Map(controlled.map((c) => [c.id, false]));
  index.coilStates = coilStates;
  let live = traverseSources(liveSources, 'live', index, defs);
  let neutral = traverseSources(neutralSources, 'neutral', index, defs);
  const signatures = new Set<string>();
  for (let iteration = 0; iteration < 64; iteration++) {
    const next = controlled.map((c) => {
      const [a, b] = defs[c.type].coilPorts!;
      const keyA = portKey(c.id, a);
      const keyB = portKey(c.id, b);
      const faults = index.faultsByComponent.get(c.id) ?? [];
      const blocked =
        c.state.isBlown ||
        c.state.isTripped ||
        faults.some((f) =>
          ['open-circuit', 'open-live', 'open-neutral', 'protection-forced-open'].includes(f.type),
        ) ||
        [keyA, keyB].some((key) =>
          index.faultsByPort.get(key)?.some((f) => f.type === 'terminal-disconnect'),
        );
      return (
        !blocked &&
        live.visitedPorts.has(keyA) &&
        neutral.visitedPorts.has(keyB) &&
        !live.visitedPorts.has(keyB) &&
        !neutral.visitedPorts.has(keyA)
      );
    });
    if (controlled.every((c, i) => coilStates.get(c.id) === next[i]))
      return { live, neutral, coilStates, unstable: false };
    const signature = next.map(Number).join('');
    if (signatures.has(signature)) break;
    signatures.add(signature);
    controlled.forEach((c, i) => coilStates.set(c.id, next[i]!));
    live = traverseSources(liveSources, 'live', index, defs);
    neutral = traverseSources(neutralSources, 'neutral', index, defs);
  }
  index.unstableCoils = true;
  for (const id of coilStates.keys()) coilStates.set(id, false);
  return {
    live: traverseSources(liveSources, 'live', index, defs),
    neutral: traverseSources(neutralSources, 'neutral', index, defs),
    coilStates,
    unstable: true,
  };
}
