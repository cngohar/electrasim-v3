import { COMPONENT_ACCESS_BASELINE, type OriginalComponentTier } from './component-baseline';

export type ComponentAccess = 'free' | 'pro';
export interface EffectiveComponentPolicy {
  readonly schemaVersion: 1;
  readonly classificationVersion: 1;
  readonly revision: number;
  readonly components: readonly Readonly<{ id: string; access: ComponentAccess }>[];
}

declare const validatedPolicy: unique symbol;
/** Validation establishes shape, not authority or freshness. Servers must read their own policy. */
export type ValidatedComponentPolicy = EffectiveComponentPolicy & {
  readonly [validatedPolicy]: true;
};

const originalTiers = new Map<string, OriginalComponentTier>(
  COMPONENT_ACCESS_BASELINE.map(({ id, originalTier }) => [id, originalTier]),
);
// Keep runtime validation opaque as well: a cast or JSON roundtrip cannot forge a validated input.
const validated = new WeakMap<ValidatedComponentPolicy, ReadonlyMap<string, ComponentAccess>>();

function exactObject(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value)) &&
    Reflect.ownKeys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}
function invalid(): never {
  throw new Error('Invalid component access policy');
}

/** Copies and freezes a complete metadata-only snapshot; unknown/missing/duplicate IDs fail. */
export function validateComponentPolicy(input: unknown): ValidatedComponentPolicy {
  if (
    !exactObject(input, ['schemaVersion', 'classificationVersion', 'revision', 'components']) ||
    input.schemaVersion !== 1 ||
    input.classificationVersion !== 1 ||
    !Number.isSafeInteger(input.revision) ||
    (input.revision as number) < 0 ||
    !Array.isArray(input.components) ||
    input.components.length !== COMPONENT_ACCESS_BASELINE.length
  )
    return invalid();
  const accessById = new Map<string, ComponentAccess>();
  for (const entry of input.components) {
    if (
      !exactObject(entry, ['id', 'access']) ||
      typeof entry.id !== 'string' ||
      !originalTiers.has(entry.id) ||
      accessById.has(entry.id) ||
      (entry.access !== 'free' && entry.access !== 'pro') ||
      (originalTiers.get(entry.id) === 'basic' && entry.access !== 'free')
    )
      return invalid();
    accessById.set(entry.id, entry.access);
  }
  const result = Object.freeze({
    schemaVersion: 1 as const,
    classificationVersion: 1 as const,
    revision: input.revision as number,
    components: Object.freeze(
      COMPONENT_ACCESS_BASELINE.map(({ id }) => Object.freeze({ id, access: accessById.get(id)! })),
    ),
  }) as ValidatedComponentPolicy;
  validated.set(result, accessById);
  return result;
}

export function originalComponentTier(id: string): OriginalComponentTier {
  const tier = originalTiers.get(id);
  if (!tier) throw new Error(`Unknown component: ${id}`);
  return tier;
}

/** Missing/expired policy falls back to code-owned classification, preserving Basic offline. */
export function componentAccess(
  id: string,
  policy?: ValidatedComponentPolicy | null,
): ComponentAccess {
  const tier = originalComponentTier(id);
  if (policy == null) return tier === 'basic' ? 'free' : 'pro';
  const accessById = validated.get(policy);
  if (!accessById) return invalid();
  return accessById.get(id)!;
}

/** Originally Pro content always needs fresh action authorization, even while displayed Free. */
export function hasOriginallyProComponents(componentTypes: readonly string[]): boolean {
  // Validate every ID, including those after a Pro ID.
  return componentTypes.map(originalComponentTier).includes('pro');
}
