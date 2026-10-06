/** Event-driven resistive-coil teaching model. No wall clock, document mutation or access policy. */
import { compileCircuit } from './compile';
import type {
  CompileOptions,
  CompileResult,
  ControlOperatingPoint,
  ElectricalControlEvent,
  ElectricalSimulationResult,
  ElectricalSimulationState,
} from './contracts';
import { ELECTRICAL_MODEL_VERSION } from './contracts';
import { CONTROL_STEP_LIMITS } from './controlLimits';
import { configurationKey, finite, time, validState } from './controlState';
export { CONTROL_STEP_LIMITS } from './controlLimits';
import { damageTargetKey } from './damageModel';
import { damageSubjects, evaluateDamage } from './damageStep';
import { solveControlledOperatingPoint } from './dimming';
import { circuitExcitation } from './excitation';
import { compareIds } from './faultTopology';
import { solveCompiledCircuit } from './mna';
import { evaluateProtection } from './protectionStep';
import { evaluateTimers } from './timerStep';

export const CONTROL_ENGINE_VERSION = 'mna-controls-4' as const;
type Compiled = Extract<CompileResult, { status: 'compiled' }>;
export interface ControlStepOptions extends CompileOptions {
  simulationState?: ElectricalSimulationState;
  deltaSeconds?: number;
}
export interface ControlStepResult {
  compiled: CompileResult;
  electrical: ElectricalSimulationResult;
  simulationState?: ElectricalSimulationState;
  simulationEvents: ElectricalControlEvent[];
}

/** Private graph-bearing result lets the app project the FINAL topology without a second solve. */
export function advanceControlStep(
  initial: Compiled,
  options: ControlStepOptions = {},
): ControlStepResult {
  const fail = (
    code: string,
    message: string,
    status: 'invalid' | 'nonconverged' | 'unsupported' = 'invalid',
  ): ControlStepResult => {
    const compiled: CompileResult = {
      status: 'invalid',
      contractVersion: initial.contractVersion,
      modelVersion: initial.modelVersion,
      diagnostics: [{ code, severity: 'error', message }],
    };
    const electrical = solveCompiledCircuit(compiled, options);
    electrical.status = status;
    electrical.engineVersion = CONTROL_ENGINE_VERSION;
    return { compiled, electrical, simulationEvents: [] };
  };
  const delta = options.deltaSeconds === undefined ? 0 : options.deltaSeconds;
  if (!finite(delta, 0, CONTROL_STEP_LIMITS.maxDeltaSeconds))
    return fail(
      'invalid-simulation-step',
      'Simulation delta must be finite and between 0 and 3600 seconds.',
    );
  const controlled = initial.graph.devices.filter(
    (d) => d.model.kind === 'contacts' && (d.model.coilModel || d.model.timerModel),
  );
  const ids = controlled.map((d) => d.componentId);
  const timerIds = controlled
    .filter((d) => d.model.kind === 'contacts' && d.model.timerModel?.kind === 'interval')
    .map((d) => d.componentId);
  const protectedIds = initial.graph.devices
    .filter((d) => d.model.kind === 'contacts' && d.model.protectionModel)
    .map((d) => d.componentId);
  const key = configurationKey(initial);
  const damage = damageSubjects(initial);
  const previous = options.simulationState;
  if (previous !== undefined && !validState(previous, key, ids, timerIds, protectedIds, damage))
    return fail(
      'invalid-simulation-state',
      'Simulation state is invalid, obsolete or belongs to another circuit configuration. Reset before continuing.',
    );
  const state: ElectricalSimulationState = previous
    ? {
        ...previous,
        contactStates: Object.fromEntries(ids.map((id) => [id, previous.contactStates[id]!])),
        pending: Object.fromEntries(
          ids.flatMap((id) => {
            const p = previous.pending[id];
            return p ? [[id, { closed: p.closed, atSeconds: p.atSeconds }]] : [];
          }),
        ),
        timers: Object.fromEntries(timerIds.map((id) => [id, { ...previous.timers[id]! }])),
        protection: Object.fromEntries(
          protectedIds.map((id) => [id, { ...previous.protection[id]! }]),
        ),
        damage: Object.fromEntries(
          damage.map(({ target }) => {
            const key = damageTargetKey(target);
            return [key, { ...previous.damage[key]! }];
          }),
        ),
      }
    : {
        version: 1,
        modelVersion: ELECTRICAL_MODEL_VERSION,
        configurationKey: key,
        elapsedSeconds: 0,
        eventSequence: 0,
        contactStates: Object.fromEntries(ids.map((id) => [id, false])),
        pending: {},
        damage: Object.fromEntries(
          damage.map(({ target, alreadyDamaged }) => [
            damageTargetKey(target),
            {
              exposure: 0,
              damaged: alreadyDamaged,
              damagedAtSeconds: null,
              lastEvaluatedSeconds: 0,
              rate: 0,
            },
          ]),
        ),
        timers: Object.fromEntries(
          timerIds.map((id) => [id, { inputHigh: false, deadlineSeconds: null }]),
        ),
        protection: Object.fromEntries(
          protectedIds.map((id) => [
            id,
            {
              heat: 0,
              tripped: false,
              reason: null,
              trippedAtSeconds: null,
              residualSinceSeconds: null,
              lastEvaluatedSeconds: 0,
            },
          ]),
        ),
      };
  const end = time(state.elapsedSeconds + delta);
  if (!finite(end, 0, CONTROL_STEP_LIMITS.maxElapsedSeconds))
    return fail(
      'invalid-simulation-step',
      'The simulation time limit has been reached; reset before continuing.',
    );
  const events: ElectricalControlEvent[] = [];
  const seen = new Set<string>();
  for (let iteration = 0; iteration < CONTROL_STEP_LIMITS.maxSolves; iteration++) {
    const compileOptions = {
      defs: options.defs,
      contactStates: new Map(Object.entries(state.contactStates)),
      trippedComponents: new Set(protectedIds.filter((id) => state.protection[id]?.tripped)),
      damagedComponents: new Set(
        damage
          .filter(
            ({ target }) =>
              target.type === 'component' && state.damage[damageTargetKey(target)]?.damaged,
          )
          .map(({ target }) => target.id),
      ),
      damagedWires: new Set(
        damage
          .filter(
            ({ target }) =>
              target.type === 'wire' && state.damage[damageTargetKey(target)]?.damaged,
          )
          .map(({ target }) => target.id),
      ),
    };
    const point = solveControlledOperatingPoint(
      compileCircuit(initial.circuit, compileOptions),
      compileOptions,
    );
    const { compiled, electrical } = point;
    electrical.engineVersion = CONTROL_ENGINE_VERSION;
    if (compiled.status !== 'compiled') return { compiled, electrical, simulationEvents: [] };
    const unpowered =
      electrical.status === 'not-solved' &&
      electrical.diagnostics.some((d) => d.code === 'mna-no-source');
    if (electrical.status !== 'converged' && !unpowered)
      return { compiled, electrical, simulationEvents: [] };
    const signature = JSON.stringify([
      state.elapsedSeconds,
      state.contactStates,
      state.timers,
      state.protection,
      state.damage,
    ]);
    if (seen.has(signature))
      return fail(
        'control-feedback-unstable',
        'Control feedback cannot settle at this simulated time. No accepted operating point is available.',
        'nonconverged',
      );
    seen.add(signature);
    const excitation = circuitExcitation(compiled.graph);
    const controls: ControlOperatingPoint[] = [];
    for (const { componentId, model } of controlled) {
      if (model.kind !== 'contacts' || !model.coilModel) continue;
      const coil = model.coilModel;
      const branchId = JSON.stringify(['device', componentId, 'coil']);
      const sourceIds = excitation.sourcesByBranch.get(branchId) ?? [];
      if (
        sourceIds.some((id) => {
          const supply = compiled.graph.sources.find((s) => s.id === id)?.model;
          return (
            supply &&
            (supply.kind !== coil.supply.kind ||
              (supply.kind === 'ac-single-phase' &&
                coil.supply.kind === 'ac-single-phase' &&
                supply.frequencyHz !== coil.supply.frequencyHz))
          );
        })
      )
        return fail(
          'control-supply-unsupported',
          `Coil ${componentId} is connected to a waveform or frequency outside its declared model.`,
          'unsupported',
        );
      const voltage = electrical.branchVoltages[branchId] ?? null;
      const current = electrical.branchCurrents[branchId] ?? null;
      const power = electrical.branchPowers[branchId] ?? null;
      const instance = compiled.circuit.components.find((c) => c.id === componentId)!;
      const coilBranch = compiled.graph.branches.find((b) => b.id === branchId)!;
      const forced = !!(instance.state.isBlown || instance.state.isTripped);
      if (!unpowered && coilBranch.closed && voltage === null)
        return fail(
          'control-voltage-unavailable',
          `Coil ${componentId} has no accepted terminal-pair voltage.`,
          'unsupported',
        );
      const volts = Math.abs(voltage ?? 0);
      const wasClosed = state.contactStates[componentId]!;
      const desired =
        !forced &&
        coilBranch.closed &&
        !unpowered &&
        (wasClosed
          ? volts > coil.supply.voltage * coil.dropoutRatio
          : volts >= coil.supply.voltage * coil.pickupRatio);
      if (desired === wasClosed) delete state.pending[componentId];
      else if (!state.pending[componentId] || forced)
        state.pending[componentId] = {
          closed: desired,
          atSeconds: time(
            state.elapsedSeconds +
              (forced ? 0 : desired ? coil.onDelaySeconds : coil.offDelaySeconds),
          ),
        };
      controls.push({
        componentId,
        closed: wasClosed,
        coilVoltageVolts: voltage,
        coilCurrentAmps: current,
        coilPowerWatts: power,
        pending: state.pending[componentId] ?? null,
      });
    }
    const timers = evaluateTimers(compiled, electrical, state);
    if (timers.error) return fail(timers.error.code, timers.error.message, 'unsupported');
    const protection = evaluateProtection(compiled, electrical, state);
    if (protection.error)
      return fail(protection.error.code, protection.error.message, 'unsupported');
    const damageStep = evaluateDamage(compiled, electrical, state);
    if (damageStep.error)
      return fail(damageStep.error.code, damageStep.error.message, 'unsupported');
    const due = Object.entries(state.pending)
      .filter(([, p]) => p.atSeconds <= state.elapsedSeconds)
      .sort(([a], [b]) => compareIds(a, b));
    if (
      due.length ||
      timers.retriggers.length ||
      protection.dueEvents.size ||
      damageStep.events.length
    ) {
      if (
        events.length +
          due.length +
          timers.retriggers.length +
          protection.dueEvents.size +
          damageStep.events.length >
          CONTROL_STEP_LIMITS.maxEvents ||
        state.eventSequence +
          due.length +
          timers.retriggers.length +
          protection.dueEvents.size +
          damageStep.events.length >
          10_000_000
      )
        return fail(
          'control-event-limit',
          'Control event limit reached. Shorten the step or repair cycling feedback.',
          'nonconverged',
        );
      const instantaneous: ElectricalControlEvent[] = [
        ...timers.retriggers.map((event) => ({ ...event, sequence: 0 })),
        ...[...protection.dueEvents.values()].map((event) => ({ ...event, sequence: 0 })),
        ...damageStep.events.map((event) => ({ ...event, sequence: 0 })),
      ];
      for (const [id, pending] of due) {
        const timerEvent = timers.dueEvents.get(id);
        const measured = controls.find((c) => c.componentId === id);
        if (timerEvent) instantaneous.push({ ...timerEvent, sequence: 0 });
        else if (measured)
          instantaneous.push({
            sequence: 0,
            atSeconds: state.elapsedSeconds,
            componentId: id,
            type: pending.closed ? 'coil-pickup' : 'coil-dropout',
            coilVoltageVolts: measured.coilVoltageVolts,
            coilCurrentAmps: measured.coilCurrentAmps,
            coilPowerWatts: measured.coilPowerWatts,
          });
        state.contactStates[id] = pending.closed;
        delete state.pending[id];
      }
      const eventId = (event: ElectricalControlEvent) =>
        event.type === 'damage' ? event.target.id : event.componentId;
      for (const event of instantaneous.sort(
        (a, b) => compareIds(eventId(a), eventId(b)) || compareIds(a.type, b.type),
      ))
        events.push({ ...event, sequence: ++state.eventSequence });
      if (due.length || protection.dueEvents.size || damageStep.events.length) continue; // Solve the changed topology at the same instant.
    }
    const protectionNext = Math.min(
      ...protection.readings.flatMap((reading: (typeof protection.readings)[number]) =>
        reading.pending ? [reading.pending.atSeconds] : [],
      ),
    );
    const next = Math.min(
      ...Object.values(state.pending).map((p) => p.atSeconds),
      protectionNext,
      ...damageStep.readings.flatMap((reading) =>
        reading.pendingAtSeconds === null ? [] : [reading.pendingAtSeconds],
      ),
    );
    if (next <= end) {
      state.elapsedSeconds = next;
      continue;
    }
    // Finish integration at the requested boundary before accepting new inputs.
    // Otherwise an input edit would apply the new current to the preceding interval.
    if (state.elapsedSeconds < end) {
      state.elapsedSeconds = end;
      continue;
    }
    electrical.controls = controls;
    electrical.timers = timers.readings;
    electrical.protection = protection.readings;
    electrical.damage = damageStep.readings;
    return { compiled, electrical, simulationState: state, simulationEvents: events };
  }
  return fail(
    'control-settle-limit',
    'Control solve limit reached. No accepted operating point is available.',
    'nonconverged',
  );
}
