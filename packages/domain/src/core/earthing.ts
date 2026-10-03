import { conductorPaths } from './conductorPaths';
import type {
  ElectricalBranch,
  ElectricalDiagnostic,
  ElectricalSimulationResult,
  TerminalGraph,
} from './contracts';
import { circuitExcitation } from './excitation';
import { compareIds, terminalId } from './faultTopology';
import { LINEAR_SYSTEM_LIMITS } from './linearSystem';

export interface EarthingTopology {
  /** Explicit conductor connectivity only; no inferred supply N-PE or soil path. */
  bonds: {
    id: string;
    returns: { terminalId: string; kind: 'neutral' | 'dc-negative' | 'winding-terminal' }[];
    protectiveTerminals: string[];
    electrodeTerminals: string[];
    branchIds: string[];
    installationAssessment: 'not-assessed';
  }[];
  continuity: {
    componentId: string;
    terminalId: string;
    status: 'connected-to-reference' | 'open';
    referenceTerminalId: string | null;
    pathBranchIds: string[];
    returnBond: 'present' | 'absent';
    loopImpedanceAndClearing: 'not-assessed';
  }[];
  diagnostics: ElectricalDiagnostic[];
  assessment: 'not-assessed';
}

export interface ProtectiveCurrentMeasurement {
  branchId: string;
  wireId?: string;
  /** Positive from the compiled branch.from to branch.to. */
  currentAmps: number | null;
  basis: 'declared-network-estimate' | 'not-assessed';
}

export interface FaultCurrentMeasurement {
  faultId: string;
  branchId: string | null;
  currentAmps: number | null;
  basis: 'declared-network-estimate' | 'not-assessed';
  installationProspectiveCurrent: 'not-assessed';
  clearing: 'not-assessed';
}

export function emptyEarthingTopology(): EarthingTopology {
  return { bonds: [], continuity: [], diagnostics: [], assessment: 'not-assessed' };
}

/** Reference relationships follow drawn conductors, never voltage gauges. A PE
 * terminal/earth rod is a reference attachment, not a source or an implicit soil
 * impedance. Paths establish continuity only, not earthing-system compliance.
 */
export function assessEarthingTopology(
  graph: TerminalGraph,
  excitation = circuitExcitation(graph),
  normal = conductorPaths(graph, { omitFaults: true }),
): EarthingTopology {
  const result = emptyEarthingTopology();
  const protective = graph.terminals.filter((terminal) => terminal.role === 'pe');
  const hasContacts = graph.branches.some((branch) => branch.kind === 'contact');
  const pe = protective.length ? conductorPaths(graph, { omitFaults: true, peOnly: true }) : normal;
  const nonPe = protective.length
    ? conductorPaths(graph, { omitFaults: true, excludePe: true })
    : normal;
  const switchable = graph.branches.some((branch) => branch.kind === 'contact' && !branch.closed)
    ? conductorPaths(graph, { omitFaults: true, includeOpenContacts: true })
    : normal;
  const terminals = new Map(graph.terminals.map((terminal) => [terminal.id, terminal]));
  const terminalsByComponent = new Map<string, typeof graph.terminals>();
  for (const terminal of graph.terminals) {
    if (!terminal.port) continue;
    const list = terminalsByComponent.get(terminal.port.componentId) ?? [];
    list.push(terminal);
    terminalsByComponent.set(terminal.port.componentId, list);
  }
  const returns: EarthingTopology['bonds'][number]['returns'] = graph.references.flatMap((ref) =>
    ref.kind === 'neutral' || ref.kind === 'dc-negative'
      ? [{ terminalId: ref.terminal, kind: ref.kind }]
      : [],
  );
  for (const transformer of graph.transformers)
    for (const terminal of [...transformer.primary, ...transformer.secondary])
      returns.push({ terminalId: terminal, kind: 'winding-terminal' });
  returns.sort((a, b) => compareIds(a.terminalId, b.terminalId));
  const bondedGroups = new Set<string>();
  for (const reference of returns) {
    const group = normal.groupByTerminal.get(reference.terminalId)!;
    if (bondedGroups.has(group)) continue;
    const relatedPe = protective.filter(
      (terminal) => normal.groupByTerminal.get(terminal.id) === group,
    );
    if (!relatedPe.length) continue;
    bondedGroups.add(group);
    result.bonds.push({
      id: group,
      returns: returns.filter((item) => normal.groupByTerminal.get(item.terminalId) === group),
      protectiveTerminals: relatedPe.map((terminal) => terminal.id),
      electrodeTerminals: graph.references
        .filter(
          (ref) => ref.kind === 'electrode' && normal.groupByTerminal.get(ref.terminal) === group,
        )
        .map((ref) => ref.terminal),
      branchIds: graph.branches
        .filter(
          (branch) =>
            branch.closed &&
            branch.kind !== 'fault' &&
            (branch.kind === 'wire' || branch.idealConductor) &&
            normal.groupByTerminal.get(branch.from) === group,
        )
        .map((branch) => branch.id),
      installationAssessment: 'not-assessed',
    });
  }
  result.bonds.sort((a, b) => compareIds(a.id, b.id));
  const anchors = new Set<string>();
  for (const device of graph.devices) {
    if (device.model.kind === 'earth-reference')
      anchors.add(terminalId(device.componentId, device.model.port));
    if (device.model.kind === 'source')
      for (const terminal of protective)
        if (terminal.port?.componentId === device.componentId) anchors.add(terminal.id);
  }
  const orderedAnchors = [...anchors].sort(compareIds);
  for (const terminal of protective) {
    if (!terminal.port || anchors.has(terminal.id)) continue;
    const reference = orderedAnchors.find(
      (id) => pe.groupByTerminal.get(id) === pe.groupByTerminal.get(terminal.id),
    );
    const path = reference ? pe.path(terminal.id, reference) : undefined;
    result.continuity.push({
      componentId: terminal.port.componentId,
      terminalId: terminal.id,
      status: reference ? 'connected-to-reference' : 'open',
      referenceTerminalId: reference ?? null,
      pathBranchIds: path?.map((branch) => branch.id) ?? [],
      returnBond: bondedGroups.has(normal.groupByTerminal.get(terminal.id)!) ? 'present' : 'absent',
      loopImpedanceAndClearing: 'not-assessed',
    });
    if (!reference)
      result.diagnostics.push({
        code: 'pe-continuity-open',
        severity: 'warning',
        componentId: terminal.port.componentId,
        message:
          'This protective terminal has no intact PE conductor path to a named protective bus, source PE terminal or electrode. Fault-loop impedance and clearing are not assessed.',
      });
  }
  const { sourceBranches, sourcesByBranch } = excitation;
  const activeSourceIds = new Set(sourceBranches.values());
  const drives = graph.sources
    .filter((source) => activeSourceIds.has(source.id))
    .map((source) => ({
      id: source.id,
      positive: source.positive,
      negative: source.negative,
      namedPolarity: true,
    }));
  for (const transformer of graph.transformers)
    for (const [branchId, pair] of [
      [transformer.primaryBranchId, transformer.primary],
      [transformer.secondaryBranchId, transformer.secondary],
    ] as const)
      if (sourcesByBranch.get(branchId)?.length)
        drives.push({ id: branchId, positive: pair[0], negative: pair[1], namedPolarity: false });
  const seen = new Set<string>();
  const finding = (
    code: string,
    componentId: string | undefined,
    sourceId: string,
    message: string,
  ) => {
    const key = JSON.stringify([code, componentId, sourceId]);
    if (seen.has(key)) return;
    seen.add(key);
    result.diagnostics.push({ code, severity: 'error', componentId, sourceId, message });
  };
  for (const drive of drives) {
    const feedGroup = normal.groupByTerminal.get(drive.positive);
    if (
      drive.namedPolarity &&
      protective.some((terminal) => normal.groupByTerminal.get(terminal.id) === feedGroup)
    )
      finding(
        'line-connected-to-pe',
        undefined,
        drive.id,
        'A source line/positive terminal is directly connected to a protective terminal. PE is not a normal supply conductor.',
      );
    for (const device of graph.devices) {
      if (!['resistive-load', 'unassessed-load', 'outlet'].includes(device.model.kind)) continue;
      const deviceTerminals = terminalsByComponent.get(device.componentId) ?? [];
      const lines = deviceTerminals.filter((terminal) => terminal.role === 'line');
      const neutrals = deviceTerminals.filter((terminal) => terminal.role === 'neutral');
      if (lines.length !== 1 || neutrals.length !== 1) continue;
      const a = lines[0]!.id;
      const b = neutrals[0]!.id;
      if (
        drive.namedPolarity &&
        feedGroup !== normal.groupByTerminal.get(drive.negative) &&
        normal.groupByTerminal.get(a) === normal.groupByTerminal.get(drive.negative) &&
        normal.groupByTerminal.get(b) === feedGroup
      )
        finding(
          'polarity-reversed',
          device.componentId,
          drive.id,
          'The device line and return terminals are connected to the opposite named source terminals. The element response does not establish correct polarity.',
        );
      if (normal.groupByTerminal.get(a) !== feedGroup) continue;
      const peOnReturn = protective.some(
        (terminal) => normal.groupByTerminal.get(terminal.id) === normal.groupByTerminal.get(b),
      );
      if (peOnReturn && nonPe.groupByTerminal.get(b) !== nonPe.groupByTerminal.get(drive.negative))
        finding(
          'pe-used-as-normal-return',
          device.componentId,
          drive.id,
          'The device return is routed through protective earth instead of an independent normal return conductor. A floating PE bus cannot complete a powered circuit; an explicit bond can make this miswire carry load current.',
        );
      // Connectivity already establishes whether a path exists. Materialize
      // its edges only when a PE/contact finding needs the contents of it.
      const feed = protective.length || hasContacts ? (normal.path(a, drive.positive) ?? []) : [];
      if (
        feed.some(
          (branch) =>
            terminals.get(branch.from)?.role === 'pe' || terminals.get(branch.to)?.role === 'pe',
        )
      )
        finding(
          'pe-used-as-line',
          device.componentId,
          drive.id,
          'The device feed is routed through protective earth. Its calculated power is not evidence of a correct supply connection.',
        );
      if (drive.namedPolarity && hasContacts && !feed.some((branch) => branch.kind === 'contact')) {
        const possibleReturn = normal.path(b, drive.negative) ?? switchable.path(b, drive.negative);
        for (const contact of possibleReturn?.filter((branch) => branch.kind === 'contact') ?? [])
          finding(
            'neutral-only-switching',
            contact.componentId,
            drive.id,
            'This contact interrupts only the return while the device line terminal retains a direct source connection. Opening it does not isolate the line conductor.',
          );
      }
    }
  }
  result.diagnostics.sort((a, b) =>
    compareIds(
      JSON.stringify([a.code, a.componentId, a.sourceId]),
      JSON.stringify([b.code, b.componentId, b.sourceId]),
    ),
  );
  return result;
}

/** Measurements come only from accepted equations. Neither zero current on a
 * floating earth fault nor a finite ideal-source estimate certifies protection.
 */
export function deriveEarthingMeasurements(
  graph: TerminalGraph,
  result: ElectricalSimulationResult,
): void {
  result.diagnostics.push(...result.readiness.earthing.diagnostics);
  const pe = new Set(
    graph.terminals.filter((terminal) => terminal.role === 'pe').map((terminal) => terminal.id),
  );
  const read = (branch: ElectricalBranch | undefined): number | null => {
    if (result.status !== 'converged' || !branch) return null;
    const value = result.branchCurrents[branch.id];
    return value !== undefined && Number.isFinite(value) ? value : null;
  };
  for (const branch of graph.branches) {
    if (branch.kind !== 'wire' && !branch.idealConductor) continue;
    if (!pe.has(branch.from) && !pe.has(branch.to)) continue;
    const current = read(branch);
    result.protectiveCurrents.push({
      branchId: branch.id,
      ...(branch.wireId ? { wireId: branch.wireId } : {}),
      currentAmps: current,
      basis: current === null ? 'not-assessed' : 'declared-network-estimate',
    });
    if (current !== null && Math.abs(current) > LINEAR_SYSTEM_LIMITS.absoluteTolerance)
      result.diagnostics.push({
        code: 'protective-conductor-current',
        severity: 'warning',
        branchId: branch.id,
        wireId: branch.wireId,
        message:
          'A protective connection carries current in the declared network. Check fault paths and unintended load returns; residual protection, soil impedance and installation fault current are not assessed.',
      });
  }
  for (const fault of graph.faults) {
    if (!['short-circuit', 'earth-fault', 'live-to-earth'].includes(fault.type)) continue;
    const branch = graph.branches.find((edge) => edge.faultId === fault.id);
    const current = fault.coverage === 'not-assessed' ? null : read(branch);
    result.faultCurrents.push({
      faultId: fault.id,
      branchId: branch?.id ?? null,
      currentAmps: current,
      basis: current === null ? 'not-assessed' : 'declared-network-estimate',
      installationProspectiveCurrent: 'not-assessed',
      clearing: 'not-assessed',
    });
    result.diagnostics.push({
      code: 'fault-current-limited',
      severity: 'warning',
      faultId: fault.id,
      branchId: branch?.id,
      message:
        current === null
          ? 'Fault current is unavailable without an accepted solution and a declared path/impedance model. No fixed current or clearing time is substituted.'
          : 'This is a steady-state estimate using ideal sources and the explicitly modeled conductor path. Source/winding/soil impedances, touch voltage, installation prospective current and clearing are not assessed; zero current on a floating fault does not establish safety.',
    });
  }
  for (const winding of result.readiness.shortedWindings)
    result.diagnostics.push({
      code: 'transformer-winding-short',
      severity: 'error',
      componentId: winding.componentId,
      branchId: winding.branchId,
      message: `The ${winding.winding} winding is bypassed by a conductor path. Any accepted current is limited only by the modeled network; transformer/source impedance, saturation and protective clearing remain unassessed.`,
    });
}
