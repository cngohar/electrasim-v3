import { Focus } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  COMPONENT_DEFS,
  type ComponentInstance,
  type Point2D,
  VIEW_H,
  VIEW_W,
  type WireInstance,
  getPortPos,
} from '../../domain';
import type { RuleTarget } from '../../domain/challenges/declarative';
import { useCircuitStore, useUiStore, useViewportStore } from '../../store';

function pointForTarget(
  target: RuleTarget,
  byId: ReadonlyMap<string, ComponentInstance>,
  wires: readonly WireInstance[],
): Point2D | null {
  if (target.kind === 'component') {
    const component = byId.get(target.id);
    if (!component) return null;
    if (target.portIndex !== undefined && COMPONENT_DEFS[component.type]?.ports[target.portIndex]) {
      return getPortPos(component, target.portIndex, COMPONENT_DEFS);
    }
    return { x: component.x, y: component.y };
  }

  const wire = wires.find((item) => item.id === target.id);
  if (!wire) return null;
  const from = byId.get(wire.fromComponentId);
  const to = byId.get(wire.toComponentId);
  if (!from && !to) return null;
  if (!from) return { x: to!.x, y: to!.y };
  if (!to) return { x: from.x, y: from.y };
  if (
    !COMPONENT_DEFS[from.type]?.ports[wire.fromPortIndex] ||
    !COMPONENT_DEFS[to.type]?.ports[wire.toPortIndex]
  ) {
    return { x: from.x, y: from.y };
  }
  const fromPoint = getPortPos(from, wire.fromPortIndex, COMPONENT_DEFS);
  const toPoint = getPortPos(to, wire.toPortIndex, COMPONENT_DEFS);
  return { x: (fromPoint.x + toPoint.x) / 2, y: (fromPoint.y + toPoint.y) / 2 };
}

function labelForPaletteType(type: string): string {
  return COMPONENT_DEFS[type]?.label ?? type;
}

/**
 * Turns a failing rule into a concrete focus request. It deliberately uses
 * the live circuit graph, so moved components and generated ids remain valid.
 */
export function ChallengeFocusOverlay() {
  const focus = useUiStore((s) => s.challengeRuleFocus);
  const setFocus = useUiStore((s) => s.setChallengeRuleFocus);
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const pan = useViewportStore((s) => s.pan);
  const zoom = useViewportStore((s) => s.zoom);

  const byId = useMemo(
    () => new Map(components.map((component) => [component.id, component])),
    [components],
  );
  const points = useMemo(
    () =>
      focus?.targets
        .map((target) => pointForTarget(target, byId, wires))
        .filter((point): point is Point2D => point !== null) ?? [],
    [byId, focus, wires],
  );

  const focusTarget = points[0] ?? null;
  useEffect(() => {
    if (!focus || !focusTarget) return;
    const current = useViewportStore.getState();
    const targetZoom = Math.max(current.zoom, 0.85);
    current.setZoom(targetZoom);
    current.setPan({
      x: VIEW_W / 2 - focusTarget.x * targetZoom,
      y: VIEW_H / 2 - focusTarget.y * targetZoom,
    });
  }, [focus, focusTarget]);

  if (!focus) return null;

  return (
    <div
      data-challenge-focus
      className="pointer-events-none absolute inset-0 z-[25] overflow-hidden"
    >
      <div className="pointer-events-auto absolute left-1/2 top-[124px] flex w-[min(420px,calc(100vw-1.5rem))] -translate-x-1/2 items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/95 px-3 py-2 text-[11px] text-indigo-900 shadow-xl shadow-indigo-900/10 backdrop-blur-xl dark:border-indigo-800 dark:bg-indigo-950/95 dark:text-indigo-100">
        <Focus className="size-3.5 shrink-0 text-indigo-600 dark:text-indigo-300" />
        <span className="min-w-0 flex-1 truncate">
          <strong className="font-semibold">Focused rule:</strong> {focus.label}
        </span>
        <button
          type="button"
          onClick={() => setFocus(null)}
          aria-label="Dismiss challenge focus"
          title="Dismiss focus"
          className="shrink-0 rounded-lg bg-white/70 px-2 py-1 text-[10px] font-bold text-indigo-700 transition hover:bg-white dark:bg-slate-900/60 dark:text-indigo-300 dark:hover:bg-slate-900"
        >
          Dismiss
        </button>
      </div>
      {focus.paletteTypes.length > 0 && (
        <div className="pointer-events-none absolute left-16 top-24 max-w-[250px] rounded-xl border border-indigo-200 bg-indigo-50/95 px-3 py-2 text-[11px] text-indigo-900 shadow-xl shadow-indigo-900/10 backdrop-blur-xl dark:border-indigo-800 dark:bg-indigo-950/95 dark:text-indigo-100">
          <div className="flex items-start gap-2">
            <Focus className="mt-0.5 size-3.5 shrink-0 text-indigo-600 dark:text-indigo-300" />
            <div className="min-w-0">
              <p className="font-semibold">Choose from Components</p>
              <p className="mt-0.5 leading-relaxed">
                Add {focus.paletteTypes.map(labelForPaletteType).join(' or ')} to satisfy this
                check.
              </p>
            </div>
          </div>
        </div>
      )}

      {points.length > 0 && (
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="block size-full"
          aria-hidden="true"
        >
          <title>Focused challenge rule: {focus.label}</title>
          <defs>
            <marker
              id="challenge-focus-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#7c3aed" />
            </marker>
          </defs>
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill="#312e81" opacity="0.04" />
            {points.map((point, index) => {
              const start = { x: point.x, y: Math.max(20, point.y - 86) };
              return (
                <g key={`${point.x}-${point.y}-${index}`}>
                  <path
                    d={`M ${start.x} ${start.y} L ${point.x} ${point.y}`}
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="4"
                    strokeDasharray="9 7"
                    strokeLinecap="round"
                    markerEnd="url(#challenge-focus-arrow)"
                    className="challenge-hint-line"
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="21"
                    fill="#7c3aed"
                    fillOpacity="0.12"
                    stroke="#7c3aed"
                    strokeWidth="3"
                    strokeDasharray="6 5"
                    className="challenge-hint-target"
                  />
                </g>
              );
            })}
            <FocusLabel point={points[0]!} text={focus.label} />
          </g>
        </svg>
      )}
    </div>
  );
}

function FocusLabel({ point, text }: { point: Point2D; text: string }) {
  const width = Math.max(180, Math.min(330, text.length * 6.3 + 26));
  const x = Math.max(8, Math.min(VIEW_W - width - 8, point.x - width / 2));
  const y = Math.max(18, Math.min(VIEW_H - 18, point.y - 26));
  return (
    <g transform={`translate(${x} ${y - 16})`}>
      <rect width={width} height="25" rx="12.5" fill="#f5f3ff" stroke="#a78bfa" strokeWidth="1.5" />
      <text
        x={width / 2}
        y="16.5"
        textAnchor="middle"
        fill="#6d28d9"
        fontSize="11"
        fontWeight="700"
      >
        {text}
      </text>
    </g>
  );
}
