import { COMPONENT_DEFS, type ComponentInstance, getPortPos } from '@electrasim/domain';
import type { FaultFxItem } from '../../ui/canvas/faultFx';
import { sampleRenderedPath } from '../../ui/canvas/renderedPath';

/** Persistent cause markers use the editor's canonical fault descriptors/route geometry.
 * Event playback and decorative animations do not run on published snapshots. */
export function FaultMarkers({
  items,
  byId,
  paths,
}: {
  items: readonly FaultFxItem[];
  byId: Map<string, ComponentInstance>;
  paths: Map<string, string>;
}) {
  return (
    <g data-preview-faults pointerEvents="none">
      {items.map((item) => {
        const component = item.componentId ? byId.get(item.componentId) : undefined;
        const route = item.wireId ? paths.get(item.wireId) : undefined;
        const wire = route ? sampleRenderedPath(route) : null;
        const point = component
          ? item.portIndex === undefined
            ? { x: component.x, y: component.y - 45 }
            : getPortPos(component, item.portIndex, COMPONENT_DEFS)
          : wire?.mid;
        if (!point) return null;
        return (
          <g
            key={item.key}
            transform={`translate(${point.x} ${point.y})`}
            data-fault-cause={item.key}
          >
            <title>{item.config.label}</title>
            <circle r={17} fill="#fff" stroke={item.config.color} strokeWidth={2} />
            <text
              textAnchor="middle"
              y={3}
              fontSize={9}
              fontFamily="monospace"
              fontWeight={700}
              fill={item.config.color}
            >
              {item.config.code}
            </text>
          </g>
        );
      })}
    </g>
  );
}
