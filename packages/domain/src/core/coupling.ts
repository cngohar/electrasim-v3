import type { CompiledTransformer, TerminalGraph } from './contracts';
import { compareIds } from './faultTopology';

/** Equation groups only. Never merge conductive nets or physical voltage references. */
export function transformerCoupling(graph: TerminalGraph): {
  active: CompiledTransformer[];
  broken: CompiledTransformer[];
  groups: { id: string; domainIds: string[]; transformers: CompiledTransformer[] }[];
} {
  if (!graph.transformers.length)
    return {
      active: [],
      broken: [],
      groups: [...graph.domains]
        .sort((a, b) => compareIds(a.id, b.id))
        .map((domain) => ({ id: domain.id, domainIds: [domain.id], transformers: [] })),
    };
  const branchById = new Map(graph.branches.map((branch) => [branch.id, branch]));
  const domainByTerminal = new Map(
    graph.domains.flatMap((domain) => domain.terminals.map((id) => [id, domain.id] as const)),
  );
  const parent = new Map(graph.domains.map((domain) => [domain.id, domain.id]));
  const root = (id: string): string => {
    let current = id;
    while (parent.get(current) !== current) current = parent.get(current)!;
    let previous = id;
    while (previous !== current) {
      const next = parent.get(previous)!;
      parent.set(previous, current);
      previous = next;
    }
    return current;
  };
  const active: CompiledTransformer[] = [];
  const broken: CompiledTransformer[] = [];
  for (const transformer of graph.transformers) {
    const primary = branchById.get(transformer.primaryBranchId)?.closed === true;
    const secondary = branchById.get(transformer.secondaryBranchId)?.closed === true;
    if (primary !== secondary) broken.push(transformer);
    if (!primary || !secondary) continue;
    active.push(transformer);
    const a = root(domainByTerminal.get(transformer.primary[0])!);
    const b = root(domainByTerminal.get(transformer.secondary[0])!);
    if (a !== b) parent.set(compareIds(a, b) < 0 ? b : a, compareIds(a, b) < 0 ? a : b);
  }
  const domains = new Map<string, string[]>();
  for (const domain of graph.domains) {
    const id = root(domain.id);
    const ids = domains.get(id) ?? [];
    ids.push(domain.id);
    domains.set(id, ids);
  }
  return {
    active,
    broken,
    groups: [...domains]
      .sort(([a], [b]) => compareIds(a, b))
      .map(([id, domainIds]) => ({
        id,
        domainIds: domainIds.sort(compareIds),
        transformers: active.filter((t) => root(domainByTerminal.get(t.primary[0])!) === id),
      })),
  };
}
