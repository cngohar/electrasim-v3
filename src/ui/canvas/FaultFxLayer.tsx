/** Canvas input markers and structural editing indicators. Short, arc and
 * smooth-DC faults use cause badges; material failure and waveforms are not
 * derived from these markers. Accepted event playback lives in Fault Lab.
 * Geometry and pointer interaction remain owned by the ordinary canvas.
 */

import {
  COMPONENT_DEFS,
  COMP_H,
  COMP_W,
  type ComponentInstance,
  type WireInstance,
  getPortControlOffset,
  getPortPos,
  sampleWire,
} from '@electrasim/domain';
import { emojiDataUri } from '../../lib/emoji/emojiSvg';
import { useUiStore } from '../../store';
import { useEmojiGlyphsReady } from '../hooks/useEmojiGlyphsReady';
import { type FaultFxItem, faultFxConfig } from './faultFx';
import { buildWirePath } from './geometry';
import type { CanvasTheme } from './types';

interface Props {
  items: readonly FaultFxItem[];
  wires: readonly WireInstance[];
  componentsById: ReadonlyMap<string, ComponentInstance>;
  theme: CanvasTheme;
  wireWidth: number;
  orthogonalPaths: ReadonlyMap<string, string>;
}

interface WireGeom {
  mid: { x: number; y: number };
  angle: number;
  d: string | null;
}

type TerminalTarget = { componentId: string; portIndex: number };

const SEVER_GAP = 26;
const SPARK_SPOKES = [0, 45, 90, 135, 180, 225, 270, 315];

export function FaultFxLayer({
  items,
  wires,
  componentsById,
  theme,
  wireWidth,
  orthogonalPaths,
}: Props) {
  // Flame/scissors chips use lazily-loaded Twemoji art; re-render once it
  // arrives so fault effects gain their pictographs (no-op after first load).
  useEmojiGlyphsReady();
  const pendingFx = useUiStore((s) => s.pendingFaultFx);
  const wiresById = new Map(wires.map((w) => [w.id, w]));

  const wireGeom = (wireId: string, terminal?: TerminalTarget): WireGeom | null => {
    const w = wiresById.get(wireId);
    if (!w) return null;
    const a = componentsById.get(w.fromComponentId);
    const b = componentsById.get(w.toComponentId);
    if (!a || !b) return null;
    const start = getPortPos(a, w.fromPortIndex, COMPONENT_DEFS);
    const end = getPortPos(b, w.toPortIndex, COMPONENT_DEFS);
    let mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    let angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
    if (terminal) {
      const points = sampleWire(w, new Map(componentsById), COMPONENT_DEFS);
      const fromTarget =
        terminal.componentId === w.fromComponentId && terminal.portIndex === w.fromPortIndex;
      const ordered = fromTarget ? points : [...points].reverse();
      const first = ordered[0];
      const next =
        first && ordered.find((point) => Math.hypot(point.x - first.x, point.y - first.y) > 0.1);
      if (first && next) {
        const dx = next.x - first.x;
        const dy = next.y - first.y;
        const length = Math.hypot(dx, dy);
        mid = { x: first.x + (dx / length) * 18, y: first.y + (dy / length) * 18 };
        angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      }
    }
    return {
      mid,
      angle,
      d:
        orthogonalPaths.get(wireId) ??
        buildWirePath(w, componentsById as Map<string, ComponentInstance>),
    };
  };

  const anchorOf = (item: FaultFxItem): { x: number; y: number } | null => {
    if (item.componentId) {
      const comp = componentsById.get(item.componentId);
      if (!comp) return null;
      return item.portIndex !== undefined
        ? getPortPos(comp, item.portIndex, COMPONENT_DEFS)
        : { x: comp.x, y: comp.y };
    }
    if (item.wireId) {
      const geom = wireGeom(item.wireId);
      return geom ? geom.mid : null;
    }
    return null;
  };

  return (
    <g data-fault-fx-layer pointerEvents="none">
      {items.map((item) => {
        const anchor = anchorOf(item);
        if (!anchor) return null;
        return (
          <FaultIndicator
            key={item.key}
            item={item}
            anchor={anchor}
            component={item.componentId ? componentsById.get(item.componentId) : undefined}
            wireGeom={wireGeom}
            theme={theme}
            wireWidth={wireWidth}
          />
        );
      })}
      {pendingFx && (
        <ArmingFx
          pending={pendingFx}
          anchor={
            'componentId' in pendingFx.target
              ? (() => {
                  const comp = componentsById.get(pendingFx.target.componentId);
                  return comp ? { x: comp.x, y: comp.y } : null;
                })()
              : (wireGeom(pendingFx.target.wireId)?.mid ?? null)
          }
        />
      )}
    </g>
  );
}

/* ─── Per-fault persistent indicator (+ mount-played entrance) ─────────── */

function FaultIndicator({
  item,
  anchor,
  component,
  wireGeom,
  theme,
  wireWidth,
}: {
  item: FaultFxItem;
  anchor: { x: number; y: number };
  component?: ComponentInstance;
  wireGeom: (wireId: string, terminal?: TerminalTarget) => WireGeom | null;
  theme: CanvasTheme;
  wireWidth: number;
}) {
  const color = item.config.color;
  const onWire = !item.componentId;

  return (
    <g
      data-fault-fx={item.fault}
      data-fault-key={item.key}
      data-fault-component={item.componentId}
      data-fault-port={item.portIndex}
      data-fault-wire={item.wireId}
    >
      {item.portIndex !== undefined && (
        <g transform={`translate(${anchor.x} ${anchor.y})`} data-fault-terminal-marker>
          <circle r={9} fill="none" stroke={color} strokeWidth={2.5} />
          <path d="M-6 6 6-6" stroke={color} strokeWidth={2} />
        </g>
      )}
      {/* Specialized indicator body */}
      {item.indicator === 'sever' && (
        <>
          {/* Wire-level open faults sever their own run at the midpoint. */}
          {onWire && item.wireId && (
            <SeverCut
              geom={wireGeom(item.wireId)}
              color={color}
              bg={theme.bg === 'transparent' ? 'var(--table-paper, #fff)' : theme.bg}
              wireWidth={wireWidth}
            />
          )}
          {item.severWireIds.map((wireId) => (
            <SeverCut
              key={`${item.key}:${wireId}`}
              geom={wireGeom(
                wireId,
                item.portIndex !== undefined && item.componentId
                  ? { componentId: item.componentId, portIndex: item.portIndex }
                  : undefined,
              )}
              color={color}
              bg={theme.bg === 'transparent' ? 'var(--table-paper, #fff)' : theme.bg}
              wireWidth={wireWidth}
            />
          ))}
        </>
      )}

      {item.indicator === 'flame' && (
        <g transform={`translate(${anchor.x} ${anchor.y})`}>
          <g className="electrasim-fx-pop-in">
            {/* one-shot spark burst as the short lands */}
            <g className="electrasim-fx-sparkburst">
              {SPARK_SPOKES.map((deg) => (
                <line
                  key={deg}
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={-26}
                  stroke="#fbbf24"
                  strokeWidth={2}
                  strokeLinecap="round"
                  transform={`rotate(${deg})`}
                />
              ))}
            </g>
            {/* persistent heat halos + flame */}
            <circle
              r={24}
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              className="electrasim-fx-halo"
            />
            <circle
              r={24}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              className="electrasim-fx-halo"
              style={{ animationDelay: '0.55s' }}
            />
            <image
              href={emojiDataUri('flame', onWire ? 14 : 18) ?? ''}
              x={onWire ? -7 : -9}
              y={onWire ? -7 : -9}
              width={onWire ? 14 : 18}
              height={onWire ? 14 : 18}
              className="electrasim-flame-flicker"
            />
          </g>
        </g>
      )}

      {item.indicator === 'swap' && (
        <>
          {/* The attached runs take on the swapped conductor identity. */}
          {item.swapWires.map(({ id, as }) => {
            const geom = wireGeom(id);
            if (!geom?.d) return null;
            return (
              <path
                key={`${item.key}:${id}`}
                d={geom.d}
                fill="none"
                stroke={theme.wire[as]}
                strokeWidth={wireWidth + 1}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="7 5"
                className="electrasim-fx-swap-stroke"
                data-fault-swap-wire={id}
                data-fault-swap-as={as}
              />
            );
          })}
          {/* Crossover arc spinning into place above the device. */}
          <g transform={`translate(${anchor.x} ${anchor.y - COMP_H / 2 - 24})`}>
            <g className="electrasim-fx-xover-spin">
              <path
                d="M -16 4 C -8 -12, 8 -12, 16 4"
                fill="none"
                stroke={theme.wire.live}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <path d="M 12 0 L 12 8 L 20 4 Z" fill={theme.wire.live} />
              <path
                d="M 16 -4 C 8 12, -8 12, -16 -4"
                fill="none"
                stroke={theme.wire.neutral}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <path d="M -12 0 L -12 -8 L -20 -4 Z" fill={theme.wire.neutral} />
            </g>
            <text x={-5.5} y={-5} fontSize={7} fontWeight="bold" fill={theme.wire.live}>
              L
            </text>
            <text x={1.5} y={10} fontSize={7} fontWeight="bold" fill={theme.wire.neutral}>
              N
            </text>
          </g>
        </>
      )}

      {item.indicator === 'earth' && (
        <g transform={`translate(${anchor.x} ${anchor.y + COMP_H / 2 + 20})`}>
          <g className="electrasim-fx-pop-in">
            {/* leakage rings sinking to ground */}
            <circle
              cy={-6}
              r={7}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              className="electrasim-fx-earth-ring"
            />
            <circle
              cy={-6}
              r={7}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              className="electrasim-fx-earth-ring"
              style={{ animationDelay: '0.75s' }}
            />
            {/* leakage bolt */}
            <path
              d="M 2 -18 L -3 -4 L 1 -4 L -2 8"
              fill="none"
              stroke={color}
              strokeWidth={2.5}
              strokeLinejoin="round"
              className="electrasim-fx-cut-pulse"
            />
            {/* earth symbol */}
            <g stroke={color} strokeWidth={1.5} strokeLinecap="round">
              <line x1={-9} y1={12} x2={9} y2={12} />
              <line x1={-5} y1={16} x2={5} y2={16} />
              <line x1={-2} y1={20} x2={2} y2={20} />
            </g>
          </g>
        </g>
      )}

      {item.indicator === 'wave' && (
        <g transform={`translate(${anchor.x} ${anchor.y - COMP_H / 2 - 22})`}>
          <path
            d="M -18 0 q 4.5 -7 9 0 t 9 0 t 9 0 t 9 0"
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            className="electrasim-fx-dc-drift"
          />
          <path
            d="M -18 0 q 4.5 -7 9 0 t 9 0 t 9 0 t 9 0"
            fill="none"
            stroke={color}
            strokeWidth={1.25}
            strokeLinecap="round"
            opacity={0.5}
            className="electrasim-fx-dc-drift"
            style={{ animationDelay: '0.7s' }}
          />
        </g>
      )}

      {item.indicator === 'arc' && (
        <g transform={`translate(${anchor.x} ${anchor.y - 10})`}>
          <polyline
            points="-10,-6 -4,3 0,-5 5,4 10,-4"
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="electrasim-fx-arc-strobe"
          />
          <polyline
            points="-10,-6 -4,3 0,-5 5,4 10,-4"
            fill="none"
            stroke="#fef3c7"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="electrasim-fx-arc-strobe"
            style={{ animationDelay: '0.12s' }}
          />
        </g>
      )}

      {item.indicator === 'bridge' && component && (
        <g transform={`rotate(${component.rotation ?? 0} ${component.x} ${component.y})`}>
          {item.bridgePortPairs?.map((pair) => {
            const unrotated = { ...component, rotation: 0 };
            const from = getPortPos(unrotated, pair.from, COMPONENT_DEFS);
            const to = getPortPos(unrotated, pair.to, COMPONENT_DEFS);
            const ports = COMPONENT_DEFS[component.type]!.ports;
            const fromOffset = getPortControlOffset(ports[pair.from]!);
            const toOffset = getPortControlOffset(ports[pair.to]!);
            const fromX = from.x + Math.sign(fromOffset.x) * 26;
            const toX = to.x + Math.sign(toOffset.x) * 26;
            const top = component.y - COMP_H / 2 - 24;
            return (
              <path
                key={`${pair.from}:${pair.to}`}
                data-fault-bypass-pole={`${pair.from}:${pair.to}`}
                d={`M ${from.x} ${from.y} H ${fromX} V ${top} H ${toX} V ${to.y} H ${to.x}`}
                fill="none"
                stroke={color}
                strokeWidth={wireWidth + 1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="electrasim-fx-bridge-draw"
              />
            );
          })}
        </g>
      )}

      {item.indicator === 'jam' && (
        <g transform={`translate(${anchor.x + COMP_W / 2 - 12} ${anchor.y + 6})`}>
          <g className="electrasim-fx-jam-shake">
            <path
              d="M -3.5 -5 a 3.5 3.5 0 0 1 7 0 v 1.5 h -7 Z"
              fill="none"
              stroke={color}
              strokeWidth={1.6}
            />
            <rect x={-6} y={-3.5} width={12} height={9} rx={1.8} fill={color} />
            <circle cy={0.5} r={1.3} fill="#0f172a" />
          </g>
        </g>
      )}

      {/* Universal per-fault badge chip (also the entire indicator for
          fault kinds without a specialized visual). */}
      <FaultChip
        x={anchor.x}
        y={anchor.y - (item.portIndex !== undefined ? 19 : onWire ? 22 : COMP_H / 2 + 14)}
        item={item}
      />
    </g>
  );
}

/** Rounded badge chip showing the fault code, popped in on mount. */
function FaultChip({ x, y, item }: { x: number; y: number; item: FaultFxItem }) {
  return (
    <g transform={`translate(${x} ${y})`} data-fault-chip={item.fault}>
      <g className="electrasim-fx-pop-in">
        <rect
          x={-15}
          y={-8}
          width={30}
          height={15}
          rx={4.5}
          fill={item.config.color}
          className="electrasim-fx-chip-pulse"
        />
        <text y={4} textAnchor="middle" fontSize={8.5} fontWeight="bold" fill="#ffffff">
          {item.config.code}
        </text>
      </g>
    </g>
  );
}

/* ─── Severed conductor: fade-out gap + sparking exposed ends ──────────── */

function SeverCut({
  geom,
  color,
  bg,
  wireWidth,
}: {
  geom: WireGeom | null;
  color: string;
  bg: string;
  wireWidth: number;
}) {
  if (!geom) return null;
  const half = SEVER_GAP / 2;
  return (
    <g
      transform={`translate(${geom.mid.x} ${geom.mid.y}) rotate(${geom.angle})`}
      data-fault-sever-cut
    >
      {/* The gap: canvas-background stroke erasing the conductor, fading
          and growing in — reads as the wire disappearing. */}
      <rect
        x={-half}
        y={-(wireWidth + 7) / 2}
        width={SEVER_GAP}
        height={wireWidth + 7}
        rx={3}
        fill={bg}
        className="electrasim-fx-gap-in"
      />
      {/* Cut-zone outline breathing. */}
      <rect
        x={-half - 1.5}
        y={-(wireWidth + 7) / 2 - 1.5}
        width={SEVER_GAP + 3}
        height={wireWidth + 10}
        rx={4}
        fill="none"
        stroke={color}
        strokeWidth={0.8}
        strokeDasharray="3 2.5"
        className="electrasim-fx-cut-pulse"
      />
      {/* Exposed conductor ends. */}
      <line
        x1={-half}
        y1={0}
        x2={-half + 5}
        y2={0}
        stroke="#b45309"
        strokeWidth={wireWidth + 1}
        strokeLinecap="round"
      />
      <line
        x1={half - 5}
        y1={0}
        x2={half}
        y2={0}
        stroke="#b45309"
        strokeWidth={wireWidth + 1}
        strokeLinecap="round"
      />
      {/* Sparking tips. */}
      <circle cx={-half} cy={0} r={2.2} fill={color} className="electrasim-fx-spark-flicker" />
      <circle
        cx={half}
        cy={0}
        r={2.2}
        fill={color}
        className="electrasim-fx-spark-flicker"
        style={{ animationDelay: '0.25s' }}
      />
    </g>
  );
}

/* ─── Arming choreography: plays BEFORE the fault commits ──────────────── */

function ArmingFx({
  pending,
  anchor,
}: {
  pending: {
    target: { componentId: string } | { wireId: string };
    type: string;
    nonce: number;
  };
  anchor: { x: number; y: number } | null;
}) {
  if (!anchor) return null;
  const config = faultFxConfig(pending.type);
  const x = anchor.x;
  const y = anchor.y;

  return (
    <g
      transform={`translate(${x} ${y})`}
      data-fault-arming={pending.type}
      data-fault-arming-nonce={pending.nonce}
    >
      {/* expanding target rings */}
      <circle
        r={22}
        fill="none"
        stroke={config.color}
        strokeWidth={2}
        className="electrasim-fx-arm-ring"
      />
      <circle
        r={22}
        fill="none"
        stroke={config.color}
        strokeWidth={1.25}
        className="electrasim-fx-arm-ring"
        style={{ animationDelay: '0.3s' }}
      />

      {config.indicator === 'flame' && (
        <>
          {/* fire sparks FIRST — the short lands when the timer expires */}
          {SPARK_SPOKES.map((deg, i) => (
            <g key={deg} transform={`rotate(${deg})`}>
              <line
                x1={0}
                y1={-10}
                x2={0}
                y2={-24}
                stroke="#fbbf24"
                strokeWidth={2}
                strokeLinecap="round"
                className="electrasim-fx-spark-flicker"
                style={{ animationDelay: `${i * 70}ms` }}
              />
            </g>
          ))}
          <image
            href={emojiDataUri('flame', 15) ?? ''}
            x={-7.5}
            y={-7.5}
            width={15}
            height={15}
            className="electrasim-flame-flicker"
          />
        </>
      )}

      {config.indicator === 'sever' && (
        <>
          <line
            x1={-COMP_W / 2 - 4}
            y1={-COMP_H / 2 - 4}
            x2={COMP_W / 2 + 4}
            y2={COMP_H / 2 + 4}
            stroke={config.color}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            className="electrasim-fx-arm-blink"
          />
          <image
            href={emojiDataUri('scissors', 15) ?? ''}
            x={-7.5}
            y={-7.5}
            width={15}
            height={15}
            className="electrasim-fx-arm-blink"
          />
        </>
      )}

      {config.indicator === 'swap' && (
        <g className="electrasim-fx-rotate-loop">
          <path
            d="M -14 3 C -7 -10, 7 -10, 14 3"
            fill="none"
            stroke={config.color}
            strokeWidth={2}
            strokeLinecap="round"
          />
          <path
            d="M 14 -3 C 7 10, -7 10, -14 -3"
            fill="none"
            stroke={config.color}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </g>
      )}

      {config.indicator !== 'flame' &&
        config.indicator !== 'sever' &&
        config.indicator !== 'swap' && (
          <g className="electrasim-fx-arm-blink">
            <rect x={-16} y={-9} width={32} height={18} rx={5} fill={config.color} />
            <text y={4} textAnchor="middle" fontSize={9} fontWeight="bold" fill="#ffffff">
              {config.code}
            </text>
          </g>
        )}
    </g>
  );
}
