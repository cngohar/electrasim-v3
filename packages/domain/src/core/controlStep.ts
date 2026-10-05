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
import { circuitExcitation } from './excitation';
import { compareIds } from './faultTopology';
import { solveCompiledCircuit } from './mna';

export const CONTROL_ENGINE_VERSION = 'mna-controls-1' as const;
export const CONTROL_STEP_LIMITS = {
  timeResolutionSeconds: 0.000001,
  maxDeltaSeconds: 3600,
  maxElapsedSeconds: 31_536_000,
  maxEvents: 128,
  maxSolves: 256,
} as const;

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

/** Geometry, manual switching and runtime faults do not change model identity. */
function configurationKey(compiled: Compiled): string {
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
      })),
  });
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
const finite = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const time = (seconds: number) => Math.round(seconds * 1_000_000) / 1_000_000;

function validState(raw: unknown, key: string, ids: string[]): raw is ElectricalSimulationState {
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
        ].includes(key),
    ) ||
    raw.version !== 1 ||
    raw.modelVersion !== ELECTRICAL_MODEL_VERSION ||
    raw.configurationKey !== key ||
    !finite(raw.elapsedSeconds, 0, CONTROL_STEP_LIMITS.maxElapsedSeconds) ||
    !Number.isSafeInteger(raw.eventSequence) ||
    !finite(raw.eventSequence, 0, 10_000_000) ||
    !record(raw.contactStates) ||
    !record(raw.pending)
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
        (raw.elapsedSeconds as number) + CONTROL_STEP_LIMITS.maxDeltaSeconds,
      ),
  );
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
    (d) => d.model.kind === 'contacts' && d.model.coilModel,
  );
  const ids = controlled.map((d) => d.componentId);
  const key = configurationKey(initial);
  const previous = options.simulationState;
  if (previous !== undefined && !validState(previous, key, ids))
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
      }
    : {
        version: 1,
        modelVersion: ELECTRICAL_MODEL_VERSION,
        configurationKey: key,
        elapsedSeconds: 0,
        eventSequence: 0,
        contactStates: Object.fromEntries(ids.map((id) => [id, false])),
        pending: {},
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
    };
    const compiled = compileCircuit(initial.circuit, compileOptions);
    const electrical = solveCompiledCircuit(compiled, compileOptions);
    electrical.engineVersion = CONTROL_ENGINE_VERSION;
    if (compiled.status !== 'compiled') return { compiled, electrical, simulationEvents: [] };
    const unpowered =
      electrical.status === 'not-solved' &&
      electrical.diagnostics.some((d) => d.code === 'mna-no-source');
    if (electrical.status !== 'converged' && !unpowered)
      return { compiled, electrical, simulationEvents: [] };
    const signature = JSON.stringify([state.elapsedSeconds, state.contactStates]);
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
    const due = Object.entries(state.pending)
      .filter(([, p]) => p.atSeconds <= state.elapsedSeconds)
      .sort(([a], [b]) => compareIds(a, b));
    if (due.length) {
      if (
        events.length + due.length > CONTROL_STEP_LIMITS.maxEvents ||
        state.eventSequence + due.length > 10_000_000
      )
        return fail(
          'control-event-limit',
          'Control event limit reached. Shorten the step or repair cycling feedback.',
          'nonconverged',
        );
      for (const [id, pending] of due) {
        const measured = controls.find((c) => c.componentId === id)!;
        events.push({
          sequence: ++state.eventSequence,
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
      continue; // Solve the changed contact topology at the same instant.
    }
    const next = Math.min(...Object.values(state.pending).map((p) => p.atSeconds));
    if (next <= end) {
      state.elapsedSeconds = next;
      continue;
    }
    state.elapsedSeconds = end;
    electrical.controls = controls;
    return { compiled, electrical, simulationState: state, simulationEvents: events };
  }
  return fail(
    'control-settle-limit',
    'Control solve limit reached. No accepted operating point is available.',
    'nonconverged',
  );
}
