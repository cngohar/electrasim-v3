import { compileCircuit } from './compile';
import {
  type CompileOptions,
  type CompileResult,
  type CompiledSource,
  ELECTRICAL_CONTRACT_VERSION,
  ELECTRICAL_MODEL_VERSION,
  type ElectricalDiagnostic,
  type ElectricalSimulationResult,
  type ModelCoverage,
} from './contracts';
import { terminalId } from './faultTopology';
import { compensatedSum, residualRatio } from './linearSystem';
import { solveCompiledCircuit } from './mna';
import {
  type MotorOperatingPoint,
  type PhasorControlReading,
  type PhasorDeviceCurrent,
  derivePhasorMeasurements,
} from './phasorMeasurements';
import { type CircuitReadiness, assessCompiledCircuitReadiness } from './readiness';
import { assessWireCapacity } from './wireCapacity';

/** Complex RMS value. Never add RMS magnitudes to calculate residual/neutral current. */
export interface Phasor {
  real: number;
  imaginary: number;
}

export interface PhasorSimulationResult {
  contractVersion: typeof ELECTRICAL_CONTRACT_VERSION;
  modelVersion: typeof ELECTRICAL_MODEL_VERSION;
  engineVersion: 'mna-phasor-resistive-1' | 'mna-phasor-controls-1';
  motors: MotorOperatingPoint[];
  deviceCurrents: PhasorDeviceCurrent[];
  controls: PhasorControlReading[];
  status: ElectricalSimulationResult['status'];
  diagnostics: ElectricalDiagnostic[];
  coverage: ModelCoverage[];
  readiness: CircuitReadiness;
  terminalVoltages: Record<string, Phasor>;
  terminalDomains: Record<string, string>;
  branchVoltages: Record<string, Phasor>;
  branchCurrents: Record<string, Phasor>;
  /** Re(V * conjugate(I)); negative source power means delivery. */
  branchActivePowersWatts: Record<string, number>;
  wireLossesWatts: Record<string, number>;
  sourceBranches: Record<string, string>;
  unavailableBranchVoltages: Record<string, 'independent-references'>;
  references: {
    domainId: string;
    terminalId: string;
    sourceIds: string[];
    frequencyHz: number | null;
    voltageConvention: 'complex-rms';
    kind: 'mathematical-gauge';
  }[];
  checks: {
    maximumKclResidualAmps: number;
    maximumSourceResidualVolts: number;
    maximumPowerResidualWatts: number;
    maximumResidualRatio: number;
  } | null;
  /** This numerical foundation does not grade operation, repair or standards. */
  operation: 'not-assessed';
  assessment: 'not-assessed';
}

/** Explicit scaled norm keeps Bun/workerd arithmetic identical and avoids
 * overflow/underflow while squaring. Their Math.hypot implementations differ
 * by a last bit on some inputs; no result rounding or parity tolerance is used.
 */
export function phasorMagnitude(value: Phasor): number {
  const largest = Math.max(Math.abs(value.real), Math.abs(value.imaginary));
  if (largest === 0) return 0;
  const real = value.real / largest;
  const imaginary = value.imaginary / largest;
  return largest * Math.sqrt(real * real + imaginary * imaginary);
}

export const phasorDifference = (a: Phasor, b: Phasor): Phasor => ({
  real: a.real - b.real,
  imaginary: a.imaginary - b.imaginary,
});

export function phasorVoltageBetween(
  result: PhasorSimulationResult,
  from: string,
  to: string,
): Phasor | undefined {
  const a = result.terminalVoltages[from];
  const b = result.terminalVoltages[to];
  return result.status === 'converged' &&
    a &&
    b &&
    result.terminalDomains[from] !== undefined &&
    result.terminalDomains[from] === result.terminalDomains[to]
    ? phasorDifference(a, b)
    : undefined;
}

function sourcePhasor(source: CompiledSource): Phasor {
  const angle = ((source.phaseAngleDegrees ?? 0) * Math.PI) / 180;
  return {
    real: source.model.voltage * Math.cos(angle),
    imaginary: source.model.voltage * Math.sin(angle),
  };
}

/** E.0 numerical entry, deliberately separate from scalar/timed app consumers.
 * For a resistive network the MNA coefficient matrix is real. Its in-phase and
 * quadrature right-hand sides solve independently under the same gauges and
 * allocation/conditioning limits. No waveform, motor impedance or source
 * synchronization is inferred. Two bounded factorizations are used in this slice.
 */
export function solvePhasorCircuit(
  raw: unknown,
  options: CompileOptions = {},
): PhasorSimulationResult {
  return solveCompiledPhasorCircuit(compileCircuit(raw, options), options);
}

export function solveCompiledPhasorCircuit(
  compiled: CompileResult,
  options: CompileOptions = {},
): PhasorSimulationResult {
  const readiness = assessCompiledCircuitReadiness(compiled, options);
  const empty = (
    status: PhasorSimulationResult['status'],
    diagnostics: ElectricalDiagnostic[],
  ): PhasorSimulationResult => ({
    contractVersion: ELECTRICAL_CONTRACT_VERSION,
    modelVersion: ELECTRICAL_MODEL_VERSION,
    engineVersion: 'mna-phasor-resistive-1',
    motors: [],
    deviceCurrents: [],
    controls: [],
    status,
    diagnostics,
    readiness,
    coverage: [
      ...(compiled.status === 'compiled'
        ? compiled.coverage
            .filter((item) => item.aspect !== 'measurements')
            .map(
              (item): ModelCoverage =>
                ['damage', 'protection'].includes(item.aspect)
                  ? {
                      ...item,
                      status: 'not-assessed',
                      reason:
                        'Static phasor snapshot; cumulative damage and automatic protective clearing are not assessed.',
                    }
                  : item,
            )
        : []),
      {
        subjectId: 'circuit',
        aspect: 'measurements',
        status: 'not-assessed',
        reason: 'No accepted complex RMS solution is available.',
      },
    ],
    terminalVoltages: {},
    terminalDomains: {},
    branchVoltages: {},
    branchCurrents: {},
    branchActivePowersWatts: {},
    wireLossesWatts: {},
    sourceBranches: {},
    unavailableBranchVoltages: {},
    references: [],
    checks: null,
    operation: 'not-assessed',
    assessment: 'not-assessed',
  });
  if (compiled.status === 'invalid') return empty('invalid', compiled.diagnostics);
  const { graph } = compiled;
  const reject = (code: string, message: string, componentId?: string) =>
    empty('unsupported', [
      ...compiled.diagnostics,
      { code, severity: 'warning', message, ...(componentId ? { componentId } : {}) },
    ]);
  if (graph.transformers.length)
    return reject(
      'phasor-transformer-unassessed',
      'Three-phase transformer coupling remains outside the E.0 resistive model.',
    );
  if (
    graph.devices.some(
      ({ model, componentId }) =>
        model.kind === 'contacts' &&
        (model.timerModel ||
          model.dimmer ||
          (model.coilModel && !options.contactStates?.has(componentId))),
    )
  )
    return reject(
      'phasor-controls-unassessed',
      'Declared coils require the phasor control step; timers and dimming remain unassessed.',
    );
  const activePairs = new Set(
    graph.branches
      .filter((b) => b.kind === 'source' && b.closed)
      .map((b) => JSON.stringify([b.from, b.to])),
  );
  const active = graph.sources.filter((s) =>
    activePairs.has(JSON.stringify([s.positive, s.negative])),
  );
  const sourcesByDomain = new Map<string, CompiledSource[]>();
  for (const domain of graph.domains) {
    const ids = new Set(domain.sourceIds);
    const sources = active.filter((s) => ids.has(s.id));
    sourcesByDomain.set(domain.id, sources);
    if (sources.some((s) => s.model.kind === 'dc'))
      return reject(
        'phasor-dc-unassessed',
        'This entry accepts AC RMS networks; use solveCircuit() for DC.',
      );
    if (
      sources.some(
        (s) =>
          s.model.kind === 'ac-three-phase' &&
          (!s.phaseSystemId || s.phaseAngleDegrees === undefined || !s.phase),
      )
    )
      return reject(
        'phasor-phase-identity-missing',
        'Three-phase constraints require explicit source and phase identity.',
      );
    const frequencies = new Set(
      sources.flatMap((s) => (s.model.kind === 'dc' ? [] : [s.model.frequencyHz])),
    );
    if (frequencies.size > 1)
      return reject(
        'phasor-frequency-mismatch',
        'Joined AC sources have different frequencies; one phasor network cannot represent them.',
      );
    if (new Set(sources.map((s) => s.phaseSystemId ?? s.id)).size > 1)
      return reject(
        'phasor-unsynchronized-sources',
        'Relative phase of independent AC source systems is undeclared. No synchronization is inferred.',
      );
    for (const device of graph.devices) {
      const model = device.model;
      if (
        model.kind !== 'resistive-load' ||
        !domain.terminals.includes(terminalId(device.componentId, model.ports[0]))
      )
        continue;
      if (
        sources.length &&
        !model.supplyKinds.includes('ac-single-phase') &&
        !model.supplyKinds.includes('ac-three-phase')
      )
        return reject(
          'phasor-load-supply-kind',
          'This resistance law is not declared for AC.',
          device.componentId,
        );
    }
  }
  // Projections are mathematical RHS values, never saved DC supply profiles.
  // Preserve graph incidence, canonical IDs, conductor laws and domain gauges.
  const project = (axis: keyof Phasor) =>
    solveCompiledCircuit(
      {
        ...compiled,
        graph: {
          ...graph,
          sources: graph.sources.map((source) => ({
            id: source.id,
            componentIds: source.componentIds,
            positive: source.positive,
            negative: source.negative,
            reference: source.reference,
            model: { kind: 'dc' as const, voltage: sourcePhasor(source)[axis] },
          })),
          devices: graph.devices.map((device) =>
            device.model.kind === 'three-phase-motor'
              ? { ...device, model: { kind: 'connections' as const, groups: [] } }
              : device.model.kind === 'resistive-load'
                ? { ...device, model: { ...device.model, supplyKinds: ['dc'] as const } }
                : device,
          ),
        },
      },
      options,
    );
  const real = project('real');
  const imaginary = project('imaginary');
  if (real.status !== 'converged' || imaginary.status !== 'converged') {
    const failed = [real, imaginary].filter((result) => result.status !== 'converged');
    // A contradiction on either axis outranks an indeterminate projection.
    const failure = failed.find((result) => result.status === 'invalid') ?? failed[0]!;
    return empty(
      failure.status,
      failed.flatMap((result) => result.diagnostics),
    );
  }
  const combine = (a: Record<string, number>, b: Record<string, number>) =>
    Object.fromEntries(
      Object.entries(a).map(([id, value]) => [id, { real: value, imaginary: b[id]! }]),
    );
  const result = empty('converged', [...readiness.diagnostics]);
  result.terminalVoltages = combine(real.terminalVoltages, imaginary.terminalVoltages);
  result.terminalDomains = real.terminalDomains;
  result.branchVoltages = combine(real.branchVoltages, imaginary.branchVoltages);
  result.branchCurrents = combine(real.branchCurrents, imaginary.branchCurrents);
  result.sourceBranches = real.sourceBranches;
  result.unavailableBranchVoltages = real.unavailableBranchVoltages;
  result.references = real.references.map((ref) => {
    const source = sourcesByDomain.get(ref.domainId)?.[0];
    return {
      domainId: ref.domainId,
      terminalId: ref.terminalId,
      sourceIds: ref.sourceIds,
      frequencyHz: source && source.model.kind !== 'dc' ? source.model.frequencyHz : null,
      voltageConvention: 'complex-rms',
      kind: 'mathematical-gauge',
    };
  });
  for (const branch of graph.branches) {
    const v = result.branchVoltages[branch.id];
    const i = result.branchCurrents[branch.id]!;
    result.branchActivePowersWatts[branch.id] = branch.closed
      ? v!.real * i.real + v!.imaginary * i.imaginary
      : 0;
    if (branch.wireId && branch.wire) {
      result.wireLossesWatts[branch.wireId] =
        (i.real * i.real + i.imaginary * i.imaginary) * branch.wire.resistanceOhms;
      const capacity = assessWireCapacity(branch.wire, phasorMagnitude(i));
      if (capacity.comparison === 'exceeded')
        result.diagnostics.push({
          code: 'wire-capacity-exceeded',
          severity: 'warning',
          wireId: branch.wireId,
          branchId: branch.id,
          message: `RMS current ${phasorMagnitude(i).toPrecision(6)} A exceeds declared cable capacity ${capacity.deratedAmps} A; damage and clearing are unassessed.`,
        });
    }
  }
  const checks = {
    maximumKclResidualAmps: 0,
    maximumSourceResidualVolts: 0,
    maximumPowerResidualWatts: 0,
    maximumResidualRatio: Math.max(
      real.checks!.maximumResidualRatio,
      imaginary.checks!.maximumResidualRatio,
    ),
  };
  for (const terminal of graph.terminals) {
    const terms = graph.branches.flatMap((b) =>
      b.from === terminal.id
        ? [result.branchCurrents[b.id]!]
        : b.to === terminal.id
          ? [
              {
                real: -result.branchCurrents[b.id]!.real,
                imaginary: -result.branchCurrents[b.id]!.imaginary,
              },
            ]
          : [],
    );
    const residual = phasorMagnitude({
      real: compensatedSum(terms.map((i) => i.real)),
      imaginary: compensatedSum(terms.map((i) => i.imaginary)),
    });
    checks.maximumKclResidualAmps = Math.max(checks.maximumKclResidualAmps, residual);
    checks.maximumResidualRatio = Math.max(
      checks.maximumResidualRatio,
      residualRatio(residual, compensatedSum(terms.map(phasorMagnitude))),
    );
  }
  for (const source of active) {
    const voltage = result.branchVoltages[result.sourceBranches[source.id]!]!;
    const expected = sourcePhasor(source);
    const residual = phasorMagnitude(phasorDifference(voltage, expected));
    checks.maximumSourceResidualVolts = Math.max(checks.maximumSourceResidualVolts, residual);
    checks.maximumResidualRatio = Math.max(
      checks.maximumResidualRatio,
      residualRatio(residual, Math.max(phasorMagnitude(voltage), phasorMagnitude(expected))),
    );
  }
  for (const domain of graph.domains) {
    const powers = graph.branches
      .filter((b) => result.terminalDomains[b.from] === domain.id)
      .map((b) => result.branchActivePowersWatts[b.id]!);
    const residual = Math.abs(compensatedSum(powers));
    checks.maximumPowerResidualWatts = Math.max(checks.maximumPowerResidualWatts, residual);
    checks.maximumResidualRatio = Math.max(
      checks.maximumResidualRatio,
      residualRatio(residual, compensatedSum(powers.map(Math.abs))),
    );
  }
  if (
    !Number.isFinite(checks.maximumResidualRatio) ||
    checks.maximumResidualRatio > 1 ||
    Object.values(result.branchActivePowersWatts).some((v) => !Number.isFinite(v))
  )
    return empty('nonconverged', [
      {
        code: 'phasor-conservation-failed',
        severity: 'error',
        message:
          'Complex KCL, source KVL or per-domain real power failed conservation; measurements are unavailable.',
      },
    ]);
  result.checks = checks;
  result.coverage[result.coverage.length - 1] = {
    subjectId: 'circuit',
    aspect: 'measurements',
    status: 'estimated',
    reason:
      'Accepted complex RMS solution of declared resistances, finite wires at 20 C and static contacts. Declared motor equivalents use unity PF; reactive loads, transformer coupling, automatic clearing, damage and standards are not assessed.',
  };
  return derivePhasorMeasurements(compiled, result);
}
