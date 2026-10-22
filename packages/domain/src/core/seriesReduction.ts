export interface SeriesResistor {
  from: string;
  to: string;
  resistance: number;
}

export function reduceSeriesPaths(resistors: SeriesResistor[], retained: ReadonlySet<string>) {
  const nodeIds = new Map<string, number>();
  const nodeNames: string[] = [];
  const retainedFlags: boolean[] = [];
  const idFor = (node: string): number => {
    const existing = nodeIds.get(node);
    if (existing !== undefined) return existing;
    const id = nodeNames.length;
    nodeIds.set(node, id);
    nodeNames.push(node);
    retainedFlags.push(retained.has(node));
    return id;
  };
  const from: number[] = [];
  const to: number[] = [];
  const resistance: number[] = [];
  const alive: boolean[] = [];
  const adjacent: number[][] = [];
  const append = (node: number, edge: number) => {
    const values = adjacent[node];
    if (values) values.push(edge);
    else adjacent[node] = [edge];
  };
  const add = (a: number, b: number, ohms: number) => {
    if (a === b) return;
    const id = from.length;
    from.push(a);
    to.push(b);
    resistance.push(ohms);
    alive.push(true);
    append(a, id);
    append(b, id);
  };
  for (const edge of resistors) add(idFor(edge.from), idFor(edge.to), edge.resistance);
  const queue: number[] = [];
  for (let id = 0; id < nodeNames.length; id++) if (!retainedFlags[id]) queue.push(id);
  const eliminated: { node: number; a: number; b: number; fraction: number }[] = [];
  for (let index = 0; index < queue.length; index++) {
    const node = queue[index]!;
    if (retainedFlags[node]) continue;
    const ids = adjacent[node];
    if (ids === undefined) continue;
    let first = -1;
    let second = -1;
    let count = 0;
    for (let i = 0; i < ids.length; i++) {
      const edge = ids[i]!;
      if (!alive[edge]) continue;
      if (count === 0) first = edge;
      else if (count === 1) second = edge;
      count++;
      if (count > 2) break;
    }
    if (count !== 2) continue;
    const leftFrom = from[first!]!;
    const leftTo = to[first!]!;
    const rightFrom = from[second!]!;
    const rightTo = to[second!]!;
    const total = resistance[first!]! + resistance[second!]!;
    if (!Number.isFinite(total) || !Number.isFinite(1 / total)) continue;
    const a = leftFrom === node ? leftTo : leftFrom;
    const b = rightFrom === node ? rightTo : rightFrom;
    eliminated.push({ node, a, b, fraction: resistance[first!]! / total });
    alive[first!] = false;
    alive[second!] = false;
    add(a, b, total);
    queue.push(a, b);
  }
  const resulting: SeriesResistor[] = [];
  const eliminatedNodes = new Set<string>();
  for (const item of eliminated) eliminatedNodes.add(nodeNames[item.node]!);
  for (let id = 0; id < from.length; id++)
    if (alive[id]!)
      resulting.push({
        from: nodeNames[from[id]!]!,
        to: nodeNames[to[id]!]!,
        resistance: resistance[id]!,
      });
  return {
    resistors: resulting,
    eliminatedNodes,
    recover(potentials: Map<string, number>) {
      for (let index = eliminated.length - 1; index >= 0; index--) {
        const { node, a, b, fraction } = eliminated[index]!;
        const va = potentials.get(nodeNames[a]!)!;
        const vb = potentials.get(nodeNames[b]!)!;
        potentials.set(nodeNames[node]!, va + (vb - va) * fraction);
      }
    },
  };
}
