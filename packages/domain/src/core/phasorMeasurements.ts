import { assessTerminalCompatibility } from './compatibility';
import { conductorPaths } from './conductorPaths';
import type { CompileResult, CompiledSource } from './contracts';
import { terminalId } from './faultTopology';
import { compensatedSum } from './linearSystem';
import { MOTOR_APPROXIMATION } from './motorModel';
import {
  type Phasor,
  type PhasorSimulationResult,
  phasorMagnitude,
  phasorVoltageBetween,
} from './phasor';

export interface MotorOperatingPoint {
  componentId: string;
  state: 'running' | 'stopped' | 'blocked';
  connectedPhases: (CompiledSource['phase'] | null)[];
  phaseSystemId: string | null;
  sequence: 'abc' | 'acb' | null;
  lineVoltages: (Phasor | null)[];
  lineCurrents: Phasor[];
  equivalentInputPowerWatts: number;
  voltageUnbalanceRatio: number | null;
  frequencyHz: number | null;
  reasons: string[];
  basis: string;
  mechanicalOperation: 'not-assessed';
}

export interface PhasorDeviceCurrent {
  componentId: string;
  poles: { index: number; current: Phasor | null; rmsAmps: number | null }[];
  residual: Phasor | null;
  residualUnavailableReason: 'independent-references' | 'missing-current' | null;
  residualMilliamps: number | null;
  maximumPoleCurrentAmps: number | null;
  currentCapacityAmps: number | null;
  capacityComparison: 'within' | 'exceeded' | 'not-assessed';
  clearing: 'not-assessed';
}

export interface PhasorControlReading {
  componentId: string;
  closed: boolean;
  coilVoltage: Phasor | null;
  coilCurrent: Phasor | null;
  coilPowerWatts: number | null;
  pending: { closed: boolean; atSeconds: number } | null;
}

export function sumPhasors(values: Phasor[]): Phasor {
  return {
    real: compensatedSum(values.map((v) => v.real)),
    imaginary: compensatedSum(values.map((v) => v.imaginary)),
  };
}

/** Motor phase identity excludes winding/backfeed voltage and passive load paths. */
export function derivePhasorMeasurements(
  compiled: Extract<CompileResult, { status: 'compiled' }>,
  result: PhasorSimulationResult,
): PhasorSimulationResult {
  if (result.status !== 'converged') return result;
  const { graph, circuit } = compiled;
  const conductors = conductorPaths(graph);
  const group = (id: string) => conductors.groupByTerminal.get(id);
  const active = graph.sources.filter((s) =>
    graph.branches.some(
      (b) => b.kind === 'source' && b.closed && b.from === s.positive && b.to === s.negative,
    ),
  );
  for (const { componentId, model } of graph.devices) {
    if (model.kind === 'three-phase-motor') {
      const terminals = model.ports.map((p) => terminalId(componentId, p));
      const sources = terminals.map((t) => active.filter((s) => group(s.positive) === group(t)));
      const identified = sources.map((s) => (s.length === 1 && s[0]?.phaseSystemId ? s[0]! : null));
      const systems = new Set(
        identified.flatMap((s) => (s?.phaseSystemId ? [s.phaseSystemId] : [])),
      );
      const phases = identified.map((s) => s?.phase ?? null);
      const distinct = new Set(phases.filter((p) => p !== null)).size === 3 && systems.size === 1;
      const first = identified[0];
      const frequency = first?.model.kind === 'ac-three-phase' ? first.model.frequencyHz : null;
      const positions = phases.map((p) => ['l1', 'l2', 'l3'].indexOf(p ?? ''));
      const forward = positions[1] === (positions[0]! + 1) % 3;
      const sourceSequence = first?.model.kind === 'ac-three-phase' ? first.model.sequence : null;
      const sequence =
        distinct && sourceSequence
          ? forward
            ? sourceSequence
            : sourceSequence === 'abc'
              ? 'acb'
              : 'abc'
          : null;
      const voltages = terminals.map(
        (t, i) => phasorVoltageBetween(result, t, terminals[(i + 1) % 3]!) ?? null,
      );
      const magnitudes = voltages.map((v) => (v ? phasorMagnitude(v) : null));
      const mean = magnitudes.every((v) => v !== null)
        ? compensatedSum(magnitudes as number[]) / 3
        : 0;
      const unbalance =
        mean > 1e-9 ? Math.max(...magnitudes.map((v) => Math.abs(v! - mean))) / mean : null;
      const instance = circuit.components.find((c) => c.id === componentId)!;
      const capability = result.readiness.capabilities
        .find((c) => c.componentId === componentId)
        ?.groups.find((g) => g.role === 'load');
      const ratingMismatch =
        capability &&
        distinct &&
        magnitudes.some(
          (v) =>
            v !== null &&
            assessTerminalCompatibility(capability, { supply: first?.model, terminalVoltage: v })
              .status === 'incompatible',
        );
      const reasons: string[] = [];
      const stopped = sources.every((s) => !s.length) || !!instance.state.isBlown;
      const add = (code: string, message: string) => {
        reasons.push(code);
        result.diagnostics.push({ code, severity: 'warning', componentId, message });
      };
      if (!stopped) {
        if (!distinct)
          add(
            'motor-phase-loss',
            'Motor teaching operation is blocked: U/V/W require three distinct conductive phases from one source. Backfeed voltage does not replace a lost phase.',
          );
        if (distinct && sequence !== model.motor.requiredSequence)
          add(
            'motor-phase-sequence',
            `Motor terminal sequence ${sequence?.toUpperCase()} differs from declared ${model.motor.requiredSequence.toUpperCase()}; teaching operation is blocked.`,
          );
        if (distinct && frequency !== model.motor.frequencyHz)
          add(
            'motor-frequency-mismatch',
            'Motor supply frequency is outside the declared teaching model.',
          );
        const range = model.motor.operatingLineVoltageRange;
        if (
          distinct &&
          magnitudes.some((v) => v === null || v < range.min - 1e-6 || v > range.max + 1e-6)
        )
          add(
            'motor-voltage-out-of-range',
            'Motor L-L terminal voltage is outside its declared operating band.',
          );
        if (
          ratingMismatch &&
          !reasons.includes('motor-voltage-out-of-range') &&
          frequency === model.motor.frequencyHz
        )
          add(
            'motor-rating-incompatible',
            'Motor terminal voltage exceeds its separate declared equipment rating; teaching operation is blocked. Damage is unassessed.',
          );
        if (
          distinct &&
          (unbalance === null || unbalance > model.motor.maximumUnbalanceRatio + 1e-9)
        )
          add(
            'motor-voltage-unbalance',
            'Motor terminal voltage unbalance exceeds the declared teaching limit; actual unbalanced motor behavior is unassessed.',
          );
      }
      const branches = graph.branches.filter(
        (b) => b.componentId === componentId && b.kind === 'load',
      );
      result.motors.push({
        componentId,
        state: stopped ? 'stopped' : reasons.length ? 'blocked' : 'running',
        connectedPhases: phases,
        phaseSystemId: systems.size === 1 ? [...systems][0]! : null,
        sequence,
        lineVoltages: voltages,
        frequencyHz: frequency,
        voltageUnbalanceRatio: unbalance,
        lineCurrents: terminals.map((t) =>
          sumPhasors(
            branches.flatMap((b) => {
              const i = result.branchCurrents[b.id]!;
              return b.from === t
                ? [i]
                : b.to === t
                  ? [{ real: -i.real, imaginary: -i.imaginary }]
                  : [];
            }),
          ),
        ),
        equivalentInputPowerWatts: compensatedSum(
          branches.map((b) => result.branchActivePowersWatts[b.id]!),
        ),
        reasons,
        basis: MOTOR_APPROXIMATION,
        mechanicalOperation: 'not-assessed',
      });
    }
    if (model.kind === 'contacts') {
      const poles = model.poles.map((_pole, index) => {
        const branches = graph.branches.filter(
          (b) =>
            b.componentId === componentId &&
            (b.id === JSON.stringify(['device', componentId, `contact:${index}:no`]) ||
              b.id === JSON.stringify(['device', componentId, `contact:${index}:nc`])),
        );
        const values = branches.map((b) => result.branchCurrents[b.id]);
        const current = values.every((v) => v !== undefined)
          ? sumPhasors(values as Phasor[])
          : null;
        return { index, current, rmsAmps: current ? phasorMagnitude(current) : null };
      });
      const sensedDomains = new Set(
        poles.flatMap((p) =>
          p.rmsAmps !== null && p.rmsAmps > 1e-9
            ? [result.terminalDomains[terminalId(componentId, model.poles[p.index]!.common)]]
            : [],
        ),
      );
      const residualUnavailableReason =
        !poles.length || poles.some((p) => p.current === null)
          ? ('missing-current' as const)
          : sensedDomains.size > 1
            ? ('independent-references' as const)
            : null;
      const residual =
        residualUnavailableReason === null ? sumPhasors(poles.map((p) => p.current!)) : null;
      const maximum =
        poles.length && poles.every((p) => p.rmsAmps !== null)
          ? Math.max(...poles.map((p) => p.rmsAmps!))
          : null;
      const caps =
        result.readiness.capabilities
          .find((c) => c.componentId === componentId)
          ?.groups.filter((g) => g.role === 'contact') ?? [];
      const capacity =
        caps.length && caps.every((g) => g.currentCapacityAmps.status === 'known')
          ? Math.min(
              ...caps.map((g) =>
                g.currentCapacityAmps.status === 'known'
                  ? g.currentCapacityAmps.value
                  : Number.POSITIVE_INFINITY,
              ),
            )
          : null;
      result.deviceCurrents.push({
        componentId,
        poles,
        residual,
        residualUnavailableReason,
        residualMilliamps: residual ? phasorMagnitude(residual) * 1000 : null,
        maximumPoleCurrentAmps: maximum,
        currentCapacityAmps: capacity,
        capacityComparison:
          maximum === null || capacity === null
            ? 'not-assessed'
            : maximum > capacity
              ? 'exceeded'
              : 'within',
        clearing: 'not-assessed',
      });
    }
  }
  return result;
}
