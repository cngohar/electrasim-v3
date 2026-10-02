import type { ElectricalBranch, ElectricalSimulationResult, TerminalGraph } from './contracts';
import { compensatedSum, residualRatio } from './linearSystem';

/** Potentials from independent mathematical references cannot be subtracted. */
export function voltageBetween(
  result: ElectricalSimulationResult,
  from: string,
  to: string,
): number | undefined {
  if (
    result.status !== 'converged' ||
    !Object.hasOwn(result.terminalVoltages, from) ||
    !Object.hasOwn(result.terminalVoltages, to)
  )
    return undefined;
  const domain = result.terminalDomains[from];
  const a = result.terminalVoltages[from];
  const b = result.terminalVoltages[to];
  return domain !== undefined &&
    domain === result.terminalDomains[to] &&
    a !== undefined &&
    b !== undefined &&
    Number.isFinite(a) &&
    Number.isFinite(b)
    ? a - b
    : undefined;
}

/** Recover currents in the forest of collapsed ideal links. Source and resistive
 * branch currents must already be assigned. Cyclic ideal paths are rejected by
 * the preparation step because their individual currents are not identifiable.
 */
export function recoverLinkCurrents(graph: TerminalGraph, currents: Record<string, number>): void {
  const outflow = new Map(graph.terminals.map((terminal) => [terminal.id, 0]));
  const adjacency = new Map<string, { terminal: string; edge: ElectricalBranch }[]>();
  const append = (terminal: string, next: string, edge: ElectricalBranch) => {
    const adjacent = adjacency.get(terminal) ?? [];
    adjacent.push({ terminal: next, edge });
    adjacency.set(terminal, adjacent);
  };
  for (const edge of graph.branches) {
    if (edge.closed && edge.idealConductor) {
      append(edge.from, edge.to, edge);
      append(edge.to, edge.from, edge);
    } else {
      const current = currents[edge.id]!;
      outflow.set(edge.from, outflow.get(edge.from)! + current);
      outflow.set(edge.to, outflow.get(edge.to)! - current);
    }
  }
  for (const net of graph.nets) {
    const root = net.terminals[0]!;
    const order = [root];
    const parent = new Map<string, { terminal: string; edge: ElectricalBranch }>();
    const visited = new Set([root]);
    for (let index = 0; index < order.length; index++) {
      const terminal = order[index]!;
      for (const next of adjacency.get(terminal) ?? []) {
        if (visited.has(next.terminal)) continue;
        visited.add(next.terminal);
        parent.set(next.terminal, { terminal, edge: next.edge });
        order.push(next.terminal);
      }
    }
    for (let index = order.length - 1; index > 0; index--) {
      const terminal = order[index]!;
      const connection = parent.get(terminal)!;
      const subtotal = outflow.get(terminal)!;
      currents[connection.edge.id] = connection.edge.from === terminal ? -subtotal : subtotal;
      outflow.set(connection.terminal, outflow.get(connection.terminal)! + subtotal);
    }
  }
}

/** Verify KCL at physical terminals (including recovered contacts), source KVL,
 * and power separately in every galvanic domain. An unrelated domain cannot
 * cancel an error. Return false without a successful measurement if any check fails.
 */
export function verifyLinearMeasurements(
  graph: TerminalGraph,
  result: ElectricalSimulationResult,
): boolean {
  const checks = result.checks;
  if (!checks) return false;
  for (const measurements of [result.terminalVoltages, result.branchVoltages, result.wireLosses])
    if (Object.values(measurements).some((value) => !Number.isFinite(value))) return false;
  const terminalCurrents = new Map(
    graph.terminals.map((terminal) => [terminal.id, [] as number[]]),
  );
  const powerByDomain = new Map<string, number[]>();
  for (const edge of graph.branches) {
    const current = result.branchCurrents[edge.id]!;
    const power = result.branchPowers[edge.id]!;
    if (!Number.isFinite(current) || !Number.isFinite(power)) return false;
    terminalCurrents.get(edge.from)!.push(current);
    terminalCurrents.get(edge.to)!.push(-current);
    const domain = result.terminalDomains[edge.from]!;
    const powers = powerByDomain.get(domain) ?? [];
    powers.push(power);
    powerByDomain.set(domain, powers);
  }
  for (const terms of terminalCurrents.values()) {
    const residual = compensatedSum(terms);
    const ratio = residualRatio(residual, compensatedSum(terms.map(Math.abs)));
    checks.maximumKclResidualAmps = Math.max(checks.maximumKclResidualAmps, Math.abs(residual));
    checks.maximumResidualRatio = Math.max(checks.maximumResidualRatio, ratio);
  }
  for (const source of graph.sources) {
    const branchId = result.sourceBranches[source.id];
    const branch = graph.branches.find((edge) => edge.id === branchId);
    if (!branch?.closed) continue;
    const voltage = result.branchVoltages[branch.id]!;
    const residual = voltage - source.model.voltage;
    const ratio = residualRatio(residual, Math.max(Math.abs(voltage), source.model.voltage));
    checks.maximumSourceResidualVolts = Math.max(
      checks.maximumSourceResidualVolts,
      Math.abs(residual),
    );
    checks.maximumResidualRatio = Math.max(checks.maximumResidualRatio, ratio);
  }
  for (const domain of checks.domains) {
    const powers = powerByDomain.get(domain.domainId) ?? [];
    const residual = compensatedSum(powers);
    const ratio = residualRatio(residual, compensatedSum(powers.map(Math.abs)));
    domain.absorbedPowerWatts = compensatedSum(powers.filter((power) => power > 0));
    domain.deliveredPowerWatts = -compensatedSum(powers.filter((power) => power < 0));
    domain.powerResidualWatts = residual;
    checks.maximumPowerResidualWatts = Math.max(
      checks.maximumPowerResidualWatts,
      Math.abs(residual),
    );
    checks.maximumResidualRatio = Math.max(checks.maximumResidualRatio, ratio);
  }
  return Number.isFinite(checks.maximumResidualRatio) && checks.maximumResidualRatio <= 1;
}
