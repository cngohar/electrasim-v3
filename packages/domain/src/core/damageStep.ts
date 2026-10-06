import type {
  CompileResult,
  DamageEvent,
  DamageOperatingPoint,
  ElectricalDiagnostic,
  ElectricalSimulationResult,
  ElectricalSimulationState,
} from './contracts';
import {
  type DamageModel,
  type DamageTarget,
  damageBudget,
  damageTargetKey,
  damageThreshold,
} from './damageModel';
import { compareIds } from './faultTopology';

type Compiled = Extract<CompileResult, { status: 'compiled' }>;
export interface DamageSubject {
  target: DamageTarget;
  model: DamageModel;
  branchId: string;
  alreadyDamaged: boolean;
}

export function damageSubjects(compiled: Compiled): DamageSubject[] {
  return [
    ...compiled.graph.devices.flatMap((device): DamageSubject[] =>
      device.damageModel
        ? [
            {
              target: { type: 'component', id: device.componentId },
              model: device.damageModel,
              branchId: JSON.stringify(['device', device.componentId, 'load']),
              alreadyDamaged: !!compiled.circuit.components.find((c) => c.id === device.componentId)
                ?.state.isBlown,
            },
          ]
        : [],
    ),
    ...compiled.circuit.wires.flatMap((wire): DamageSubject[] =>
      wire.damageModel
        ? [
            {
              target: { type: 'wire', id: wire.id },
              model: wire.damageModel,
              branchId: JSON.stringify(['wire', wire.id]),
              alreadyDamaged: !!wire.isBusted,
            },
          ]
        : [],
    ),
  ].sort((a, b) => compareIds(damageTargetKey(a.target), damageTargetKey(b.target)));
}

const measured = (value: number | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/** Cumulative stress is piecewise constant between accepted topology/input events. */
export function evaluateDamage(
  compiled: Compiled,
  electrical: ElectricalSimulationResult,
  state: ElectricalSimulationState,
): {
  readings: DamageOperatingPoint[];
  events: Omit<DamageEvent, 'sequence'>[];
  error?: ElectricalDiagnostic;
} {
  const readings: DamageOperatingPoint[] = [];
  const events: Omit<DamageEvent, 'sequence'>[] = [];
  for (const subject of damageSubjects(compiled)) {
    const { target, model, branchId, alreadyDamaged } = subject;
    const runtime = state.damage[damageTargetKey(target)]!;
    const budget = damageBudget(model);
    const dt = Math.round((state.elapsedSeconds - runtime.lastEvaluatedSeconds) * 1e6) / 1e6;
    runtime.exposure = Math.min(budget, runtime.exposure + runtime.rate * dt);
    runtime.lastEvaluatedSeconds = state.elapsedSeconds;
    runtime.damaged ||= alreadyDamaged;
    const currentAmps = measured(electrical.branchCurrents[branchId]);
    const voltageVolts = measured(electrical.branchVoltages[branchId]);
    const value = model.kind === 'overcurrent' ? currentAmps : voltageVolts;
    const branch = compiled.graph.branches.find((b) => b.id === branchId)!;
    const unpowered =
      electrical.status === 'not-solved' &&
      electrical.diagnostics.some((d) => d.code === 'mna-no-source');
    if (!runtime.damaged && branch.closed && value === null && !unpowered) {
      return {
        readings: [],
        events: [],
        error: {
          code: 'damage-measurement-unavailable',
          severity: 'warning',
          message: `The declared damage model for ${target.id} has no accepted ${model.kind === 'overcurrent' ? 'branch current' : 'terminal-pair voltage'}.`,
          ...(target.type === 'component' ? { componentId: target.id } : { wireId: target.id }),
        },
      };
    }
    runtime.rate =
      runtime.damaged || !branch.closed || value === null || unpowered
        ? 0
        : Math.max(0, value ** 2 - damageThreshold(model) ** 2);
    const unit = model.kind === 'overcurrent' ? ('A²s' as const) : ('V²s' as const);
    if (!runtime.damaged && runtime.exposure >= budget) {
      runtime.damaged = true;
      runtime.damagedAtSeconds = state.elapsedSeconds;
      runtime.rate = 0;
      events.push({
        type: 'damage',
        atSeconds: state.elapsedSeconds,
        target,
        reason: model.kind,
        currentAmps,
        voltageVolts,
        exposure: runtime.exposure,
        budget,
        unit,
      });
    }
    const remainingSeconds = runtime.rate > 0 ? (budget - runtime.exposure) / runtime.rate : null;
    readings.push({
      target,
      kind: model.kind,
      exposure: runtime.exposure,
      budget,
      unit,
      damaged: runtime.damaged,
      damagedAtSeconds: runtime.damagedAtSeconds,
      currentAmps,
      voltageVolts,
      pendingAtSeconds:
        remainingSeconds === null
          ? null
          : Math.max(
              state.elapsedSeconds + 0.000001,
              Math.ceil((state.elapsedSeconds + remainingSeconds) * 1e6) / 1e6,
            ),
    });
  }
  return { readings, events };
}
