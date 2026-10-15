/** Shared bounded complex MNA for declared catalogue profiles. The established
 * linear solver remains the fast path for documents without profile branches.
 * Newton solves the original branch laws; a seed conductance is never output.
 */
import type { ProfileBranchLaw } from './catalogueProfiles';
import { ntcResistance } from './catalogueProfiles';
import {
  type CompileOptions,
  type CompileResult,
  ELECTRICAL_CONTRACT_VERSION,
  ELECTRICAL_MODEL_VERSION,
  type ElectricalBranch,
  type ElectricalDiagnostic,
  type ElectricalSimulationResult,
} from './contracts';
import { deriveEarthingMeasurements } from './earthing';
import { compareIds } from './faultTopology';
import { recoverLinkCurrents } from './linearMeasurements';
import { LINEAR_SYSTEM_LIMITS, compensatedSum, solveLinearSystem } from './linearSystem';
import { deriveOperatingPoints } from './operatingPoint';
import { assessCompiledCircuitReadiness } from './readiness';
import { inspectVoltageConstraints } from './voltageConstraints';

type Compiled = Extract<CompileResult, { status: 'compiled' }>;
type Complex = { real: number; imaginary: number };
export const PROFILE_SOLVER_LIMITS = {
  iterations: 64,
  lineSearch: 12,
  statePasses: 16,
  maxRealUnknowns: LINEAR_SYSTEM_LIMITS.maxUnknowns,
} as const;
export function complexMagnitude(v: Complex): number {
  const m = Math.max(Math.abs(v.real), Math.abs(v.imaginary));
  return m === 0 ? 0 : m * Math.sqrt((v.real / m) ** 2 + (v.imaginary / m) ** 2);
}
const display = (v: Complex) =>
  (Math.sign(Math.abs(v.real) > 1e-12 ? v.real : v.imaginary) || 1) * complexMagnitude(v);
const difference = (a: Complex, b: Complex): Complex => ({
  real: a.real - b.real,
  imaginary: a.imaginary - b.imaginary,
});
const power = (v: Complex, i: Complex) => v.real * i.real + v.imaginary * i.imaginary;
const zero = (): Complex => ({ real: 0, imaginary: 0 });
class Groups {
  private parents = new Map<string, string>();
  constructor(ids: string[]) {
    for (const id of ids) this.parents.set(id, id);
  }
  root(id: string): string {
    const p = this.parents.get(id)!;
    if (p === id) return id;
    const r = this.root(p);
    this.parents.set(id, r);
    return r;
  }
  join(a: string, b: string) {
    const x = this.root(a);
    const y = this.root(b);
    if (x !== y) this.parents.set(compareIds(x, y) < 0 ? y : x, compareIds(x, y) < 0 ? x : y);
  }
}
interface LawValue {
  current: Complex;
  jacobian: readonly [number, number, number, number];
}
/** The Jacobian is [dIr/dVr,dIr/dVi,dIi/dVr,dIi/dVi]. */
function evaluate(
  law: ProfileBranchLaw | undefined,
  branch: ElectricalBranch,
  v: Complex,
  on: boolean,
  seed: boolean,
  dc: boolean,
): LawValue {
  if (!on) return { current: zero(), jacobian: [0, 0, 0, 0] };
  const x = v.real;
  const y = v.imaginary;
  let g = 0;
  let b = 0;
  if (!law) g = 1 / (branch.wire?.resistanceOhms ?? branch.resistanceOhms!);
  else if (law.kind === 'ntc') g = 1 / ntcResistance(law.profile);
  else if (law.kind === 'pv') {
    const p = law.profile;
    const scale =
      (p.irradianceWattsPerM2 / 1000) *
      (1 + p.currentTemperatureCoefficient * (p.temperatureC - 25));
    const vs = 1 + p.voltageTemperatureCoefficient * (p.temperatureC - 25);
    const voc = p.openCircuitVoltage * vs;
    const vmp = p.maximumPowerVoltage * vs;
    const isc = p.shortCircuitAmps * scale;
    const imp = p.maximumPowerAmps * scale;
    if (!scale) return { current: zero(), jacobian: [0, 0, 0, 0] };
    const high = seed || x >= vmp;
    const slope = high ? imp / (voc - vmp) : (isc - imp) / vmp;
    const intercept = high ? -slope * voc : -isc;
    return {
      current: { real: slope * x + intercept, imaginary: 0 },
      jacobian: [slope, 0, 0, slope],
    };
  } else if (law.kind === 'spd') {
    const p = law.profile;
    const r = complexMagnitude(v);
    const threshold = dc ? p.dcClampVoltage : p.rmsClampVoltage;
    g = 1 / p.leakageResistanceOhms;
    if (r > threshold) {
      g += (1 - threshold / r) / p.dynamicResistanceOhms;
      const d = threshold / (p.dynamicResistanceOhms * r ** 3);
      return {
        current: { real: g * x, imaginary: g * y },
        jacobian: [g + d * x * x, d * x * y, d * x * y, g + d * y * y],
      };
    }
  } else {
    g = law.conductance;
    b = law.susceptance;
    const p = law.constantPowerWatts;
    if (p) {
      if (seed) g += p / law.nominalVoltage ** 2;
      else {
        const r2 = x * x + y * y;
        if (!(r2 > 1e-18))
          return {
            current: { real: Number.NaN, imaginary: Number.NaN },
            jacobian: [Number.NaN, Number.NaN, Number.NaN, Number.NaN],
          };
        const c = p / r2;
        const d = (2 * p) / (r2 * r2);
        return {
          current: { real: (g + c) * x - b * y, imaginary: b * x + (g + c) * y },
          jacobian: [g + c - d * x * x, -b - d * x * y, b - d * x * y, g + c - d * y * y],
        };
      }
    }
  }
  return { current: { real: g * x - b * y, imaginary: b * x + g * y }, jacobian: [g, -b, b, g] };
}

export function solveProfileCircuit(
  compiled: Compiled,
  options: CompileOptions = {},
): ElectricalSimulationResult {
  const { graph } = compiled;
  const readiness = assessCompiledCircuitReadiness(compiled, options);
  const base = (
    status: ElectricalSimulationResult['status'],
    diagnostics: ElectricalDiagnostic[] = [],
  ): ElectricalSimulationResult => ({
    contractVersion: ELECTRICAL_CONTRACT_VERSION,
    modelVersion: ELECTRICAL_MODEL_VERSION,
    engineVersion: 'mna-regulated-1',
    status,
    coverage: [
      ...compiled.coverage.filter((c) => c.aspect !== 'measurements'),
      {
        subjectId: 'circuit',
        aspect: 'measurements',
        status: status === 'converged' ? 'estimated' : 'not-assessed',
        reason:
          status === 'converged'
            ? 'Accepted bounded complex MNA of declared profile laws, finite wires and source/winding constraints. No harmonic, mechanical, certification or implicit damage model.'
            : 'No accepted profile solution; measurements are unavailable.',
      },
    ],
    diagnostics: [...compiled.diagnostics, ...diagnostics],
    readiness,
    terminalVoltages: {},
    terminalDomains: {},
    branchCurrents: {},
    branchVoltages: {},
    branchPowers: {},
    wireLosses: {},
    sourceBranches: {},
    unavailableBranchVoltages: {},
    references: [],
    transformers: [],
    protectiveCurrents: [],
    faultCurrents: [],
    checks: null,
    loads: [],
    wires: [],
    deviceCurrents: [],
    operation: 'not-assessed',
    assessment: 'not-assessed',
  });
  const fail = (
    code: string,
    message: string,
    status: ElectricalSimulationResult['status'] = 'nonconverged',
    componentId?: string,
  ) => {
    const r = base(status, [
      {
        code,
        message,
        severity: status === 'unsupported' ? 'warning' : 'error',
        ...(componentId ? { componentId } : {}),
      },
    ]);
    deriveEarthingMeasurements(graph, r);
    return deriveOperatingPoints(compiled, r, options);
  };
  const unsupported = compiled.coverage.find(
    (c) =>
      c.status === 'not-assessed' && !['damage', 'protection', 'measurements'].includes(c.aspect),
  );
  if (unsupported)
    return fail(
      'profile-model-unavailable',
      unsupported.reason,
      'unsupported',
      unsupported.subjectId,
    );
  const net = new Map(graph.nets.flatMap((n) => n.terminals.map((t) => [t, n.id] as const)));
  const branches = graph.branches;
  const byId = new Map(branches.map((b) => [b.id, b]));
  for (const n of graph.nets)
    if (
      branches.filter((b) => b.closed && b.idealConductor && net.get(b.from) === n.id).length >=
      n.terminals.length
    )
      return fail(
        'profile-indeterminate-ideal-current',
        'A redundant ideal link loop leaves its individual currents indeterminate.',
        'not-solved',
      );
  const sources = graph.sources.flatMap((s) => {
    const branch = branches.find(
      (b) => b.kind === 'source' && b.from === s.positive && b.to === s.negative,
    );
    return branch?.closed ? [{ source: s, branch }] : [];
  });
  const idealSources = sources.filter(({ source }) => source.law !== 'photovoltaic');
  if (!sources.length)
    return fail('profile-no-source', 'No active declared source is available.', 'not-solved');
  const windings = graph.transformers.filter(
    (t) => byId.get(t.primaryBranchId)?.closed && byId.get(t.secondaryBranchId)?.closed,
  );
  if (
    graph.transformers.some(
      (t) => byId.get(t.primaryBranchId)?.closed !== byId.get(t.secondaryBranchId)?.closed,
    )
  )
    return fail(
      'profile-broken-winding',
      'An internally open winding requires an explicit failure model.',
      'unsupported',
    );
  const sourceValue = (s: (typeof sources)[number]['source']): Complex => {
    const a = ((s.phaseAngleDegrees ?? 0) * Math.PI) / 180;
    return {
      real: s.model.voltage * Math.cos(a),
      imaginary: s.model.kind === 'dc' ? 0 : s.model.voltage * Math.sin(a),
    };
  };
  for (const axis of ['real', 'imaginary'] as const) {
    const constraints = inspectVoltageConstraints(
      idealSources.map(({ source }) => ({
        id: source.id,
        positive: net.get(source.positive)!,
        negative: net.get(source.negative)!,
        voltage: sourceValue(source)[axis],
      })),
    );
    if (constraints.conflicting.length)
      return fail(
        'profile-conflicting-source',
        'Ideal source constraints contradict a source or ideal short; no current is estimated.',
        'invalid',
      );
    if (constraints.redundant.length)
      return fail(
        'profile-indeterminate-source-current',
        'Redundant ideal voltage sources leave individual source currents indeterminate.',
        'not-solved',
      );
  }
  const enabled = new Map<string, boolean>();
  for (const b of branches) {
    const l = b.profileLaw;
    enabled.set(
      b.id,
      b.closed &&
        !(
          l?.kind === 'demand' &&
          l.constantPowerWatts === 0 &&
          l.conductance === 0 &&
          l.susceptance === 0
        ) &&
        !(l?.kind === 'pv' && l.profile.irradianceWattsPerM2 === 0),
    );
    if (
      b.closed &&
      !b.idealConductor &&
      !['source', 'winding'].includes(b.kind) &&
      !l &&
      !(b.wire?.resistanceOhms ?? b.resistanceOhms)
    )
      return fail(
        'profile-unknown-branch-law',
        'A connected consuming branch has no declared law.',
        'unsupported',
        b.componentId,
      );
  }
  const seenStates = new Set<string>();
  for (let pass = 0; pass < PROFILE_SOLVER_LIMITS.statePasses; pass++) {
    const signature = branches
      .filter((b) => b.profileLaw?.kind === 'demand' && b.profileLaw.constantPowerWatts > 0)
      .map((b) => `${b.id}:${enabled.get(b.id)}`)
      .join('|');
    if (seenStates.has(signature))
      return fail(
        'profile-state-cycle',
        'On/off candidates cannot satisfy one operating-band state. No measurements were accepted.',
      );
    seenStates.add(signature);
    const groups = new Groups(graph.nets.map((n) => n.id));
    for (const b of branches)
      if (b.closed && (b.idealConductor || enabled.get(b.id)))
        groups.join(net.get(b.from)!, net.get(b.to)!);
    const domains = new Map<string, string[]>();
    for (const n of graph.nets) {
      const r = groups.root(n.id);
      const a = domains.get(r) ?? [];
      a.push(n.id);
      domains.set(r, a);
    }
    const coupled = new Groups([...domains.keys()]);
    for (const t of windings)
      coupled.join(groups.root(net.get(t.primary[0])!), groups.root(net.get(t.secondary[0])!));
    const groupSources = (domain: string) =>
      sources.filter(
        ({ source }) =>
          coupled.root(groups.root(net.get(source.positive)!)) === coupled.root(domain),
      );
    const dcDomain = (domain: string) =>
      groupSources(domain).every(({ source }) => source.model.kind === 'dc');
    for (const d of domains.keys()) {
      const ss = groupSources(d);
      const kinds = new Set(ss.map(({ source }) => (source.model.kind === 'dc' ? 'dc' : 'ac')));
      const frequencies = new Set(
        ss.flatMap(({ source }) => (source.model.kind === 'dc' ? [] : [source.model.frequencyHz])),
      );
      if (kinds.size > 1 || frequencies.size > 1)
        return fail(
          'profile-mixed-excitation',
          'Joined AC/DC or different-frequency sources need a waveform model.',
          'unsupported',
        );
      if (
        !dcDomain(d) &&
        new Set(ss.map(({ source }) => source.phaseSystemId ?? source.id)).size > 1
      )
        return fail(
          'profile-unsynchronized-sources',
          'Independent joined AC source phases are unspecified.',
          'unsupported',
        );
    }
    for (const t of windings)
      if (
        dcDomain(groups.root(net.get(t.primary[0])!)) &&
        groupSources(groups.root(net.get(t.primary[0])!)).length
      )
        return fail(
          'profile-dc-transformer',
          'Steady DC does not transfer through the declared ideal AC winding model.',
          'unsupported',
          t.componentId,
        );
    for (const b of branches) {
      const law = b.profileLaw;
      if (!law || !b.closed) continue;
      const ss = groupSources(groups.root(net.get(b.from)!));
      if (law.kind === 'pv' && ss.some(({ source }) => source.model.kind !== 'dc'))
        return fail(
          'profile-pv-ac',
          'The declared photovoltaic curve requires DC.',
          'unsupported',
          b.componentId,
        );
      if (
        law.kind === 'demand' &&
        ss.some(
          ({ source }) =>
            source.model.kind === 'dc' || !law.frequencyHz.includes(source.model.frequencyHz),
        )
      )
        return fail(
          'profile-load-excitation',
          'This profile requires its declared sinusoidal AC frequency; DC suitability is unassessed.',
          'unsupported',
          b.componentId,
        );
      if (
        law.kind === 'spd' &&
        ss.some(
          ({ source }) =>
            source.model.kind !== 'dc' && ![50, 60].includes(source.model.frequencyHz),
        )
      )
        return fail(
          'profile-spd-frequency',
          'The RMS-envelope SPD profile is declared only for 50/60 Hz AC or its separately parameterized DC law.',
          'unsupported',
          b.componentId,
        );
    }
    const references = new Map(
      [...domains].map(([d, ns]) => [
        d,
        net.get(
          groupSources(d).find(({ source }) => groups.root(net.get(source.negative)!) === d)?.source
            .negative ?? '',
        ) ?? ns[0]!,
      ]),
    );
    const voltageNets = graph.nets
      .map((n) => n.id)
      .filter((id) => references.get(groups.root(id)) !== id);
    const indices = new Map(voltageNets.map((n, i) => [n, i]));
    const complexSize = voltageNets.length + idealSources.length + windings.length;
    const size = 2 * complexSize;
    if (size > PROFILE_SOLVER_LIMITS.maxRealUnknowns)
      return fail(
        'profile-size-limit',
        `The profile system needs ${size} real unknowns; the accepted limit is ${PROFILE_SOLVER_LIMITS.maxRealUnknowns}.`,
        'unsupported',
      );
    const at = (values: Float64Array, n: string): Complex => {
      const i = indices.get(n);
      return i === undefined ? zero() : { real: values[2 * i]!, imaginary: values[2 * i + 1]! };
    };
    const pair = (values: Float64Array, b: ElectricalBranch) =>
      difference(at(values, net.get(b.from)!), at(values, net.get(b.to)!));
    const assemble = (values: Float64Array, seed: boolean) => {
      const matrix = Array.from({ length: size }, () => new Float64Array(size));
      const f = new Float64Array(size);
      const scale = new Float64Array(size);
      const stamp = (r: number | undefined, c: number | undefined, value: number) => {
        if (r !== undefined && c !== undefined) matrix[r]![c] = matrix[r]![c]! + value;
      };
      for (const b of branches) {
        if (
          !b.closed ||
          b.idealConductor ||
          b.kind === 'winding' ||
          (b.kind === 'source' && b.profileLaw?.kind !== 'pv')
        )
          continue;
        const a = indices.get(net.get(b.from)!);
        const z = indices.get(net.get(b.to)!);
        const law = evaluate(
          b.profileLaw,
          b,
          pair(values, b),
          enabled.get(b.id) === true,
          seed,
          dcDomain(groups.root(net.get(b.from)!)),
        );
        for (const [i, sign] of [
          [a, 1],
          [z, -1],
        ] as const) {
          if (i === undefined) continue;
          f[2 * i] = f[2 * i]! + sign * law.current.real;
          f[2 * i + 1] = f[2 * i + 1]! + sign * law.current.imaginary;
          scale[2 * i] = scale[2 * i]! + Math.abs(law.current.real);
          scale[2 * i + 1] = scale[2 * i + 1]! + Math.abs(law.current.imaginary);
          for (const [j, sj] of [
            [a, 1],
            [z, -1],
          ] as const) {
            if (j === undefined) continue;
            stamp(2 * i, 2 * j, sign * sj * law.jacobian[0]);
            stamp(2 * i, 2 * j + 1, sign * sj * law.jacobian[1]);
            stamp(2 * i + 1, 2 * j, sign * sj * law.jacobian[2]);
            stamp(2 * i + 1, 2 * j + 1, sign * sj * law.jacobian[3]);
          }
        }
      }
      const constraint = (
        index: number,
        terminals: readonly (readonly [string, number])[],
        target: Complex,
      ) => {
        for (const axis of [0, 1]) {
          const row = 2 * index + axis;
          f[row] = -(axis === 0 ? target.real : target.imaginary);
          scale[row] = Math.abs(f[row]!);
          for (const [t, coefficient] of terminals) {
            const n = indices.get(net.get(t)!);
            if (n === undefined) continue;
            const column = 2 * n + axis;
            stamp(row, column, coefficient);
            stamp(column, row, coefficient);
            f[row] = f[row]! + coefficient * values[column]!;
            f[column] = f[column]! + coefficient * values[row]!;
            scale[row] = scale[row]! + Math.abs(coefficient * values[column]!);
            scale[column] = scale[column]! + Math.abs(coefficient * values[row]!);
          }
        }
      };
      idealSources.forEach(({ source }, i) =>
        constraint(
          voltageNets.length + i,
          [
            [source.positive, 1],
            [source.negative, -1],
          ],
          sourceValue(source),
        ),
      );
      windings.forEach((t, i) =>
        constraint(
          voltageNets.length + idealSources.length + i,
          [
            [t.primary[0], 1],
            [t.primary[1], -1],
            [t.secondary[0], -t.turnsRatio],
            [t.secondary[1], t.turnsRatio],
          ],
          zero(),
        ),
      );
      let norm = 0;
      for (let i = 0; i < size; i++)
        norm = Math.max(
          norm,
          Math.abs(f[i]!) / ((i < 2 * voltageNets.length ? 1e-9 : 1e-8) + 1e-8 * scale[i]!),
        );
      return { matrix, f, norm };
    };
    let values: Float64Array = new Float64Array(size);
    const initial = assemble(values, true);
    const seed = solveLinearSystem(
      initial.matrix,
      Float64Array.from(initial.f, (v) => -v),
    );
    if (seed.status !== 'solved')
      return fail(
        `profile-seed-${seed.status}`,
        'The declared circuit has singular, conflicting or out-of-bounds equations. No substitute grounding is introduced.',
      );
    values = seed.values;
    let changed = false;
    // Only the first nominal seed chooses initial off states. Later passes must
    // satisfy the exact accepted on/off equations or report a state cycle.
    if (pass === 0)
      for (const b of branches) {
        const l = b.profileLaw;
        if (b.closed && l?.kind === 'demand' && l.constantPowerWatts > 0) {
          const v = complexMagnitude(pair(values, b));
          if (
            v < l.operatingVoltageRange.min ||
            v > l.operatingVoltageRange.max ||
            !groupSources(groups.root(net.get(b.from)!)).length
          ) {
            enabled.set(b.id, false);
            changed = true;
          }
        }
      }
    if (changed) continue;
    let converged = false;
    let lastStep = Number.POSITIVE_INFINITY;
    let minimumPivot = seed.minimumScaledPivot;
    for (let iteration = 0; iteration < PROFILE_SOLVER_LIMITS.iterations; iteration++) {
      const system = assemble(values, false);
      if (
        Number.isFinite(system.norm) &&
        system.norm <= 1 &&
        (lastStep < 1e-7 || iteration === 0)
      ) {
        converged = true;
        break;
      }
      const delta = solveLinearSystem(
        system.matrix,
        Float64Array.from(system.f, (v) => -v),
      );
      if (delta.status !== 'solved')
        return fail(
          `profile-newton-${delta.status}`,
          'The profile Jacobian is singular or marginal, or failed its residual check. No measurements are accepted.',
        );
      minimumPivot = Math.min(minimumPivot, delta.minimumScaledPivot);
      let accepted = false;
      for (let line = 0; line <= PROFILE_SOLVER_LIMITS.lineSearch; line++) {
        const step = 2 ** -line;
        const trial = Float64Array.from(values, (v, i) => v + step * delta.values[i]!);
        const next = assemble(trial, false);
        if (Number.isFinite(next.norm) && (next.norm < system.norm || next.norm <= 1)) {
          values = trial;
          lastStep = Math.max(0, ...delta.values.map(Math.abs)) * step;
          accepted = true;
          break;
        }
      }
      if (!accepted)
        return fail(
          'profile-line-search',
          'No residual-decreasing Newton step exists within the declared limit; the load may have no regulated operating point.',
        );
    }
    if (!converged)
      return fail(
        'profile-iteration-limit',
        'The profile solver exhausted its bounded iteration budget.',
      );
    for (const b of branches) {
      const l = b.profileLaw;
      if (!b.closed || l?.kind !== 'demand' || l.constantPowerWatts <= 0) continue;
      const a = groups.root(net.get(b.from)!);
      const z = groups.root(net.get(b.to)!);
      if (a !== z) continue;
      const v = complexMagnitude(pair(values, b));
      const on =
        v >= l.operatingVoltageRange.min - 1e-8 &&
        v <= l.operatingVoltageRange.max + 1e-8 &&
        groupSources(a).length > 0;
      if (on !== enabled.get(b.id)) {
        enabled.set(b.id, on);
        changed = true;
      }
    }
    if (changed) continue;
    const result = base('converged');
    result.phasors = { terminalVoltages: {}, branchVoltages: {}, branchCurrents: {} };
    result.profileStates = {};
    result.checks = {
      absoluteTolerance: 1e-9,
      relativeTolerance: 1e-8,
      maximumKclResidualAmps: 0,
      maximumSourceResidualVolts: 0,
      maximumTransformerVoltageResidualVolts: 0,
      maximumTransformerCurrentResidualAmps: 0,
      maximumTransformerPowerResidualWatts: 0,
      maximumPowerResidualWatts: 0,
      maximumResidualRatio: assemble(values, false).norm,
      domains: [],
      couplingGroups: [
        {
          groupId: 'profile-system',
          domainIds: [...domains.keys()],
          transformerIds: windings.map((t) => t.componentId),
          unknowns: size,
          minimumScaledPivot: minimumPivot,
          maximumEquationResidualRatio: assemble(values, false).norm,
        },
      ],
    };
    for (const [d, ns] of domains) {
      const ss = groupSources(d);
      result.references.push({
        domainId: d,
        netId: references.get(d)!,
        terminalId: references.get(d)!,
        kind: 'mathematical-gauge',
        couplingGroupId: coupled.root(d),
        sourceIds: ss.map(({ source }) => source.id),
        voltageConvention: dcDomain(d) ? 'dc' : 'complex-rms',
        ...(ss[0]?.source.model.kind !== 'dc' && ss[0]
          ? { frequencyHz: ss[0].source.model.frequencyHz }
          : {}),
      });
      result.checks.domains.push({
        domainId: d,
        unknowns: 2 * Math.max(0, ns.length - 1),
        minimumScaledPivot: minimumPivot,
        maximumEquationResidualRatio: assemble(values, false).norm,
        absorbedPowerWatts: 0,
        deliveredPowerWatts: 0,
        powerResidualWatts: 0,
      });
    }
    for (const t of graph.terminals) {
      const v = at(values, net.get(t.id)!);
      result.phasors.terminalVoltages[t.id] = v;
      result.terminalVoltages[t.id] = display(v);
      result.terminalDomains[t.id] = groups.root(net.get(t.id)!);
    }
    idealSources.forEach(({ branch }, i) => {
      const k = 2 * (voltageNets.length + i);
      result.phasors!.branchCurrents[branch.id] = { real: values[k]!, imaginary: values[k + 1]! };
    });
    for (const { source, branch } of sources) result.sourceBranches[source.id] = branch.id;
    windings.forEach((t, i) => {
      const k = 2 * (voltageNets.length + idealSources.length + i);
      const ip = { real: values[k]!, imaginary: values[k + 1]! };
      result.phasors!.branchCurrents[t.primaryBranchId] = ip;
      result.phasors!.branchCurrents[t.secondaryBranchId] = {
        real: -t.turnsRatio * ip.real,
        imaginary: -t.turnsRatio * ip.imaginary,
      };
    });
    for (const b of branches) {
      const connected = groups.root(net.get(b.from)!) === groups.root(net.get(b.to)!);
      const v = connected ? pair(values, b) : undefined;
      if (v) {
        result.phasors.branchVoltages[b.id] = v;
        result.branchVoltages[b.id] = display(v);
      } else result.unavailableBranchVoltages[b.id] = 'independent-references';
      if (!b.closed || (b.profileLaw && !enabled.get(b.id)))
        result.phasors.branchCurrents[b.id] = zero();
      else if (
        !b.idealConductor &&
        b.kind !== 'winding' &&
        !(b.kind === 'source' && b.profileLaw?.kind !== 'pv')
      )
        result.phasors.branchCurrents[b.id] = evaluate(
          b.profileLaw,
          b,
          v ?? zero(),
          true,
          false,
          dcDomain(groups.root(net.get(b.from)!)),
        ).current;
      const l = b.profileLaw;
      if (l?.kind === 'pv' && v) {
        const voc =
          l.profile.openCircuitVoltage *
          (1 + l.profile.voltageTemperatureCoefficient * (l.profile.temperatureC - 25));
        if (v.real < -1e-7 || v.real > voc + 1e-7)
          return fail(
            'profile-pv-out-of-curve',
            'The PV operating point is outside its declared forward generating curve; reverse bias and overdrive are unassessed.',
            'unsupported',
            b.componentId,
          );
      }
      if (l?.kind === 'demand' && b.componentId) {
        const magnitude = v ? complexMagnitude(v) : null;
        result.profileStates[b.componentId] =
          !b.closed || magnitude === null
            ? 'disconnected'
            : l.mode === 'off'
              ? 'off'
              : l.conductance > 0 &&
                  (magnitude < l.operatingVoltageRange.min ||
                    magnitude > l.operatingVoltageRange.max)
                ? 'outside-running-band'
                : magnitude < l.operatingVoltageRange.min
                  ? 'undervoltage-off'
                  : magnitude > l.operatingVoltageRange.max
                    ? 'overvoltage-off'
                    : l.mode === 'standby'
                      ? 'standby'
                      : l.conductance > 0
                        ? 'running-equivalent'
                        : enabled.get(b.id)
                          ? 'on'
                          : 'off';
      }
    }
    const real = Object.fromEntries(
      Object.entries(result.phasors.branchCurrents).map(([id, i]) => [id, i.real]),
    );
    const imaginary = Object.fromEntries(
      Object.entries(result.phasors.branchCurrents).map(([id, i]) => [id, i.imaginary]),
    );
    recoverLinkCurrents(graph, real);
    recoverLinkCurrents(graph, imaginary);
    const sums = new Map(graph.terminals.map((t) => [t.id, [] as Complex[]]));
    const powers = new Map([...domains.keys()].map((d) => [d, [] as number[]]));
    for (const b of branches) {
      const i = { real: real[b.id] ?? 0, imaginary: imaginary[b.id] ?? 0 };
      result.phasors.branchCurrents[b.id] = i;
      result.branchCurrents[b.id] = display(i);
      const v = result.phasors.branchVoltages[b.id];
      const p = v ? power(v, i) : 0;
      if (!Number.isFinite(p) || !Number.isFinite(display(i)))
        return fail(
          'profile-nonfinite-measurement',
          'The accepted profile equations produced a non-finite quantity.',
        );
      result.branchPowers[b.id] = p;
      if (b.wireId && b.wire)
        result.wireLosses[b.wireId] = complexMagnitude(i) ** 2 * b.wire.resistanceOhms;
      sums.get(b.from)!.push(i);
      sums.get(b.to)!.push({ real: -i.real, imaginary: -i.imaginary });
      powers.get(result.terminalDomains[b.from]!)!.push(p);
    }
    for (const terms of sums.values()) {
      const residual = complexMagnitude({
        real: compensatedSum(terms.map((i) => i.real)),
        imaginary: compensatedSum(terms.map((i) => i.imaginary)),
      });
      result.checks.maximumKclResidualAmps = Math.max(
        result.checks.maximumKclResidualAmps,
        residual,
      );
      if (residual > 1e-8 + 1e-7 * terms.reduce((s, i) => s + complexMagnitude(i), 0))
        return fail('profile-kcl-failed', 'Physical-terminal complex KCL verification failed.');
    }
    for (const [d, ps] of powers) {
      const residual = compensatedSum(ps);
      result.checks.maximumPowerResidualWatts = Math.max(
        result.checks.maximumPowerResidualWatts,
        Math.abs(residual),
      );
      const check = result.checks.domains.find((v) => v.domainId === d)!;
      check.absorbedPowerWatts = compensatedSum(ps.filter((p) => p > 0));
      check.deliveredPowerWatts = -compensatedSum(ps.filter((p) => p < 0));
      check.powerResidualWatts = residual;
      if (Math.abs(residual) > 1e-8 + 1e-7 * ps.reduce((s, p) => s + Math.abs(p), 0))
        return fail('profile-power-failed', 'Per-domain real power conservation failed.');
    }
    for (const { source, branch } of idealSources) {
      const residual = complexMagnitude(
        difference(result.phasors.branchVoltages[branch.id]!, sourceValue(source)),
      );
      result.checks.maximumSourceResidualVolts = Math.max(
        result.checks.maximumSourceResidualVolts,
        residual,
      );
      if (residual > 1e-8 + 1e-8 * source.model.voltage)
        return fail('profile-source-kvl-failed', 'Source voltage-constraint verification failed.');
    }
    for (const t of windings) {
      const vp = result.phasors.branchVoltages[t.primaryBranchId]!;
      const vs = result.phasors.branchVoltages[t.secondaryBranchId]!;
      const ip = result.phasors.branchCurrents[t.primaryBranchId]!;
      const is = result.phasors.branchCurrents[t.secondaryBranchId]!;
      result.checks.maximumTransformerVoltageResidualVolts = Math.max(
        result.checks.maximumTransformerVoltageResidualVolts,
        complexMagnitude({
          real: vp.real - t.turnsRatio * vs.real,
          imaginary: vp.imaginary - t.turnsRatio * vs.imaginary,
        }),
      );
      const pd = result.terminalDomains[t.primary[0]]!;
      const sd = result.terminalDomains[t.secondary[0]]!;
      const ss = groupSources(pd);
      const model = graph.devices.find((d) => d.componentId === t.componentId)?.model;
      const shared = model?.kind === 'transformer' && model.isolation === 'shared-common';
      const currentResidual = complexMagnitude({
        real: is.real + t.turnsRatio * ip.real,
        imaginary: is.imaginary + t.turnsRatio * ip.imaginary,
      });
      const powerResidual = Math.abs(power(vp, ip) + power(vs, is));
      result.checks.maximumTransformerCurrentResidualAmps = Math.max(
        result.checks.maximumTransformerCurrentResidualAmps,
        currentResidual,
      );
      result.checks.maximumTransformerPowerResidualWatts = Math.max(
        result.checks.maximumTransformerPowerResidualWatts,
        powerResidual,
      );
      result.transformers.push({
        componentId: t.componentId,
        turnsRatio: t.turnsRatio,
        primaryBranchId: t.primaryBranchId,
        secondaryBranchId: t.secondaryBranchId,
        primaryDomainId: pd,
        secondaryDomainId: sd,
        connection: shared
          ? 'shared-common'
          : pd === sd
            ? 'externally-connected'
            : 'galvanically-isolated',
        primaryVoltageVolts: display(vp),
        secondaryVoltageVolts: display(vs),
        primaryCurrentAmps: display(ip),
        secondaryCurrentAmps: display(is),
        primaryPowerWatts: power(vp, ip),
        secondaryPowerWatts: power(vs, is),
        sourceIds: ss.map(({ source }) => source.id),
        frequencyHz:
          ss[0]?.source.model.kind === 'dc' ? null : (ss[0]?.source.model.frequencyHz ?? null),
        model: shared ? 'ideal-shared-common-ac' : 'ideal-isolated-ac',
        lossesAndSaturation: 'not-assessed',
      });
    }
    deriveEarthingMeasurements(graph, result);
    return deriveOperatingPoints(compiled, result, options);
  }
  return fail(
    'profile-state-limit',
    'The declared operating states exhausted their bounded selection limit.',
  );
}
