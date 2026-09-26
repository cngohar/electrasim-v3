/**
 * Topology generation (plan §7, step "Topology Generation").
 *
 * A tiny, port-checked circuit builder that recipes drive. It mirrors the
 * guarantees the hand-written `src/domain/templates.ts` helpers already
 * provide — unknown component types and mismatched port rails throw
 * immediately, so a recipe bug surfaces as a loud error rather than a subtly
 * broken circuit.
 *
 * The builder records *placement hints* (column / row) rather than pixel
 * coordinates; `layout.ts` turns those into grid-snapped `x` / `y`.
 */

import { COMPONENT_DEFS } from '../../components';
import type { ComponentInstance, ComponentState, WireInstance } from '../../types';

/**
 * Maximum number of wires a single port may carry.
 *
 * Supply terminals, breaker outputs and neutral bars legitimately fan out;
 * beyond four conductors on one terminal the drawing stops being legible and
 * almost certainly indicates a recipe bug.
 */
export const MAX_PORT_FANOUT = 4;

/** Handle returned when a component is added to the builder. */
export interface NodeRef {
  /** Fully-qualified component instance id. */
  readonly id: string;
  /** Registry type key, e.g. `'mcb'`. */
  readonly type: string;
  /** Layout column (0 = supply side, increasing toward loads). */
  readonly column: number;
  /** Layout row within the column (0 = topmost). */
  readonly row: number;
}

export interface AddNodeOptions {
  /** Local id, made unique by the builder prefix. */
  localId: string;
  /** Registry component type. Must exist in `COMPONENT_DEFS`. */
  type: string;
  column: number;
  row: number;
  state?: ComponentState;
}

export interface ConnectOptions {
  /** Local wire id, made unique by the builder prefix. */
  localId: string;
  from: NodeRef;
  fromPort: number;
  to: NodeRef;
  toPort: number;
  /** One-way run length in metres (drives voltage-drop calculations). */
  lengthMeters: number;
  /** Explicit conductor cross-section in mm². */
  cableMm2: number;
}

export interface BuiltTopology {
  components: ComponentInstance[];
  wires: WireInstance[];
  /** Placement hints keyed by component id, consumed by `layout.ts`. */
  placements: Map<string, { column: number; row: number }>;
}

export class TopologyBuilder {
  private readonly prefix: string;
  private readonly components: ComponentInstance[] = [];
  private readonly wires: WireInstance[] = [];
  private readonly placements = new Map<string, { column: number; row: number }>();
  private readonly usedComponentIds = new Set<string>();
  private readonly usedWireIds = new Set<string>();
  /** Canonical `"a:i|b:j"` keys, so the same port pair is never wired twice. */
  private readonly connectedPairs = new Set<string>();
  /** Fan-out degree per `"componentId:portIndex"`. */
  private readonly portDegree = new Map<string, number>();

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  /** Place a component. Throws if the type or ids are invalid. */
  add(options: AddNodeOptions): NodeRef {
    const { localId, type, column, row, state } = options;
    const def = COMPONENT_DEFS[type];
    if (!def) {
      throw new Error(`topology "${this.prefix}": unknown component type "${type}"`);
    }

    const id = `${this.prefix}-${localId}`;
    if (this.usedComponentIds.has(id)) {
      throw new Error(`topology "${this.prefix}": duplicate component id "${id}"`);
    }
    this.usedComponentIds.add(id);

    // `x` / `y` are placeholders; `layout.ts` overwrites them from the hints.
    this.components.push({ id, type, x: 0, y: 0, state: { ...(state ?? {}) } });
    this.placements.set(id, { column, row });

    return { id, type, column, row };
  }

  /**
   * Connect two ports.
   *
   * Enforces the same invariants as `templates.ts`: both ports must exist and
   * carry the same rail (`live`/`neutral`/`earth`). Additionally rejects
   * self-loops and duplicate wires between the same port pair — the latter is
   * `TOPOLOGY_DUPLICATE_WIRE` in the production connection validator.
   *
   * Fan-out from one port IS allowed (a supply terminal or a breaker output
   * legitimately feeds several branches, exactly as the hand-written
   * templates do) but is capped at {@link MAX_PORT_FANOUT} so a recipe bug
   * cannot silently build an unreadable star.
   */
  connect(options: ConnectOptions): WireInstance {
    const { localId, from, fromPort, to, toPort, lengthMeters, cableMm2 } = options;

    if (from.id === to.id) {
      throw new Error(`topology "${this.prefix}": self-loop on "${from.id}"`);
    }

    const fromDef = COMPONENT_DEFS[from.type];
    const toDef = COMPONENT_DEFS[to.type];
    const fromPortDef = fromDef?.ports[fromPort];
    const toPortDef = toDef?.ports[toPort];

    if (!fromPortDef) {
      throw new Error(`topology "${this.prefix}": ${from.type} has no port ${fromPort}`);
    }
    if (!toPortDef) {
      throw new Error(`topology "${this.prefix}": ${to.type} has no port ${toPort}`);
    }
    if (fromPortDef.type !== toPortDef.type) {
      throw new Error(
        `topology "${this.prefix}": cannot connect ${fromPortDef.type} port to ${toPortDef.type} port ` +
          `(${from.type}[${fromPort}] → ${to.type}[${toPort}])`,
      );
    }

    const fromKey = `${from.id}:${fromPort}`;
    const toKey = `${to.id}:${toPort}`;
    const pairKey = [fromKey, toKey].sort().join('|');
    if (this.connectedPairs.has(pairKey)) {
      throw new Error(`topology "${this.prefix}": duplicate wire between ${fromKey} and ${toKey}`);
    }
    this.connectedPairs.add(pairKey);

    for (const key of [fromKey, toKey]) {
      const degree = (this.portDegree.get(key) ?? 0) + 1;
      if (degree > MAX_PORT_FANOUT) {
        throw new Error(
          `topology "${this.prefix}": port ${key} exceeds fan-out limit of ${MAX_PORT_FANOUT}`,
        );
      }
      this.portDegree.set(key, degree);
    }

    const id = `${this.prefix}-w-${localId}`;
    if (this.usedWireIds.has(id)) {
      throw new Error(`topology "${this.prefix}": duplicate wire id "${id}"`);
    }
    this.usedWireIds.add(id);

    const wire: WireInstance = {
      id,
      fromComponentId: from.id,
      fromPortIndex: fromPort,
      toComponentId: to.id,
      toPortIndex: toPort,
      controlPoints: [],
      pathKind: 'orthogonal',
      // Explicit cable metadata keeps every downstream calculation (ampacity,
      // voltage drop, Zs) deterministic instead of falling back to defaults.
      lengthMeters: Math.round(lengthMeters * 10) / 10,
      customCableMm2: cableMm2,
      material: 'copper',
      installationMethod: 'C',
    };
    this.wires.push(wire);
    return wire;
  }

  /** Ids of every component placed so far. */
  componentIds(): string[] {
    return this.components.map((component) => component.id);
  }

  /** Ids of every wire laid so far. */
  wireIds(): string[] {
    return this.wires.map((wire) => wire.id);
  }

  build(): BuiltTopology {
    return {
      components: this.components,
      wires: this.wires,
      placements: this.placements,
    };
  }
}

export function createTopologyBuilder(prefix: string): TopologyBuilder {
  return new TopologyBuilder(prefix);
}
