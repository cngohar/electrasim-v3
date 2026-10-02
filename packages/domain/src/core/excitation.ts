import type { TerminalGraph } from './contracts';
import { transformerCoupling } from './coupling';
import { compareIds } from './faultTopology';
import { closedPathBlocks } from './pathBlocks';

/** Propagate source identity through complete source/winding loops and transformer
 * coupling. This establishes potential excitation only, never voltage/current.
 * A loop attached at one terminal is not fed by an unrelated source in its domain.
 */
export function circuitExcitation(graph: TerminalGraph) {
  const sourceByPair = new Map(
    graph.sources.map((source) => [JSON.stringify([source.positive, source.negative]), source.id]),
  );
  const sourceBranches = new Map(
    graph.branches.flatMap((branch) => {
      if (branch.kind !== 'source' || !branch.closed) return [];
      const id = sourceByPair.get(JSON.stringify([branch.from, branch.to]));
      return id ? [[branch.id, id] as const] : [];
    }),
  );
  const blocks = closedPathBlocks(graph.branches);
  const blockByBranch = new Map(
    blocks.flatMap((block, index) => block.map((branch) => [branch.id, index] as const)),
  );
  const sourcesByBlock = blocks.map(
    (block) =>
      new Set(
        block.flatMap((branch) => {
          const source = sourceBranches.get(branch.id);
          return source ? [source] : [];
        }),
      ),
  );
  const neighbors = blocks.map(() => new Set<number>());
  for (const transformer of transformerCoupling(graph).active) {
    const primary = blockByBranch.get(transformer.primaryBranchId);
    const secondary = blockByBranch.get(transformer.secondaryBranchId);
    if (primary === undefined || secondary === undefined) continue;
    neighbors[primary]!.add(secondary);
    neighbors[secondary]!.add(primary);
  }
  const queue = sourcesByBlock.flatMap((sources, index) => (sources.size ? [index] : []));
  const queued = new Set(queue);
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index]!;
    queued.delete(current);
    for (const next of neighbors[current]!) {
      const target = sourcesByBlock[next]!;
      const size = target.size;
      for (const id of sourcesByBlock[current]!) target.add(id);
      if (target.size !== size && !queued.has(next)) {
        queue.push(next);
        queued.add(next);
      }
    }
  }
  const sourcesByBranch = new Map<string, string[]>();
  const pathSources = new Map<string, string[]>();
  blocks.forEach((block, index) => {
    const sources = [...sourcesByBlock[index]!].sort(compareIds);
    if (!sources.length) return;
    for (const branch of block) {
      sourcesByBranch.set(branch.id, sources);
      if (block.length > 1) pathSources.set(branch.id, sources);
    }
  });
  return { sourceBranches, sourcesByBranch, pathSources };
}
