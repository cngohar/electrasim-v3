import { type Circuit, type SimulationResult, VIEW_H, VIEW_W } from '@electrasim/domain';
import { isCurrentSimulation } from '@electrasim/domain/simulationEvidence';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildWirePath } from './geometry';
import {
  MATTER_EFFECT_LIMIT,
  MATTER_FRAME_MS,
  MATTER_SETTLE_FRAMES,
  collectMatterEffects,
} from './matterEffects';
import type { EffectAnchor } from './matterScene';

interface Props {
  circuit: Circuit;
  simulation?: SimulationResult | null;
  paths: ReadonlyMap<string, string>;
  pan: { x: number; y: number };
  zoom: number;
  enabled: boolean;
  animate: boolean;
}

/** SVG remains the renderer; Matter owns only disposable decorative positions. */
export function MatterLayer({ circuit, simulation, paths, pan, zoom, enabled, animate }: Props) {
  const root = useRef<SVGGElement>(null);
  const [visible, setVisible] = useState(!document.hidden);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const descriptors = useMemo(() => {
    if (!enabled) return [];
    const byId = new Map(circuit.components.map((c) => [c.id, c]));
    const wiresById = new Map(circuit.wires.map((w) => [w.id, w]));
    return collectMatterEffects(circuit, simulation).map((effect) => {
      const component = byId.get(effect.id);
      const wire = effect.target === 'wire' ? wiresById.get(effect.id) : null;
      return {
        ...effect,
        x: component?.x ?? 0,
        y: component?.y ?? 0,
        path: wire ? (paths.get(wire.id) ?? buildWirePath(wire, byId) ?? '') : '',
      };
    });
  }, [circuit, simulation, paths, enabled]);
  // Preserve a settled scene across solver ticks whose visual state is unchanged.
  const currentEvidence = useMemo(
    () => isCurrentSimulation(circuit, simulation),
    [circuit, simulation],
  );
  const signature = JSON.stringify(descriptors);
  const stable = useMemo(() => JSON.parse(signature) as typeof descriptors, [signature]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const motion = () => setReducedMotion(media?.matches ?? false);
    media?.addEventListener('change', motion);
    let intersecting = true;
    const visibility = () => setVisible(intersecting && !document.hidden);
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            intersecting = entry.isIntersecting;
            visibility();
          });
    const svg = root.current?.ownerSVGElement;
    if (svg) observer?.observe(svg);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      media?.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', visibility);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    let cancelled = false;
    let frame = 0;
    let scene: Awaited<ReturnType<typeof import('./matterScene')['createMatterScene']>> | undefined;
    const anchors: EffectAnchor[] = [];
    const outputs = new Map<string, SVGPathElement>();
    const markers = host.querySelectorAll<SVGGElement>('[data-matter-effect]');
    for (const [index, marker] of [...markers].entries()) {
      const descriptor = stable[index];
      let { x, y } = descriptor;
      let tangent: EffectAnchor['tangent'] = null;
      const source = marker.querySelector<SVGPathElement>('[data-effect-source]');
      if (descriptor.target === 'wire') {
        if (!source?.getTotalLength) continue;
        const length = source.getTotalLength();
        if (length < 2) continue;
        const mid = source.getPointAtLength(length / 2);
        const a = source.getPointAtLength(Math.max(0, length / 2 - 1));
        const b = source.getPointAtLength(Math.min(length, length / 2 + 1));
        const distance = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        x = mid.x;
        y = mid.y;
        tangent = { x: (b.x - a.x) / distance, y: (b.y - a.y) / distance };
      }
      const onscreen =
        x * zoom + pan.x >= -40 &&
        x * zoom + pan.x <= VIEW_W + 40 &&
        y * zoom + pan.y >= -40 &&
        y * zoom + pan.y <= VIEW_H + 40;
      marker.style.display = enabled && onscreen ? '' : 'none';
      const output = marker.querySelector<SVGPathElement>('[data-effect-output]')!;
      output.setAttribute(
        'd',
        `M ${x - 10} ${y - 10} L ${x + 10} ${y + 10} M ${x + 10} ${y - 10} L ${x - 10} ${y + 10}`,
      );
      if (descriptor.kind === 'overload')
        output.setAttribute('d', `M ${x - 12} ${y} Q ${x} ${y + 14} ${x + 12} ${y}`);
      if (onscreen && anchors.length < MATTER_EFFECT_LIMIT) {
        anchors.push({ key: descriptor.key, kind: descriptor.kind, x, y, tangent });
        outputs.set(descriptor.key, output);
      }
    }
    host.dataset.matterStatus = 'static';
    host.dataset.matterBodies = '0';
    host.dataset.matterFrames = '0';
    if (enabled && animate && currentEvidence && visible && !reducedMotion && anchors.length) {
      host.dataset.matterStatus = 'loading';
      void import('./matterScene')
        .then(({ createMatterScene }) => {
          if (cancelled) return;
          scene = createMatterScene(anchors);
          host.dataset.matterBodies = String(scene.bodyCount);
          host.dataset.matterStatus = 'running';
          let last = 0;
          let frames = 0;
          let totalMs = 0;
          let maxMs = 0;
          const samples: number[] = [];
          const tick = (now: number) => {
            if (cancelled || !scene) return;
            if (now - last >= MATTER_FRAME_MS) {
              last = now;
              const start = performance.now();
              for (const item of scene.step()) outputs.get(item.key)?.setAttribute('d', item.d);
              const elapsed = performance.now() - start;
              samples.push(elapsed);
              host.dataset.matterP95Ms = String(
                [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * 0.95) - 1],
              );
              totalMs += elapsed;
              maxMs = Math.max(maxMs, elapsed);
              frames++;
              host.dataset.matterFrames = String(frames);
              host.dataset.matterMeanMs = String(totalMs / frames);
              host.dataset.matterMaxMs = String(maxMs);
            }
            if (frames < MATTER_SETTLE_FRAMES) frame = requestAnimationFrame(tick);
            else {
              host.dataset.matterStatus = 'settled';
              scene.dispose();
              scene = undefined;
              host.dataset.matterBodies = '0';
            }
          };
          frame = requestAnimationFrame(tick);
        })
        .catch(() => {
          if (!cancelled) host.dataset.matterStatus = 'unavailable';
        });
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      scene?.dispose();
    };
  }, [stable, enabled, animate, currentEvidence, visible, reducedMotion, pan.x, pan.y, zoom]);

  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: Decorative SVG group has no focusable descendants.
    <g ref={root} data-matter-layer pointerEvents="none" aria-hidden="true">
      {stable.map((effect) => (
        <g key={effect.key} data-matter-effect={effect.kind} data-matter-target={effect.key}>
          {effect.path && <path data-effect-source d={effect.path} fill="none" stroke="none" />}
          <path
            data-effect-output
            fill="none"
            stroke={effect.kind === 'damage' ? '#dc2626' : '#f59e0b'}
            strokeWidth={3}
            strokeLinecap="round"
          />
        </g>
      ))}
    </g>
  );
}
