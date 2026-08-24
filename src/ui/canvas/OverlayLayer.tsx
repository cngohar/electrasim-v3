import type { PointerEvent, ReactNode, RefObject } from 'react';
import {
  COMPONENT_DEFS,
  COMP_H,
  COMP_W,
  type Circuit,
  type ComponentInstance,
  getPortControlOffset,
  getPortPos,
  snapToGrid,
} from '../../domain';
import type { PendingCustomPath } from '../../store';
import { WireEndpointHandles } from './WireLayer';
import { getDefaultArt } from './componentArt';
import { buildBezierPath, pointsToLinePath } from './geometry';
import type { CanvasTheme, PortLoc } from './types';

interface CanvasOverlayLayerProps {
  children: ReactNode;
  circuit: Circuit;
  componentsById: Map<string, ComponentInstance>;
  theme: CanvasTheme;
  selectedWireId: string | null;
  pendingWireFrom: PortLoc | null;
  pendingCustomPath: PendingCustomPath | null;
  reroute: { wireId: string; end: 'from' | 'to' } | null;
  cursor: { x: number; y: number } | null;
  placingType: string | null;
  gridSize: number;
  selectedComponentIds: readonly string[];
  dragRect: { x1: number; y1: number; x2: number; y2: number } | null;
  customCursorRef: RefObject<SVGGElement | null>;
  previewVariantType?: string | null;
  previewComponentId?: string | null;
  onArmEndpointReroute: (
    wireId: string,
    end: 'from' | 'to',
    event?: PointerEvent<SVGCircleElement>,
  ) => void;
}

export function CanvasOverlayLayer({
  children,
  circuit,
  componentsById,
  theme,
  selectedWireId,
  pendingWireFrom,
  pendingCustomPath,
  reroute,
  cursor,
  placingType,
  gridSize,
  selectedComponentIds,
  dragRect,
  customCursorRef,
  previewVariantType,
  previewComponentId,
  onArmEndpointReroute,
}: CanvasOverlayLayerProps) {
  const previewComponent =
    previewVariantType && previewComponentId ? componentsById.get(previewComponentId) : null;

  return (
    <>
      {previewVariantType && previewComponent && (
        <VariantPreviewGhost type={previewVariantType} component={previewComponent} theme={theme} />
      )}
      {selectedWireId && (
        <WireEndpointHandles
          wire={circuit.wires.find((wire) => wire.id === selectedWireId)}
          componentsById={componentsById}
          theme={theme}
          onArmReroute={onArmEndpointReroute}
        />
      )}
      {pendingWireFrom && cursor && !reroute && (
        <RubberBand
          from={pendingWireFrom}
          to={cursor}
          componentsById={componentsById}
          theme={theme}
        />
      )}
      {pendingCustomPath && (
        <CustomPathOverlay
          path={pendingCustomPath}
          componentsById={componentsById}
          theme={theme}
          cursorRef={customCursorRef}
        />
      )}
      {reroute && cursor && (
        <RerouteRubberBand
          reroute={reroute}
          cursor={cursor}
          circuit={circuit}
          componentsById={componentsById}
          theme={theme}
        />
      )}
      {placingType && cursor && (
        <GhostComponent type={placingType} cursor={cursor} gridSize={gridSize} theme={theme} />
      )}
      {selectedComponentIds.length > 1 && (
        <g pointerEvents="none">
          {selectedComponentIds.map((id) => {
            const component = componentsById.get(id);
            if (!component) return null;
            return (
              <rect
                key={id}
                data-selection-component-id={id}
                x={component.x - COMP_W / 2 - 4}
                y={component.y - COMP_H / 2 - 4}
                width={COMP_W + 8}
                height={COMP_H + 8}
                rx={theme.component.rounded + 3}
                fill="none"
                stroke={theme.component.selectedRing}
                strokeWidth={2}
                strokeOpacity={0.7}
                strokeDasharray="4 3"
              />
            );
          })}
        </g>
      )}
      {children}
      {dragRect && <DragRect rect={dragRect} color={theme.component.selectedRing} />}
    </>
  );
}

interface RubberBandProps {
  from: PortLoc;
  to: { x: number; y: number };
  componentsById: ReadonlyMap<string, ComponentInstance>;
  theme: CanvasTheme;
}

function RubberBand({ from, to, componentsById, theme }: RubberBandProps) {
  const component = componentsById.get(from.componentId);
  const port = component ? COMPONENT_DEFS[component.type]?.ports[from.portIndex] : undefined;
  if (!component || !port) return null;
  const start = getPortPos(component, from.portIndex, COMPONENT_DEFS);
  return (
    <path
      d={buildBezierPath(start, getPortControlOffset(port), to, { x: -30, y: 0 }, [])}
      fill="none"
      stroke={theme.wire[port.type]}
      strokeWidth={2.25}
      strokeOpacity={0.7}
      strokeDasharray="4 4"
      strokeLinecap="round"
      pointerEvents="none"
    />
  );
}

interface RerouteRubberBandProps {
  reroute: { wireId: string; end: 'from' | 'to' };
  cursor: { x: number; y: number };
  circuit: Circuit;
  componentsById: ReadonlyMap<string, ComponentInstance>;
  theme: CanvasTheme;
}

function RerouteRubberBand({
  reroute,
  cursor,
  circuit,
  componentsById,
  theme,
}: RerouteRubberBandProps) {
  const wire = circuit.wires.find((item) => item.id === reroute.wireId);
  if (!wire) return null;
  const componentId = reroute.end === 'from' ? wire.toComponentId : wire.fromComponentId;
  const portIndex = reroute.end === 'from' ? wire.toPortIndex : wire.fromPortIndex;
  const component = componentsById.get(componentId);
  const port = component ? COMPONENT_DEFS[component.type]?.ports[portIndex] : undefined;
  if (!component || !port) return null;
  const start = getPortPos(component, portIndex, COMPONENT_DEFS);
  return (
    <path
      d={buildBezierPath(start, getPortControlOffset(port), cursor, { x: -30, y: 0 }, [])}
      fill="none"
      stroke={theme.wire[port.type]}
      strokeWidth={2.5}
      strokeDasharray="6 4"
      strokeLinecap="round"
      pointerEvents="none"
    />
  );
}

interface CustomPathOverlayProps {
  path: PendingCustomPath;
  componentsById: ReadonlyMap<string, ComponentInstance>;
  theme: CanvasTheme;
  cursorRef: RefObject<SVGGElement | null>;
}

function CustomPathOverlay({ path, componentsById, theme, cursorRef }: CustomPathOverlayProps) {
  const component = componentsById.get(path.from.componentId);
  const port = component ? COMPONENT_DEFS[component.type]?.ports[path.from.portIndex] : undefined;
  if (!component || !port) return null;
  const origin = getPortPos(component, path.from.portIndex, COMPONENT_DEFS);
  const color = theme.wire[port.type];
  const tail = path.checkpoints.at(-1) ?? origin;
  return (
    <g pointerEvents="none">
      <path
        d={pointsToLinePath([origin, ...path.checkpoints])}
        fill="none"
        stroke={color}
        strokeWidth={2.25}
        strokeOpacity={0.85}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="6 4"
      />
      {path.checkpoints.map((checkpoint, index) => (
        <rect
          key={`${checkpoint.x}:${checkpoint.y}:${index}`}
          x={checkpoint.x - 4}
          y={checkpoint.y - 4}
          width={8}
          height={8}
          fill={color}
          fillOpacity={0.75}
          rx={1}
          transform={`rotate(45 ${checkpoint.x} ${checkpoint.y})`}
        />
      ))}
      <circle cx={origin.x} cy={origin.y} r={4.5} fill={color} fillOpacity={0.9} />
      <g ref={cursorRef} transform={`translate(${tail.x} ${tail.y})`}>
        <circle r={5} fill={color} fillOpacity={0.7} />
        <circle r={8} fill="none" stroke={color} strokeWidth={1.5} strokeOpacity={0.4} />
      </g>
    </g>
  );
}

function DragRect({
  rect,
  color,
}: {
  rect: { x1: number; y1: number; x2: number; y2: number };
  color: string;
}) {
  const x = Math.min(rect.x1, rect.x2);
  const y = Math.min(rect.y1, rect.y2);
  return (
    <rect
      x={x}
      y={y}
      width={Math.abs(rect.x2 - rect.x1)}
      height={Math.abs(rect.y2 - rect.y1)}
      fill={color}
      fillOpacity={0.07}
      stroke={color}
      strokeWidth={1.5}
      strokeOpacity={0.7}
      strokeDasharray="6 3"
      rx={4}
      pointerEvents="none"
    />
  );
}

function GhostComponent({
  type,
  cursor,
  gridSize,
  theme,
}: {
  type: string;
  cursor: { x: number; y: number };
  gridSize: number;
  theme: CanvasTheme;
}) {
  const definition = COMPONENT_DEFS[type];
  if (!definition) return null;
  const x = snapToGrid(cursor.x, gridSize) - COMP_W / 2;
  const y = snapToGrid(cursor.y, gridSize) - COMP_H / 2;
  // Match the placed component's visual: near-realistic SVG art when the
  // component has it, legacy emoji glyph otherwise. Keeps the drag/placement
  // preview consistent with what actually lands on the canvas.
  const art = getDefaultArt(type);
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none" opacity={0.55}>
      <rect
        width={COMP_W}
        height={COMP_H}
        rx={theme.component.rounded}
        ry={theme.component.rounded}
        fill={theme.component.bg}
        stroke={theme.component.accent}
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      {art ? (
        <image
          href={art}
          x={COMP_W / 2 - 19}
          y={4}
          width={38}
          height={34}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <text x={COMP_W / 2} y={28} textAnchor="middle" fontSize="20">
          {definition.icon}
        </text>
      )}
      <text
        x={COMP_W / 2}
        y={50}
        textAnchor="middle"
        fontSize="9"
        fontFamily={theme.monoFont ?? theme.font}
        fill={theme.component.text}
      >
        {definition.label}
      </text>
      {definition.ports.map((port, index) => (
        <circle
          key={index}
          cx={port.relX * COMP_W}
          cy={port.relY * COMP_H}
          r={5}
          fill={theme.port.bgIdle}
          stroke={theme.wire[port.type]}
          strokeWidth={1.5}
        />
      ))}
    </g>
  );
}

interface VariantPreviewGhostProps {
  type: string;
  component: ComponentInstance;
  theme: CanvasTheme;
}

function VariantPreviewGhost({ type, component, theme }: VariantPreviewGhostProps) {
  const definition = COMPONENT_DEFS[type];
  if (!definition) return null;

  const powerLabel = definition.powerWatts
    ? `${definition.powerWatts >= 1000 ? `${definition.powerWatts / 1000}kW` : `${definition.powerWatts}W`}`
    : definition.maxAmps
      ? `${definition.maxAmps}A`
      : '';

  return (
    <g
      transform={`translate(${component.x - COMP_W / 2} ${component.y - COMP_H / 2})`}
      pointerEvents="none"
    >
      {/* Outer ghost glow aura */}
      <rect
        x={-8}
        y={-8}
        width={COMP_W + 16}
        height={COMP_H + 16}
        rx={theme.component.rounded + 6}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2.5}
        strokeDasharray="6 4"
        opacity={0.85}
      />

      {/* Semi-transparent preview card */}
      <rect
        width={COMP_W}
        height={COMP_H}
        rx={theme.component.rounded}
        ry={theme.component.rounded}
        fill={theme.isDark ? '#0f172a' : '#ffffff'}
        fillOpacity={0.88}
        stroke="#2563eb"
        strokeWidth={2}
      />

      {/* Header Tag Badge */}
      <g transform={`translate(${COMP_W / 2}, -14)`}>
        <rect x={-55} y={-10} width={110} height={20} rx={10} fill="#1d4ed8" />
        <text textAnchor="middle" y={3} fontSize="9" fontWeight="700" fill="#ffffff">
          PREVIEW {powerLabel ? `• ${powerLabel}` : ''}
        </text>
      </g>

      {/* Visual: near-realistic art when available, legacy glyph otherwise */}
      {getDefaultArt(type) ? (
        <image
          href={getDefaultArt(type) ?? undefined}
          x={COMP_W / 2 - 20}
          y={8}
          width={40}
          height={34}
          preserveAspectRatio="xMidYMid meet"
        />
      ) : (
        <text x={COMP_W / 2} y={32} textAnchor="middle" fontSize="22">
          {definition.icon}
        </text>
      )}

      {/* Variant Label */}
      <text
        x={COMP_W / 2}
        y={54}
        textAnchor="middle"
        fontSize="9"
        fontWeight="600"
        fill={theme.isDark ? '#f1f5f9' : '#0f172a'}
      >
        {definition.label}
      </text>

      {/* Ghost ports */}
      {definition.ports.map((port, index) => (
        <circle
          key={index}
          cx={port.relX * COMP_W}
          cy={port.relY * COMP_H}
          r={5.5}
          fill="#2563eb"
          stroke="#ffffff"
          strokeWidth={1.5}
        />
      ))}
    </g>
  );
}
