/**
 * layout.test.ts — deterministic canvas placement (plan §7).
 */

import { describe, expect, it } from 'vitest';
import { COMP_H, COMP_W, GRID_SIZE } from '../../components';
import type { ComponentInstance } from '../../types';
import {
  COLUMN_PITCH,
  LAYOUT_ORIGIN_X,
  LAYOUT_ORIGIN_Y,
  ROW_PITCH,
  applyLayout,
  hasOverlappingComponents,
  isGridAligned,
} from './layout';

function component(id: string): ComponentInstance {
  return { id, type: 'bulb', x: -1, y: -1, state: {} };
}

describe('layout constants', () => {
  it('snaps both pitches to the editor grid with clearance', () => {
    expect(COLUMN_PITCH % GRID_SIZE).toBe(0);
    expect(ROW_PITCH % GRID_SIZE).toBe(0);
    expect(COLUMN_PITCH).toBeGreaterThan(COMP_W);
    expect(ROW_PITCH).toBeGreaterThan(COMP_H);
  });

  it('anchors the block on the grid', () => {
    expect(LAYOUT_ORIGIN_X % GRID_SIZE).toBe(0);
    expect(LAYOUT_ORIGIN_Y % GRID_SIZE).toBe(0);
  });
});

describe('applyLayout', () => {
  it('places columns left to right and rows top to bottom', () => {
    const components = [component('a'), component('b'), component('c')];
    const placements = new Map([
      ['a', { column: 0, row: 0 }],
      ['b', { column: 1, row: 0 }],
      ['c', { column: 1, row: 1 }],
    ]);

    const { components: placed } = applyLayout(components, placements);
    const [a, b, c] = placed as [ComponentInstance, ComponentInstance, ComponentInstance];

    expect(b.x).toBeGreaterThan(a.x);
    expect(c.x).toBe(b.x);
    expect(c.y).toBeGreaterThan(b.y);
    expect(c.y - b.y).toBe(ROW_PITCH);
  });

  it('grid-aligns every coordinate', () => {
    const components = Array.from({ length: 9 }, (_, i) => component(`c${i}`));
    const placements = new Map(
      components.map((c, i) => [c.id, { column: i % 3, row: Math.floor(i / 3) }]),
    );
    expect(isGridAligned(applyLayout(components, placements).components)).toBe(true);
  });

  it('never overlaps components placed in distinct slots', () => {
    const components = Array.from({ length: 12 }, (_, i) => component(`c${i}`));
    const placements = new Map(
      components.map((c, i) => [c.id, { column: i % 4, row: Math.floor(i / 4) }]),
    );
    expect(hasOverlappingComponents(applyLayout(components, placements).components)).toBe(false);
  });

  it('vertically centres a short column against the tallest one', () => {
    const components = [
      component('tall0'),
      component('tall1'),
      component('tall2'),
      component('short'),
    ];
    const placements = new Map([
      ['tall0', { column: 1, row: 0 }],
      ['tall1', { column: 1, row: 1 }],
      ['tall2', { column: 1, row: 2 }],
      ['short', { column: 0, row: 0 }],
    ]);

    const placed = applyLayout(components, placements).components;
    const short = placed.find((c) => c.id === 'short')!;
    const middle = placed.find((c) => c.id === 'tall1')!;
    // The lone component sits opposite the middle of the three-row column.
    expect(Math.abs(short.y - middle.y)).toBeLessThanOrEqual(GRID_SIZE);
  });

  it('does not mutate its input', () => {
    const components = [component('a')];
    applyLayout(components, new Map([['a', { column: 2, row: 3 }]]));
    expect(components[0]!.x).toBe(-1);
    expect(components[0]!.y).toBe(-1);
  });

  it('leaves components without a placement hint untouched', () => {
    const orphan: ComponentInstance = { id: 'o', type: 'bulb', x: 60, y: 90, state: {} };
    const [placed] = applyLayout([orphan], new Map()).components;
    expect(placed).toEqual(orphan);
  });

  it('reports bounds that enclose every component box', () => {
    const components = [component('a'), component('b')];
    const placements = new Map([
      ['a', { column: 0, row: 0 }],
      ['b', { column: 2, row: 1 }],
    ]);
    const { components: placed, bounds } = applyLayout(components, placements);

    for (const item of placed) {
      expect(item.x).toBeGreaterThanOrEqual(bounds.minX);
      expect(item.y).toBeGreaterThanOrEqual(bounds.minY);
      expect(item.x + COMP_W).toBeLessThanOrEqual(bounds.maxX);
      expect(item.y + COMP_H).toBeLessThanOrEqual(bounds.maxY);
    }
    expect(bounds.width).toBe(bounds.maxX - bounds.minX);
    expect(bounds.height).toBe(bounds.maxY - bounds.minY);
  });

  it('is deterministic', () => {
    const components = Array.from({ length: 6 }, (_, i) => component(`c${i}`));
    const placements = new Map(
      components.map((c, i) => [c.id, { column: i % 2, row: Math.floor(i / 2) }]),
    );
    expect(applyLayout(components, placements)).toEqual(applyLayout(components, placements));
  });
});

describe('layout guards', () => {
  it('detects stacked components', () => {
    const stacked: ComponentInstance[] = [
      { id: 'a', type: 'bulb', x: 120, y: 150, state: {} },
      { id: 'b', type: 'bulb', x: 120, y: 150, state: {} },
    ];
    expect(hasOverlappingComponents(stacked)).toBe(true);
  });

  it('detects off-grid components', () => {
    expect(isGridAligned([{ id: 'a', type: 'bulb', x: 121, y: 150, state: {} }])).toBe(false);
  });
});
