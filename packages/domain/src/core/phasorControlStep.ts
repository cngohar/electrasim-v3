/** Deterministic phasor coil controls. No scalar residual/protection substitution. */
import { compileCircuit } from './compile';
import {
  type CompileOptions,
  type CompileResult,
  ELECTRICAL_MODEL_VERSION,
  type ElectricalControlEvent,
  type ElectricalSimulationState,
} from './contracts';
import { CONTROL_STEP_LIMITS } from './controlLimits';
import { configurationKey, finite, time, validState } from './controlState';
import { compareIds } from './faultTopology';
import { phasorMagnitude, solveCompiledPhasorCircuit } from './phasor';
import type { PhasorControlReading } from './phasorMeasurements';

type Compiled = Extract<CompileResult, { status: 'compiled' }>;
interface PhasorStepOptions extends CompileOptions {
  simulationState?: ElectricalSimulationState;
  deltaSeconds?: number;
}

export function advancePhasorControlStep(initial: Compiled, options: PhasorStepOptions = {}) {
  const fail = (
    code: string,
    message: string,
    status: 'invalid' | 'unsupported' | 'nonconverged' = 'invalid',
  ) => {
    const compiled: CompileResult = {
      status: 'invalid',
      contractVersion: initial.contractVersion,
      modelVersion: initial.modelVersion,
      diagnostics: [{ code, severity: 'error', message }],
    };
    const phasor = solveCompiledPhasorCircuit(compiled, options);
    phasor.status = status;
    phasor.engineVersion = 'mna-phasor-controls-1';
    return {
      compiled,
      phasor,
      simulationEvents: [] as ElectricalControlEvent[],
      simulationState: undefined as ElectricalSimulationState | undefined,
    };
  };
  const controlled = initial.graph.devices.filter(
    (d) => d.model.kind === 'contacts' && d.model.coilModel,
  );
  const ids = controlled.map((d) => d.componentId);
  const delta = options.deltaSeconds === undefined ? 0 : options.deltaSeconds;
  if (!finite(delta, 0, CONTROL_STEP_LIMITS.maxDeltaSeconds))
    return fail(
      'invalid-simulation-step',
      'Simulation delta must be finite and between 0 and 3600 seconds.',
    );
  const key = configurationKey(initial);
  const previous = options.simulationState;
  if (previous !== undefined && !validState(previous, key, ids, [], [], []))
    return fail(
      'invalid-simulation-state',
      'Simulation state is invalid, obsolete or belongs to another configuration. Reset before continuing.',
    );
  const state: ElectricalSimulationState = previous
    ? {
        ...previous,
        contactStates: { ...previous.contactStates },
        pending: Object.fromEntries(
          Object.entries(previous.pending).map(([id, p]) => [id, { ...p }]),
        ),
        timers: {},
        protection: {},
        damage: {},
      }
    : {
        version: 1,
        modelVersion: ELECTRICAL_MODEL_VERSION,
        configurationKey: key,
        elapsedSeconds: 0,
        eventSequence: 0,
        contactStates: Object.fromEntries(ids.map((id) => [id, false])),
        pending: {},
        timers: {},
        protection: {},
        damage: {},
      };
  const end = time(state.elapsedSeconds + delta);
  if (!finite(end, 0, CONTROL_STEP_LIMITS.maxElapsedSeconds))
    return fail(
      'invalid-simulation-step',
      'Simulation time limit reached; reset before continuing.',
    );
  const events: ElectricalControlEvent[] = [];
  const seen = new Set<string>();
  for (let iteration = 0; iteration < CONTROL_STEP_LIMITS.maxSolves; iteration++) {
    const compileOptions = {
      defs: options.defs,
      contactStates: new Map(Object.entries(state.contactStates)),
    };
    const compiled = compileCircuit(initial.circuit, compileOptions);
    const phasor = solveCompiledPhasorCircuit(compiled, compileOptions);
    phasor.engineVersion = 'mna-phasor-controls-1';
    const unpowered =
      phasor.status === 'not-solved' && phasor.diagnostics.some((d) => d.code === 'mna-no-source');
    if (compiled.status !== 'compiled' || (phasor.status !== 'converged' && !unpowered))
      return {
        compiled,
        phasor,
        simulationEvents: [] as ElectricalControlEvent[],
        simulationState: undefined as ElectricalSimulationState | undefined,
      };
    const signature = JSON.stringify([state.elapsedSeconds, state.contactStates]);
    if (seen.has(signature))
      return fail(
        'control-feedback-unstable',
        'Coil feedback cannot settle at this simulated time.',
        'nonconverged',
      );
    seen.add(signature);
    const controls: PhasorControlReading[] = [];
    for (const { componentId, model } of controlled) {
      if (model.kind !== 'contacts' || !model.coilModel) continue;
      const coil = model.coilModel;
      const id = JSON.stringify(['device', componentId, 'coil']);
      const branch = compiled.graph.branches.find((b) => b.id === id)!;
      const domain = phasor.terminalDomains[branch.from];
      const reference = phasor.references.find((r) => r.domainId === domain);
      const sourceIds = reference?.sourceIds ?? [];
      if (
        sourceIds.length &&
        (coil.supply.kind !== 'ac-single-phase' ||
          reference?.frequencyHz !== coil.supply.frequencyHz)
      )
        return fail(
          'control-supply-unsupported',
          `Coil ${componentId} requires its declared AC waveform and frequency.`,
          'unsupported',
        );
      const voltage = phasor.branchVoltages[id] ?? null;
      const current = phasor.branchCurrents[id] ?? null;
      const instance = compiled.circuit.components.find((c) => c.id === componentId)!;
      const forced = !!(instance.state.isBlown || instance.state.isTripped);
      if (!unpowered && branch.closed && voltage === null)
        return fail(
          'control-voltage-unavailable',
          `Coil ${componentId} has no accepted terminal-pair voltage.`,
          'unsupported',
        );
      const volts = voltage ? phasorMagnitude(voltage) : 0;
      const closed = state.contactStates[componentId]!;
      const desired =
        !forced &&
        branch.closed &&
        sourceIds.length > 0 &&
        (closed
          ? volts > coil.supply.voltage * coil.dropoutRatio
          : volts >= coil.supply.voltage * coil.pickupRatio);
      if (desired === closed) delete state.pending[componentId];
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
        closed,
        coilVoltage: voltage,
        coilCurrent: current,
        coilPowerWatts: phasor.branchActivePowersWatts[id] ?? null,
        pending: state.pending[componentId] ?? null,
      });
    }
    const due = Object.entries(state.pending)
      .filter(([, p]) => p.atSeconds <= state.elapsedSeconds)
      .sort(([a], [b]) => compareIds(a, b));
    if (
      events.length + due.length > CONTROL_STEP_LIMITS.maxEvents ||
      state.eventSequence + due.length > 10_000_000
    )
      return fail(
        'control-event-limit',
        'Coil event limit reached; shorten the step or repair cycling feedback.',
        'nonconverged',
      );
    for (const [id, pending] of due) {
      const measured = controls.find((c) => c.componentId === id)!;
      events.push({
        sequence: ++state.eventSequence,
        atSeconds: state.elapsedSeconds,
        componentId: id,
        type: pending.closed ? 'coil-pickup' : 'coil-dropout',
        measurementConvention: 'complex-rms-magnitudes',
        coilVoltageVolts: measured.coilVoltage ? phasorMagnitude(measured.coilVoltage) : null,
        coilCurrentAmps: measured.coilCurrent ? phasorMagnitude(measured.coilCurrent) : null,
        coilPowerWatts: measured.coilPowerWatts,
      });
      state.contactStates[id] = pending.closed;
      delete state.pending[id];
    }
    if (due.length) continue;
    const next = Math.min(...Object.values(state.pending).map((p) => p.atSeconds));
    if (next <= end) {
      state.elapsedSeconds = next;
      continue;
    }
    if (state.elapsedSeconds < end) {
      state.elapsedSeconds = end;
      continue;
    }
    phasor.controls = controls;
    return { compiled, phasor, simulationState: state, simulationEvents: events };
  }
  return fail(
    'control-settle-limit',
    'Coil solve limit reached; no accepted operating point is available.',
    'nonconverged',
  );
}
