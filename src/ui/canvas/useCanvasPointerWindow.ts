import {
  COMP_H,
  COMP_W,
  type ComponentInstance,
  type Point2D,
  type WireInstance,
  snapToGrid,
} from '@electrasim/domain';
import { type RefObject, useEffect } from 'react';
import {
  type PendingCustomPath,
  useCircuitStore,
  useSettingsStore,
  useUiStore,
  useViewportStore,
} from '../../store';
import { buildWirePreviewPath, screenToSvg, svgToWorld } from './geometry';
import type { PortLoc } from './types';

export interface CanvasDragState {
  startClient: Point2D;
  startMouse: Point2D;
  starts: Map<string, Point2D>;
  currentDelta: Point2D;
  didMove: boolean;
  previewComponents: Map<string, ComponentInstance>;
  componentNodes: Map<string, SVGGElement>;
  selectionNodes: Map<string, SVGRectElement>;
  connectedWires: Array<{
    wire: WireInstance;
    group?: SVGElement;
    originalOpacity: string;
    paths: Array<{ element: SVGPathElement; originalD: string | null }>;
  }>;
  liveWirePreview: boolean;
  deferredWireLayer?: { element: SVGElement; originalOpacity: string };
}

export interface CanvasPanState {
  startClient: Point2D;
  screenScale: Point2D;
  startPan: Point2D;
}

export interface CanvasDragRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface CanvasPointerWindowOptions {
  svgRef: RefObject<SVGSVGElement | null>;
  dragRef: RefObject<CanvasDragState | null>;
  panRef: RefObject<CanvasPanState | null>;
  dragRectRef: RefObject<CanvasDragRect | null>;
  activePointerIdRef: RefObject<number | null>;
  pendingPanRef: RefObject<Point2D | null>;
  panPreviewRef: RefObject<HTMLDivElement | null>;
  worldGroupRef: RefObject<SVGGElement | null>;
  panDidMoveRef: RefObject<boolean>;
  customCursorRef: RefObject<Point2D | null>;
  pendingWireFrom: PortLoc | null;
  placingType: string | null;
  pendingCustomPath: PendingCustomPath | null;
  gridSize: number;
  pan: Point2D;
  zoom: number;
  setWorldCursor: (point: Point2D | null) => void;
}

interface PointerSnapshot {
  clientX: number;
  clientY: number;
  pointerId: number;
}

export interface ResolvedDragUpdates {
  updates: Array<{ id: string; x: number; y: number }>;
  moved: boolean;
}

/** Resolve final positions without letting a click snap an off-grid component. */
export function resolveDragUpdates(
  starts: ReadonlyMap<string, Point2D>,
  delta: Point2D,
  gridSize: number,
  commit: boolean,
  didMove: boolean,
  snap = true,
): ResolvedDragUpdates {
  const shouldMove = commit && didMove;
  let moved = false;
  const updates = Array.from(starts, ([id, start]) => {
    if (!shouldMove) return { id, x: start.x, y: start.y };
    const x = snap ? snapToGrid(start.x + delta.x, gridSize) : start.x + delta.x;
    const y = snap ? snapToGrid(start.y + delta.y, gridSize) : start.y + delta.y;
    moved ||= x !== start.x || y !== start.y;
    return { id, x, y };
  });
  return { updates, moved };
}

/** Owns the window-level move/up/cancel lifecycle for active SVG gestures. */
export function useCanvasPointerWindow({
  svgRef,
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
}: CanvasPointerWindowOptions) {
  useEffect(() => {
    let moveFrame = 0;
    let latestMove: PointerSnapshot | null = null;

    const processMove = (event: PointerSnapshot) => {
      const svg = svgRef.current;
      if (!svg) return;
      const panGesture = panRef.current;
      if (panGesture) {
        const dx = event.clientX - panGesture.startClient.x;
        const dy = event.clientY - panGesture.startClient.y;
        if (!panDidMoveRef.current && dx * dx + dy * dy > 16) panDidMoveRef.current = true;
        pendingPanRef.current = {
          x: panGesture.startPan.x + dx / panGesture.screenScale.x,
          y: panGesture.startPan.y + dy / panGesture.screenScale.y,
        };
        if (panPreviewRef.current) {
          panPreviewRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        }
        return;
      }

      const screenPoint = screenToSvg(svg, event.clientX, event.clientY);
      const worldPoint = svgToWorld(screenPoint, pan, zoom);
      const drag = dragRef.current;
      if (drag) {
        let dx = worldPoint.x - drag.startMouse.x;
        let dy = worldPoint.y - drag.startMouse.y;
        const clientDx = event.clientX - drag.startClient.x;
        const clientDy = event.clientY - drag.startClient.y;
        if (!drag.didMove) {
          if (clientDx * clientDx + clientDy * clientDy <= 16) return;
          drag.didMove = true;
        }

        // Smart alignment guidelines & magnetic alignment
        const smartAlignment = useSettingsStore.getState().smartAlignmentGuides;
        if (smartAlignment && drag.starts.size === 1) {
          const [[draggedId, start]] = drag.starts;
          const targetX = start.x + dx;
          const targetY = start.y + dy;
          const allComps = useCircuitStore.getState().components;
          const SNAP_DIST = 7;
          let snapGuideX: number | undefined;
          let snapGuideY: number | undefined;

          for (const c of allComps) {
            if (c.id === draggedId) continue;
            if (Math.abs(targetX - c.x) <= SNAP_DIST && snapGuideX === undefined) {
              dx = c.x - start.x;
              snapGuideX = c.x;
            }
            if (Math.abs(targetY - c.y) <= SNAP_DIST && snapGuideY === undefined) {
              dy = c.y - start.y;
              snapGuideY = c.y;
            }
          }

          useUiStore
            .getState()
            .setAlignmentGuides(
              snapGuideX !== undefined || snapGuideY !== undefined
                ? { x: snapGuideX, y: snapGuideY }
                : null,
            );
        }

        drag.currentDelta = { x: dx, y: dy };

        for (const [id, start] of drag.starts) {
          const component = drag.previewComponents.get(id);
          if (!component) continue;
          drag.previewComponents.set(id, { ...component, x: start.x + dx, y: start.y + dy });
          const node = drag.componentNodes.get(id);
          if (node) node.style.translate = `${dx}px ${dy}px`;
          const selectionNode = drag.selectionNodes.get(id);
          if (selectionNode) selectionNode.style.translate = `${dx}px ${dy}px`;
        }

        if (drag.liveWirePreview) {
          for (const { wire, paths } of drag.connectedWires) {
            const path = buildWirePreviewPath(wire, drag.previewComponents);
            if (!path) continue;
            for (const { element } of paths) element.setAttribute('d', path);
          }
        }
        return;
      }

      const dragRect = dragRectRef.current;
      if (dragRect) {
        dragRect.x2 = worldPoint.x;
        dragRect.y2 = worldPoint.y;
        useUiStore.getState().setDragRect({ ...dragRect });
        return;
      }
      if (pendingWireFrom || placingType || useUiStore.getState().reroute) {
        setWorldCursor(worldPoint);
      }
      if (pendingCustomPath) customCursorRef.current = worldPoint;
    };

    const flushMove = () => {
      if (moveFrame) cancelAnimationFrame(moveFrame);
      moveFrame = 0;
      const next = latestMove;
      latestMove = null;
      if (next) processMove(next);
    };

    const finishDrag = (commit: boolean) => {
      const drag = dragRef.current;
      if (!drag) return;
      const { updates, moved } = resolveDragUpdates(
        drag.starts,
        drag.currentDelta,
        gridSize,
        commit,
        drag.didMove,
        useSettingsStore.getState().snapToGrid,
      );
      for (const { id, x, y } of updates) {
        const component = drag.previewComponents.get(id);
        if (component) drag.previewComponents.set(id, { ...component, x, y });
        const node = drag.componentNodes.get(id);
        if (node) {
          node.setAttribute(
            'transform',
            `translate(${x - COMP_W / 2} ${y - COMP_H / 2}) rotate(${(component?.rotation ?? 0) % 360} ${COMP_W / 2} ${COMP_H / 2})`,
          );
          node.style.removeProperty('translate');
          node.style.removeProperty('will-change');
        }
        const selectionNode = drag.selectionNodes.get(id);
        if (selectionNode) {
          selectionNode.style.removeProperty('translate');
          selectionNode.style.removeProperty('will-change');
        }
      }
      for (const { wire, group, originalOpacity, paths } of drag.connectedWires) {
        if (group) {
          if (originalOpacity) group.style.opacity = originalOpacity;
          else group.style.removeProperty('opacity');
        }
        const previewPath = moved ? buildWirePreviewPath(wire, drag.previewComponents) : null;
        for (const { element, originalD } of paths) {
          const path = previewPath ?? originalD;
          if (path) element.setAttribute('d', path);
          else element.removeAttribute('d');
        }
      }
      if (drag.deferredWireLayer) {
        const { element, originalOpacity } = drag.deferredWireLayer;
        if (originalOpacity) element.style.opacity = originalOpacity;
        else element.style.removeProperty('opacity');
      }
      dragRef.current = null;
      useUiStore.getState().setAlignmentGuides(null);
      if (moved) useCircuitStore.getState().setComponentPositions(updates);
    };

    const finishSelection = (commit: boolean) => {
      const rect = dragRectRef.current;
      if (!rect) return;
      const minX = Math.min(rect.x1, rect.x2);
      const maxX = Math.max(rect.x1, rect.x2);
      const minY = Math.min(rect.y1, rect.y2);
      const maxY = Math.max(rect.y1, rect.y2);
      if (commit && maxX - minX > 4 && maxY - minY > 4) {
        const halfWidth = COMP_W / 2;
        const halfHeight = COMP_H / 2;
        const inside = useCircuitStore
          .getState()
          .components.filter(
            (component) =>
              component.x - halfWidth < maxX &&
              component.x + halfWidth > minX &&
              component.y - halfHeight < maxY &&
              component.y + halfHeight > minY,
          )
          .map((component) => component.id);
        if (inside.length > 0) {
          useCircuitStore.getState().setMultiSelection(inside);
          panDidMoveRef.current = true;
        }
      }
      dragRectRef.current = null;
      useUiStore.getState().setDragRect(null);
    };

    const finishPan = (commit: boolean) => {
      if (!panRef.current) return;
      panRef.current = null;
      const nextPan = pendingPanRef.current;
      pendingPanRef.current = null;
      if (commit && nextPan) {
        worldGroupRef.current?.setAttribute(
          'transform',
          `translate(${nextPan.x} ${nextPan.y}) scale(${zoom})`,
        );
        useViewportStore.getState().setPan(nextPan);
      }
      panPreviewRef.current?.style.removeProperty('transform');
      panPreviewRef.current?.style.removeProperty('will-change');
      if (svgRef.current) svgRef.current.style.cursor = '';
    };

    const finishInteraction = (commit: boolean) => {
      if (svgRef.current?.getAttribute('data-canvas-gesture') !== 'zoom') {
        svgRef.current?.removeAttribute('data-canvas-gesture');
      }
      finishDrag(commit);
      finishSelection(commit);
      finishPan(commit);
      if (!commit) panDidMoveRef.current = false;
      activePointerIdRef.current = null;
    };

    const cancelReroute = () => {
      const ui = useUiStore.getState();
      if (!ui.reroute) return;
      ui.setMode('idle');
      ui.addLog('Reroute cancelled.', 'info');
    };

    const onMove = (event: PointerEvent) => {
      const activePointerId = activePointerIdRef.current;
      if (activePointerId !== null && event.pointerId !== activePointerId) return;
      latestMove = {
        clientX: event.clientX,
        clientY: event.clientY,
        pointerId: event.pointerId,
      };
      if (!moveFrame) {
        moveFrame = requestAnimationFrame(() => {
          moveFrame = 0;
          const next = latestMove;
          latestMove = null;
          if (next) processMove(next);
        });
      }
    };

    const onUp = (event: PointerEvent) => {
      const activePointerId = activePointerIdRef.current;
      if (activePointerId !== null && event.pointerId !== activePointerId) return;
      flushMove();
      finishInteraction(true);
      const activeReroute = useUiStore.getState().reroute;
      if (activeReroute?.source === 'drag') {
        cancelReroute();
      }
    };

    const onCancel = (event: PointerEvent) => {
      const activePointerId = activePointerIdRef.current;
      if (activePointerId !== null && event.pointerId !== activePointerId) return;
      latestMove = null;
      finishInteraction(false);
      cancelReroute();
    };
    const onBlur = () => {
      latestMove = null;
      finishInteraction(false);
      cancelReroute();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onBlur);
    return () => {
      if (moveFrame) cancelAnimationFrame(moveFrame);
      finishInteraction(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onBlur);
    };
  }, [
    activePointerIdRef,
    customCursorRef,
    dragRectRef,
    dragRef,
    gridSize,
    pan,
    panDidMoveRef,
    panPreviewRef,
    panRef,
    pendingCustomPath,
    pendingPanRef,
    pendingWireFrom,
    placingType,
    setWorldCursor,
    svgRef,
    worldGroupRef,
    zoom,
  ]);
}
