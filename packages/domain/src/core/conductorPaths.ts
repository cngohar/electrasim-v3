import type { ElectricalBranch, TerminalGraph } from './contracts';

/** Wires/contacts/links establish conductor paths. Sources, loads and winding
 * equations cannot establish a neutral/PE bond or a direct supply connection.
 */
export function conductorPaths(
  graph: TerminalGraph,
  options: {
    omitFaults?: boolean;
    includeOpenContacts?: boolean;
    peOnly?: boolean;
    excludePe?: boolean;
  } = {},
) {
  const roles = new Map(graph.terminals.map((terminal) => [terminal.id, terminal.role]));
  const adjacency = new Map<string, { terminal: string; branch: ElectricalBranch }[]>();
  const append = (from: string, to: string, branch: ElectricalBranch) => {
    const edges = adjacency.get(from) ?? [];
    edges.push({ terminal: to, branch });
    adjacency.set(from, edges);
  };
  for (const branch of graph.branches) {
    if (!(branch.closed || (options.includeOpenContacts && branch.kind === 'contact'))) continue;
    if (!(branch.idealConductor || branch.kind === 'wire')) continue;
    if (options.omitFaults && branch.kind === 'fault') continue;
    if (options.peOnly && (roles.get(branch.from) !== 'pe' || roles.get(branch.to) !== 'pe'))
      continue;
    if (options.excludePe && (roles.get(branch.from) === 'pe' || roles.get(branch.to) === 'pe'))
      continue;
    append(branch.from, branch.to, branch);
    append(branch.to, branch.from, branch);
  }
  const groupByTerminal = new Map<string, string>();
  for (const terminal of graph.terminals) {
    if (groupByTerminal.has(terminal.id)) continue;
    const queue = [terminal.id];
    groupByTerminal.set(terminal.id, terminal.id);
    for (let index = 0; index < queue.length; index++)
      for (const next of adjacency.get(queue[index]!) ?? []) {
        if (groupByTerminal.has(next.terminal)) continue;
        groupByTerminal.set(next.terminal, terminal.id);
        queue.push(next.terminal);
      }
  }
  const path = (from: string, to: string): ElectricalBranch[] | undefined => {
    if (!groupByTerminal.has(from) || groupByTerminal.get(from) !== groupByTerminal.get(to))
      return undefined;
    const queue = [from];
    const visited = new Set([from]);
    const parents = new Map<string, { terminal: string; branch: ElectricalBranch }>();
    for (let index = 0; index < queue.length && !visited.has(to); index++) {
      const current = queue[index]!;
      for (const next of adjacency.get(current) ?? []) {
        if (visited.has(next.terminal)) continue;
        visited.add(next.terminal);
        parents.set(next.terminal, { terminal: current, branch: next.branch });
        queue.push(next.terminal);
      }
    }
    const edges: ElectricalBranch[] = [];
    for (let current = to; current !== from; ) {
      const parent = parents.get(current)!;
      edges.push(parent.branch);
      current = parent.terminal;
    }
    return edges.reverse();
  };
  return { groupByTerminal, path };
}
