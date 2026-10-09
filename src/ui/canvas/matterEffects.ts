import type { Circuit, SimulationResult } from '@electrasim/domain';
import { isCurrentSimulation } from '@electrasim/domain/simulationEvidence';

export type MatterEffectKind = 'overload' | 'damage';
export interface MatterEffect {
  key: string;
  target: 'wire' | 'component';
  id: string;
  kind: MatterEffectKind;
}

/** Read-only consequence projection. A fault label or ordinary trip is never damage. */
export function collectMatterEffects(
  circuit: Circuit,
  result: SimulationResult | null | undefined,
): MatterEffect[] {
  const current = isCurrentSimulation(circuit, result) ? result : null;
  const effects = new Map<string, MatterEffect>();
  const add = (target: MatterEffect['target'], id: string, kind: MatterEffectKind) => {
    const key = `${target}:${id}`;
    if (effects.get(key)?.kind !== 'damage') effects.set(key, { key, target, id, kind });
  };
  for (const wire of circuit.wires) {
    const ratio = current?.wireHeatRatios?.[wire.id];
    if (typeof ratio === 'number' && Number.isFinite(ratio) && ratio > 1)
      add('wire', wire.id, 'overload');
    if (wire.isBusted || current?.bustedWires?.has(wire.id)) add('wire', wire.id, 'damage');
  }
  for (const component of circuit.components) {
    if (component.state.isBlown || current?.blownComponents?.some((c) => c.id === component.id))
      add('component', component.id, 'damage');
  }
  // Explicit damage budgets can be exceeded below the cable's ordinary ampacity.
  for (const point of current?.electrical?.damage ?? []) {
    const exists =
      point.target.type === 'wire'
        ? circuit.wires.some((w) => w.id === point.target.id)
        : circuit.components.some((c) => c.id === point.target.id);
    if (exists && (point.damaged || point.pendingAtSeconds !== null))
      add(point.target.type, point.target.id, point.damaged ? 'damage' : 'overload');
  }
  return [...effects.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export const MATTER_EFFECT_LIMIT = 24;
export const MATTER_FRAME_MS = 1000 / 30;
export const MATTER_SETTLE_FRAMES = 45;
