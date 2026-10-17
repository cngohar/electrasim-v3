import type { ComponentInstance } from '@electrasim/domain';
import { create } from 'zustand';

/** Visual projection only. Never enters the circuit, solver or undo history. */
export interface FaultDragPreview {
  components: ReadonlyMap<string, ComponentInstance>;
  paths: ReadonlyMap<string, string>;
  deferredWireIds: ReadonlySet<string>;
}
export const useFaultDragPreview = create<{ preview: FaultDragPreview | null }>(() => ({
  preview: null,
}));
