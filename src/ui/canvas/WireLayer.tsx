import {
  COMPONENT_DEFS,
  type ComponentInstance,
  type SimulationResult,
  type WireInstance,
  getPortPos,
} from '@electrasim/domain';
import { memo } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import { emojiDataUri } from '../../lib/emoji/emojiSvg';
import { useEmojiGlyphsReady } from '../hooks/useEmojiGlyphsReady';
import { DenseWireLayer } from './DenseWireLayer';
import { WireScenePath } from './WireScenePath';
import type { CanvasTheme } from './types';

interface WireLayerProps {
  wires: readonly WireInstance[];
  componentsById: Map<string, ComponentInstance>;
  theme: CanvasTheme;
  wireWidth: number;
  simulation?: SimulationResult | null;
  selectedWireId: string | null;
  currentFlowOn: boolean;
  wireGlowOn: boolean;
  reducedDetails: boolean;
  orthogonalPaths: ReadonlyMap<string, string>;
  flaggedWireIds?: Set<string>;
  traceWireIds?: Set<string> | null;
  /** Conductor runs visually severed by an open fault (FaultFxLayer draws
      the cut zone on top); rendered faded so the "wire is gone" reads. */
  severedWireIds?: ReadonlySet<string>;
  onSelectWire: (id: string) => void;
  onArmReroute: (id: string) => void;
  onContextMenu: (id: string, event: MouseEvent<SVGGElement>) => void;
}

export const WireLayer = memo(function WireLayer({
  wires,
  componentsById,
  theme,
  wireWidth,
  simulation,
  selectedWireId,
  currentFlowOn,
  wireGlowOn,
  reducedDetails,
  orthogonalPaths,
  flaggedWireIds,
  traceWireIds,
  severedWireIds,
  onSelectWire,
  onArmReroute,
  onContextMenu,
}: WireLayerProps) {
  // Keep the batch renderer for ordinary conductors; safety and trace
  // states use the same renderer at every circuit size so LOD cannot hide evidence.
  const detailedWires = reducedDetails
    ? wires.filter(
        (wire) =>
          flaggedWireIds?.has(wire.id) ||
          traceWireIds?.has(wire.id) ||
          severedWireIds?.has(wire.id) ||
          wire.fault ||
          wire.isBusted ||
          simulation?.errorWires.has(wire.id) ||
          simulation?.overloadedWires?.has(wire.id) ||
          simulation?.bustedWires?.has(wire.id) ||
          (simulation?.wireHeatRatios?.[wire.id] ?? 0) > 0.8,
      )
    : wires;
  const detailedIds = new Set(detailedWires.map((wire) => wire.id));

  return (
    <g>
      {reducedDetails && (
        <g opacity={traceWireIds != null ? 0.15 : 1}>
          <DenseWireLayer
            wires={wires.filter((wire) => !detailedIds.has(wire.id))}
            componentsById={componentsById}
            theme={theme}
            wireWidth={wireWidth}
            simulation={simulation}
            selectedWireId={selectedWireId}
            orthogonalPaths={orthogonalPaths}
            onSelectWire={onSelectWire}
            onArmReroute={onArmReroute}
            onContextMenu={onContextMenu}
          />
        </g>
      )}
      {detailedWires.map((wire) => (
        <WirePath
          key={wire.id}
          wire={wire}
          componentsById={componentsById}
          theme={theme}
          wireWidth={wireWidth}
          simulation={simulation}
          energized={simulation?.energizedWires.has(wire.id) ?? false}
          error={simulation?.errorWires.has(wire.id) ?? false}
          overloaded={simulation?.overloadedWires?.has(wire.id) ?? false}
          selected={selectedWireId === wire.id}
          flagged={flaggedWireIds?.has(wire.id)}
          severed={severedWireIds?.has(wire.id) ?? false}
          currentFlowOn={currentFlowOn}
          wireGlowOn={wireGlowOn}
          precomputedPath={orthogonalPaths.get(wire.id)}
          traceWireIds={traceWireIds}
          onSelect={onSelectWire}
          onArmReroute={onArmReroute}
          onContextMenu={onContextMenu}
        />
      ))}
    </g>
  );
});

function WirePath(props: import('./WireScenePath').WireScenePathProps) {
  useEmojiGlyphsReady();
  return (
    <WireScenePath
      {...props}
      badges={{ flame: emojiDataUri('flame', 12) ?? '', bolt: emojiDataUri('bolt', 11) ?? '' }}
    />
  );
}

interface WireEndpointHandlesProps {
  wire: WireInstance | undefined;
  componentsById: ReadonlyMap<string, ComponentInstance>;
  theme: CanvasTheme;
  onArmReroute: (
    wireId: string,
    end: 'from' | 'to',
    event?: PointerEvent<SVGCircleElement>,
  ) => void;
}

export function WireEndpointHandles({
  wire,
  componentsById,
  theme,
  onArmReroute,
}: WireEndpointHandlesProps) {
  if (!wire) return null;
  const from = componentsById.get(wire.fromComponentId);
  const to = componentsById.get(wire.toComponentId);
  if (!from || !to) return null;
  const start = getPortPos(from, wire.fromPortIndex, COMPONENT_DEFS);
  const end = getPortPos(to, wire.toPortIndex, COMPONENT_DEFS);
  const handleProps = (x: number, y: number, endpoint: 'from' | 'to') => ({
    cx: x,
    cy: y,
    r: 7,
    fill: '#ffffff',
    stroke: theme.component.selectedRing,
    strokeWidth: 2,
    role: 'button',
    tabIndex: 0,
    'aria-label': `Reroute ${endpoint === 'from' ? 'origin' : 'target'} of wire ${wire.id}`,
    style: { cursor: 'pointer' as const },
    onPointerDown: (event: PointerEvent<SVGCircleElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      onArmReroute(wire.id, endpoint, event);
    },
    onKeyDown: (event: KeyboardEvent<SVGCircleElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      onArmReroute(wire.id, endpoint);
    },
  });
  return (
    <g>
      <circle {...handleProps(start.x, start.y, 'from')} />
      <circle {...handleProps(end.x, end.y, 'to')} />
    </g>
  );
}
