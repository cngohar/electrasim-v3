import { compileCircuit } from './compile';
import {
  type CompileOptions,
  type CompiledSource,
  type CompiledTransformer,
  ELECTRICAL_CONTRACT_VERSION,
  ELECTRICAL_MODEL_VERSION,
  type ElectricalBranch,
  type ElectricalDiagnostic,
  type ElectricalSimulationResult,
  type ModelCoverage,
} from './contracts';
import { transformerCoupling } from './coupling';
import { deriveEarthingMeasurements } from './earthing';
import { compareIds } from './faultTopology';
import {
  recoverLinkCurrents,
  verifyLinearMeasurements,
  voltageBetween,
} from './linearMeasurements';
import { LINEAR_SYSTEM_LIMITS, solveLinearSystem } from './linearSystem';
import { deriveOperatingPoints } from './operatingPoint';
import { type CircuitReadiness, assessCompiledCircuitReadiness } from './readiness';
import { inspectVoltageConstraints } from './voltageConstraints';

export const MNA_ENGINE_VERSION = 'mna-linear-2' as const;
/** Allocation/work limits for driven domains; passive homogeneous domains need
 * no factorization. Larger active systems await a separately accepted sparse solver.
 */
export const MNA_LIMITS = {
  maxUnknownsPerCouplingGroup: LINEAR_SYSTEM_LIMITS.maxUnknowns,
  /** Retained for existing callers; coupled domains share the same allocation bound. */
  maxUnknownsPerDomain: LINEAR_SYSTEM_LIMITS.maxUnknowns,
  maxTotalUnknowns: 2048,
  maxCubicWork: 2 * LINEAR_SYSTEM_LIMITS.maxUnknowns ** 3,
} as const;

function emptyResult(
  status: ElectricalSimulationResult['status'],
  diagnostics: ElectricalDiagnostic[],
  coverage: ModelCoverage[],
  readiness: CircuitReadiness,
): ElectricalSimulationResult {
  return {
    contractVersion: ELECTRICAL_CONTRACT_VERSION,
    engineVersion: MNA_ENGINE_VERSION,
    modelVersion: ELECTRICAL_MODEL_VERSION,
    status,
    diagnostics,
    coverage: [
      ...coverage,
      {
        subjectId: 'circuit',
        aspect: 'measurements',
        status: 'not-assessed',
        reason: 'No accepted linear solution is available for this document.',
      },
    ],
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
    readiness,
    loads: [],
    wires: [],
    deviceCurrents: [],
    operation: 'not-assessed',
    assessment: 'not-assessed',
  };
}

interface SourceBranch {
  source: CompiledSource;
  branch: ElectricalBranch;
}
interface DomainPlan {
  id: string;
  nets: string[];
  reference: string;
  sources: SourceBranch[];
  resistors: ElectricalBranch[];
  unknowns: number;
}
interface CouplingPlan {
  id: string;
  domains: DomainPlan[];
  sources: SourceBranch[];
  resistors: ElectricalBranch[];
  transformers: CompiledTransformer[];
  unknowns: number;
}

/** Fixed resistors, finite wires, static ideal contacts, independent DC supplies
 * and one single-phase RMS source per transformer-coupled equation group.
 * Does not advance controls, trip protection, damage parts or assess standards.
 * The app's legacy adapter is intentionally replaced in the later integration gate.
 */
export function solveCircuit(
  raw: unknown,
  options: CompileOptions = {},
): ElectricalSimulationResult {
  const compiled = compileCircuit(raw, options);
  const readiness = assessCompiledCircuitReadiness(compiled, options);
  if (compiled.status === 'invalid')
    return emptyResult('invalid', compiled.diagnostics, [], readiness);
  const { graph } = compiled;
  const coupling = transformerCoupling(graph);
  const coverage = compiled.coverage.filter((item) => item.aspect !== 'measurements');
  const unavailable = (
    status: ElectricalSimulationResult['status'],
    diagnostics: ElectricalDiagnostic[],
  ) => {
    const result = emptyResult(
      status,
      [...compiled.diagnostics, ...diagnostics],
      coverage,
      readiness,
    );
    deriveEarthingMeasurements(graph, result);
    return deriveOperatingPoints(compiled, result, options);
  };
  const unsupported = coverage.filter(
    (item) => item.status === 'not-assessed' && item.aspect !== 'protection',
  );
  if (unsupported.length)
    return unavailable(
      'unsupported',
      unsupported.map((item) => ({
        code: 'mna-model-unsupported',
        severity: 'warning',
        message: item.reason,
        ...(item.aspect === 'fault'
          ? { faultId: item.subjectId }
          : { componentId: item.subjectId }),
      })),
    );
  if (coupling.broken.length)
    return unavailable(
      'unsupported',
      coupling.broken.map((transformer) => ({
        code: 'mna-transformer-broken-winding',
        severity: 'warning',
        componentId: transformer.componentId,
        message:
          'An internally open winding needs a failure/magnetizing model. The ideal coupled winding constraint is not substituted across the break.',
      })),
    );
  const netByTerminal = new Map(
    graph.nets.flatMap((net) => net.terminals.map((id) => [id, net.id] as const)),
  );
  const domainByTerminal = new Map(
    graph.domains.flatMap((domain) => domain.terminals.map((id) => [id, domain.id] as const)),
  );
  const sourceByPair = new Map(
    graph.sources.map((source) => [JSON.stringify([source.positive, source.negative]), source]),
  );
  const sources: SourceBranch[] = [];
  const sourceBranches: Record<string, string> = {};
  const resistors: ElectricalBranch[] = [];
  const idealEdges = new Map<string, ElectricalBranch[]>();
  for (const branch of graph.branches) {
    if (branch.kind === 'source') {
      const source = sourceByPair.get(JSON.stringify([branch.from, branch.to]));
      if (!source)
        return unavailable('invalid', [
          {
            code: 'mna-missing-source',
            severity: 'error',
            message: 'Source branch has no declared voltage constraint.',
            branchId: branch.id,
          },
        ]);
      sourceBranches[source.id] = branch.id;
      if (branch.closed) sources.push({ source, branch });
    } else if (branch.closed && branch.idealConductor) {
      const net = netByTerminal.get(branch.from)!;
      const edges = idealEdges.get(net) ?? [];
      edges.push(branch);
      idealEdges.set(net, edges);
    } else if (branch.closed && branch.kind !== 'winding') {
      const resistance = branch.wire?.resistanceOhms ?? branch.resistanceOhms;
      if (resistance === undefined)
        return unavailable('unsupported', [
          {
            code: 'mna-branch-law-unknown',
            severity: 'warning',
            message: 'This closed branch has no supported voltage/current law.',
            branchId: branch.id,
            componentId: branch.componentId,
          },
        ]);
      if (!Number.isFinite(resistance) || resistance <= 0 || !Number.isFinite(1 / resistance))
        return unavailable('nonconverged', [
          {
            code: 'mna-resistance-range',
            severity: 'error',
            message: 'The declared resistance is outside the finite numerical range.',
            branchId: branch.id,
          },
        ]);
      resistors.push(branch);
    }
  }
  sources.sort((a, b) => compareIds(a.source.id, b.source.id));
  if (!sources.length)
    return unavailable('not-solved', [
      {
        code: graph.terminals.length ? 'mna-no-source' : 'mna-empty',
        severity: 'info',
        message: 'No active supported voltage source is available for a driven circuit solve.',
      },
    ]);
  const constraints = inspectVoltageConstraints(
    sources.map(({ source }) => ({
      id: source.id,
      positive: netByTerminal.get(source.positive)!,
      negative: netByTerminal.get(source.negative)!,
      voltage: source.model.voltage,
    })),
  );
  if (constraints.conflicting.length)
    return unavailable(
      'invalid',
      constraints.conflicting.map((sourceId) => ({
        code: 'mna-conflicting-source',
        severity: 'error',
        sourceId,
        message:
          'Ideal source voltage constraints contradict each other or a zero-impedance short. Declare the actual source/loop impedance before calculating current.',
      })),
    );
  if (constraints.redundant.length)
    return unavailable(
      'not-solved',
      constraints.redundant.map((sourceId) => ({
        code: 'mna-indeterminate-source-current',
        severity: 'error',
        sourceId,
        message:
          'Dependent ideal source constraints leave individual source currents indeterminate. Declare impedance; no equal split is assumed.',
      })),
    );
  for (const net of graph.nets) {
    const edges = idealEdges.get(net.id) ?? [];
    if (edges.length >= net.terminals.length)
      return unavailable('not-solved', [
        {
          code: 'mna-indeterminate-link-current',
          severity: 'error',
          branchId: edges[0]!.id,
          message:
            'A loop of zero-impedance links has indeterminate individual currents. Declare impedance or remove the redundant ideal path.',
        },
      ]);
  }
  const domainPlans: DomainPlan[] = graph.domains.map((domain) => {
    const nets = [...new Set(domain.terminals.map((id) => netByTerminal.get(id)!))].sort(
      compareIds,
    );
    const domainSources = sources.filter(
      ({ source }) => domainByTerminal.get(source.positive) === domain.id,
    );
    const windingReturn = coupling.active
      .flatMap((transformer) => [transformer.secondary[1], transformer.primary[1]])
      .find((id) => domainByTerminal.get(id) === domain.id);
    return {
      id: domain.id,
      nets,
      reference: domainSources[0]
        ? netByTerminal.get(domainSources[0].source.negative)!
        : windingReturn
          ? netByTerminal.get(windingReturn)!
          : nets[0]!,
      sources: domainSources,
      resistors: resistors.filter((branch) => domainByTerminal.get(branch.from) === domain.id),
      unknowns: nets.length - 1 + domainSources.length,
    };
  });
  const domainPlanById = new Map(domainPlans.map((plan) => [plan.id, plan]));
  const plans: CouplingPlan[] = coupling.groups.map((group) => {
    const domains = group.domainIds.map((id) => domainPlanById.get(id)!);
    return {
      id: group.id,
      domains,
      sources: domains
        .flatMap((domain) => domain.sources)
        .sort((a, b) => compareIds(a.source.id, b.source.id)),
      resistors: domains.flatMap((domain) => domain.resistors),
      transformers: group.transformers,
      unknowns:
        domains.reduce((sum, domain) => sum + domain.unknowns, 0) + group.transformers.length,
    };
  });
  const planByDomain = new Map(
    plans.flatMap((plan) => plan.domains.map((domain) => [domain.id, plan] as const)),
  );
  let totalUnknowns = 0;
  let cubicWork = 0;
  for (const plan of plans) {
    if (!plan.sources.length && !plan.transformers.length) continue;
    totalUnknowns += plan.unknowns;
    cubicWork += plan.unknowns ** 3;
    if (
      plan.unknowns > MNA_LIMITS.maxUnknownsPerCouplingGroup ||
      totalUnknowns > MNA_LIMITS.maxTotalUnknowns ||
      cubicWork > MNA_LIMITS.maxCubicWork
    )
      return unavailable('not-solved', [
        {
          code: 'mna-size-limit',
          severity: 'warning',
          domainId: plan.id,
          message: `The bounded dense solver supports at most ${MNA_LIMITS.maxUnknownsPerCouplingGroup} unknowns per coupled equation group and ${MNA_LIMITS.maxTotalUnknowns} total, within its declared work budget.`,
        },
      ]);
    if (!plan.sources.length) continue;
    const first = plan.sources[0]!.source.model;
    const models = plan.sources.map(({ source }) => source.model);
    if (plan.transformers.length && models.some((model) => model.kind === 'dc'))
      return unavailable('unsupported', [
        {
          code: 'mna-transformer-dc-unsupported',
          severity: 'warning',
          domainId: plan.id,
          message:
            'An ideal AC transformer cannot transfer steady DC. No rectifier, switching converter, winding resistance or saturation model is declared.',
        },
      ]);
    if (models.some((model) => model.kind !== first.kind))
      return unavailable('unsupported', [
        {
          code: 'mna-mixed-source-kinds',
          severity: 'warning',
          domainId: plan.id,
          message:
            'Joined AC/DC sources require a waveform/superposition model. Keep independently modeled supplies in separate conductive domains.',
        },
      ]);
    if (
      first.kind === 'ac-single-phase' &&
      models.some(
        (model) => model.kind === 'ac-single-phase' && model.frequencyHz !== first.frequencyHz,
      )
    )
      return unavailable('unsupported', [
        {
          code: 'mna-source-frequency-mismatch',
          severity: 'warning',
          domainId: plan.id,
          message:
            'Joined sources have different frequencies; a single real RMS solve cannot represent this network.',
        },
      ]);
    if (first.kind === 'ac-single-phase' && plan.sources.length > 1)
      return unavailable('unsupported', [
        {
          code: 'mna-ac-source-phase-unassessed',
          severity: 'warning',
          domainId: plan.id,
          message:
            'Relative phase/synchronization of independent AC sources is not declared. This slice supports one AC source per transformer-coupled equation group.',
        },
      ]);
  }
  for (const { componentId, model } of graph.devices) {
    if (model.kind !== 'resistive-load') continue;
    const branch = resistors.find(
      (edge) => edge.componentId === componentId && edge.kind === 'load',
    );
    const plan = branch && planByDomain.get(domainByTerminal.get(branch.from)!);
    if (plan?.sources.some(({ source }) => !model.supplyKinds.includes(source.model.kind)))
      return unavailable('unsupported', [
        {
          code: 'mna-load-supply-kind',
          severity: 'warning',
          componentId,
          message: 'The resistor approximation is not declared for this connected supply kind.',
        },
      ]);
  }
  const result = emptyResult('converged', [...compiled.diagnostics], coverage, readiness);
  result.sourceBranches = sourceBranches;
  result.checks = {
    relativeTolerance: LINEAR_SYSTEM_LIMITS.relativeTolerance,
    absoluteTolerance: LINEAR_SYSTEM_LIMITS.absoluteTolerance,
    maximumKclResidualAmps: 0,
    maximumSourceResidualVolts: 0,
    maximumTransformerVoltageResidualVolts: 0,
    maximumTransformerCurrentResidualAmps: 0,
    maximumTransformerPowerResidualWatts: 0,
    maximumPowerResidualWatts: 0,
    maximumResidualRatio: 0,
    couplingGroups: [],
    domains: [],
  };
  const potentials = new Map<string, number>();
  for (const plan of plans) {
    const model = plan.sources[0]?.source.model;
    for (const domain of plan.domains) {
      result.references.push({
        domainId: domain.id,
        netId: domain.reference,
        terminalId: domain.reference,
        kind: 'mathematical-gauge',
        couplingGroupId: plan.id,
        sourceIds: plan.sources.map(({ source }) => source.id),
        voltageConvention:
          model?.kind === 'dc'
            ? 'dc'
            : model?.kind === 'ac-single-phase'
              ? 'signed-rms'
              : 'passive-relative',
        ...(model?.kind === 'ac-single-phase' ? { frequencyHz: model.frequencyHz } : {}),
      });
      result.checks.domains.push({
        domainId: domain.id,
        unknowns: domain.unknowns,
        minimumScaledPivot: 1,
        maximumEquationResidualRatio: 0,
        absorbedPowerWatts: 0,
        deliveredPowerWatts: 0,
        powerResidualWatts: 0,
      });
    }
    const groupCheck = {
      groupId: plan.id,
      domainIds: plan.domains.map((domain) => domain.id),
      transformerIds: plan.transformers.map((transformer) => transformer.componentId),
      unknowns: plan.unknowns,
      minimumScaledPivot: 1,
      maximumEquationResidualRatio: 0,
    };
    result.checks.couplingGroups.push(groupCheck);
    if (!plan.sources.length && !plan.transformers.length) {
      // Positive resistances and no source have a unique zero-difference solution
      // after choosing a gauge. This creates no earth bond or measurable cross-domain voltage.
      for (const domain of plan.domains) for (const net of domain.nets) potentials.set(net, 0);
      continue;
    }
    const voltageNets = plan.domains.flatMap((domain) =>
      domain.nets.filter((id) => id !== domain.reference),
    );
    const indices = new Map(voltageNets.map((id, index) => [id, index]));
    const matrix = Array.from({ length: plan.unknowns }, () => new Float64Array(plan.unknowns));
    const rhs = new Float64Array(plan.unknowns);
    const stamp = (row: number, column: number, value: number) => {
      const coefficients = matrix[row]!;
      coefficients[column] = coefficients[column]! + value;
    };
    for (const branch of plan.resistors) {
      const from = netByTerminal.get(branch.from)!;
      const to = netByTerminal.get(branch.to)!;
      if (from === to) continue;
      const a = indices.get(from);
      const b = indices.get(to);
      const conductance = 1 / (branch.wire?.resistanceOhms ?? branch.resistanceOhms!);
      if (a !== undefined) stamp(a, a, conductance);
      if (b !== undefined) stamp(b, b, conductance);
      if (a !== undefined && b !== undefined) {
        stamp(a, b, -conductance);
        stamp(b, a, -conductance);
      }
    }
    plan.sources.forEach(({ source }, index) => {
      const currentIndex = voltageNets.length + index;
      const positive = indices.get(netByTerminal.get(source.positive)!);
      const negative = indices.get(netByTerminal.get(source.negative)!);
      if (positive !== undefined) {
        stamp(positive, currentIndex, 1);
        stamp(currentIndex, positive, 1);
      }
      if (negative !== undefined) {
        stamp(negative, currentIndex, -1);
        stamp(currentIndex, negative, -1);
      }
      rhs[currentIndex] = source.model.voltage;
    });
    plan.transformers.forEach((transformer, index) => {
      // One current unknown Ip, with Is = -n*Ip. The same incidence column
      // and constraint row enforce Vp - n*Vs = 0 and lossless power transfer.
      const currentIndex = voltageNets.length + plan.sources.length + index;
      for (const [terminal, coefficient] of [
        [transformer.primary[0], 1],
        [transformer.primary[1], -1],
        [transformer.secondary[0], -transformer.turnsRatio],
        [transformer.secondary[1], transformer.turnsRatio],
      ] as const) {
        const node = indices.get(netByTerminal.get(terminal)!);
        if (node !== undefined) {
          stamp(node, currentIndex, coefficient);
          stamp(currentIndex, node, coefficient);
        }
      }
    });
    const solved = solveLinearSystem(matrix, rhs);
    if (solved.status !== 'solved')
      return unavailable('nonconverged', [
        {
          code: `mna-linear-${solved.status}`,
          severity: 'error',
          domainId: plan.id,
          message: `The linear equations are ${solved.status}; no measurements are accepted and no resistance or grounding is substituted.`,
        },
      ]);
    groupCheck.minimumScaledPivot = solved.minimumScaledPivot;
    groupCheck.maximumEquationResidualRatio = solved.maximumResidualRatio;
    for (const domain of result.checks.domains.filter((entry) =>
      groupCheck.domainIds.includes(entry.domainId),
    )) {
      domain.minimumScaledPivot = solved.minimumScaledPivot;
      domain.maximumEquationResidualRatio = solved.maximumResidualRatio;
    }
    result.checks.maximumResidualRatio = Math.max(
      result.checks.maximumResidualRatio,
      solved.maximumResidualRatio,
    );
    for (const domain of plan.domains) potentials.set(domain.reference, 0);
    for (const [net, index] of indices) potentials.set(net, solved.values[index]!);
    plan.sources.forEach(({ branch }, index) => {
      result.branchCurrents[branch.id] = solved.values[voltageNets.length + index]!;
    });
    plan.transformers.forEach((transformer, index) => {
      const current = solved.values[voltageNets.length + plan.sources.length + index]!;
      result.branchCurrents[transformer.primaryBranchId] = current;
      result.branchCurrents[transformer.secondaryBranchId] = -transformer.turnsRatio * current;
    });
  }
  for (const terminal of graph.terminals) {
    result.terminalVoltages[terminal.id] = potentials.get(netByTerminal.get(terminal.id)!)!;
    result.terminalDomains[terminal.id] = domainByTerminal.get(terminal.id)!;
  }
  for (const branch of graph.branches) {
    const voltage = voltageBetween(result, branch.from, branch.to);
    if (voltage === undefined)
      result.unavailableBranchVoltages[branch.id] = 'independent-references';
    else result.branchVoltages[branch.id] = voltage;
    if (!branch.closed) result.branchCurrents[branch.id] = 0;
    else if (!branch.idealConductor && branch.kind !== 'source' && branch.kind !== 'winding')
      result.branchCurrents[branch.id] =
        voltage! / (branch.wire?.resistanceOhms ?? branch.resistanceOhms!);
  }
  recoverLinkCurrents(graph, result.branchCurrents);
  for (const branch of graph.branches) {
    const current = result.branchCurrents[branch.id]!;
    result.branchPowers[branch.id] = branch.closed
      ? result.branchVoltages[branch.id]! * current
      : 0;
    if (branch.wireId && branch.wire)
      result.wireLosses[branch.wireId] = current * current * branch.wire.resistanceOhms;
  }
  for (const transformer of coupling.active) {
    const primaryDomainId = domainByTerminal.get(transformer.primary[0])!;
    const secondaryDomainId = domainByTerminal.get(transformer.secondary[0])!;
    const plan = planByDomain.get(primaryDomainId)!;
    const model = plan.sources[0]?.source.model;
    result.transformers.push({
      componentId: transformer.componentId,
      turnsRatio: transformer.turnsRatio,
      primaryBranchId: transformer.primaryBranchId,
      secondaryBranchId: transformer.secondaryBranchId,
      primaryDomainId,
      secondaryDomainId,
      connection:
        primaryDomainId === secondaryDomainId ? 'externally-connected' : 'galvanically-isolated',
      primaryVoltageVolts: result.branchVoltages[transformer.primaryBranchId]!,
      secondaryVoltageVolts: result.branchVoltages[transformer.secondaryBranchId]!,
      primaryCurrentAmps: result.branchCurrents[transformer.primaryBranchId]!,
      secondaryCurrentAmps: result.branchCurrents[transformer.secondaryBranchId]!,
      primaryPowerWatts: result.branchPowers[transformer.primaryBranchId]!,
      secondaryPowerWatts: result.branchPowers[transformer.secondaryBranchId]!,
      sourceIds: plan.sources.map(({ source }) => source.id),
      frequencyHz: model?.kind === 'ac-single-phase' ? model.frequencyHz : null,
      model: 'ideal-isolated-ac',
      lossesAndSaturation: 'not-assessed',
    });
  }
  if (!verifyLinearMeasurements(graph, result))
    return unavailable('nonconverged', [
      {
        code: 'mna-conservation-failed',
        severity: 'error',
        message:
          'The solution failed finite-value, terminal KCL, source/transformer constraints or per-domain power checks; no measurements are accepted.',
      },
    ]);
  result.coverage = [
    ...coverage.map(
      (item): ModelCoverage =>
        item.aspect === 'source'
          ? {
              ...item,
              status: 'estimated',
              reason:
                'Configured ideal source constraint. Source impedance, synchronization between independent AC sources and installation prospective fault current are not assessed.',
            }
          : item,
    ),
    {
      subjectId: 'circuit',
      aspect: 'measurements',
      status: 'estimated',
      reason:
        'Accepted linear DC / single-source RMS solution with finite wire resistance at 20 C, declared load response and ideal isolated AC transformers. Mathematical references add no PE bond. Unknown operating ranges, transformer losses/saturation, trip/damage and standards assessment remain unassessed.',
    },
  ];
  deriveEarthingMeasurements(graph, result);
  return deriveOperatingPoints(compiled, result, options);
}

export { voltageBetween } from './linearMeasurements';
