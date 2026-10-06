import type { CompileResult, ElectricalSimulationState } from './contracts';
import { ELECTRICAL_MODEL_VERSION } from './contracts';
import { CONTROL_STEP_LIMITS } from './controlLimits';
import { damageBudget, damageTargetKey } from './damageModel';
import type { DamageSubject } from './damageStep';
import { compareIds } from './faultTopology';
type Compiled = Extract<CompileResult, { status: 'compiled' }>;

/** Geometry, manual switching and runtime faults do not change model identity. */
export function configurationKey(compiled: Compiled): string {
  const wireProperties = new Map(
    compiled.graph.branches.filter((b) => b.wireId).map((b) => [b.wireId, b.wire]),
  );
  return JSON.stringify({
    devices: compiled.graph.devices,
    wires: [...compiled.circuit.wires]
      .sort((a, b) => compareIds(a.id, b.id))
      .map((w) => ({
        id: w.id,
        from: [w.fromComponentId, w.fromPortIndex],
        to: [w.toComponentId, w.toPortIndex],
        properties: wireProperties.get(w.id),
        damageModel: w.damageModel,
      })),
  });
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
export const finite = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
export const time = (seconds: number) => Math.round(seconds * 1_000_000) / 1_000_000;

export function validState(
  raw: unknown,
  key: string,
  ids: string[],
  timerIds: string[],
  protectionIds: string[],
  damage: DamageSubject[],
): raw is ElectricalSimulationState {
  if (
    !record(raw) ||
    Object.keys(raw).some(
      (key) =>
        ![
          'version',
          'modelVersion',
          'configurationKey',
          'elapsedSeconds',
          'contactStates',
          'pending',
          'eventSequence',
          'timers',
          'protection',
          'damage',
        ].includes(key),
    ) ||
    raw.version !== 1 ||
    raw.modelVersion !== ELECTRICAL_MODEL_VERSION ||
    raw.configurationKey !== key ||
    !finite(raw.elapsedSeconds, 0, CONTROL_STEP_LIMITS.maxElapsedSeconds) ||
    !Number.isSafeInteger(raw.eventSequence) ||
    !finite(raw.eventSequence, 0, 10_000_000) ||
    !record(raw.contactStates) ||
    !record(raw.pending) ||
    !record(raw.timers) ||
    !record(raw.protection) ||
    !record(raw.damage)
  )
    return false;
  const damageState = raw.damage;
  if (
    Object.keys(damageState).length !== damage.length ||
    damage.some(({ target, model }) => {
      const runtime = damageState[damageTargetKey(target)];
      return (
        !record(runtime) ||
        Object.keys(runtime).some(
          (key) =>
            !['exposure', 'damaged', 'damagedAtSeconds', 'lastEvaluatedSeconds', 'rate'].includes(
              key,
            ),
        ) ||
        !finite(runtime.exposure, 0, damageBudget(model)) ||
        typeof runtime.damaged !== 'boolean' ||
        (runtime.damagedAtSeconds !== null &&
          (!runtime.damaged ||
            !finite(runtime.damagedAtSeconds, 0, raw.elapsedSeconds as number))) ||
        !finite(runtime.lastEvaluatedSeconds, 0, raw.elapsedSeconds as number) ||
        !finite(runtime.rate, 0, 1e30) ||
        (runtime.damaged && runtime.rate !== 0)
      );
    })
  )
    return false;
  const protection = raw.protection;
  if (
    Object.keys(protection).length !== protectionIds.length ||
    protectionIds.some((id) => {
      const runtime = protection[id];
      return (
        !Object.hasOwn(protection, id) ||
        !record(runtime) ||
        Object.keys(runtime).some(
          (key) =>
            ![
              'heat',
              'tripped',
              'reason',
              'trippedAtSeconds',
              'residualSinceSeconds',
              'lastEvaluatedSeconds',
            ].includes(key),
        ) ||
        !finite(runtime.heat, 0, 10_000_000) ||
        typeof runtime.tripped !== 'boolean' ||
        (runtime.reason !== null &&
          !['overload', 'short-circuit', 'residual'].includes(runtime.reason as string)) ||
        (runtime.trippedAtSeconds !== null &&
          !finite(runtime.trippedAtSeconds, 0, CONTROL_STEP_LIMITS.maxElapsedSeconds)) ||
        (runtime.residualSinceSeconds !== null &&
          !finite(
            runtime.residualSinceSeconds,
            Math.max(0, (raw.elapsedSeconds as number) - 86_400),
            raw.elapsedSeconds as number,
          )) ||
        !finite(runtime.lastEvaluatedSeconds, 0, raw.elapsedSeconds as number)
      );
    })
  )
    return false;
  const timers = raw.timers;
  if (
    Object.keys(timers).length !== timerIds.length ||
    timerIds.some((id) => {
      const timer = timers[id];
      return (
        !Object.hasOwn(timers, id) ||
        !record(timer) ||
        Object.keys(timer).some((key) => !['inputHigh', 'deadlineSeconds'].includes(key)) ||
        typeof timer.inputHigh !== 'boolean' ||
        (timer.deadlineSeconds !== null &&
          !finite(
            timer.deadlineSeconds,
            raw.elapsedSeconds as number,
            (raw.elapsedSeconds as number) + 86_400,
          ))
      );
    })
  )
    return false;
  const contacts = raw.contactStates;
  if (
    Object.keys(contacts).length !== ids.length ||
    ids.some((id) => !Object.hasOwn(contacts, id) || typeof contacts[id] !== 'boolean')
  )
    return false;
  return Object.entries(raw.pending).every(
    ([id, pending]) =>
      ids.includes(id) &&
      record(pending) &&
      typeof pending.closed === 'boolean' &&
      pending.closed !== contacts[id] &&
      finite(
        pending.atSeconds,
        raw.elapsedSeconds as number,
        (raw.elapsedSeconds as number) + 604_800,
      ),
  );
}
