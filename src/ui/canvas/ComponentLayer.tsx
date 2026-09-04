import type { MouseEvent, PointerEvent } from 'react';
import type { ComponentInstance, SimulationResult } from '../../domain';
import { ComponentNode } from './ComponentNode';
import type { CanvasTheme, PortLoc } from './types';

interface ComponentLayerProps {
  components: readonly ComponentInstance[];
  componentsById: ReadonlyMap<string, ComponentInstance>;
  simulation?: SimulationResult | null;
  selectedId?: string | null;
  theme: CanvasTheme;
  wireMode: boolean;
  pendingFrom: PortLoc | null;
  customPathFrom: PortLoc | null;
  activeLoadEffects: boolean;
  reducedDetails: boolean;
  flaggedIds?: Set<string>;
  traceComponentIds?: Set<string> | null;
  onPointerDown: (component: ComponentInstance, event: PointerEvent<SVGGElement>) => void;
  onSelect?: (id: string | null) => void;
  onToggleSwitch?: (id: string) => void;
  onSetSwitchState?: (id: string, on: boolean) => void;
  onPortClick: (componentId: string, portIndex: number) => void;
  onHoverChange: (id: string | null) => void;
  onContextMenu: (id: string, event: MouseEvent<SVGGElement>) => void;
}

export function ComponentLayer({
  components,
  componentsById,
  simulation,
  selectedId,
  theme,
  wireMode,
  pendingFrom,
  customPathFrom,
  activeLoadEffects,
  reducedDetails,
  flaggedIds,
  traceComponentIds,
  onPointerDown,
  onSelect,
  onToggleSwitch,
  onSetSwitchState,
  onPortClick,
  onHoverChange,
  onContextMenu,
}: ComponentLayerProps) {
  // Render selected component last so it stays on top of other components on canvas
  const orderedComponents = selectedId
    ? [...components].sort((a, b) => (a.id === selectedId ? 1 : b.id === selectedId ? -1 : 0))
    : components;

  return (
    <g>
      {orderedComponents.map((component) => (
        <ComponentNode
          key={component.id}
          component={component}
          componentsById={componentsById}
          simulation={simulation}
          theme={theme}
          selected={selectedId === component.id}
          flagged={flaggedIds?.has(component.id)}
          energized={simulation?.energizedComponents.has(component.id) ?? false}
          error={simulation?.errorComponents.has(component.id) ?? false}
          wireMode={wireMode}
          pendingFrom={pendingFrom}
          customPathFrom={customPathFrom}
          activeLoadEffects={activeLoadEffects}
          reducedDetails={reducedDetails}
          traceComponentIds={traceComponentIds}
          onPointerDown={onPointerDown}
          onSelect={onSelect}
          onToggleSwitch={onToggleSwitch}
          onSetSwitchState={onSetSwitchState}
          onPortClick={onPortClick}
          onHoverChange={onHoverChange}
          onContextMenu={onContextMenu}
        />
      ))}
    </g>
  );
}

// ─── Extracted modules (moved verbatim; re-exported for API parity) ─────────
export { ComponentNode, type ComponentNodeProps } from './ComponentNode';
export { ComponentTooltip, type ComponentTooltipProps } from './ComponentTooltip';
