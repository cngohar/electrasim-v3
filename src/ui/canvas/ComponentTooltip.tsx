/**
 * ComponentTooltip — hover tooltip for canvas components.
 *
 * Split verbatim from the former monolithic `ComponentLayer.tsx`.
 */

import {
  COMPONENT_DEFS,
  COMP_H,
  COMP_W,
  type ComponentInstance,
  type SimulationResult,
} from '@electrasim/domain';

export interface ComponentTooltipProps {
  component: ComponentInstance | undefined;
  simulation: SimulationResult | null;
  pan: { x: number; y: number };
  zoom: number;
}

export function ComponentTooltip({ component, simulation, pan, zoom }: ComponentTooltipProps) {
  if (!component) return null;
  const definition = COMPONENT_DEFS[component.type];
  if (!definition) return null;
  const anchorX = pan.x + (component.x - COMP_W / 2) * zoom;
  const anchorY = pan.y + (component.y - COMP_H / 2) * zoom - 12;
  const energized = simulation?.energizedComponents.has(component.id) ?? false;
  const error = simulation?.errorComponents.has(component.id) ?? false;
  const isOn = component.state.on === true;
  const changeoverPosition = definition.changeover
    ? definition.ports[
        isOn ? definition.changeover.onPortIndex : definition.changeover.offPortIndex
      ]?.label
    : null;
  const lines = [
    `${definition.label}  ·  ${component.id}`,
    definition.isSwitch
      ? definition.isMomentary
        ? `Button: ${isOn ? 'pressed' : 'released'}`
        : changeoverPosition
          ? `Switch position: ${changeoverPosition}`
          : `Switch: ${isOn ? 'closed (on)' : 'open (off)'}`
      : '',
    error ? 'Status: fault' : energized ? 'Status: energised' : 'Status: idle',
    `Ports: ${definition.ports.map((port) => port.label ?? port.type).join(' · ')}`,
  ].filter(Boolean);
  const width = 200;
  const height = 16 + lines.length * 14;
  return (
    <g pointerEvents="none" transform={`translate(${anchorX} ${anchorY - height})`}>
      <rect width={width} height={height} rx={8} ry={8} fill="#0f172a" opacity={0.92} />
      {lines.map((line, index) => (
        <text
          key={line}
          x={10}
          y={16 + index * 14}
          fontSize={10}
          fill="#e2e8f0"
          fontFamily="ui-sans-serif, system-ui"
        >
          {line}
        </text>
      ))}
    </g>
  );
}
