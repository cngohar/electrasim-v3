/** Pure wire drawing shared by the editor and server-rendered preview. */
import {
  COMPONENT_DEFS,
  type ComponentInstance,
  type SimulationResult,
  type WireInstance,
  getPortPos,
} from '@electrasim/domain';
import type { MouseEvent } from 'react';
import { buildWirePath } from './geometry';
import type { CanvasTheme } from './types';
export interface WireScenePathProps {
  readOnly?: boolean;
  badges?: { flame: string; bolt: string };
  wire: WireInstance;
  componentsById: Map<string, ComponentInstance>;
  theme: CanvasTheme;
  wireWidth: number;
  simulation?: SimulationResult | null;
  energized: boolean;
  error: boolean;
  overloaded?: boolean;
  selected: boolean;
  flagged?: boolean;
  severed?: boolean;
  currentFlowOn: boolean;
  wireGlowOn: boolean;
  precomputedPath?: string;
  traceWireIds?: Set<string> | null;
  onSelect: (id: string) => void;
  onArmReroute: (id: string) => void;
  onContextMenu: (id: string, event: MouseEvent<SVGGElement>) => void;
}

export function WireScenePath({
  readOnly = false,
  badges,
  wire,
  componentsById,
  theme,
  wireWidth,
  simulation,
  energized,
  error,
  overloaded = false,
  selected,
  flagged,
  severed = false,
  currentFlowOn,
  wireGlowOn,
  precomputedPath,
  traceWireIds,
  onSelect,
  onArmReroute,
  onContextMenu,
}: WireScenePathProps) {
  const from = componentsById.get(wire.fromComponentId);
  const to = componentsById.get(wire.toComponentId);
  if (!from || !to) return null;
  const fromPort = COMPONENT_DEFS[from.type]?.ports[wire.fromPortIndex];
  const toPort = COMPONENT_DEFS[to.type]?.ports[wire.toPortIndex];
  if (!fromPort || !toPort) return null;

  const start = getPortPos(from, wire.fromPortIndex, COMPONENT_DEFS);
  const end = getPortPos(to, wire.toPortIndex, COMPONENT_DEFS);
  const path = precomputedPath ?? buildWirePath(wire, componentsById);
  if (!path) return null;

  const broken = wire.fault === 'open-circuit';
  const isShortFault = wire.fault === 'short-circuit';
  const isBusted = wire.isBusted || (simulation?.bustedWires?.has(wire.id) ?? false);
  const heatRatio = simulation?.wireHeatRatios?.[wire.id] ?? 0;
  const isOverloaded = overloaded || heatRatio > 1.0;

  const isDimmedByTrace = traceWireIds != null && !traceWireIds.has(wire.id);
  const isHighlightedInTrace = Boolean(traceWireIds?.has(wire.id));

  const calc = simulation?.wireCalculations?.[wire.id];
  const liveCurrent = calc?.currentAmps;
  const conductorDrop = calc?.voltageDropVolts;

  let color = theme.wire[fromPort.type];
  if (isBusted) {
    color = '#991b1b';
  } else if (error || broken || isShortFault || isOverloaded) {
    color = '#dc2626';
  } else if (heatRatio > 0.8) {
    color = '#f59e0b';
  }

  const dashed = !energized && theme.wireDashIdle && !error && !broken && !isBusted && !severed;
  const animateFlow =
    liveCurrent !== undefined &&
    Math.abs(liveCurrent) > 1e-9 &&
    currentFlowOn &&
    !error &&
    !isOverloaded &&
    !isBusted &&
    !severed;
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };

  let wireClassName: string | undefined;
  if (isBusted) {
    wireClassName = 'electrasim-wire-busted';
  } else if (isOverloaded) {
    wireClassName = 'electrasim-wire-heat';
  } else if (animateFlow) {
    wireClassName = 'electrasim-wire-flow';
  }

  // A severed conductor (open fault) fades out instead of showing state —
  // FaultFxLayer draws the cut zone on top. The fade itself animates via
  // the CSS transition on `stroke-opacity` (see `electrasim-wire-fade`).
  const baseStrokeOpacity = severed
    ? 0.1
    : energized || error || isOverloaded || isBusted
      ? 1
      : 0.45;
  const baseDash = severed
    ? '4 6'
    : isBusted
      ? '10 4'
      : animateFlow
        ? '8 6'
        : dashed
          ? '6 6'
          : undefined;

  return (
    <g data-wire-group opacity={isDimmedByTrace ? 0.15 : 1}>
      <g
        role={readOnly ? undefined : 'button'}
        data-wire-hitbox
        data-wire-id={wire.id}
        tabIndex={readOnly ? undefined : 0}
        aria-label={`Wire ${wire.id}${selected ? ', selected' : ''}`}
        aria-pressed={readOnly ? undefined : selected}
        onPointerDown={(event) => {
          if (event.button === 0) {
            event.stopPropagation();
          }
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onSelect(wire.id);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            onSelect(wire.id);
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
        style={{ cursor: readOnly ? 'default' : 'pointer' }}
      >
        <path d={path} fill="none" stroke="transparent" strokeWidth={14} />
        {isHighlightedInTrace && (
          <path
            d={path}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={wireWidth + 7}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.7}
            className="animate-pulse"
            pointerEvents="none"
          />
        )}
        {selected && (
          <path
            d={path}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={wireWidth + 8}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.55}
            strokeDasharray="8 6"
            pointerEvents="none"
          />
        )}
        {flagged && (
          <path
            d={path}
            fill="none"
            stroke="#ef4444"
            strokeWidth={wireWidth + 6}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={0.8}
            strokeDasharray="6 4"
            className="animate-pulse"
            pointerEvents="none"
          />
        )}
        {wireGlowOn && (energized || isOverloaded || isBusted) && !error && !severed && (
          <path
            d={path}
            fill="none"
            stroke={isBusted ? '#ef4444' : isOverloaded ? '#f97316' : color}
            strokeWidth={wireWidth + (isBusted ? 10 : isOverloaded ? 8 : 6)}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity={isBusted ? 0.35 : isOverloaded ? 0.25 : 0.14}
            pointerEvents="none"
          />
        )}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={
            wireWidth +
            (energized ? 0.5 : 0) +
            (isOverloaded ? 2 : 0) +
            (isBusted ? 2.5 : 0) +
            (selected ? 1.25 : 0)
          }
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={baseDash}
          className={
            wireClassName ? `${wireClassName} electrasim-wire-fade` : 'electrasim-wire-fade'
          }
          style={{ strokeOpacity: baseStrokeOpacity }}
        />
        {/* Busted / Melted Wire Animation Marker */}
        {isBusted && (
          <g pointerEvents="none" data-busted-wire-indicator>
            <circle
              cx={midpoint.x}
              cy={midpoint.y}
              r={14}
              fill="#7f1d1d"
              stroke="#ef4444"
              strokeWidth={2}
              className="electrasim-flame-flicker"
            />
            <image
              href={badges?.flame ?? ''}
              x={midpoint.x - 6}
              y={midpoint.y - 6}
              width={12}
              height={12}
            />
          </g>
        )}
        {/* Overloaded Heating Marker */}
        {isOverloaded && !isBusted && !broken && (
          <g pointerEvents="none" data-overload-indicator>
            <circle
              cx={midpoint.x}
              cy={midpoint.y}
              r={13}
              fill="#fee2e2"
              stroke="#ef4444"
              strokeWidth={1.5}
              opacity={0.9}
              className="electrasim-trip-pulse"
            />
            <circle
              cx={midpoint.x}
              cy={midpoint.y}
              r={9}
              fill="#dc2626"
              stroke="#ffffff"
              strokeWidth={1}
            />
            <image
              href={badges?.bolt ?? ''}
              x={midpoint.x - 5}
              y={midpoint.y - 5}
              width={10}
              height={10}
            />
          </g>
        )}
        {/* Injected Wire Short Circuit Animated Marker */}
        {isShortFault && !isBusted && (
          <g pointerEvents="none" data-short-wire-indicator>
            <circle
              cx={midpoint.x}
              cy={midpoint.y}
              r={14}
              fill="#ef4444"
              stroke="#f97316"
              strokeWidth={2}
              className="electrasim-trip-pulse"
            />
            <circle
              cx={midpoint.x}
              cy={midpoint.y}
              r={10}
              fill="#7f1d1d"
              className="electrasim-flame-flicker"
            />
            <image
              href={badges?.bolt ?? ''}
              x={midpoint.x - 5.5}
              y={midpoint.y - 5.5}
              width={11}
              height={11}
            />
          </g>
        )}
        {/* Injected open markers are owned by the route-aware FaultFxLayer. */}
        {/* Selected Wire Live Telemetry Overlay Label */}
        {selected && (
          <g pointerEvents="none" data-selected-wire-telemetry>
            <rect
              x={midpoint.x - 52}
              y={midpoint.y - (isBusted || isOverloaded || isShortFault || broken ? 38 : 26)}
              width={104}
              height={22}
              rx={6}
              fill="#0f172a"
              fillOpacity={0.92}
              stroke={energized ? '#10b981' : '#3b82f6'}
              strokeWidth={1.5}
            />
            <text
              x={midpoint.x}
              y={midpoint.y - (isBusted || isOverloaded || isShortFault || broken ? 23 : 11)}
              textAnchor="middle"
              fontSize={10}
              fontWeight="bold"
              fill="#ffffff"
              fontFamily="monospace"
            >
              {liveCurrent === undefined ? 'Current unavailable' : `${liveCurrent.toFixed(3)} A`}
              {' · '}
              {conductorDrop == null ? 'Drop unavailable' : `${conductorDrop.toFixed(3)} V drop`}
            </text>
          </g>
        )}
      </g>
    </g>
  );
}
