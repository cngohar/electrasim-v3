/**
 * useInspectorSelectionState — derives which inspector view should render
 * from the current circuit-store selection. Moved verbatim from
 * `Inspector.tsx`. Public API unchanged.
 */

import type { ComponentInstance, WireInstance } from '@electrasim/domain';
import { useCircuitStore, useUiStore } from '../../../store';

export function useInspectorSelectionState({
  selectedComp,
  selectedWire,
}: {
  selectedComp: ComponentInstance | null;
  selectedWire?: WireInstance | null;
}) {
  const selectedComponentIds = useCircuitStore((s) => s.selectedComponentIds);
  const selectedWireIds = useCircuitStore((s) => s.selectedWireIds);
  const selectedId = useCircuitStore((s) => s.selectedComponentId);
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const validationReport = useUiStore((s) => s.validationReport);

  // 1. Multi-component selection
  if (selectedComponentIds.length > 1) {
    return {
      kind: 'multi-component' as const,
      count: selectedComponentIds.length,
      componentIds: selectedComponentIds,
    };
  }

  // 2. Single Component
  const singleCompId =
    selectedId ?? (selectedComponentIds.length === 1 ? selectedComponentIds[0] : null);
  const activeComp =
    selectedComp ?? (singleCompId ? (components.find((c) => c.id === singleCompId) ?? null) : null);

  if (activeComp) {
    return {
      kind: 'component' as const,
      component: activeComp,
    };
  }

  // 3. Single Wire
  const activeWire =
    selectedWire ??
    (selectedWireIds.length === 1
      ? (wires.find((w) => w.id === selectedWireIds[0]) ?? null)
      : null);

  if (activeWire) {
    return {
      kind: 'wire' as const,
      wire: activeWire,
    };
  }

  // 4. Default empty selection
  return {
    kind: 'empty' as const,
    validationReport,
  };
}

/** Selection-state discriminated union consumed by the inspector views. */
export type InspectorSelectionState = ReturnType<typeof useInspectorSelectionState>;
