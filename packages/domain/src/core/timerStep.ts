import type {
  CompileResult,
  ElectricalDiagnostic,
  ElectricalSimulationResult,
  ElectricalSimulationState,
  TimerControlEvent,
  TimerOperatingPoint,
} from './contracts';
import { circuitExcitation } from './excitation';
import { scheduleAt } from './timerModel';

type TimerEvent = Omit<TimerControlEvent, 'sequence'>;
const time = (seconds: number) => Math.round(seconds * 1_000_000) / 1_000_000;

/** Updates transient latches/deadlines only. Contact changes are applied together
 * with coil events by the shared step, then MNA solves the resulting topology. */
export function evaluateTimers(
  compiled: Extract<CompileResult, { status: 'compiled' }>,
  electrical: ElectricalSimulationResult,
  state: ElectricalSimulationState,
): {
  readings: TimerOperatingPoint[];
  dueEvents: Map<string, TimerEvent>;
  retriggers: TimerEvent[];
  error?: ElectricalDiagnostic;
} {
  const readings: TimerOperatingPoint[] = [];
  const dueEvents = new Map<string, TimerEvent>();
  const retriggers: TimerEvent[] = [];
  const excitation = circuitExcitation(compiled.graph);
  for (const { componentId, model } of compiled.graph.devices) {
    if (model.kind !== 'contacts' || !model.timerModel) continue;
    const timer = model.timerModel;
    const component = compiled.circuit.components.find((c) => c.id === componentId)!;
    const supply = timer.kind === 'interval' ? timer.controlSupply : undefined;
    const branchId = JSON.stringify(['device', componentId, 'control-supply']);
    const branch = compiled.graph.branches.find((b) => b.id === branchId);
    const voltage = electrical.branchVoltages[branchId] ?? null;
    const current = electrical.branchCurrents[branchId] ?? null;
    const power = electrical.branchPowers[branchId] ?? null;
    const sources = excitation.sourcesByBranch.get(branchId) ?? [];
    if (
      supply &&
      sources.some((id) => {
        const source = compiled.graph.sources.find((s) => s.id === id)?.model;
        return (
          source &&
          (source.kind !== supply.supply.kind ||
            (source.kind === 'ac-single-phase' &&
              supply.supply.kind === 'ac-single-phase' &&
              source.frequencyHz !== supply.supply.frequencyHz))
        );
      })
    )
      return {
        readings: [],
        dueEvents,
        retriggers: [],
        error: {
          code: 'timer-supply-unsupported',
          severity: 'error',
          componentId,
          message: 'Timer electronics require their declared waveform and frequency.',
        },
      };
    const forced = !!(component.state.isBlown || component.state.isTripped);
    const powered =
      !forced &&
      (!supply ||
        (!!branch?.closed &&
          voltage !== null &&
          Math.abs(voltage) >= supply.supply.voltage * supply.minimumVoltageRatio));
    const closed = state.contactStates[componentId]!;
    let desired = false;
    let next: number | null = null;
    let reason: TimerControlEvent['reason'] = 'power-loss';
    if (timer.kind === 'schedule') {
      const enabled = powered && component.state.on === true;
      const schedule = scheduleAt(timer, state.elapsedSeconds);
      desired = enabled && schedule.closed;
      next = enabled ? schedule.nextSeconds : null;
      reason = enabled ? 'schedule' : 'disabled';
    } else {
      const runtime = state.timers[componentId]!;
      const high = component.state.on === true;
      const rising = high && !runtime.inputHigh;
      runtime.inputHigh = high;
      if (!powered) runtime.deadlineSeconds = null;
      else if (rising && (runtime.deadlineSeconds === null || timer.retrigger === 'restart')) {
        if (
          closed &&
          runtime.deadlineSeconds !== null &&
          runtime.deadlineSeconds > state.elapsedSeconds
        )
          retriggers.push({
            componentId,
            atSeconds: state.elapsedSeconds,
            type: 'timer-retrigger',
            reason: 'trigger',
            contactCurrentAmps:
              electrical.branchCurrents[JSON.stringify(['device', componentId, 'contact:0:no'])] ??
              null,
          });
        runtime.deadlineSeconds = time(state.elapsedSeconds + timer.durationSeconds);
      }
      if (runtime.deadlineSeconds !== null && runtime.deadlineSeconds <= state.elapsedSeconds)
        runtime.deadlineSeconds = null;
      desired = powered && runtime.deadlineSeconds !== null;
      next = runtime.deadlineSeconds;
      reason = !powered ? 'power-loss' : desired ? 'trigger' : 'expiry';
    }
    delete state.pending[componentId];
    if (desired !== closed) {
      state.pending[componentId] = { closed: desired, atSeconds: state.elapsedSeconds };
      dueEvents.set(componentId, {
        componentId,
        atSeconds: state.elapsedSeconds,
        type: desired ? 'timer-on' : 'timer-off',
        reason,
        contactCurrentAmps:
          electrical.branchCurrents[JSON.stringify(['device', componentId, 'contact:0:no'])] ??
          null,
      });
    } else if (next !== null) state.pending[componentId] = { closed: !closed, atSeconds: next };
    readings.push({
      componentId,
      kind: timer.kind,
      closed,
      clock: supply ? 'declared-supply' : 'external',
      powered,
      controlVoltageVolts: voltage,
      controlCurrentAmps: current,
      controlPowerWatts: power,
      pending: state.pending[componentId] ?? null,
    });
  }
  return { readings, dueEvents, retriggers };
}
