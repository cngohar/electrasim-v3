/**
 * Layout generation (plan §7, step "Layout Generation").
 *
 * Turns the column/row placement hints recorded by `topology.ts` into
 * grid-snapped canvas coordinates that match the editor's own geometry
 * constants (`GRID_SIZE = 30`, `COMP_W = 100`, `COMP_H = 70`).
 *
 * Rules:
 *  - Columns flow left→right, supply on the left, loads on the right, which is
 *    how every hand-authored template in `templates.ts` reads.
 *  - Every coordinate is a multiple of `GRID_SIZE`, so a generated circuit
 *    behaves exactly like a hand-placed one under snap-to-grid dragging.
 *  - Column and row pitch leave a full component of clearance, so orthogonal
 *    wire routing never has to squeeze between two boxes.
 *  - Rows in a column are vertically centred, keeping single-load circuits
 *    tidy and multi-branch circuits symmetric.
 *  - Deterministic: no randomness, no clock. Same topology → same pixels.
 */

import { COMP_H, COMP_W, GRID_SIZE } from '../../components';
import type { ComponentInstance } from '../../types';

/** Left/top margin of the generated block, in canvas units. */
export const LAYOUT_ORIGIN_X = 120;
export const LAYOUT_ORIGIN_Y = 150;

/** Horizontal distance between column anchors (component + routing gap). */
export const COLUMN_PITCH = snapUp(COMP_W + GRID_SIZE * 3);

/** Vertical distance between row anchors (component + routing gap). */
export const ROW_PITCH = snapUp(COMP_H + GRID_SIZE * 2);

function snapUp(value: number): number {
  return Math.ceil(value / GRID_SIZE) * GRID_SIZE;
}

function snap(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export interface LayoutBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  components: ComponentInstance[];
  bounds: LayoutBounds;
}

/**
 * Apply the layout to a component list.
 *
 * Returns NEW component objects; the input array is not mutated, keeping the
 * generator pipeline side-effect free.
 */
export function applyLayout(
  components: readonly ComponentInstance[],
  placements: ReadonlyMap<string, { column: number; row: number }>,
): LayoutResult {
  // Tallest column decides the vertical centring baseline.
  const rowsPerColumn = new Map<number, number>();
  for (const component of components) {
    const placement = placements.get(component.id);
    if (!placement) continue;
    const current = rowsPerColumn.get(placement.column) ?? 0;
    rowsPerColumn.set(placement.column, Math.max(current, placement.row + 1));
  }
  const tallestColumn = Math.max(1, ...rowsPerColumn.values());

  const laidOut = components.map((component) => {
    const placement = placements.get(component.id);
    if (!placement) return { ...component };

    const rowsHere = rowsPerColumn.get(placement.column) ?? 1;
    // Centre this column's rows against the tallest column.
    const verticalOffset = ((tallestColumn - rowsHere) * ROW_PITCH) / 2;

    return {
      ...component,
      x: snap(LAYOUT_ORIGIN_X + placement.column * COLUMN_PITCH),
      y: snap(LAYOUT_ORIGIN_Y + verticalOffset + placement.row * ROW_PITCH),
    };
  });

  const xs = laidOut.map((component) => component.x);
  const ys = laidOut.map((component) => component.y);
  const minX = xs.length > 0 ? Math.min(...xs) : LAYOUT_ORIGIN_X;
  const minY = ys.length > 0 ? Math.min(...ys) : LAYOUT_ORIGIN_Y;
  const maxX = (xs.length > 0 ? Math.max(...xs) : LAYOUT_ORIGIN_X) + COMP_W;
  const maxY = (ys.length > 0 ? Math.max(...ys) : LAYOUT_ORIGIN_Y) + COMP_H;

  return {
    components: laidOut,
    bounds: { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY },
  };
}

/**
 * True when no two components overlap.
 *
 * Used by the structural validator so a recipe that accidentally reuses a
 * column/row slot is rejected instead of shipping a circuit with two boxes
 * drawn on top of each other.
 */
export function hasOverlappingComponents(components: readonly ComponentInstance[]): boolean {
  const seen = new Set<string>();
  for (const component of components) {
    const key = `${component.x}:${component.y}`;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

/** True when every component sits on the editor grid. */
export function isGridAligned(components: readonly ComponentInstance[]): boolean {
  return components.every(
    (component) => component.x % GRID_SIZE === 0 && component.y % GRID_SIZE === 0,
  );
}
