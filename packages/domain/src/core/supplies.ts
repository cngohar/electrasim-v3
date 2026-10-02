import type { Circuit, ComponentState } from '../types';
import type { SupplyModel } from './contracts';

export const SUPPLY_PROFILE_VERSION = 1 as const;
export const DOCUMENT_SUPPLY_ID = 'legacy-mains';
export const LEGACY_SUPPLY_DEFAULTS = { voltage: 230, frequencyHz: 50 } as const;

export type SupplyValueOrigin =
  | 'explicit'
  | 'legacy-document'
  | 'legacy-instance'
  | 'legacy-assumption'
  | 'catalogue';

/** Persisted source settings, independent of standards selection and device ratings.
 * Source identity is the document alias group or the source component's canonical ID.
 * AC voltage is RMS L-N, including the reserved three-phase profile (not L-L).
 */
export interface SupplyProfile {
  version: typeof SUPPLY_PROFILE_VERSION;
  model: SupplyModel;
  provenance: { voltage: SupplyValueOrigin; frequency?: SupplyValueOrigin };
}

export const SOURCE_INTERFACES = {
  'live-terminal': 'line-alias',
  'neutral-terminal': 'neutral-alias',
  'ac-mains-supply': 'ac-source',
  'diesel-generator': 'ac-source',
  'dc-battery-12v': 'dc-source',
} as const;

export function sourceInterface(
  type: string,
): (typeof SOURCE_INTERFACES)[keyof typeof SOURCE_INTERFACES] | undefined {
  return Object.hasOwn(SOURCE_INTERFACES, type)
    ? SOURCE_INTERFACES[type as keyof typeof SOURCE_INTERFACES]
    : undefined;
}

export function sourceProfileFitsInterface(type: string, profile: SupplyProfile): boolean {
  const kind = sourceInterface(type);
  return (
    kind !== undefined &&
    !(kind === 'dc-source' && profile.model.kind !== 'dc') &&
    !(kind === 'ac-source' && profile.model.kind === 'dc')
  );
}

export function explicitSupplyProfile(model: SupplyModel): SupplyProfile {
  return {
    version: SUPPLY_PROFILE_VERSION,
    model: { ...model },
    provenance: {
      voltage: 'explicit',
      ...(model.kind === 'dc' ? {} : { frequency: 'explicit' as const }),
    },
  };
}

export function copySupplyProfile(profile: SupplyProfile): SupplyProfile {
  return {
    version: profile.version,
    model: { ...profile.model },
    provenance: { ...profile.provenance },
  };
}

export function withSupplyVoltage(profile: SupplyProfile, voltage: number): SupplyProfile {
  return {
    ...copySupplyProfile(profile),
    model: { ...profile.model, voltage },
    provenance: { ...profile.provenance, voltage: 'explicit' },
  };
}

/** Schema 1 did not persist frequency. Never infer it from today's standards view. */
export function resolveDocumentSupply(
  circuit: Pick<Circuit, 'supply' | 'globalVoltage'>,
): SupplyProfile {
  if (circuit.supply) return copySupplyProfile(circuit.supply);
  return {
    version: SUPPLY_PROFILE_VERSION,
    model: {
      kind: 'ac-single-phase',
      voltage: circuit.globalVoltage ?? LEGACY_SUPPLY_DEFAULTS.voltage,
      frequencyHz: LEGACY_SUPPLY_DEFAULTS.frequencyHz,
    },
    provenance: {
      voltage: circuit.globalVoltage === undefined ? 'legacy-assumption' : 'legacy-document',
      frequency: 'legacy-assumption',
    },
  };
}

/** Freeze independent legacy sources at migration/placement, before a document edit.
 * Alias overrides remain representable so contradictory old sources are diagnosed,
 * never silently selected or repaired by migration.
 */
export function resolveSourceProfile(
  type: string,
  state: ComponentState,
  circuit: Pick<Circuit, 'supply' | 'globalVoltage'>,
): SupplyProfile | undefined {
  if (!sourceInterface(type)) return undefined;
  if (state.sourceProfile) return copySupplyProfile(state.sourceProfile);
  if (type === 'dc-battery-12v')
    return {
      version: SUPPLY_PROFILE_VERSION,
      model: { kind: 'dc', voltage: state.customVoltage ?? 12 },
      provenance: { voltage: state.customVoltage === undefined ? 'catalogue' : 'legacy-instance' },
    };
  const document = resolveDocumentSupply(circuit);
  if ((type === 'ac-mains-supply' || type === 'diesel-generator') && document.model.kind === 'dc')
    return {
      version: SUPPLY_PROFILE_VERSION,
      model: { kind: 'ac-single-phase', voltage: state.customVoltage ?? 230, frequencyHz: 50 },
      provenance: {
        voltage: state.customVoltage === undefined ? 'catalogue' : 'legacy-instance',
        frequency: 'catalogue',
      },
    };
  if (state.customVoltage === undefined) return document;
  return {
    ...document,
    model: { ...document.model, voltage: state.customVoltage },
    provenance: { ...document.provenance, voltage: 'legacy-instance' },
  };
}

/** Power-source profiles only: a neutral/PE terminal is not a voltage generator.
 * One explicit live alias configures the alias group; contradictory explicit
 * aliases remain in this list for deterministic rejection/coverage diagnostics.
 */
export function configuredSupplySources(
  circuit: Circuit,
): { componentId: string; profile: SupplyProfile }[] {
  const aliases = circuit.components.filter((c) => sourceInterface(c.type) === 'line-alias');
  const explicitAliases = aliases.filter(
    (c) => c.state.sourceProfile || c.state.customVoltage !== undefined,
  );
  const independent = circuit.components.filter((c) => {
    const kind = sourceInterface(c.type);
    return kind === 'ac-source' || kind === 'dc-source';
  });
  return [...(explicitAliases.length ? explicitAliases : aliases), ...independent]
    .flatMap((component) => {
      const profile = resolveSourceProfile(component.type, component.state, circuit);
      return profile ? [{ componentId: component.id, profile }] : [];
    })
    .sort((a, b) => (a.componentId < b.componentId ? -1 : a.componentId > b.componentId ? 1 : 0));
}

export function sameSupplyModel(a: SupplyModel, b: SupplyModel): boolean {
  if (a.kind !== b.kind || a.voltage !== b.voltage) return false;
  if (a.kind === 'dc' || b.kind === 'dc') return true;
  return (
    a.frequencyHz === b.frequencyHz &&
    (a.kind !== 'ac-three-phase' || b.kind !== 'ac-three-phase' || a.sequence === b.sequence)
  );
}

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0.001 && value <= 100_000;
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function onlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

export function isSupplyModel(value: unknown): value is SupplyModel {
  if (!record(value) || !positive(value.voltage)) return false;
  if (value.kind === 'dc') return onlyKeys(value, ['kind', 'voltage']);
  if (!positive(value.frequencyHz)) return false;
  if (value.kind === 'ac-single-phase') return onlyKeys(value, ['kind', 'voltage', 'frequencyHz']);
  return (
    value.kind === 'ac-three-phase' &&
    (value.sequence === 'abc' || value.sequence === 'acb') &&
    onlyKeys(value, ['kind', 'voltage', 'frequencyHz', 'sequence'])
  );
}

export function isSupplyProfile(value: unknown): value is SupplyProfile {
  if (
    !record(value) ||
    value.version !== SUPPLY_PROFILE_VERSION ||
    !onlyKeys(value, ['version', 'model', 'provenance']) ||
    !isSupplyModel(value.model) ||
    !record(value.provenance)
  )
    return false;
  const origins: unknown[] = [
    'explicit',
    'legacy-document',
    'legacy-instance',
    'legacy-assumption',
    'catalogue',
  ];
  return (
    onlyKeys(value.provenance, ['voltage', 'frequency']) &&
    origins.includes(value.provenance.voltage) &&
    (value.model.kind === 'dc'
      ? value.provenance.frequency === undefined
      : origins.includes(value.provenance.frequency))
  );
}

/** Pure transaction primitive. UI confirmation/authorization is owned by the editor.
 * Freeze missing independent profiles before changing only the named document supply.
 * Does not clear faults, trips, damage, wires or a load's design/nameplate fields.
 */
export function withDocumentSupply(circuit: Circuit, profile: SupplyProfile): Circuit {
  if (!isSupplyProfile(profile)) throw new Error('Invalid supply profile.');
  const previous = resolveDocumentSupply(circuit);
  const aliases = circuit.components.filter((c) => {
    const kind = sourceInterface(c.type);
    return kind === 'line-alias' || kind === 'neutral-alias';
  });
  if (
    sameSupplyModel(previous.model, profile.model) &&
    aliases.every((c) => {
      const source = resolveSourceProfile(c.type, c.state, circuit);
      return source && sameSupplyModel(source.model, profile.model);
    })
  )
    return circuit;
  return {
    ...circuit,
    supply: copySupplyProfile(profile),
    globalVoltage: profile.model.voltage,
    components: circuit.components.map((component) => {
      const kind = sourceInterface(component.type);
      if (!kind) return component;
      const alias = kind === 'line-alias' || kind === 'neutral-alias';
      const sourceProfile = alias
        ? copySupplyProfile(profile)
        : resolveSourceProfile(component.type, component.state, circuit);
      return {
        ...component,
        state: {
          ...component.state,
          sourceProfile,
          ...(alias ? { customVoltage: profile.model.voltage } : {}),
        },
      };
    }),
  };
}
