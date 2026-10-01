import type { Circuit } from '@electrasim/domain';
import { create } from 'zustand';

export interface CircuitLibraryDocument {
  id: string;
  name: string;
  version: number;
  circuit: Circuit;
  readOnly: boolean;
}

interface CircuitLibraryState {
  /** The account whose current selection is held in this browser session. */
  ownerId: string | null;
  name: string;
  current: CircuitLibraryDocument | null;
  setOwner: (ownerId: string | null) => void;
  setName: (name: string) => void;
  setCurrent: (document: CircuitLibraryDocument | null) => void;
}

export const DEFAULT_CIRCUIT_NAME = 'My circuit';

/**
 * The saved-circuit panel is opened as a lazy modal and is unmounted when the
 * modal closes. Keep its selected document outside the panel so returning to
 * the canvas and opening it again does not lose the version used by Update.
 * The owner guard prevents one account's selection from carrying into another
 * account after sign-in or sign-out.
 */
export const useCircuitLibraryStore = create<CircuitLibraryState>((set) => ({
  ownerId: null,
  name: DEFAULT_CIRCUIT_NAME,
  current: null,
  setOwner: (ownerId) =>
    set((state) =>
      state.ownerId === ownerId ? state : { ownerId, name: DEFAULT_CIRCUIT_NAME, current: null },
    ),
  setName: (name) => set({ name }),
  setCurrent: (current) => set({ current }),
}));
