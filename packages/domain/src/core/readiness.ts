import { COMPONENT_DEFS } from '../components';
import { type DeviceCapabilities, resolveDeviceCapabilities } from './capabilities';
import { type CompatibilityResult, assessTerminalCompatibility } from './compatibility';
import { compileCircuit } from './compile';
import { conductorPaths } from './conductorPaths';
import {
  type CompileOptions,
  type CompileResult,
  ELECTRICAL_MODEL_VERSION,
  type ElectricalDiagnostic,
  type ModelCoverage,
} from './contracts';
import { type EarthingTopology, assessEarthingTopology, emptyEarthingTopology } from './earthing';
import { circuitExcitation } from './excitation';
import { compareIds, terminalId } from './faultTopology';
import { inspectVoltageConstraints } from './voltageConstraints';

export type CircuitTopologyReadiness =
  | 'invalid'
  | 'empty'
  | 'no-source'
  | 'no-load'
  | 'open'
  | 'partial'
  | 'connected'
  | 'short';
export interface CircuitReadiness {
  modelVersion: typeof ELECTRICAL_MODEL_VERSION;
  topology: CircuitTopologyReadiness;
  /** Compilation/path checks are not convergence, operation or a safety assessment. */
  calculation: 'not-performed';
  operation: 'not-assessed';
  assessment: 'not-assessed';
  diagnosticRunAvailable: boolean;
  compatibility: CompatibilityResult['status'];
  groups: {
    componentId: string;
    groupId: string;
    domainIds: string[];
    sourceIds: string[];
    result: CompatibilityResult;
  }[];
  loadPaths: {
    branchId: string;
    componentId: string;
    state: 'closed-path' | 'open';
    sourceIds: string[];
  }[];
  shortedSourceIds: string[];
  shortedWindings: {
    componentId: string;
    winding: 'primary' | 'secondary';
    branchId: string;
    sourceIds: string[];
  }[];
  diagnostics: ElectricalDiagnostic[];
  coverage: ModelCoverage[];
  capabilities: DeviceCapabilities[];
  earthing: EarthingTopology;
}

/** Shared preflight for every future UI/worker/exercise entry point. Independent
 * terminal groups retain their own supplies; no global-voltage/first-source guess.
 * Results deliberately contain no fabricated current, voltage or successful run.
 */
export function assessCircuitReadiness(
  raw: unknown,
  options: CompileOptions = {},
): CircuitReadiness {
  return assessCompiledCircuitReadiness(compileCircuit(raw, options), options);
}

/** Reuse the same validated graph in MNA without compiling the document twice. */
export function assessCompiledCircuitReadiness(
  compiled: CompileResult,
  options: CompileOptions = {},
): CircuitReadiness {
  const base: CircuitReadiness = {
    modelVersion: ELECTRICAL_MODEL_VERSION,
    topology: 'invalid',
    calculation: 'not-performed',
    operation: 'not-assessed',
    assessment: 'not-assessed',
    diagnosticRunAvailable: false,
    compatibility: 'unassessed',
    groups: [],
    loadPaths: [],
    shortedSourceIds: [],
    shortedWindings: [],
    diagnostics: [...compiled.diagnostics],
    coverage: [],
    capabilities: [],
    earthing: emptyEarthingTopology(),
  };
  if (compiled.status === 'invalid') return base;
  const { graph, circuit } = compiled;
  base.coverage = compiled.coverage;
  if (!circuit.components.length) {
    base.topology = 'empty';
    base.diagnostics.push({
      code: 'empty-circuit',
      severity: 'info',
      message: 'Add a source and components.',
    });
    return base;
  }
  const excitation = circuitExcitation(graph);
  const { sourceBranches, pathSources, sourcesByBranch } = excitation;
  const activeSourceIds = new Set(sourceBranches.values());
  base.loadPaths = graph.branches
    .filter((b) => b.kind === 'load' || b.kind === 'coil' || b.kind === 'control-supply')
    .map((b) => ({
      branchId: b.id,
      componentId: b.componentId ?? '',
      state: pathSources.has(b.id) ? 'closed-path' : 'open',
      sourceIds: [...(pathSources.get(b.id) ?? [])].sort(compareIds),
    }));
  // Connectivity of conductors only. This is a topology test, not a zero-resistance
  // approximation: finite wire resistance is retained by the compiler for MNA.
  const conductors = conductorPaths(graph);
  const conductorGroup = conductors.groupByTerminal;
  base.shortedSourceIds = graph.sources
    .filter(
      (s) =>
        activeSourceIds.has(s.id) &&
        (conductorGroup.get(s.positive) === conductorGroup.get(s.negative) ||
          (s.phaseSystemId !== undefined &&
            graph.sources.some(
              (other) =>
                activeSourceIds.has(other.id) &&
                other.phaseSystemId === s.phaseSystemId &&
                other.phase !== s.phase &&
                conductorGroup.get(other.positive) === conductorGroup.get(s.positive),
            ))),
    )
    .map((s) => s.id);
  for (const transformer of graph.transformers)
    for (const [winding, terminals, branchId] of [
      ['primary', transformer.primary, transformer.primaryBranchId],
      ['secondary', transformer.secondary, transformer.secondaryBranchId],
    ] as const) {
      const sourceIds = sourcesByBranch.get(branchId) ?? [];
      if (sourceIds.length && conductorGroup.get(terminals[0]) === conductorGroup.get(terminals[1]))
        base.shortedWindings.push({
          componentId: transformer.componentId,
          winding,
          branchId,
          sourceIds,
        });
    }
  const complete = base.loadPaths.filter((path) => path.state === 'closed-path').length;
  base.topology =
    base.shortedSourceIds.length || base.shortedWindings.length
      ? 'short'
      : !activeSourceIds.size
        ? 'no-source'
        : !base.loadPaths.length
          ? 'no-load'
          : !complete
            ? 'open'
            : complete < base.loadPaths.length
              ? 'partial'
              : 'connected';
  base.diagnosticRunAvailable = activeSourceIds.size > 0;
  const messages: Partial<Record<CircuitTopologyReadiness, string>> = {
    'no-source': 'No active modeled supply is connected; unsupported sources require model review.',
    'no-load':
      'No complete load path; connect a load and return, or use an explicit no-load diagnostic.',
    open: 'No complete source/load path. Open switches may be intentional; diagnostic voltage requires a solve.',
    partial: 'Some loads have a complete source path; other branches are open or disconnected.',
    short:
      'A conductive path bypasses the loads across a source or transformer winding. Fault current and clearing behavior require the solver and declared impedance.',
  };
  const message = messages[base.topology];
  if (message)
    base.diagnostics.push({
      code: `readiness-${base.topology}`,
      severity: base.topology === 'short' ? 'error' : 'info',
      message,
    });
  const domainByTerminal = new Map(
    graph.domains.flatMap((d) => d.terminals.map((t) => [t, d] as const)),
  );
  const models = new Map(graph.devices.map((d) => [d.componentId, d.model]));
  const branchesByComponent = new Map<string, typeof graph.branches>();
  for (const branch of graph.branches) {
    if (!branch.componentId) continue;
    const branches = branchesByComponent.get(branch.componentId) ?? [];
    branches.push(branch);
    branchesByComponent.set(branch.componentId, branches);
  }
  const defs = options.defs ?? COMPONENT_DEFS;
  for (const component of [...circuit.components].sort((a, b) => compareIds(a.id, b.id))) {
    const capability = resolveDeviceCapabilities(
      component,
      circuit,
      defs[component.type],
      models.get(component.id),
    );
    base.capabilities.push(capability);
    for (const group of capability.groups) {
      const terminals = group.ports.map((port) => terminalId(component.id, port));
      const domains = [
        ...new Set(
          terminals
            .map((t) => domainByTerminal.get(t)?.id)
            .filter((id): id is string => id !== undefined),
        ),
      ].sort(compareIds);
      const availableSources = graph.sources.filter(
        (source) =>
          activeSourceIds.has(source.id) &&
          terminals.some((t) => domainByTerminal.get(t)?.sourceIds.includes(source.id)),
      );
      const coupledSourceIds = new Set(
        (branchesByComponent.get(component.id) ?? [])
          .filter((branch) => terminals.includes(branch.from) && terminals.includes(branch.to))
          .flatMap((branch) => sourcesByBranch.get(branch.id) ?? []),
      );
      const directlyWired =
        terminals.length === 2
          ? availableSources.filter((source) => {
              const [a, b] = terminals.map((t) => conductorGroup.get(t));
              const p = conductorGroup.get(source.positive);
              const n = conductorGroup.get(source.negative);
              return (a === p && b === n) || (a === n && b === p);
            })
          : [];
      const sources = directlyWired.length
        ? directlyWired
        : availableSources.length
          ? availableSources
          : graph.sources.filter((source) => coupledSourceIds.has(source.id));
      const result =
        sources.length > 1 &&
        !(
          sources[0]?.phaseSystemId &&
          sources.every((s) => s.phaseSystemId === sources[0]?.phaseSystemId)
        ) &&
        group.role !== 'source' &&
        group.role !== 'reference'
          ? {
              status: 'unassessed' as const,
              reasons: [
                {
                  code: 'multiple-sources' as const,
                  severity: 'warning' as const,
                  basis: 'declared-model' as const,
                  message:
                    'Multiple sources affect this terminal group; compatibility requires the solved operating point.',
                },
              ],
            }
          : assessTerminalCompatibility(group, {
              supply: sources[0]?.model,
              compareNominalVoltage: directlyWired.length === 1,
            });
      base.groups.push({
        componentId: component.id,
        groupId: group.id,
        domainIds: domains,
        sourceIds: sources.map((s) => s.id),
        result,
      });
    }
  }
  base.compatibility = base.groups.some((g) => g.result.status === 'incompatible')
    ? 'incompatible'
    : base.groups.some((g) => g.result.status === 'unassessed')
      ? 'unassessed'
      : 'compatible';
  base.earthing = assessEarthingTopology(
    graph,
    excitation,
    graph.branches.some((branch) => branch.kind === 'fault') ? undefined : conductors,
  );
  base.diagnostics.push(...base.earthing.diagnostics);
  const netByTerminal = new Map(
    graph.nets.flatMap((net) => net.terminals.map((t) => [t, net.id] as const)),
  );
  const constraints = inspectVoltageConstraints(
    graph.sources
      .filter((s) => activeSourceIds.has(s.id))
      .map((s) => ({
        id: s.id,
        positive: netByTerminal.get(s.positive)!,
        negative: netByTerminal.get(s.negative)!,
        voltage: s.model.voltage,
        ...(s.phaseAngleDegrees === undefined ? {} : { phaseAngleDegrees: s.phaseAngleDegrees }),
      })),
  );
  if (constraints.conflicting.length) {
    base.topology = 'invalid';
    base.diagnosticRunAvailable = false;
    for (const id of constraints.conflicting) {
      const source = graph.sources.find((s) => s.id === id);
      base.diagnostics.push({
        code: 'source-constraint-conflict',
        severity: 'error',
        componentId: source?.componentIds[0],
        message:
          'Contradictory ideal source constraints. Separate the sources or add declared impedance before calculating.',
      });
    }
  }
  return base;
}
