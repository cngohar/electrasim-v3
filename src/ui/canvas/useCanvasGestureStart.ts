import type { ComponentInstance, InteractionMode, Point2D } from '@electrasim/domain';
import {
  type PointerEvent,
  type RefObject,
  type WheelEvent,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useCircuitStore, useUiStore, useViewportStore } from '../../store';
import type { PendingCustomPath, RerouteState } from '../../store/uiStore';
import { dropComponentAt } from '../canvas-actions';
import { screenToSvg, svgToWorld } from './geometry';
import type { PortLoc } from './types';
import type { CanvasDragRect, CanvasDragState, CanvasPanState } from './useCanvasPointerWindow';

interface CanvasGestureStartOptions {
  svgRef: RefObject<SVGSVGElement | null>;
  dragRef: RefObject<CanvasDragState | null>;
  panRef: RefObject<CanvasPanState | null>;
  dragRectRef: RefObject<CanvasDragRect | null>;
  activePointerIdRef: RefObject<number | null>;
  pendingPanRef: RefObject<Point2D | null>;
  panPreviewRef: RefObject<HTMLDivElement | null>;
  panDidMoveRef: RefObject<boolean>;
  customWiringMode: boolean;
  onSelect?: (id: string | null) => void;
  pendingWireFrom: PortLoc | null;
  placingType: string | null;
  mode: InteractionMode;
  reroute: RerouteState | null;
  pendingCustomPath: PendingCustomPath | null;
  gridSize: number;
  pan: Point2D;
  zoom: number;
  reducedDetails: boolean;
  liveDragWireLimit: number;
}

function capturePointer(
  event: PointerEvent<SVGElement>,
  activePointerIdRef: RefObject<number | null>,
) {
  activePointerIdRef.current = event.pointerId;
  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    // Synthetic pointer events and older SVG implementations may not support capture.
  }
}

function hasDifferentActivePointer(
  event: PointerEvent<SVGElement>,
  activePointerIdRef: RefObject<number | null>,
): boolean {
  const activePointerId = activePointerIdRef.current;
  return activePointerId !== null && activePointerId !== event.pointerId;
}

/** Builds the pointer-down, wheel, and drop handlers that arm canvas gestures. */
export function useCanvasGestureStart({
  svgRef,
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
  liveDragWireLimit,
}: CanvasGestureStartOptions) {
  const wheelEnd = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (wheelEnd.current !== null) clearTimeout(wheelEnd.current);
    },
    [],
  );
  const handleDrop = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg || !placingType) return;
    const point = svgToWorld(screenToSvg(svg, clientX, clientY), pan, zoom);
    dropComponentAt(point.x, point.y, gridSize);
  };

  const handleComponentPointerDown = useCallback(
    (component: ComponentInstance, event: PointerEvent<SVGGElement>) => {
      const svg = svgRef.current;
      if (!svg || event.button !== 0) return;
      event.stopPropagation();
      if (hasDifferentActivePointer(event, activePointerIdRef)) return;
      if (customWiringMode && useUiStore.getState().pendingCustomPath) return;
      svg.setAttribute('data-canvas-gesture', 'drag');
      const view = useViewportStore.getState();
      const startMouse = svgToWorld(
        screenToSvg(svg, event.clientX, event.clientY),
        view.pan,
        view.zoom,
      );

      if (event.shiftKey) {
        svg.removeAttribute('data-canvas-gesture');
        useCircuitStore.getState().toggleComponentSelection(component.id);
        return;
      }
      const selectedIds = useCircuitStore.getState().selectedComponentIds;
      if (!selectedIds.includes(component.id)) onSelect?.(component.id);

      const store = useCircuitStore.getState();
      const currentIds = store.selectedComponentIds;
      const compGroup = store.componentGroups.find((g) => g.componentIds.includes(component.id));
      const groupMemberIds = compGroup ? compGroup.componentIds : [];
      const movingIds = new Set(
        groupMemberIds.length > 0
          ? [...groupMemberIds, ...(currentIds.length > 0 ? currentIds : [component.id])]
          : currentIds.length > 0
            ? currentIds
            : [component.id],
      );
      const componentsById = new Map(store.components.map((item) => [item.id, item]));
      const starts = new Map<string, Point2D>();
      for (const id of movingIds) {
        const item = componentsById.get(id);
        if (item) starts.set(id, { x: item.x, y: item.y });
      }

      const componentNodes = new Map<string, SVGGElement>();
      for (const node of svg.querySelectorAll<SVGGElement>('[data-component-id]')) {
        const id = node.getAttribute('data-component-id');
        if (id && movingIds.has(id)) {
          node.style.willChange = 'transform';
          componentNodes.set(id, node);
        }
      }
      const selectionNodes = new Map<string, SVGRectElement>();
      for (const node of svg.querySelectorAll<SVGRectElement>('[data-selection-component-id]')) {
        const id = node.getAttribute('data-selection-component-id');
        if (id && movingIds.has(id)) {
          node.style.willChange = 'transform';
          selectionNodes.set(id, node);
        }
      }
      const wireNodes = new Map<string, SVGElement>();
      for (const node of svg.querySelectorAll<SVGElement>('[data-wire-id]')) {
        const id = node.getAttribute('data-wire-id');
        if (id) wireNodes.set(id, node);
      }
      const connectedWires = store.wires
        .filter((wire) => movingIds.has(wire.fromComponentId) || movingIds.has(wire.toComponentId))
        .map((wire) => {
          const hitTarget = wireNodes.get(wire.id);
          const group = hitTarget?.closest<SVGElement>('[data-wire-group]') ?? hitTarget;
          const dense = Boolean(hitTarget?.closest('[data-dense-wire-layer]'));
          return {
            wire,
            group,
            originalOpacity: group?.style.opacity ?? '',
            paths: dense
              ? []
              : Array.from(group?.querySelectorAll<SVGPathElement>('path') ?? [], (element) => ({
                  element,
                  originalD: element.getAttribute('d'),
                })),
          };
        });
      const liveWirePreview = !reducedDetails && connectedWires.length <= liveDragWireLimit;
      const denseWireLayer = svg.querySelector<SVGElement>('[data-dense-wire-layer]');
      const deferredWireLayer =
        !liveWirePreview && denseWireLayer
          ? { element: denseWireLayer, originalOpacity: denseWireLayer.style.opacity }
          : undefined;
      if (!liveWirePreview) {
        if (deferredWireLayer) {
          deferredWireLayer.element.style.opacity = '0.28';
        } else {
          for (const { group } of connectedWires) {
            if (group) group.style.opacity = '0.28';
          }
        }
      }

      useUiStore.getState().setHoveredComponentId(null);
      capturePointer(event, activePointerIdRef);
      dragRef.current = {
        startClient: { x: event.clientX, y: event.clientY },
        startMouse,
        starts,
        currentDelta: { x: 0, y: 0 },
        didMove: false,
        previewComponents: new Map(componentsById),
        componentNodes,
        selectionNodes,
        connectedWires,
        liveWirePreview,
        deferredWireLayer,
      };
    },
    [
      svgRef,
      activePointerIdRef,
      customWiringMode,
      onSelect,
      reducedDetails,
      liveDragWireLimit,
      dragRef,
    ],
  );

  const handleBackgroundPointerDown = (event: PointerEvent<SVGElement>) => {
    const svg = svgRef.current;
    if (!svg || (event.button !== 0 && event.button !== 1) || pendingCustomPath) return;
    if (hasDifferentActivePointer(event, activePointerIdRef)) return;
    const canStartRect =
      event.button !== 1 &&
      event.pointerType !== 'touch' &&
      !pendingWireFrom &&
      !placingType &&
      !reroute &&
      mode !== 'wiring' &&
      mode !== 'placing';
    capturePointer(event, activePointerIdRef);
    svg.setAttribute('data-canvas-gesture', canStartRect ? 'select' : 'pan');
    if (canStartRect) {
      const point = svgToWorld(screenToSvg(svg, event.clientX, event.clientY), pan, zoom);
      dragRectRef.current = { x1: point.x, y1: point.y, x2: point.x, y2: point.y };
      panDidMoveRef.current = false;
      return;
    }

    const matrix = svg.getScreenCTM();
    panRef.current = {
      startClient: { x: event.clientX, y: event.clientY },
      screenScale: {
        x: Math.max(Math.hypot(matrix?.a ?? 1, matrix?.b ?? 0), Number.EPSILON),
        y: Math.max(Math.hypot(matrix?.c ?? 0, matrix?.d ?? 1), Number.EPSILON),
      },
      startPan: { ...useViewportStore.getState().pan },
    };
    if (panPreviewRef.current) panPreviewRef.current.style.willChange = 'transform';
    pendingPanRef.current = null;
    svg.style.cursor = 'grabbing';
    panDidMoveRef.current = false;
  };

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    event.preventDefault();
    if (activePointerIdRef.current !== null) return;
    svg.setAttribute('data-canvas-gesture', 'zoom');
    if (wheelEnd.current !== null) clearTimeout(wheelEnd.current);
    wheelEnd.current = setTimeout(() => {
      if (svg.getAttribute('data-canvas-gesture') === 'zoom')
        svg.removeAttribute('data-canvas-gesture');
      wheelEnd.current = null;
    }, 160);
    const point = screenToSvg(svg, event.clientX, event.clientY);
    useViewportStore.getState().zoomBy(Math.exp(-event.deltaY * 0.0015), point);
  };

  const handleEndpointPointerDown = (
    wireId: string,
    end: 'from' | 'to',
    event?: PointerEvent<SVGCircleElement>,
  ) => {
    if (event && hasDifferentActivePointer(event, activePointerIdRef)) return;
    const ui = useUiStore.getState();
    // Endpoint handles use the same deterministic flow as the R shortcut:
    // arm one end, then activate a destination port with pointer or keyboard.
    ui.setMode('wiring');
    ui.setReroute({ wireId, end, source: 'armed' });
    ui.addLog('Reroute armed - choose a compatible port.', 'info');
  };

  return {
    handleBackgroundPointerDown,
    handleComponentPointerDown,
    handleDrop,
    handleEndpointPointerDown,
    handleWheel,
  };
}
