import { COMPONENT_DEFS } from '../components';
import { type DeviceCapabilities, resolveDeviceCapabilities } from './capabilities';
import { type CompatibilityResult, assessTerminalCompatibility } from './compatibility';
import { compileCircuit } from './compile';
import {
  type CompileOptions,
  type CompileResult,
  ELECTRICAL_MODEL_VERSION,
  type ElectricalBranch,
  type ElectricalDiagnostic,
  type ModelCoverage,
} from './contracts';
import { compareIds, terminalId } from './faultTopology';
import { closedPathBlocks } from './pathBlocks';

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
  diagnostics: ElectricalDiagnostic[];
  coverage: ModelCoverage[];
  capabilities: DeviceCapabilities[];
}

function isConductor(branch: ElectricalBranch): boolean {
  return branch.closed && (branch.idealConductor || branch.kind === 'wire');
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
    diagnostics: [...compiled.diagnostics],
    coverage: [],
    capabilities: [],
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
  const sourceBranches = new Map<string, string>();
  for (const edge of graph.branches) {
    if (edge.kind !== 'source' || !edge.closed) continue;
    const source = graph.sources.find((s) => s.positive === edge.from && s.negative === edge.to);
    if (source) sourceBranches.set(edge.id, source.id);
  }
  const activeSourceIds = new Set(sourceBranches.values());
  const pathSources = new Map<string, Set<string>>();
  for (const block of closedPathBlocks(graph.branches)) {
    if (block.length < 2) continue;
    const sources = block.flatMap((edge) => {
      const id = sourceBranches.get(edge.id);
      return id ? [id] : [];
    });
    if (!sources.length) continue;
    for (const edge of block) pathSources.set(edge.id, new Set(sources));
  }
  base.loadPaths = graph.branches
    .filter((b) => b.kind === 'load' || b.kind === 'coil' || b.kind === 'winding')
    .map((b) => ({
      branchId: b.id,
      componentId: b.componentId ?? '',
      state: pathSources.has(b.id) ? 'closed-path' : 'open',
      sourceIds: [...(pathSources.get(b.id) ?? [])].sort(compareIds),
    }));
  // Connectivity of conductors only. This is a topology test, not a zero-resistance
  // approximation: finite wire resistance is retained by the compiler for MNA.
  const conductorAdj = new Map<string, string[]>();
  for (const edge of graph.branches.filter(isConductor)) {
    conductorAdj.set(edge.from, [...(conductorAdj.get(edge.from) ?? []), edge.to]);
    conductorAdj.set(edge.to, [...(conductorAdj.get(edge.to) ?? []), edge.from]);
  }
  const conductorGroup = new Map<string, string>();
  for (const terminal of graph.terminals) {
    if (conductorGroup.has(terminal.id)) continue;
    const queue = [terminal.id];
    conductorGroup.set(terminal.id, terminal.id);
    for (let i = 0; i < queue.length; i++) {
      for (const next of conductorAdj.get(queue[i] ?? '') ?? []) {
        if (conductorGroup.has(next)) continue;
        conductorGroup.set(next, terminal.id);
        queue.push(next);
      }
    }
  }
  base.shortedSourceIds = graph.sources
    .filter(
      (s) =>
        activeSourceIds.has(s.id) &&
        conductorGroup.get(s.positive) === conductorGroup.get(s.negative),
    )
    .map((s) => s.id);
  const complete = base.loadPaths.filter((path) => path.state === 'closed-path').length;
  base.topology = base.shortedSourceIds.length
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
      'A conductive path bypasses the loads across a source. Fault current and clearing behavior require the solver and declared impedance.',
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
      const directlyWired =
        terminals.length === 2
          ? availableSources.filter((source) => {
              const [a, b] = terminals.map((t) => conductorGroup.get(t));
              const p = conductorGroup.get(source.positive);
              const n = conductorGroup.get(source.negative);
              return (a === p && b === n) || (a === n && b === p);
            })
          : [];
      const sources = directlyWired.length ? directlyWired : availableSources;
      const result =
        sources.length > 1 && group.role !== 'source' && group.role !== 'reference'
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
  return base;
}
