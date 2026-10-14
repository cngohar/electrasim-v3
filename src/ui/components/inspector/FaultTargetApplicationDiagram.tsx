import {
  COMPONENT_DEFS,
  COMP_H,
  COMP_W,
  type Circuit,
  type ComponentInstance,
  type FaultTarget,
  type FaultType,
  getPortControlOffset,
  getPortPos,
  normalizeCircuitFaults,
  sampleWire,
} from '@electrasim/domain';
import { resolveDeviceModel } from '@electrasim/domain/core/models';
import { ComponentSymbol } from '../../canvas/ComponentSymbol';
import { FaultFxLayer } from '../../canvas/FaultFxLayer';
import { collectFaultFx } from '../../canvas/faultFx';
import { labGlassDark } from '../../theme';

const phaseColor = {
  live: '#e8a66c',
  neutral: '#81a9e5',
  earth: '#72c6a2',
} as const;
const faultColor = '#f08071';
const canvasColor = '#142733';

type Point = { x: number; y: number };

function portPoint(
  component: ComponentInstance,
  index: number,
  x: number,
  y: number,
): Point | null {
  const port = COMPONENT_DEFS[component.type]?.ports[index];
  if (!port) return null;
  return getPortPos({ ...component, x: x + COMP_W / 2, y: y + COMP_H / 2 }, index, COMPONENT_DEFS);
}

function portDirection(component: ComponentInstance, index: number): Point | null {
  const port = COMPONENT_DEFS[component.type]?.ports[index];
  if (!port) return null;
  const offset = getPortControlOffset(port);
  const length = Math.max(1, Math.hypot(offset.x, offset.y));
  const dx = offset.x / length;
  const dy = offset.y / length;
  const rotation = ((component.rotation ?? 0) * Math.PI) / 180;
  return {
    x: dx * Math.cos(rotation) - dy * Math.sin(rotation),
    y: dx * Math.sin(rotation) + dy * Math.cos(rotation),
  };
}

function ComponentGlyph({
  component,
  x,
  y,
  contactsOpen = false,
  highlighted = false,
}: {
  component: ComponentInstance;
  x: number;
  y: number;
  contactsOpen?: boolean;
  highlighted?: boolean;
}) {
  const rotation = component.rotation ?? 0;
  const centerX = x + COMP_W / 2;
  const centerY = y + COMP_H / 2;
  return (
    <g
      data-fault-target-component={component.id}
      transform={`rotate(${rotation} ${centerX} ${centerY})`}
    >
      <rect
        x={x}
        y={y}
        width={COMP_W}
        height={COMP_H}
        rx={9}
        fill="#1d3542"
        stroke={highlighted ? faultColor : '#8099a6'}
        strokeWidth={highlighted ? 2.5 : 1.5}
      />
      <svg
        x={x + 21}
        y={y + 3}
        width={58}
        height={58}
        viewBox="0 0 64 64"
        color="#e4edf1"
        aria-hidden="true"
      >
        <ComponentSymbol component={component} contactsOpen={contactsOpen} />
      </svg>
    </g>
  );
}

function terminalData(component: ComponentInstance, x: number, y: number) {
  const definition = COMPONENT_DEFS[component.type];
  if (!definition) return [];
  return definition.ports.flatMap((port, index) => {
    const point = portPoint(component, index, x, y);
    const direction = portDirection(component, index);
    if (!point || !direction) return [];
    return [
      {
        index,
        label: port.label,
        role: port.type,
        point,
        direction,
        end: { x: point.x + direction.x * 42, y: point.y + direction.y * 42 },
      },
    ];
  });
}

function openTerminalSet(type: FaultType, target: FaultTarget, component: ComponentInstance) {
  if (
    !['open-circuit', 'open-live', 'open-neutral', 'open-earth', 'terminal-disconnect'].includes(
      type,
    )
  )
    return new Set<number>();
  if (target.type === 'port') return new Set([target.portIndex]);
  if (type === 'terminal-disconnect') return new Set<number>();
  if (!['open-live', 'open-neutral', 'open-earth'].includes(type)) return new Set<number>();
  const role = type === 'open-live' ? 'live' : type === 'open-neutral' ? 'neutral' : 'earth';
  return new Set(
    (COMPONENT_DEFS[component.type]?.ports ?? []).flatMap((port, index) =>
      port.type === role ? [index] : [],
    ),
  );
}

function linePath(from: Point, to: Point) {
  return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
}

function bridgePath(
  fromTerminal: ReturnType<typeof terminalData>[number],
  toTerminal: ReturnType<typeof terminalData>[number],
) {
  const from = fromTerminal.end;
  const to = toTerminal.end;
  if (Math.abs(from.x - to.x) < 1 && Math.abs(fromTerminal.direction.x) > 0.5) {
    const edge = from.x + fromTerminal.direction.x * 42;
    return `M ${from.x} ${from.y} C ${edge} ${from.y} ${edge} ${to.y} ${to.x} ${to.y}`;
  }
  const midY = Math.min(from.y, to.y) - 42;
  return `M ${from.x} ${from.y} C ${from.x} ${midY} ${to.x} ${midY} ${to.x} ${to.y}`;
}

function ComponentFaultDiagram({
  circuit,
  component,
  target,
  type,
  coverage,
}: {
  circuit: Circuit;
  component: ComponentInstance;
  target: FaultTarget;
  type: FaultType;
  coverage: 'supported' | 'not-assessed';
}) {
  const x = 250;
  const y = 62;
  const terminals = terminalData(component, x, y);
  const openTerminals = openTerminalSet(type, target, component);
  const definition = COMPONENT_DEFS[component.type];
  const model = definition && resolveDeviceModel(component, definition, circuit);
  const byRole = (role: 'live' | 'neutral' | 'earth') =>
    terminals.filter((terminal) => terminal.role === role);
  const oneLive = byRole('live').length === 1 ? byRole('live')[0] : undefined;
  const oneNeutral = byRole('neutral').length === 1 ? byRole('neutral')[0] : undefined;
  const oneEarth = byRole('earth').length === 1 ? byRole('earth')[0] : undefined;
  const bridgeTo = type === 'short-circuit' ? oneNeutral : oneEarth;
  const bridgeLabel = type === 'short-circuit' ? 'L → N bridge' : 'L → PE bridge';
  const selectedPort = target.type === 'port' ? target.portIndex : null;
  const openedTerminal = (index: number) => openTerminals.has(index);
  const displayableBridge =
    oneLive !== undefined &&
    bridgeTo !== undefined &&
    (coverage === 'supported' || type === 'live-to-earth');
  const unrotatedTerminals = terminalData({ ...component, rotation: 0 }, x, y);
  const polePairs =
    definition?.isProtection && model?.kind === 'contacts'
      ? model.poles.flatMap((pole) => {
          const input = unrotatedTerminals.find((terminal) => terminal.index === pole.common);
          const output = unrotatedTerminals.find((terminal) => terminal.index === pole.no);
          return input && output ? [{ input, output }] : [];
        })
      : [];

  return (
    <svg
      viewBox="0 0 600 200"
      role="img"
      aria-label={`${type} shown on the actual ${definition?.label ?? component.type} component and its terminals`}
      data-fault-target-diagram="component"
      data-fault-target-id={component.id}
    >
      <title>
        Actual component symbol and terminal positions from this circuit; explanatory fault overlay.
      </title>
      <rect x="8" y="8" width="584" height="184" rx="15" fill={canvasColor} />
      {terminals.map((terminal) => {
        const gap = openedTerminal(terminal.index) ? 6 : 0;
        const mid = {
          x: (terminal.point.x + terminal.end.x) / 2,
          y: (terminal.point.y + terminal.end.y) / 2,
        };
        const dx = terminal.direction.x * gap;
        const dy = terminal.direction.y * gap;
        return (
          <g key={`lead-${terminal.index}`}>
            {gap ? (
              <>
                <path
                  d={linePath(terminal.point, { x: mid.x - dx, y: mid.y - dy })}
                  stroke={phaseColor[terminal.role]}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                <path
                  d={linePath({ x: mid.x + dx, y: mid.y + dy }, terminal.end)}
                  stroke={phaseColor[terminal.role]}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
                <circle cx={mid.x - dx} cy={mid.y - dy} r={2.5} fill={faultColor} />
                <circle cx={mid.x + dx} cy={mid.y + dy} r={2.5} fill={faultColor} />
              </>
            ) : (
              <path
                d={linePath(terminal.point, terminal.end)}
                stroke={phaseColor[terminal.role]}
                strokeWidth={4}
                strokeLinecap="round"
              />
            )}
          </g>
        );
      })}

      {type === 'protection-bypass' &&
        coverage === 'supported' &&
        polePairs.map(({ input, output }, index) => {
          const lane = 68 + index * 11;
          const firstControl = {
            x: input.end.x + input.direction.x * 20,
            y: input.end.y + input.direction.y * 20 - lane,
          };
          const secondControl = {
            x: output.end.x + output.direction.x * 20,
            y: output.end.y + output.direction.y * 20 - lane,
          };
          return (
            <path
              key={`bypass-${input.index}-${output.index}`}
              d={`M ${input.end.x} ${input.end.y} C ${firstControl.x} ${firstControl.y} ${secondControl.x} ${secondControl.y} ${output.end.x} ${output.end.y}`}
              fill="none"
              stroke="#f1bd76"
              strokeWidth={5}
              strokeLinecap="round"
              data-fault-path="protection-bypass"
              transform={`rotate(${component.rotation ?? 0} ${x + COMP_W / 2} ${y + COMP_H / 2})`}
            />
          );
        })}
      {displayableBridge && type === 'live-to-earth' && (
        <path
          d={bridgePath(oneLive, bridgeTo)}
          fill="none"
          stroke="#f1bd76"
          strokeWidth={4}
          strokeDasharray="7 6"
          data-fault-path="leakage-impedance-unspecified"
        />
      )}
      {displayableBridge && (type === 'short-circuit' || type === 'earth-fault') && (
        <path
          d={bridgePath(oneLive, bridgeTo)}
          fill="none"
          stroke="#f1bd76"
          strokeWidth={5}
          strokeLinecap="round"
          data-fault-path={type}
        />
      )}
      {type === 'reverse-polarity' && coverage === 'supported' && oneLive && oneNeutral && (
        <g data-fault-path="reverse-polarity">
          <rect x="411" y="72" width="118" height="42" rx="10" fill="#263d4a" />
          <text x="470" y="89" textAnchor="middle" fill="#f1bd76" fontSize={12} fontWeight={700}>
            L ⇄ N
          </text>
          <text x="470" y="104" textAnchor="middle" fill="#c6d5dd" fontSize={9}>
            external connections
          </text>
        </g>
      )}
      <ComponentGlyph
        component={component}
        x={x}
        y={y}
        highlighted
        contactsOpen={
          model?.kind === 'contacts' &&
          (type === 'protection-forced-open' || type === 'protection-bypass')
        }
      />
      {terminals.map((terminal) => {
        const highlighted =
          selectedPort === terminal.index ||
          (displayableBridge &&
            (terminal.index === oneLive.index || terminal.index === bridgeTo.index)) ||
          ((type === 'protection-forced-open' || type === 'protection-bypass') &&
            polePairs.some(
              ({ input, output }) =>
                input.index === terminal.index || output.index === terminal.index,
            ));
        const labelX = terminal.end.x + terminal.direction.x * 6;
        const labelY = terminal.end.y + terminal.direction.y * 6 + 3;
        const anchor =
          terminal.direction.x > 0.2 ? 'start' : terminal.direction.x < -0.2 ? 'end' : 'middle';
        return (
          <g key={`terminal-${terminal.index}`}>
            <circle
              cx={terminal.point.x}
              cy={terminal.point.y}
              r={highlighted ? 7 : 5}
              fill={canvasColor}
              stroke={highlighted ? faultColor : phaseColor[terminal.role]}
              strokeWidth={highlighted ? 3 : 2}
            />
            <text
              x={labelX}
              y={labelY}
              textAnchor={anchor}
              fill={highlighted ? '#ffe0ba' : '#c6d5dd'}
              fontSize={11}
              fontWeight={highlighted ? 700 : 500}
            >
              {terminal.label}
            </text>
          </g>
        );
      })}

      {(type === 'open-circuit' && target.type === 'component') ||
      (type === 'terminal-disconnect' && target.type === 'component') ? (
        <g aria-label="component conduction path opened">
          <rect x={x + COMP_W - 22} y={y - 8} width={30} height={22} rx={6} fill={faultColor} />
          <text
            x={x + COMP_W - 7}
            y={y + 7}
            textAnchor="middle"
            fill="#fff"
            fontSize={14}
            fontWeight={800}
          >
            ✂
          </text>
        </g>
      ) : null}
      <text x="300" y="176" textAnchor="middle" fill="#d5e0e5" fontSize={12}>
        {type === 'open-circuit' && target.type === 'component'
          ? 'Component conduction path opened'
          : type === 'terminal-disconnect'
            ? 'Selected terminal connection opened'
            : type === 'open-live' || type === 'open-neutral' || type === 'open-earth'
              ? `Selected ${type.slice(5)} terminal path opened`
              : type === 'short-circuit' || type === 'earth-fault'
                ? bridgeLabel
                : type === 'live-to-earth'
                  ? 'L → PE path shown · impedance unspecified'
                  : type === 'reverse-polarity'
                    ? oneLive && oneNeutral
                      ? 'L and N terminal connections swapped'
                      : 'Live and neutral mapping is unavailable'
                    : type === 'protection-forced-open'
                      ? 'Protective contact shown open'
                      : type === 'protection-bypass'
                        ? 'External shunt around the protective contacts'
                        : type === 'switched-neutral'
                          ? 'Neutral mapping is unavailable for this component'
                          : type === 'arc-fault'
                            ? 'Arc waveform and detection are not modeled'
                            : type === 'smooth-dc-residual'
                              ? 'DC residual waveform is not modeled'
                              : 'Selected component shown with the applied fault marker'}
      </text>
    </svg>
  );
}

function pointOnPath(points: Point[], distance: number): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0]!;
  let remaining = Math.max(0, distance);
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1]!;
    const b = points[index]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= length || index === points.length - 1) {
      const ratio = length === 0 ? 0 : Math.min(1, remaining / length);
      return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
    }
    remaining -= length;
  }
  return points[points.length - 1]!;
}

function partialPath(points: Point[], start: number, end: number, total: number) {
  const included: Point[] = [pointOnPath(points, start)];
  let traversed = 0;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1]!;
    const b = points[index]!;
    traversed += Math.hypot(b.x - a.x, b.y - a.y);
    if (traversed > start && traversed < end) included.push(b);
  }
  included.push(pointOnPath(points, Math.min(end, total)));
  return included.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
}

function WireFaultDiagram({
  circuit,
  target,
  type,
}: { circuit: Circuit; target: FaultTarget; type: FaultType }) {
  if (target.type !== 'wire') return null;
  const wire = circuit.wires.find((candidate) => candidate.id === target.id);
  const from =
    wire && circuit.components.find((component) => component.id === wire.fromComponentId);
  const to = wire && circuit.components.find((component) => component.id === wire.toComponentId);
  if (!wire || !from || !to) return null;
  const points = sampleWire(
    wire,
    new Map(circuit.components.map((component) => [component.id, component])),
    COMPONENT_DEFS,
    12,
  );
  const allX = [
    from.x - COMP_W / 2,
    from.x + COMP_W / 2,
    to.x - COMP_W / 2,
    to.x + COMP_W / 2,
    ...points.map((point) => point.x),
  ];
  const allY = [
    from.y - COMP_H / 2,
    from.y + COMP_H / 2,
    to.y - COMP_H / 2,
    to.y + COMP_H / 2,
    ...points.map((point) => point.y),
  ];
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const scale = Math.min(500 / Math.max(maxX - minX, 1), 112 / Math.max(maxY - minY, 1));
  const tx = 300 - ((minX + maxX) / 2) * scale;
  const ty = 90 - ((minY + maxY) / 2) * scale;
  const fromDef = COMPONENT_DEFS[from.type];
  const toDef = COMPONENT_DEFS[to.type];
  const fromPort = fromDef?.ports[wire.fromPortIndex];
  const toPort = toDef?.ports[wire.toPortIndex];
  if (!fromPort || !toPort || points.length < 2) return null;
  const total = points.slice(1).reduce((sum, point, index) => {
    const previous = points[index]!;
    return sum + Math.hypot(point.x - previous.x, point.y - previous.y);
  }, 0);
  const opened = ['open-circuit', 'open-live', 'open-neutral'].includes(type);
  const gap = Math.min(12, total / 8);
  const midpoint = pointOnPath(points, total / 2);
  const before = partialPath(points, 0, total / 2 - gap, total);
  const after = partialPath(points, total / 2 + gap, total, total);
  const full = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const role = fromPort.type;
  const fromPosition = getPortPos(from, wire.fromPortIndex, COMPONENT_DEFS);
  const toPosition = getPortPos(to, wire.toPortIndex, COMPONENT_DEFS);
  const vector = { x: toPosition.x - fromPosition.x, y: toPosition.y - fromPosition.y };
  const magnitude = Math.max(1, Math.hypot(vector.x, vector.y));
  const normal = { x: -vector.y / magnitude, y: vector.x / magnitude };

  return (
    <svg
      viewBox="0 0 600 200"
      role="img"
      aria-label={`${type} on wire ${wire.label || wire.id} between the actual connected component terminals`}
      data-fault-target-diagram="wire"
      data-fault-target-id={wire.id}
    >
      <title>
        Actual wire route, connected component symbols, and named end terminals from this circuit.
      </title>
      <rect x="8" y="8" width="584" height="184" rx="15" fill={canvasColor} />
      <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
        <path
          d={opened ? `${before} ${after}` : full}
          fill="none"
          stroke={phaseColor[role]}
          strokeWidth={5 / scale}
          strokeLinecap="round"
          strokeLinejoin="round"
          data-wire-fault-path={opened ? type : 'continuous'}
        />
        {opened && (
          <g data-fault-break="wire" stroke={faultColor} strokeWidth={3 / scale}>
            <path
              d={`M ${midpoint.x - normal.x * 5} ${midpoint.y - normal.y * 5} L ${midpoint.x + normal.x * 5} ${midpoint.y + normal.y * 5}`}
            />
          </g>
        )}
        {[from, to].map((component) => {
          const x = component.x - COMP_W / 2;
          const y = component.y - COMP_H / 2;
          return (
            <g key={component.id}>
              <ComponentGlyph component={component} x={x} y={y} />
              {terminalData(component, x, y).map((terminal) => (
                <circle
                  key={terminal.index}
                  cx={terminal.point.x}
                  cy={terminal.point.y}
                  r={
                    (component.id === from.id && terminal.index === wire.fromPortIndex) ||
                    (component.id === to.id && terminal.index === wire.toPortIndex)
                      ? 5 / scale
                      : 3 / scale
                  }
                  fill={canvasColor}
                  stroke={phaseColor[terminal.role]}
                  strokeWidth={1.5 / scale}
                />
              ))}
              <text
                x={component.x}
                y={component.y + COMP_H / 2 + 16}
                textAnchor="middle"
                fill="#d3dfe5"
                fontSize={8 / scale}
              >
                {component.state.autoLabel ||
                  COMPONENT_DEFS[component.type]?.label ||
                  component.type}
              </text>
            </g>
          );
        })}
      </g>
      <text x="24" y="180" fill="#c6d5dd" fontSize={11}>
        {from.state.autoLabel || fromDef.label} · {fromPort.label}
      </text>
      <text x="576" y="180" textAnchor="end" fill="#c6d5dd" fontSize={11}>
        {to.state.autoLabel || toDef.label} · {toPort.label}
      </text>
      <text x="300" y="28" textAnchor="middle" fill="#f2c89e" fontSize={12} fontWeight={700}>
        {opened
          ? `${type === 'open-circuit' ? 'Conductor' : role} path opened`
          : 'Selected conductor'}
      </text>
    </svg>
  );
}

export function FaultTargetApplicationDiagram({
  circuit,
  target,
  type,
  coverage,
}: {
  circuit: Circuit;
  target: FaultTarget;
  type: FaultType;
  coverage: 'supported' | 'not-assessed';
}) {
  if (target.type === 'wire')
    return <WireFaultDiagram circuit={circuit} target={target} type={type} />;
  const componentId = target.type === 'port' ? target.componentId : target.id;
  const component = circuit.components.find((candidate) => candidate.id === componentId);
  return component ? (
    <ComponentFaultDiagram
      circuit={circuit}
      component={component}
      target={target}
      type={type}
      coverage={coverage}
    />
  ) : null;
}

/** Saved drawing geometry plus the same injected-cause markers as the workspace canvas. */
export function FaultCircuitOverview({
  circuit,
  target,
}: { circuit: Circuit; target: FaultTarget | null }) {
  const byId = new Map(circuit.components.map((component) => [component.id, component]));
  const faults = normalizeCircuitFaults(circuit).filter((fault) => !fault.resolved);
  const paths = circuit.wires.flatMap((wire) => {
    const from = byId.get(wire.fromComponentId);
    const port = from && COMPONENT_DEFS[from.type]?.ports[wire.fromPortIndex];
    const points = sampleWire(wire, byId, COMPONENT_DEFS);
    if (!port || points.length < 2) return [];
    return [
      {
        wire,
        points,
        color: phaseColor[port.type],
        d: points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' '),
      },
    ];
  });
  const bounds = circuit.components.flatMap((component) => {
    const rotation = ((component.rotation ?? 0) * Math.PI) / 180;
    const halfWidth =
      (Math.abs(Math.cos(rotation)) * COMP_W) / 2 + (Math.abs(Math.sin(rotation)) * COMP_H) / 2;
    const halfHeight =
      (Math.abs(Math.sin(rotation)) * COMP_W) / 2 + (Math.abs(Math.cos(rotation)) * COMP_H) / 2;
    return [
      { x: component.x - halfWidth, y: component.y - halfHeight },
      { x: component.x + halfWidth, y: component.y + halfHeight },
    ];
  });
  const points = [...bounds, ...paths.flatMap((path) => path.points)];
  const minX = Math.min(0, ...points.map((point) => point.x)) - 65;
  const minY = Math.min(0, ...points.map((point) => point.y)) - 65;
  const maxX = Math.max(500, ...points.map((point) => point.x)) + 65;
  const maxY = Math.max(240, ...points.map((point) => point.y)) + 65;
  const selectedId =
    target?.type === 'port' ? target.componentId : target?.type === 'component' ? target.id : null;
  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      role="img"
      aria-label="Current circuit topology overview"
      data-fault-circuit-overview
    >
      <title>
        Saved component symbols, terminal positions and wire routes with current injected fault
        markers. Run for electrical readings.
      </title>
      <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill={canvasColor} />
      {paths.map(({ wire, color, d }) => (
        <g key={wire.id} data-fault-overview-wire={wire.id}>
          {target?.type === 'wire' && target.id === wire.id && (
            <path d={d} fill="none" stroke="#f4bd76" strokeWidth={9} opacity={0.3} />
          )}
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}
      {circuit.components.map((component) => {
        const x = component.x - COMP_W / 2;
        const y = component.y - COMP_H / 2;
        const contactsOpen = faults.some(
          (fault) =>
            fault.target.type === 'component' &&
            fault.target.id === component.id &&
            (fault.type === 'protection-forced-open' || fault.type === 'protection-bypass'),
        );
        return (
          <g key={component.id}>
            <ComponentGlyph
              component={component}
              x={x}
              y={y}
              highlighted={selectedId === component.id}
              contactsOpen={contactsOpen}
            />
            {terminalData(component, x, y).map((terminal) => (
              <g key={terminal.index}>
                <circle
                  cx={terminal.point.x}
                  cy={terminal.point.y}
                  r={5}
                  fill={canvasColor}
                  stroke={phaseColor[terminal.role]}
                  strokeWidth={2}
                />
                <text
                  x={terminal.point.x - terminal.direction.x * 11}
                  y={terminal.point.y - terminal.direction.y * 11 + 3}
                  textAnchor="middle"
                  fontSize={7}
                  fill="#c6d5dd"
                >
                  {terminal.label}
                </text>
              </g>
            ))}
            <text
              x={component.x}
              y={component.y + COMP_H / 2 + 14}
              textAnchor="middle"
              fill="#d3dfe5"
              fontSize={8}
            >
              {component.state.autoLabel || COMPONENT_DEFS[component.type]?.label || component.type}
            </text>
          </g>
        );
      })}
      <FaultFxLayer
        items={collectFaultFx(circuit, byId)}
        wires={circuit.wires}
        componentsById={byId}
        theme={{ ...labGlassDark, bg: canvasColor }}
        wireWidth={3}
        orthogonalPaths={new Map(paths.map((path) => [path.wire.id, path.d]))}
      />
    </svg>
  );
}
