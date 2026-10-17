import type { ComponentInstance, SimulationResult } from '@electrasim/domain';
import type { CompatibilityResult } from '@electrasim/domain/core/compatibility';
import { assessmentPresentation } from '@electrasim/domain/core/readinessPresentation';
import { memo, useMemo } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import { useCircuitReadiness } from '../../store/electricalReadiness';
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
  forcedOpenIds?: ReadonlySet<string>;
  traceComponentIds?: Set<string> | null;
  onPointerDown: (component: ComponentInstance, event: PointerEvent<SVGGElement>) => void;
  onSelect?: (id: string | null) => void;
  onToggleSwitch?: (id: string) => void;
  onSetSwitchState?: (id: string, on: boolean) => void;
  onPortClick: (componentId: string, portIndex: number) => void;
  onHoverChange: (id: string | null) => void;
  onContextMenu: (id: string, event: MouseEvent<SVGGElement>) => void;
}

export const ComponentLayer = memo(function ComponentLayer({
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
  forcedOpenIds,
  traceComponentIds,
  onPointerDown,
  onSelect,
  onToggleSwitch,
  onSetSwitchState,
  onPortClick,
  onHoverChange,
  onContextMenu,
}: ComponentLayerProps) {
  const readiness = useCircuitReadiness();
  const reviews = useMemo(() => {
    const entries = new Map<string, 'incompatible' | 'unassessed'>();
    for (const group of readiness.groups) {
      if (group.result.status === 'incompatible') entries.set(group.componentId, 'incompatible');
      else if (group.result.status === 'unassessed' && !entries.has(group.componentId))
        entries.set(group.componentId, 'unassessed');
    }
    return entries;
  }, [readiness]);
  const reviewDetails = useMemo(() => {
    const entries = new Map<string, CompatibilityResult>();
    for (const group of readiness.groups) {
      const entry = entries.get(group.componentId) ?? { status: 'compatible', reasons: [] };
      if (
        group.result.status === 'incompatible' ||
        (entry.status === 'compatible' && group.result.status === 'unassessed')
      )
        entry.status = group.result.status;
      entry.reasons.push(...group.result.reasons);
      entries.set(group.componentId, entry);
    }
    return new Map([...entries].map(([id, result]) => [id, assessmentPresentation(result)]));
  }, [readiness]);
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
          forcedOpenCause={forcedOpenIds?.has(component.id)}
          compatibilityReview={reviews.get(component.id)}
          compatibilityLabel={reviewDetails.get(component.id)?.label}
          compatibilityDetails={`${reviewDetails.get(component.id)?.detail ?? ''} ${reviewDetails.get(component.id)?.action ?? ''}`}
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
});

// ─── Extracted modules (moved verbatim; re-exported for API parity) ─────────
export { ComponentNode, type ComponentNodeProps } from './ComponentNode';
export { ComponentTooltip, type ComponentTooltipProps } from './ComponentTooltip';
