/**
 * WireJointsLayer — automatically places a connection joint (dot) wherever two
 * wires cross each other.
 *
 * This is the "auto joint on wire crossing" option. It applies to every wire
 * kind — bezier, orthogonal, and custom (hand-placed polyline) wires. We sample
 * each wire into a polyline, test every pair of wires for segment
 * intersections, cluster near-identical hits into one dot, and render a small
 * filled dot at each crossing — matching the standard electrical-schematic
 * "junction dot" convention.
 *
 * Pure visual overlay: it does not alter connectivity or add data-model nodes.
 */

import { useMemo } from 'react';
import {
  COMPONENT_DEFS,
  type ComponentInstance,
  type WireInstance,
  getPortPos,
  sampleWire,
} from '../../domain';
import type { CanvasTheme } from './types';

interface WireJointsLayerProps {
  wires: readonly WireInstance[];
  componentsById: Map<string, ComponentInstance>;
  theme: CanvasTheme;
  enabled: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface Joint {
  x: number;
  y: number;
}

const SAMPLES = 32;

function orientation(a: Point, b: Point, c: Point): number {
  const val = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : 2;
}

function onSegment(a: Point, b: Point, c: Point): boolean {
  return (
    Math.min(a.x, b.x) - 1e-6 <= c.x &&
    c.x <= Math.max(a.x, b.x) + 1e-6 &&
    Math.min(a.y, b.y) - 1e-6 <= c.y &&
    c.y <= Math.max(a.y, b.y) + 1e-6
  );
}

/** Return the intersection point of segments ab and cd, or null. */
function segIntersect(a: Point, b: Point, c: Point, d: Point): Point | null {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 !== o2 && o3 !== o4) {
    // General intersection — solve for t on ab.
    const denom = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
    if (Math.abs(denom) < 1e-9) return null;
    const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / denom;
    return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  }
  return null;
}

export function WireJointsLayer({ wires, componentsById, theme, enabled }: WireJointsLayerProps) {
  // 1. Real Electrical Junctions: multiple wires connecting to the same terminal port
  const realJunctions = useMemo<{ x: number; y: number; color: string; count: number }[]>(() => {
    const portMap = new Map<string, { compId: string; portIndex: number; count: number }>();
    for (const w of wires) {
      const p1 = `${w.fromComponentId}:${w.fromPortIndex}`;
      const p2 = `${w.toComponentId}:${w.toPortIndex}`;
      const e1 = portMap.get(p1) ?? {
        compId: w.fromComponentId,
        portIndex: w.fromPortIndex,
        count: 0,
      };
      e1.count += 1;
      portMap.set(p1, e1);
      const e2 = portMap.get(p2) ?? { compId: w.toComponentId, portIndex: w.toPortIndex, count: 0 };
      e2.count += 1;
      portMap.set(p2, e2);
    }

    const junctions: { x: number; y: number; color: string; count: number }[] = [];
    for (const entry of portMap.values()) {
      if (entry.count >= 2) {
        const comp = componentsById.get(entry.compId);
        if (!comp) continue;
        const pos = getPortPos(comp, entry.portIndex, COMPONENT_DEFS);
        const portDef = COMPONENT_DEFS[comp.type]?.ports[entry.portIndex];
        const color = portDef ? (theme.wire[portDef.type] ?? '#2563eb') : '#2563eb';
        junctions.push({ x: pos.x, y: pos.y, color, count: entry.count });
      }
    }
    return junctions;
  }, [wires, componentsById, theme]);

  // 2. Wire Overlaps / Crossings in mid-air (non-connecting wires)
  const crossings = useMemo<Joint[]>(() => {
    if (!enabled) return [];

    // Sample wires into polylines
    const sampled: { id: string; pts: Point[] }[] = [];
    for (const wire of wires) {
      const pts = sampleWire(wire, componentsById, COMPONENT_DEFS, SAMPLES) as unknown as Point[];
      if (pts.length >= 2) sampled.push({ id: wire.id, pts });
    }
    if (sampled.length < 2) return [];

    const raw: Joint[] = [];
    for (let i = 0; i < sampled.length; i++) {
      for (let j = i + 1; j < sampled.length; j++) {
        const A = sampled[i].pts;
        const B = sampled[j].pts;
        for (let a = 0; a < A.length - 1; a++) {
          for (let b = 0; b < B.length - 1; b++) {
            const hit = segIntersect(A[a], A[a + 1], B[b], B[b + 1]);
            if (hit) raw.push(hit);
          }
        }
      }
    }

    const CLUSTER = 8;
    const found: Joint[] = [];
    for (const p of raw) {
      // Exclude points that coincide with real terminal ports
      const nearRealPort = realJunctions.some((rj) => Math.hypot(rj.x - p.x, rj.y - p.y) < CLUSTER);
      if (nearRealPort) continue;

      const existing = found.find((j) => Math.hypot(j.x - p.x, j.y - p.y) < CLUSTER);
      if (existing) {
        existing.x = (existing.x + p.x) / 2;
        existing.y = (existing.y + p.y) / 2;
      } else {
        found.push({ x: p.x, y: p.y });
      }
    }
    return found;
  }, [wires, componentsById, enabled, realJunctions]);

  const jointColor = theme.wire?.live ?? '#ef4444';

  return (
    <g pointerEvents="none" data-wire-junctions-layer>
      {/* Real Electrical Junction Dots at shared ports */}
      {realJunctions.map((j, idx) => (
        <g key={`junction-${idx}`} transform={`translate(${j.x} ${j.y})`} data-real-junction-dot>
          <circle r={5} fill="#ffffff" opacity={0.95} />
          <circle r={3.2} fill={j.color} />
          <circle r={1.2} fill="#ffffff" opacity={0.8} />
        </g>
      ))}

      {/* Wire Crossover Arc Bridge Jumpers for mid-air overlaps */}
      {crossings.map((c, idx) => (
        <g key={`cross-${idx}`} transform={`translate(${c.x} ${c.y})`} data-wire-crossover-bridge>
          <circle r={5.5} fill="#ffffff" opacity={0.9} />
          <path
            d="M -5 0 A 5 5 0 0 1 5 0"
            fill="none"
            stroke={jointColor}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </g>
      ))}
    </g>
  );
}
