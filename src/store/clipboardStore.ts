/**
 * clipboardStore — in-memory clipboard for copy/paste (Phase 6.2.4).
 *
 * D7 decision (PLAN.md §10): clipboard is intentionally in-memory only.
 * No persistence across page reloads; no cross-tab sharing.
 *
 * Stores a snapshot of the components at copy-time. Wires between
 * copied components are not included (they require full sub-graph
 * copy semantics). The paste action
 * re-generates fresh IDs so copies are independent instances.
 */

import type { ComponentInstance } from '@electrasim/domain';
import { create } from 'zustand';

interface ClipboardState {
  /** Components currently on the clipboard. Empty = nothing copied. */
  items: ComponentInstance[];
  /** How many times the current clipboard content has been pasted.
   *  Used to stack-offset repeated pastes so they don't land on top
   *  of each other. Resets to 0 on each new copy. */
  pasteCount: number;

  copy: (components: ComponentInstance[]) => void;
  incrementPasteCount: () => void;
  clear: () => void;
}

export const useClipboardStore = create<ClipboardState>()((set) => ({
  items: [],
  pasteCount: 0,

  copy: (components) => set({ items: components, pasteCount: 0 }),

  incrementPasteCount: () => set((s) => ({ pasteCount: s.pasteCount + 1 })),

  clear: () => set({ items: [], pasteCount: 0 }),
}));
