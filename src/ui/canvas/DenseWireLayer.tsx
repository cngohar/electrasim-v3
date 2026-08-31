import type { MouseEvent } from 'react';
import {
  COMPONENT_DEFS,
  type ComponentInstance,
  type SimulationResult,
  type WireInstance,
  getPortPos,
} from '../../domain';
import { emojiDataUri } from '../../lib/emoji/emojiSvg';
import { useEmojiGlyphsReady } from '../hooks/useEmojiGlyphsReady';
import { buildWirePath } from './geometry';
import type { CanvasTheme } from './types';

interface DenseWireLayerProps {
  wires: readonly WireInstance[];
  componentsById: Map<string, ComponentInstance>;
  theme: CanvasTheme;
  wireWidth: number;
  simulation?: SimulationResult | null;
  selectedWireId: string | null;
  orthogonalPaths: ReadonlyMap<string, string>;
  onSelectWire: (id: string) => void;
  onArmReroute: (id: string) => void;
  onContextMenu: (id: string, event: MouseEvent<SVGPathElement>) => void;
}

interface PaintBatch {
  color: string;
  width: number;
  opacity: number;
  dash?: string;
  paths: string[];
}

interface DenseWire {
  wire: WireInstance;
  path: string;
  broken: boolean;
  overloaded: boolean;
  midpoint: { x: number; y: number };
}

/**
 * Dense-circuit LOD: paint wires in style batches while retaining one
 * transparent hit path per wire. This keeps selection semantics intact and
 * turns hundreds of visible SVG paint operations into a handful.
 */
export function DenseWireLayer({
  wires,
  componentsById,
  theme,
  wireWidth,
  simulation,
  selectedWireId,
  orthogonalPaths,
  onSelectWire,
  onArmReroute,
  onContextMenu,
}: DenseWireLayerProps) {
  // Warning markers use lazily-loaded Twemoji art; re-render once it arrives.
  useEmojiGlyphsReady();
  const batches = new Map<string, PaintBatch>();
  const renderedWires: DenseWire[] = [];

  for (const wire of wires) {
    const from = componentsById.get(wire.fromComponentId);
    const to = componentsById.get(wire.toComponentId);
    if (!from || !to) continue;
    const fromPort = COMPONENT_DEFS[from.type]?.ports[wire.fromPortIndex];
    const toPort = COMPONENT_DEFS[to.type]?.ports[wire.toPortIndex];
    if (!fromPort || !toPort) continue;

    const path = orthogonalPaths.get(wire.id) ?? buildWirePath(wire, componentsById);
    if (!path) continue;
    const start = getPortPos(from, wire.fromPortIndex, COMPONENT_DEFS);
    const end = getPortPos(to, wire.toPortIndex, COMPONENT_DEFS);
    const energized = simulation?.energizedWires.has(wire.id) ?? false;
    const error = simulation?.errorWires.has(wire.id) ?? false;
    const overloaded = simulation?.overloadedWires?.has(wire.id) ?? false;
    const broken = wire.fault === 'open-circuit';
    const selected = selectedWireId === wire.id;
    const color = error || broken || overloaded ? '#ef4444' : theme.wire[fromPort.type];
    const width = wireWidth + (energized ? 0.5 : 0) + (error ? 0.5 : 0) + (selected ? 1.25 : 0);
    const opacity = energized || error || overloaded ? 1 : 0.45;
    const dash =
      !energized && theme.wireDashIdle && !error && !broken && !overloaded ? '6 6' : undefined;
    const key = `${color}|${width}|${opacity}|${dash ?? ''}`;
    const batch = batches.get(key) ?? { color, width, opacity, dash, paths: [] };
    batch.paths.push(path);
    batches.set(key, batch);
    renderedWires.push({
      wire,
      path,
      broken,
      overloaded,
      midpoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    });
  }

  return (
    <g data-render-detail="reduced-wires" data-dense-wire-layer>
      {Array.from(batches.entries(), ([key, batch]) => (
        <path
          key={key}
          d={batch.paths.join(' ')}
          fill="none"
          stroke={batch.color}
          strokeWidth={batch.width}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity={batch.opacity}
          strokeDasharray={batch.dash}
          pointerEvents="none"
        />
      ))}

      {renderedWires.map(({ wire, path, broken, overloaded, midpoint }) => (
        <g key={wire.id} data-wire-group>
          {selectedWireId === wire.id && (
            <path
              d={path}
              fill="none"
              stroke={theme.component.selectedRing}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeOpacity={0.8}
              strokeDasharray="2 4"
              pointerEvents="none"
            />
          )}
          {overloaded && !broken && (
            <g pointerEvents="none" data-overload-indicator>
              <circle
                cx={midpoint.x}
                cy={midpoint.y}
                r={12}
                fill="#fee2e2"
                stroke="#ef4444"
                strokeWidth={1.5}
                opacity={0.9}
              />
              <circle
                cx={midpoint.x}
                cy={midpoint.y}
                r={8.5}
                fill="#dc2626"
                stroke="#ffffff"
                strokeWidth={1}
              />
              <image
                href={emojiDataUri('warning', 9) ?? ''}
                x={midpoint.x - 4.5}
                y={midpoint.y - 4.5}
                width={9}
                height={9}
              />
            </g>
          )}
          {broken && (
            <g pointerEvents="none">
              <circle
                cx={midpoint.x}
                cy={midpoint.y}
                r={8}
                fill="#fee2e2"
                stroke="#ef4444"
                strokeWidth={1.5}
              />
              <path
                d={`M ${midpoint.x - 4} ${midpoint.y - 4} L ${midpoint.x + 4} ${
                  midpoint.y + 4
                } M ${midpoint.x + 4} ${midpoint.y - 4} L ${midpoint.x - 4} ${midpoint.y + 4}`}
                fill="none"
                stroke="#ef4444"
                strokeWidth={2}
                strokeLinecap="round"
              />
            </g>
          )}
          <path
            data-wire-id={wire.id}
            role="button"
            tabIndex={0}
            aria-label={`Wire ${wire.id}${selectedWireId === wire.id ? ', selected' : ''}`}
            aria-pressed={selectedWireId === wire.id}
            d={path}
            fill="none"
            stroke="transparent"
            strokeWidth={14}
            pointerEvents="stroke"
            onPointerDown={(event) => {
              if (event.button === 0) {
                event.stopPropagation();
              }
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onSelectWire(wire.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                onSelectWire(wire.id);
              } else if (event.key === 'r' || event.key === 'R') {
                event.preventDefault();
                event.stopPropagation();
                onArmReroute(wire.id);
              }
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onContextMenu(wire.id, event);
            }}
            style={{ cursor: 'pointer' }}
          />
        </g>
      ))}
    </g>
  );
}
