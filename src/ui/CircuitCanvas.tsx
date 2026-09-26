/** Accessible SVG renderer and interaction controller for the circuit editor. */

import {
  COMPONENT_DEFS,
  type Circuit,
  type ComponentInstance,
  type SimulationResult,
  VIEW_H,
  VIEW_W,
  getPortPos,
} from '@electrasim/domain';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useCircuitStore, useSettingsStore, useUiStore, useViewportStore } from '../store';
import {
  applyReroute,
  commitCustomPath,
  requestDeleteWire,
  handlePortClick as runPortClickFsm,
} from './canvas-actions';
import { ComponentLayer, ComponentTooltip } from './canvas/ComponentLayer';
import { FaultFxLayer } from './canvas/FaultFxLayer';
import { CanvasOverlayLayer } from './canvas/OverlayLayer';
import { StressZoneOverlay } from './canvas/StressZoneOverlay';
import { WireJointsLayer } from './canvas/WireJointsLayer';
import { WireLayer } from './canvas/WireLayer';
import { collectFaultFx, severedWireIdSet } from './canvas/faultFx';
import { buildOrthogonalPath, screenToSvg, svgToWorld } from './canvas/geometry';
import type { CanvasTheme } from './canvas/types';
import { useCanvasGestureStart } from './canvas/useCanvasGestureStart';
import {
  type CanvasDragRect,
  type CanvasDragState,
  type CanvasPanState,
  useCanvasPointerWindow,
} from './canvas/useCanvasPointerWindow';

export type { CanvasTheme } from './canvas/types';
const REDUCED_EFFECTS_AUTO_THRESHOLD = 50;
const LIVE_DRAG_CIRCUIT_LIMIT = 80;
const LIVE_DRAG_WIRE_LIMIT = 32;

interface Props {
  circuit: Circuit;
  simResult?: SimulationResult | null;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onToggleSwitch?: (id: string) => void;
  onSetSwitchState?: (id: string, on: boolean) => void;
  theme: CanvasTheme;
  className?: string;
  /** Lets snapshot export access the live SVG without owning this controller's ref. */
  externalSvgRef?: React.RefObject<SVGSVGElement | null>;
}

export function CircuitCanvas({
  circuit,
  simResult,
  selectedId,
  onSelect,
  onToggleSwitch,
  onSetSwitchState,
  theme,
  className,
  externalSvgRef,
}: Props) {
  const gridPatternId = useId().replace(/:/g, '');
  const canvasDescriptionId = useId().replace(/:/g, '');
  const gridSize = theme.gridSize ?? 24;
  const wireWidth = theme.wireWidth ?? 2;

  const internalSvgRef = useRef<SVGSVGElement | null>(null);
  // Keep the internal interaction ref and optional export ref on the same node.
  const svgRef = useCallback(
    (node: SVGSVGElement | null) => {
      internalSvgRef.current = node;
      if (externalSvgRef)
        (externalSvgRef as React.MutableRefObject<SVGSVGElement | null>).current = node;
    },
    [externalSvgRef],
  );
  const dragRef = useRef<CanvasDragState | null>(null);
  const panRef = useRef<CanvasPanState | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);
  const panPreviewRef = useRef<HTMLDivElement | null>(null);
  const worldGroupRef = useRef<SVGGElement | null>(null);
  /** Selection rectangle in world coordinates, committed on pointer up. */
  const dragRectRef = useRef<CanvasDragRect | null>(null);
  /**
   * Tracks whether the current pan gesture actually moved.
   * Used to suppress the click handlers that would otherwise fire on
   * pointerup at the end of a pan (deselect-on-empty-click, drop-placing,
   * cancel-reroute), so the user doesn't accidentally lose their selection
   * or drop a component just because they panned the canvas.
   */
  const panDidMoveRef = useRef(false);
  // Store subscriptions ────────────────────────────────────────────────────
  const pendingWireFrom = useUiStore((s) => s.pendingWireFrom);
  const placingType = useUiStore((s) => s.placingType);
  const mode = useUiStore((s) => s.mode);
  const reroute = useUiStore((s) => s.reroute);
  const hoveredId = useUiStore((s) => s.hoveredComponentId);
  const dragRect = useUiStore((s) => s.dragRect);
  const pendingCustomPath = useUiStore((s) => s.pendingCustomPath);
  const previewVariantType = useUiStore((s) => s.previewVariantType);
  const previewComponentId = useUiStore((s) => s.previewComponentId);
  const selectedWireIds = useCircuitStore((s) => s.selectedWireIds);
  const selectedComponentIds = useCircuitStore((s) => s.selectedComponentIds);
  const showTooltips = useSettingsStore((s) => s.showTooltips);
  const currentFlowAnim = useSettingsStore((s) => s.currentFlowAnimation);
  const activeLoadEffectsSetting = useSettingsStore((s) => s.activeLoadEffects);
  const reducedEffectsSetting = useSettingsStore((s) => s.reducedEffects);
  const customWiringMode = useSettingsStore((s) => s.customWiringMode);
  const autoWireJoints = useSettingsStore((s) => s.autoWireJoints);
  const tracePathMode = useUiStore((s) => s.tracePathMode);
  const challengePaused = useUiStore((s) => s.challengePaused);

  // The custom-path cursor uses a ref + rAF so we
  // don't trigger a React re-render on every pointermove — only a lightweight
  // SVG attribute mutation. The rAF loop only runs while a custom path is
  // in flight (pendingCustomPath != null).
  const customCursorRef = useRef<{ x: number; y: number } | null>(null);
  const customCursorElRef = useRef<SVGGElement | null>(null);

  // Dense circuits disable continuous dash and load animations, which otherwise
  // force every energized SVG element to repaint each frame on weaker hardware.
  const reducedEffects =
    reducedEffectsSetting || circuit.components.length > REDUCED_EFFECTS_AUTO_THRESHOLD;
  const reducedDetails = circuit.components.length > LIVE_DRAG_CIRCUIT_LIMIT;
  // Effective gates: `reducedEffects` strictly subtracts work; it never
  // overrides a user choice to enable a sub-feature in normal mode.
  const currentFlowOn = currentFlowAnim && !reducedEffects;
  const activeLoadEffects = activeLoadEffectsSetting && !reducedEffects;
  const wireGlowOn = (theme.wireGlow ?? false) && !reducedEffects;
  const pan = useViewportStore((s) => s.pan);
  const zoom = useViewportStore((s) => s.zoom);

  const selectedWireId = selectedWireIds[0] ?? null;

  const validationReport = useUiStore((s) => s.validationReport);

  const flaggedComponentIds = useMemo(() => {
    if (!validationReport?.issues) return new Set<string>();
    const set = new Set<string>();
    for (const issue of validationReport.issues) {
      if (issue.componentId) set.add(issue.componentId);
    }
    return set;
  }, [validationReport]);

  const flaggedWireIds = useMemo(() => {
    if (!validationReport?.issues) return new Set<string>();
    const set = new Set<string>();
    for (const issue of validationReport.issues) {
      if (issue.wireId) set.add(issue.wireId);
    }
    return set;
  }, [validationReport]);

  const { traceComponentIds, traceWireIds } = useMemo(() => {
    if (!tracePathMode || !selectedWireId) {
      return { traceComponentIds: null, traceWireIds: null };
    }
    const selectedWire = circuit.wires.find((w) => w.id === selectedWireId);
    if (!selectedWire) {
      return { traceComponentIds: null, traceWireIds: null };
    }

    const compIds = new Set<string>([selectedWire.fromComponentId, selectedWire.toComponentId]);
    const wireIds = new Set<string>([selectedWire.id]);

    const queue = [selectedWire.fromComponentId, selectedWire.toComponentId];
    while (queue.length > 0) {
      const currCompId = queue.shift()!;
      for (const w of circuit.wires) {
        if (!wireIds.has(w.id)) {
          if (w.fromComponentId === currCompId) {
            wireIds.add(w.id);
            if (!compIds.has(w.toComponentId)) {
              compIds.add(w.toComponentId);
              queue.push(w.toComponentId);
            }
          } else if (w.toComponentId === currCompId) {
            wireIds.add(w.id);
            if (!compIds.has(w.fromComponentId)) {
              compIds.add(w.fromComponentId);
              queue.push(w.fromComponentId);
            }
          }
        }
      }
    }

    return { traceComponentIds: compIds, traceWireIds: wireIds };
  }, [tracePathMode, selectedWireId, circuit.wires]);

  // Cursor in *world* space — drives rubber-band / ghost / reroute previews.
  const [worldCursor, setWorldCursor] = useState<{ x: number; y: number } | null>(null);

  // Memoised so its reference is stable across no-op renders — required
  // for the orthogonal-path memo below to ever be a hit, and for any
  // future React.memo on child components to actually save work.
  const byId = useMemo(() => {
    const m = new Map<string, ComponentInstance>();
    for (const c of circuit.components) m.set(c.id, c);
    return m;
  }, [circuit.components]);

  // ── Fault Lab canvas effects ─────────────────────────────────────────
  // Descriptors are linear in circuit size (cheap) and identity-stable per
  // fault key, so the layer's entrance animations only play on real fault
  // transitions, never on re-renders.
  const faultFxItems = useMemo(() => collectFaultFx(circuit, byId), [circuit, byId]);
  const severedWireIds = useMemo(() => severedWireIdSet(faultFxItems), [faultFxItems]);

  // Orthogonal path computation is O(components) per wire,
  // so re-running it on every parent render (selection click, hover, sim
  // tick …) burned CPU at idle. Cache the SVG `d` string per wire here;
  // the memo invalidates only when components or wires actually change.
  // Bezier wires are O(1) per render so we skip them — they go through
  // the legacy in-component path build.
  const orthogonalPathD = useMemo(() => {
    const m = new Map<string, string>();
    for (const w of circuit.wires) {
      if (w.pathKind !== 'orthogonal') continue;
      const a = byId.get(w.fromComponentId);
      const b = byId.get(w.toComponentId);
      if (!a || !b) continue;
      const def1 = COMPONENT_DEFS[a.type];
      const def2 = COMPONENT_DEFS[b.type];
      if (!def1?.ports[w.fromPortIndex] || !def2?.ports[w.toPortIndex]) continue;
      const p1 = getPortPos(a, w.fromPortIndex, COMPONENT_DEFS);
      const p2 = getPortPos(b, w.toPortIndex, COMPONENT_DEFS);
      m.set(w.id, buildOrthogonalPath(p1, p2, w, byId));
    }
    return m;
  }, [circuit.wires, byId]);

  useCanvasPointerWindow({
    svgRef: internalSvgRef,
    dragRef,
    panRef,
    dragRectRef,
    activePointerIdRef,
    pendingPanRef,
    panPreviewRef,
    worldGroupRef,
    panDidMoveRef,
    customCursorRef,
    pendingWireFrom,
    placingType,
    pendingCustomPath,
    gridSize,
    pan,
    zoom,
    setWorldCursor,
  });

  const {
    handleBackgroundPointerDown,
    handleComponentPointerDown,
    handleDrop,
    handleEndpointPointerDown,
    handleWheel,
  } = useCanvasGestureStart({
    svgRef: internalSvgRef,
    dragRef,
    panRef,
    dragRectRef,
    activePointerIdRef,
    pendingPanRef,
    panPreviewRef,
    panDidMoveRef,
    customWiringMode,
    onSelect,
    pendingWireFrom,
    placingType,
    mode,
    reroute,
    pendingCustomPath,
    gridSize,
    pan,
    zoom,
    reducedDetails,
    liveDragWireLimit: LIVE_DRAG_WIRE_LIMIT,
  });

  // Mutate the SVG cursor group's transform directly, avoiding a React
  // re-render. Runs only while a custom path is active.
  useEffect(() => {
    if (!pendingCustomPath) return;
    let raf = 0;
    const tick = () => {
      const cur = customCursorRef.current;
      const el = customCursorElRef.current;
      if (el && cur) {
        el.setAttribute('transform', `translate(${cur.x} ${cur.y})`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pendingCustomPath]);

  // Cancel rubber-band when wire mode is exited.
  useEffect(() => {
    if (mode !== 'wiring' && pendingWireFrom) {
      useUiStore.getState().setPendingWireFrom(null);
      setWorldCursor(null);
    }
    if (mode !== 'placing' && !pendingWireFrom && !reroute) {
      setWorldCursor(null);
    }
  }, [mode, pendingWireFrom, reroute]);

  // ── Port click → wire creation OR reroute commit OR custom-path step ──
  const handlePortClick = (compId: string, portIndex: number) => {
    // A compatibility click from a secondary touch must not alter wiring while
    // the primary pointer still owns a drag or pan gesture.
    if (activePointerIdRef.current !== null) return;
    const ui = useUiStore.getState();
    const r = ui.reroute;
    if (r) {
      applyReroute(r.wireId, r.end, { componentId: compId, portIndex });
      return;
    }
    // In custom wiring mode an in-flight path turns this port into the destination.
    if (customWiringMode && ui.pendingCustomPath) {
      commitCustomPath(compId, portIndex);
      customCursorRef.current = null;
      return;
    }
    // Otherwise this port starts a custom path.
    if (customWiringMode && !ui.pendingCustomPath) {
      ui.startCustomPath({ componentId: compId, portIndex });
      return;
    }
    runPortClickFsm(compId, portIndex, byId);
  };

  const cancelArmedReroute = () => {
    const ui = useUiStore.getState();
    if (ui.reroute?.source !== 'armed') return;
    ui.setMode('idle');
    ui.addLog('Reroute cancelled.', 'info');
  };

  const armWireTargetReroute = (wireId: string) => {
    useCircuitStore.getState().selectWire(wireId);
    const ui = useUiStore.getState();
    ui.setMode('wiring');
    ui.setReroute({ wireId, end: 'to', source: 'armed' });
    ui.addLog('Reroute armed - choose a compatible port.', 'info');
  };

  return (
    <div ref={panPreviewRef} className={className} style={{ background: theme.bg }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className={['block h-full w-full', challengePaused ? 'pointer-events-none' : ''].join(' ')}
        data-challenge-paused={challengePaused ? 'true' : undefined}
        aria-disabled={challengePaused}
        style={{
          background: theme.bg,
          fontFamily: theme.font,
          cursor: panRef.current
            ? 'grabbing'
            : pendingWireFrom || placingType || reroute
              ? 'crosshair'
              : 'default',
          touchAction: 'none',
        }}
        data-circuit-canvas
        data-interaction-mode={mode}
        data-reroute-active={reroute ? `${reroute.wireId}:${reroute.end}` : undefined}
        role="application"
        aria-label="Circuit diagram"
        aria-describedby={canvasDescriptionId}
        onWheel={handleWheel}
        onPointerDown={handleBackgroundPointerDown}
        onContextMenu={(e) => {
          e.preventDefault();
          useUiStore.getState().setContextMenu({
            x: e.clientX,
            y: e.clientY,
            target: { kind: 'canvas' },
          });
        }}
        onClick={(e) => {
          // A pan drag fires `click` on pointer up if the
          // pointer didn't leave the SVG. Suppress all click side-effects
          // when we just panned, otherwise the user loses their selection
          // / reroute / placement intent every time they drag the canvas.
          if (panDidMoveRef.current) {
            panDidMoveRef.current = false;
            return;
          }
          if (placingType) {
            handleDrop(e.clientX, e.clientY);
            return;
          }
          if (e.target === e.currentTarget) {
            // A background click adds a checkpoint to an in-flight custom path.
            if (pendingCustomPath) {
              if (!internalSvgRef.current) return;
              const sp = screenToSvg(internalSvgRef.current, e.clientX, e.clientY);
              const wp = svgToWorld(sp, pan, zoom);
              useUiStore.getState().addCustomPathCheckpoint(wp);
              return;
            }
            onSelect?.(null);
            useCircuitStore.getState().selectWire(null);
            if (pendingWireFrom) {
              useUiStore.getState().setPendingWireFrom(null);
              useUiStore.getState().setMode('idle');
            }
            cancelArmedReroute();
          }
        }}
      >
        <title>
          Live circuit ({circuit.components.length} components, {circuit.wires.length} wires)
        </title>
        <desc id={canvasDescriptionId}>
          Interactive circuit editor. Tab to components, ports, and wires. Press Enter or Space to
          activate the focused item.
        </desc>
        <defs>
          {theme.showGrid !== false && (
            <pattern
              id={`grid-${gridPatternId}`}
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill={theme.gridDot} />
            </pattern>
          )}
        </defs>

        {/* Background fills the full viewBox so pan/zoom doesn't expose a
          colour gap. The grid lives inside the world transform and pans
          with the content. */}
        <rect x={0} y={0} width={VIEW_W} height={VIEW_H} fill={theme.bg} pointerEvents="none" />

        {/* World transform applies pan + zoom to everything. */}
        <g
          ref={worldGroupRef}
          data-canvas-world
          transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}
        >
          {theme.showGrid !== false && (
            <rect
              x={-VIEW_W * 4}
              y={-VIEW_H * 4}
              width={VIEW_W * 9}
              height={VIEW_H * 9}
              fill={`url(#grid-${gridPatternId})`}
              onClick={(e) => {
                // Use the same pan-suppression guard as the SVG-level
                // click handler. The grid rect bubbles to the SVG handler
                // too, so we only need to handle the placement / deselect
                // intent here — the pan-flag reset happens upstream.
                if (panDidMoveRef.current) return;
                if (placingType) {
                  handleDrop(e.clientX, e.clientY);
                  return;
                }
                // Empty-canvas clicks add checkpoints to an in-flight custom path.
                if (pendingCustomPath) {
                  if (!internalSvgRef.current) return;
                  const sp = screenToSvg(internalSvgRef.current, e.clientX, e.clientY);
                  const wp = svgToWorld(sp, pan, zoom);
                  useUiStore.getState().addCustomPathCheckpoint(wp);
                  return;
                }
                onSelect?.(null);
                useCircuitStore.getState().selectWire(null);
                cancelArmedReroute();
              }}
            />
          )}

          <WireLayer
            wires={circuit.wires}
            componentsById={byId}
            theme={theme}
            wireWidth={wireWidth}
            simulation={simResult}
            selectedWireId={selectedWireId}
            currentFlowOn={currentFlowOn}
            wireGlowOn={wireGlowOn}
            reducedDetails={reducedDetails}
            orthogonalPaths={orthogonalPathD}
            flaggedWireIds={flaggedWireIds}
            traceWireIds={traceWireIds}
            severedWireIds={severedWireIds}
            onSelectWire={(id) => {
              useCircuitStore.getState().selectWire(id);
              useUiStore.getState().setInspectorCollapsed(false);
            }}
            onArmReroute={armWireTargetReroute}
            onContextMenu={(id, event) => {
              event.preventDefault();
              event.stopPropagation();
              useCircuitStore.getState().selectWire(id);
              useUiStore.getState().setContextMenu({
                x: event.clientX,
                y: event.clientY,
                target: { kind: 'wire', id },
              });
            }}
          />

          <WireJointsLayer
            wires={circuit.wires}
            componentsById={byId}
            theme={theme}
            enabled={autoWireJoints}
          />

          <CanvasOverlayLayer
            circuit={circuit}
            componentsById={byId}
            theme={theme}
            selectedWireId={selectedWireId}
            pendingWireFrom={pendingWireFrom}
            pendingCustomPath={pendingCustomPath}
            reroute={reroute}
            cursor={worldCursor}
            placingType={placingType}
            gridSize={gridSize}
            selectedComponentIds={selectedComponentIds}
            dragRect={dragRect}
            customCursorRef={customCursorElRef}
            previewVariantType={previewVariantType}
            previewComponentId={previewComponentId}
            onArmEndpointReroute={handleEndpointPointerDown}
          >
            <ComponentLayer
              components={circuit.components}
              componentsById={byId}
              simulation={simResult}
              selectedId={selectedId}
              theme={theme}
              wireMode={mode === 'wiring' || Boolean(reroute)}
              pendingFrom={pendingWireFrom}
              customPathFrom={pendingCustomPath?.from ?? null}
              activeLoadEffects={activeLoadEffects}
              reducedDetails={reducedDetails}
              flaggedIds={flaggedComponentIds}
              traceComponentIds={traceComponentIds}
              onPointerDown={(component, event) => {
                handleComponentPointerDown(component, event);
              }}
              onSelect={onSelect}
              onToggleSwitch={onToggleSwitch}
              onSetSwitchState={onSetSwitchState}
              onPortClick={handlePortClick}
              onHoverChange={(id) => useUiStore.getState().setHoveredComponentId(id)}
              onContextMenu={(id, event) => {
                event.preventDefault();
                event.stopPropagation();
                useUiStore.getState().setContextMenu({
                  x: event.clientX,
                  y: event.clientY,
                  target: { kind: 'component', id },
                });
              }}
            />
          </CanvasOverlayLayer>

          {/* Pro-only heatmap overlay. Sits above wires and components so
              the stress halos are always visible; pointer-events disabled. */}
          <StressZoneOverlay
            circuit={circuit}
            simulation={simResult ?? null}
            componentsById={byId}
            orthogonalPaths={orthogonalPathD}
          />

          {/* Fault Lab effects: per-fault canvas animations + persistent
              indicators; topmost world-space layer, pointer-transparent. */}
          <FaultFxLayer
            items={faultFxItems}
            wires={circuit.wires}
            componentsById={byId}
            theme={theme}
            wireWidth={wireWidth}
            orthogonalPaths={orthogonalPathD}
          />
        </g>

        {/* Tooltip — drawn outside the world transform so size stays
          constant under zoom. Coordinates come from the hovered
          component projected back into screen-space. */}
        {showTooltips && hoveredId && (
          <ComponentTooltip
            component={byId.get(hoveredId)}
            simulation={simResult ?? null}
            pan={pan}
            zoom={zoom}
          />
        )}
      </svg>
    </div>
  );
}

export { requestDeleteWire };
