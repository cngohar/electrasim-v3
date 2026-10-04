/**
 * StressZoneOverlay — heatmap rendered over the canvas when the Pro-mode
 * unified diagnostic overlay is set to Heat or Heat + V-drop.
 *
 * For every energised component and wire we compute a normalised stress
 * ratio 0..1 by combining two signals available on the live simulation
 * result:
 *   - thermal ratio: component temperature (°C) / 90 °C, or the wire's
 *     `wireHeatRatios` entry (current / derated ampacity)
 *   - voltage-drop ratio: wire's percentage drop / the selected standard's
 *     ceiling for lighting or power circuits.
 *
 * The higher of the two drives the heat colour (green → amber → orange →
 * red). Components/wires above 80 % get a pulsing outline. The overlay is
 * purely decorative (pointer-events: none); all interaction stays with the
 * existing canvas layers.
 */

import {
  COMPONENT_DEFS,
  COMP_H,
  COMP_W,
  type Circuit,
  type ComponentInstance,
  type SimulationResult,
} from '@electrasim/domain';
import { getStandard, voltageDropCeiling } from '@electrasim/domain/standards';
import { useSettingsStore } from '../../store';
import { buildWirePath } from './geometry';

interface Props {
  circuit: Circuit;
  simulation: SimulationResult | null;
  componentsById: Map<string, ComponentInstance>;
  /** Reuse the exact routed geometry already calculated by CircuitCanvas. */
  orthogonalPaths: ReadonlyMap<string, string>;
}

/** Interpolate green → amber → orange → red on a 0..1 ratio. */
function stressColor(ratio: number): string {
  const r = Math.max(0, Math.min(1, ratio));
  if (r < 0.5) {
    // green (34,197,94) → amber (234,179,8)
    const t = r / 0.5;
    const R = Math.round(34 + (234 - 34) * t);
    const G = Math.round(197 + (179 - 197) * t);
    const B = Math.round(94 + (8 - 94) * t);
    return `rgb(${R},${G},${B})`;
  }
  // amber → orange → red
  const t = (r - 0.5) / 0.5;
  const R = Math.round(234 + (239 - 234) * t);
  const G = Math.round(179 + (68 - 179) * t);
  const B = Math.round(8 + (68 - 8) * t);
  return `rgb(${R},${G},${B})`;
}

export function StressZoneOverlay({ circuit, simulation, componentsById, orthogonalPaths }: Props) {
  const overlayMode = useSettingsStore((s) => s.diagnosticOverlayMode);
  const regulationStandard = useSettingsStore((s) => s.regulationStandard);
  const standard = getStandard(regulationStandard);

  if (overlayMode === 'off') return null;

  const { components, wires } = circuit;
  // When simulation isn't running yet we still render an empty marker group
  // so callers (and tests) can detect the selected visualization mode.
  if (!simulation) {
    return (
      <g pointerEvents="none" data-stress-zone-overlay data-diagnostic-overlay-mode={overlayMode} />
    );
  }

  return (
    <g
      pointerEvents="none"
      data-stress-zone-overlay
      data-diagnostic-overlay-mode={overlayMode}
      style={{ isolation: 'isolate' }}
    >
      {/* The Heat-only mode uses ComponentNode's detailed °C/W cards. In the
          combined mode these stress halos replace them, avoiding stacked controls. */}
      {overlayMode === 'heat-vdrop' &&
        components.map((comp) => {
          if (!simulation.energizedComponents.has(comp.id)) return null;
          const thermal = simulation.thermalData?.[comp.id];
          const tempRatio = thermal ? thermal.temperature / 90 : 0;
          // Live component power also contributes a small heat floor.
          const power = comp.state.customPowerWatts ?? COMPONENT_DEFS[comp.type]?.powerWatts ?? 0;
          const powerRatio = power > 0 ? Math.min(0.6, power / 3000) : 0;
          const ratio = Math.max(tempRatio, powerRatio, comp.state.isBlown ? 1 : 0);
          if (ratio < 0.25) return null;
          const color = stressColor(ratio);
          const x = comp.x - COMP_W / 2;
          const y = comp.y - COMP_H / 2;
          return (
            <g key={`stress-c-${comp.id}`}>
              <rect
                x={x - 8}
                y={y - 8}
                width={COMP_W + 16}
                height={COMP_H + 16}
                rx={16}
                fill={color}
                fillOpacity={0.18 + ratio * 0.25}
                stroke={color}
                strokeWidth={ratio > 0.8 ? 2.5 : 1.5}
                strokeOpacity={0.7}
                strokeDasharray={ratio > 0.8 ? '5 3' : undefined}
                className={ratio > 0.8 ? 'animate-pulse' : undefined}
              />
              <g transform={`translate(${comp.x}, ${y - 12})`}>
                <rect
                  x={-28}
                  y={-8}
                  width={56}
                  height={14}
                  rx={7}
                  fill="#0f172a"
                  stroke={color}
                  strokeWidth={1}
                />
                <text
                  textAnchor="middle"
                  y={2}
                  fontSize="8"
                  fontWeight="bold"
                  fill={color}
                  fontFamily="ui-monospace, monospace"
                >
                  {Math.round(ratio * 100)}%
                  {thermal ? ` · ${Math.round(thermal.temperature)}°C` : ''}
                </text>
              </g>
            </g>
          );
        })}

      {/* Wire stress bands follow the same bezier/orthogonal route as WireLayer. */}
      {wires.map((wire) => {
        if (!simulation.energizedWires.has(wire.id)) return null;
        const calc = simulation.wireCalculations?.[wire.id];
        const heatRatio = simulation.wireHeatRatios?.[wire.id] ?? 0;
        const fromComp = componentsById.get(wire.fromComponentId);
        const toComp = componentsById.get(wire.toComponentId);
        if (!fromComp || !toComp) return null;
        const ceiling = voltageDropCeiling(fromComp.type, standard);
        const dropRatio =
          overlayMode === 'heat-vdrop' && calc?.voltageDropPercent != null && ceiling !== null
            ? calc.voltageDropPercent / ceiling
            : 0;
        const ratio = Math.max(heatRatio, dropRatio, wire.isBusted ? 1 : 0);
        if (ratio < 0.25) return null;

        const path = orthogonalPaths.get(wire.id) ?? buildWirePath(wire, componentsById);
        if (!path) return null;
        const mx = (fromComp.x + toComp.x) / 2;
        const my = (fromComp.y + toComp.y) / 2;
        const color = stressColor(ratio);
        const label =
          overlayMode === 'heat-vdrop' && calc?.voltageDropPercent != null
            ? `${calc.voltageDropPercent.toFixed(1)}% ΔU`
            : `${Math.round(heatRatio * 100)}% load`;
        return (
          <g key={`stress-w-${wire.id}`} data-stress-wire-id={wire.id}>
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={10 + ratio * 8}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.2 + ratio * 0.28}
              className={ratio > 0.8 ? 'animate-pulse' : undefined}
            />
            {/* Animated current flow heatmap along the conductor */}
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={3 + ratio * 2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="8 8"
              className="electrasim-wire-flow"
              style={{
                strokeOpacity: 0.85,
                animationDuration: `${Math.max(0.35, 1.6 - ratio * 1.1)}s`,
              }}
            />
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={1.5 + ratio * 1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={0.65}
              strokeDasharray={ratio > 0.8 ? '7 4' : undefined}
            />
            <g transform={`translate(${mx + 12}, ${my - 6})`}>
              <rect x={-4} y={-8} width={44} height={14} rx={7} fill="#0f172a" stroke={color} />
              <text
                textAnchor="middle"
                x={18}
                y={2}
                fontSize="7.5"
                fontWeight="bold"
                fill={color}
                fontFamily="ui-monospace, monospace"
              >
                {label}
              </text>
            </g>
          </g>
        );
      })}
    </g>
  );
}
