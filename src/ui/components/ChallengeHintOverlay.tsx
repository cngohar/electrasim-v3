import { useMemo } from 'react';
import {
  COMPONENT_DEFS,
  type ComponentInstance,
  type Point2D,
  VIEW_H,
  VIEW_W,
  getPortPos,
} from '../../domain';
import type { ChallengeVisualTarget } from '../../domain/challenges/declarative';
import { useCircuitStore, useViewportStore } from '../../store';
import { useDeclarativeChallengeStore } from '../../store/declarativeChallengeStore';

export type ResolvedVisual =
  | { kind: 'point'; point: Point2D; label: string }
  | { kind: 'connection'; from: Point2D; to: Point2D; label: string };

function firstOfType(
  components: readonly ComponentInstance[],
  type: string,
  occurrence = 0,
): ComponentInstance | null {
  return components.filter((component) => component.type === type)[occurrence] ?? null;
}

function safePortPosition(component: ComponentInstance | null, portIndex: number): Point2D | null {
  if (!component || !COMPONENT_DEFS[component.type]?.ports[portIndex]) return null;
  return getPortPos(component, portIndex, COMPONENT_DEFS);
}

export function resolveVisualTarget(
  target: ChallengeVisualTarget,
  components: readonly ComponentInstance[],
  label: string,
): ResolvedVisual {
  if (target.kind === 'component') {
    const component = firstOfType(components, target.componentType);
    return {
      kind: 'point',
      point: component
        ? { x: component.x, y: component.y }
        : (target.fallback ?? { x: 600, y: 260 }),
      label,
    };
  }

  if (target.kind === 'port') {
    const component = firstOfType(components, target.componentType);
    return {
      kind: 'point',
      point:
        safePortPosition(component, target.portIndex) ??
        target.fallback ??
        (component ? { x: component.x, y: component.y } : { x: 600, y: 260 }),
      label,
    };
  }

  const fromComponent = firstOfType(
    components,
    target.from.componentType,
    target.from.occurrence ?? 0,
  );
  const toComponent = firstOfType(
    components,
    target.to.componentType,
    target.to.occurrence ??
      (target.from.componentType === target.to.componentType && (target.from.occurrence ?? 0) === 0
        ? 1
        : 0),
  );
  const from = safePortPosition(fromComponent, target.from.portIndex);
  const to = safePortPosition(toComponent, target.to.portIndex);
  if (from && to) return { kind: 'connection', from, to, label };

  return {
    kind: 'point',
    point:
      target.fallback ??
      from ??
      to ??
      (fromComponent ? { x: fromComponent.x, y: fromComponent.y } : { x: 600, y: 260 }),
    label,
  };
}

function arrowStart(point: Point2D): Point2D {
  // Keep the arrow inside the editor viewBox while still making its direction
  // obvious. The target remains the actual component/terminal when available.
  const above = { x: point.x, y: point.y - 92 };
  if (above.y >= 20) return above;
  return { x: point.x, y: point.y + 92 };
}

export function ChallengeHintOverlay() {
  const status = useDeclarativeChallengeStore((s) => s.status);
  const paused = useDeclarativeChallengeStore((s) => s.paused);
  const definition = useDeclarativeChallengeStore((s) => s.definition);
  const visualHintVisible = useDeclarativeChallengeStore((s) => s.visualHintVisible);
  const visualHintLevel = useDeclarativeChallengeStore((s) => s.visualHintLevel);
  const components = useCircuitStore((s) => s.components);
  const pan = useViewportStore((s) => s.pan);
  const zoom = useViewportStore((s) => s.zoom);

  const hint = useMemo(() => {
    if (!definition || !visualHintVisible || visualHintLevel === null) return null;
    return definition.hints[visualHintLevel - 1] ?? null;
  }, [definition, visualHintLevel, visualHintVisible]);

  const resolved = useMemo(() => {
    if (!hint?.visual) return null;
    return resolveVisualTarget(hint.visual.target, components, hint.visual.label);
  }, [components, hint]);

  if (status !== 'active' || paused || definition?.kind === 'tutorial' || !resolved) return null;

  return (
    <div
      data-challenge-visual-hint
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      aria-hidden="true"
    >
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="block size-full"
      >
        <title>Visual challenge hint: {resolved.label}</title>
        <defs>
          <marker
            id="challenge-hint-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
          </marker>
        </defs>
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {resolved.kind === 'connection' ? (
            <>
              <path
                d={`M ${resolved.from.x} ${resolved.from.y} L ${resolved.to.x} ${resolved.to.y}`}
                fill="none"
                stroke="#2563eb"
                strokeWidth="4"
                strokeDasharray="10 8"
                strokeLinecap="round"
                markerEnd="url(#challenge-hint-arrow)"
                className="challenge-hint-line"
              />
              <circle
                cx={resolved.from.x}
                cy={resolved.from.y}
                r="9"
                fill="#2563eb"
                opacity="0.18"
              />
              <circle cx={resolved.to.x} cy={resolved.to.y} r="9" fill="#2563eb" opacity="0.25" />
              <HintLabel point={midpoint(resolved.from, resolved.to)} text={resolved.label} />
            </>
          ) : (
            <>
              {(() => {
                const start = arrowStart(resolved.point);
                return (
                  <path
                    d={`M ${start.x} ${start.y} L ${resolved.point.x} ${resolved.point.y}`}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="4"
                    strokeDasharray="10 8"
                    strokeLinecap="round"
                    markerEnd="url(#challenge-hint-arrow)"
                    className="challenge-hint-line"
                  />
                );
              })()}
              <circle
                cx={resolved.point.x}
                cy={resolved.point.y}
                r="18"
                fill="#2563eb"
                fillOpacity="0.12"
                stroke="#2563eb"
                strokeWidth="3"
                strokeDasharray="6 5"
                className="challenge-hint-target"
              />
              <HintLabel
                point={{ x: resolved.point.x, y: resolved.point.y - 22 }}
                text={resolved.label}
              />
            </>
          )}
        </g>
      </svg>
      <span className="sr-only">Visual hint: {resolved.label}</span>
    </div>
  );
}

function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 18 };
}

function HintLabel({ point, text }: { point: Point2D; text: string }) {
  const width = Math.max(170, Math.min(300, text.length * 6.4 + 24));
  const x = Math.max(8, Math.min(VIEW_W - width - 8, point.x - width / 2));
  const y = Math.max(18, Math.min(VIEW_H - 18, point.y));
  return (
    <g transform={`translate(${x} ${y - 16})`}>
      <rect width={width} height="25" rx="12.5" fill="#eff6ff" stroke="#60a5fa" strokeWidth="1.5" />
      <text
        x={width / 2}
        y="16.5"
        textAnchor="middle"
        fill="#1d4ed8"
        fontSize="11"
        fontWeight="700"
      >
        {text}
      </text>
    </g>
  );
}
