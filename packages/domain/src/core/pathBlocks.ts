import type { ElectricalBranch } from './contracts';

/** Undirected biconnected edge blocks, using an iterative DFS to bound stack use.
 * Edges share a source/load cycle only inside the same block. Mere connectivity
 * (or non-bridge edges in two loops joined at one terminal) is insufficient.
 */
export function closedPathBlocks(branches: readonly ElectricalBranch[]): ElectricalBranch[][] {
  const edges = branches.filter((edge) => edge.closed);
  const adjacent = new Map<string, { to: string; edge: number }[]>();
  const append = (from: string, to: string, edge: number) => {
    const values = adjacent.get(from) ?? [];
    values.push({ to, edge });
    adjacent.set(from, values);
  };
  edges.forEach((edge, index) => {
    append(edge.from, edge.to, index);
    append(edge.to, edge.from, index);
  });
  const discovered = new Map<string, number>();
  const low = new Map<string, number>();
  const pending: number[] = [];
  const blocks: ElectricalBranch[][] = [];
  let time = 0;
  for (const start of adjacent.keys()) {
    if (discovered.has(start)) continue;
    discovered.set(start, ++time);
    low.set(start, time);
    const stack: { node: string; parentEdge?: number; next: number }[] = [{ node: start, next: 0 }];
    while (stack.length) {
      const frame = stack[stack.length - 1];
      if (!frame) break;
      const link = adjacent.get(frame.node)?.[frame.next++];
      if (link) {
        if (link.edge === frame.parentEdge) continue;
        const visited = discovered.get(link.to);
        if (visited === undefined) {
          pending.push(link.edge);
          discovered.set(link.to, ++time);
          low.set(link.to, time);
          stack.push({ node: link.to, parentEdge: link.edge, next: 0 });
        } else if (visited < (discovered.get(frame.node) ?? 0)) {
          pending.push(link.edge);
          low.set(frame.node, Math.min(low.get(frame.node) ?? time, visited));
        }
        continue;
      }
      stack.pop();
      const parent = stack[stack.length - 1];
      if (!parent || frame.parentEdge === undefined) continue;
      low.set(parent.node, Math.min(low.get(parent.node) ?? time, low.get(frame.node) ?? time));
      if ((low.get(frame.node) ?? time) >= (discovered.get(parent.node) ?? 0)) {
        const block: ElectricalBranch[] = [];
        while (pending.length) {
          const index = pending.pop();
          const edge = index === undefined ? undefined : edges[index];
          if (edge) block.push(edge);
          if (index === frame.parentEdge) break;
        }
        blocks.push(block);
      }
    }
  }
  return blocks;
}
