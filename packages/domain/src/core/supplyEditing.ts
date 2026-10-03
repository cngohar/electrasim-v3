import { COMPONENT_DEFS } from '../components';
import type { Circuit } from '../types';
import { compileCircuit } from './compile';
import { type CircuitReadiness, assessCompiledCircuitReadiness } from './readiness';
import {
  type SupplyProfile,
  copySupplyProfile,
  isSupplyProfile,
  resolveDocumentSupply,
  resolveSourceProfile,
  sameSupplyModel,
  sourceInterface,
  sourceProfileFitsInterface,
  withDocumentSupply,
} from './supplies';

export type SupplyTarget = { kind: 'document' } | { kind: 'component'; componentId: string };

export function supplyTargetForComponent(
  circuit: Circuit,
  componentId: string,
): SupplyTarget | null {
  const component = circuit.components.find((c) => c.id === componentId);
  const kind = component && sourceInterface(component.type);
  if (!kind) return null;
  return kind === 'line-alias' || kind === 'neutral-alias'
    ? { kind: 'document' }
    : { kind: 'component', componentId };
}

export function supplyAtTarget(circuit: Circuit, target: SupplyTarget): SupplyProfile | undefined {
  if (target.kind === 'document') return resolveDocumentSupply(circuit);
  const component = circuit.components.find((c) => c.id === target.componentId);
  return component && resolveSourceProfile(component.type, component.state, circuit);
}

export function supplyDescription(profile: SupplyProfile): string {
  const m = profile.model;
  return `${m.voltage} V ${m.kind === 'dc' ? 'DC' : `AC ${m.frequencyHz} Hz${m.kind === 'ac-three-phase' ? ' · 3-phase L-N' : ''}`}`;
}

export interface SupplyChangePreview {
  status: 'ready' | 'unchanged' | 'blocked';
  reason?: string;
  target: SupplyTarget;
  targetLabel: string;
  previous?: SupplyProfile;
  profile: SupplyProfile;
  circuit: Circuit;
  sourceComponentIds: string[];
  independentSourceIds: string[];
  affectedComponentIds: string[];
  reviewComponentIds: string[];
  terminalChanges: string[];
  readiness: CircuitReadiness;
}

/** A non-mutating preview and transaction. The editor owns confirmation, revision
 * and authorization. Source magnitude never becomes an equipment nameplate rating.
 */
export function previewSupplyChange(
  circuit: Circuit,
  requestedTarget: SupplyTarget,
  profile: SupplyProfile,
): SupplyChangePreview {
  const target =
    requestedTarget.kind === 'component'
      ? (supplyTargetForComponent(circuit, requestedTarget.componentId) ?? requestedTarget)
      : requestedTarget;
  const component =
    target.kind === 'component'
      ? circuit.components.find((c) => c.id === target.componentId)
      : undefined;
  const previous = supplyAtTarget(circuit, target);
  const sourceComponentIds = circuit.components
    .filter((c) => {
      const kind = sourceInterface(c.type);
      return target.kind === 'document'
        ? kind === 'line-alias' || kind === 'neutral-alias'
        : c.id === target.componentId;
    })
    .map((c) => c.id);
  let reason: string | undefined;
  if (!previous || !isSupplyProfile(profile)) reason = 'Choose a valid modeled supply.';
  else if (profile.model.kind === 'ac-three-phase')
    reason = 'Three-phase editing requires explicit phase terminals and a supported phase model.';
  else if (component && !sourceProfileFitsInterface(component.type, profile))
    reason =
      'This source has a different physical AC/DC interface. Add a suitable independent source and wire it explicitly.';

  const next = reason
    ? circuit
    : target.kind === 'document'
      ? withDocumentSupply(circuit, profile)
      : previous && sameSupplyModel(previous.model, profile.model)
        ? circuit
        : {
            ...circuit,
            components: circuit.components.map((c) =>
              c.id === component?.id
                ? {
                    ...c,
                    state: {
                      ...c.state,
                      sourceProfile: copySupplyProfile(profile),
                      customVoltage: profile.model.voltage,
                    },
                  }
                : c,
            ),
          };
  const compiled = compileCircuit(next);
  const readiness = assessCompiledCircuitReadiness(compiled);
  const sourceIds = new Set(
    compiled.status === 'compiled'
      ? compiled.graph.sources
          .filter((s) => s.componentIds.some((id) => sourceComponentIds.includes(id)))
          .map((s) => s.id)
      : [],
  );
  const affectedGroups = readiness.groups.filter(
    (g) =>
      g.sourceIds.some((id) => sourceIds.has(id)) ||
      (target.kind === 'document' && g.sourceIds.length === 0),
  );
  const affectedComponentIds = [
    ...new Set([...sourceComponentIds, ...affectedGroups.map((g) => g.componentId)]),
  ];
  const reviewComponentIds = [
    ...new Set(
      affectedGroups
        .filter((g) => g.result.status !== 'compatible' || g.result.reasons.length > 0)
        .map((g) => g.componentId),
    ),
  ];
  const terminalChanges: string[] = [];
  if (
    previous &&
    (previous.model.kind === 'dc') !== (profile.model.kind === 'dc') &&
    target.kind === 'document'
  ) {
    for (const c of circuit.components.filter((c) => sourceComponentIds.includes(c.id))) {
      const line = sourceInterface(c.type) === 'line-alias';
      terminalChanges.push(
        `${c.state.autoLabel ?? c.id}: ${line ? 'L / positive (+)' : 'N / negative (−)'} uses the same terminal; ${profile.model.kind === 'dc' ? 'DC polarity' : 'AC line/neutral'} applies.`,
      );
    }
    terminalChanges.push('PE remains protective earth. No PE terminal becomes a power return.');
  }
  return {
    status: reason ? 'blocked' : next === circuit ? 'unchanged' : 'ready',
    reason,
    target,
    targetLabel:
      target.kind === 'document'
        ? 'Document supply (L/N aliases)'
        : `${COMPONENT_DEFS[component?.type ?? '']?.label ?? 'Source'} · ${component?.id ?? target.componentId}`,
    previous,
    profile,
    circuit: next,
    sourceComponentIds,
    independentSourceIds: circuit.components
      .filter((c) => {
        const kind = sourceInterface(c.type);
        return (kind === 'ac-source' || kind === 'dc-source') && !sourceComponentIds.includes(c.id);
      })
      .map((c) => c.id),
    affectedComponentIds,
    reviewComponentIds,
    terminalChanges,
    readiness,
  };
}
