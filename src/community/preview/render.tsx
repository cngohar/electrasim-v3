/** Store-independent SVG scene. No document, editor state, persistence or simulation execution. */
import { COMP_H, COMP_W, type Circuit, type SimulationResult } from '@electrasim/domain';
import { renderToStaticMarkup } from 'react-dom/server';
import { ComponentSceneNode } from '../../ui/canvas/ComponentSceneNode';
import { WireScenePath } from '../../ui/canvas/WireScenePath';
import { collectFaultFx, severedWireIdSet } from '../../ui/canvas/faultFx';
import { buildWirePath } from '../../ui/canvas/geometry';
import { labGlassLight } from '../../ui/canvas/lightTheme';
import { FaultMarkers } from './FaultMarkers';

const noop = () => {};
const badge = (path: string, color: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><path fill="${color}" d="${path}"/></svg>`)}`;
const bolt = badge('M21 1 5 21h11l-1 14L31 14H20z', '#f59e0b');
const flame = badge('M18 1C24 11 32 15 31 24A13 13 0 0 1 5 24C4 15 14 11 18 1', '#ef4444');

export function sceneGeometry(circuit: Circuit) {
  const byId = new Map(circuit.components.map((c) => [c.id, c]));
  const paths = new Map<string, string>();
  const points: { x: number; y: number }[] = [];
  for (const c of circuit.components) {
    const a = ((c.rotation ?? 0) * Math.PI) / 180;
    for (const x of [-COMP_W / 2, COMP_W / 2])
      for (const y of [-COMP_H / 2, COMP_H / 2 + 14])
        points.push({
          x: c.x + x * Math.cos(a) - y * Math.sin(a),
          y: c.y + x * Math.sin(a) + y * Math.cos(a),
        });
  }
  for (const wire of circuit.wires) {
    const path = buildWirePath(wire, byId);
    if (!path) continue;
    paths.set(wire.id, path);
    // These shared routes contain only M/L/Q/C commands. Their control hull
    // includes the full curve, including authored corners outside device bounds.
    const values = (path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
    for (let i = 0; i + 1 < values.length; i += 2) points.push({ x: values[i], y: values[i + 1] });
  }
  const bounds = points.reduce(
    (b, p) => ({
      left: Math.min(b.left, p.x),
      top: Math.min(b.top, p.y),
      right: Math.max(b.right, p.x),
      bottom: Math.max(b.bottom, p.y),
    }),
    {
      left: points[0]?.x ?? 0,
      top: points[0]?.y ?? 0,
      right: points[0]?.x ?? 0,
      bottom: points[0]?.y ?? 0,
    },
  );
  const width = Math.max(600, bounds.right - bounds.left + 128);
  const height = Math.max(360, bounds.bottom - bounds.top + 128);
  const left = (bounds.left + bounds.right - width) / 2;
  const top = (bounds.top + bounds.bottom - height) / 2;
  return { byId, paths, viewBox: [left, top, width, height] };
}

export function renderCircuitSvg(circuit: Circuit, title: string, simulation?: SimulationResult) {
  const { byId, paths, viewBox } = sceneGeometry(circuit);
  const theme = labGlassLight;
  const faults = collectFaultFx(circuit, byId);
  const severed = severedWireIdSet(faults);
  const markup = renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox.join(' ')}
      role="img"
      aria-label={title}
      className="circuit-scene"
      data-preview-svg
      data-reduced-effects="true"
    >
      <title>{title}</title>
      <desc>
        Read-only published schematic. {circuit.components.length} components and{' '}
        {circuit.wires.length} wires.{' '}
        {simulation ? 'Temporary simulation results.' : 'No simulation has been run.'}
      </desc>
      <rect x={viewBox[0]} y={viewBox[1]} width={viewBox[2]} height={viewBox[3]} fill="#f8fafc" />
      <g data-scene-wires>
        {circuit.wires.map((wire) => (
          <WireScenePath
            key={wire.id}
            wire={wire}
            componentsById={byId}
            theme={theme}
            wireWidth={2.25}
            simulation={simulation}
            selected={false}
            energized={simulation?.energizedWires.has(wire.id) ?? false}
            error={simulation?.errorWires.has(wire.id) ?? false}
            overloaded={simulation?.overloadedWires?.has(wire.id)}
            currentFlowOn={false}
            wireGlowOn={false}
            precomputedPath={paths.get(wire.id)}
            onSelect={noop}
            onArmReroute={noop}
            onContextMenu={noop}
            readOnly
            severed={severed.has(wire.id)}
            badges={{ flame, bolt }}
          />
        ))}
      </g>
      <g data-scene-components>
        {circuit.components.map((component) => (
          <ComponentSceneNode
            key={component.id}
            component={component}
            componentsById={byId}
            theme={theme}
            simulation={simulation}
            forcedOpenCause={faults.some(
              (item) =>
                item.componentId === component.id && ['jam', 'bridge'].includes(item.indicator),
            )}
            appearance="both"
            diagnosticOverlayMode="off"
            autoLabelsEnabled
            appMode="pro"
            selected={false}
            energized={simulation?.energizedComponents.has(component.id) ?? false}
            error={simulation?.errorComponents.has(component.id) ?? false}
            wireMode={false}
            pendingFrom={null}
            customPathFrom={null}
            activeLoadEffects={false}
            reducedDetails={false}
            onPointerDown={noop}
            onPortClick={noop}
            onHoverChange={noop}
            onContextMenu={noop}
            readOnly
            badges={{ short: bolt, tripped: bolt, blown: flame }}
          />
        ))}
      </g>
      <FaultMarkers items={faults} byId={byId} paths={paths} />
    </svg>,
  );
  // Presentation attributes keep standalone SVGs self-contained and obey the
  // page's strict style CSP. Editor-only cursors/user-select do not belong here.
  return markup
    .replace(/ style="([^"]*)"/g, (_match, style: string) => {
      const opacity = /(?:^|;)stroke-opacity:([\d.]+)/.exec(style)?.[1];
      return opacity ? ` stroke-opacity="${opacity}"` : '';
    })
    .replaceAll('font-family="var(--canvas-mono)"', 'font-family="monospace"')
    .replaceAll('fill="var(--canvas-text)"', 'fill="#0f172a"')
    .replaceAll('font-family="var(--canvas-mono, monospace)"', 'font-family="monospace"')
    .replaceAll('fill="var(--canvas-text, #0f172a)"', 'fill="#0f172a"')
    .replaceAll('stroke="var(--canvas-surface, #fff)"', 'stroke="#fff"');
}
