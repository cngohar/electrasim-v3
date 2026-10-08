/** Exact series reduction for private MNA equation preparation. Source,
 * transformer and reference nodes are retained. The authored graph stays intact
 * for branch recovery and all physical-terminal conservation checks. */
export interface SeriesResistor {
  from: string;
  to: string;
  resistance: number;
}

export function reduceSeriesPaths(resistors: SeriesResistor[], retained: ReadonlySet<string>) {
  const edges = new Map<number, SeriesResistor>();
  const adjacent = new Map<string, Set<number>>();
  let nextId = 0;
  const add = (edge: SeriesResistor) => {
    if (edge.from === edge.to) return;
    const id = nextId++;
    edges.set(id, edge);
    for (const node of [edge.from, edge.to]) {
      const ids = adjacent.get(node) ?? new Set<number>();
      ids.add(id);
      adjacent.set(node, ids);
    }
  };
  for (const edge of resistors) add(edge);
  const queue = [...adjacent.keys()].filter((node) => !retained.has(node));
  const eliminated: { node: string; a: string; b: string; fraction: number }[] = [];
  for (let index = 0; index < queue.length; index++) {
    const node = queue[index]!;
    const ids = adjacent.get(node);
    if (retained.has(node) || ids?.size !== 2) continue;
    const [first, second] = [...ids];
    const left = edges.get(first!)!;
    const right = edges.get(second!)!;
    const resistance = left.resistance + right.resistance;
    // Keep the original equations when a reduced law would exceed the range.
    if (!Number.isFinite(resistance) || !Number.isFinite(1 / resistance)) continue;
    const a = left.from === node ? left.to : left.from;
    const b = right.from === node ? right.to : right.from;
    eliminated.push({ node, a, b, fraction: left.resistance / resistance });
    for (const id of [first!, second!]) {
      const edge = edges.get(id)!;
      adjacent.get(edge.from)!.delete(id);
      adjacent.get(edge.to)!.delete(id);
      edges.delete(id);
    }
    add({ from: a, to: b, resistance });
    queue.push(a, b);
  }
  return {
    resistors: [...edges.values()],
    eliminatedNodes: new Set(eliminated.map(({ node }) => node)),
    recover(potentials: Map<string, number>) {
      for (let index = eliminated.length - 1; index >= 0; index--) {
        const { node, a, b, fraction } = eliminated[index]!;
        const va = potentials.get(a)!;
        const vb = potentials.get(b)!;
        potentials.set(node, va + (vb - va) * fraction);
      }
    },
  };
}
