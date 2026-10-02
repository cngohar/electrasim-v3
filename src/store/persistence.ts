/**
 * persistence — IndexedDB autosave for the circuit graph (Phase 6).
 *
 * Goals (PLAN.md §2 / §6):
 *   1. Survive page reloads — the user's circuit is restored on next visit.
 *   2. Survive offline mode — the PWA shell + the IDB autosave together
 *      mean the editor is fully usable with no network at all.
 *   3. Stay out of the hot path — autosave is debounced (250 ms after the
 *      last mutation) and runs in a microtask so it can never block input.
 *   4. Forward-compatible — the persisted blob carries a schema `version`
 *      so future shape changes can migrate cleanly.
 *
 * Out of scope (Phase 9): cloud sync, multi-document, conflict resolution.
 *
 * Storage format:
 *   key   = `electrasim:circuit:v1`
 *   value = { version: 2, savedAt: number, circuit: { components, wires, supply, ... } }
 *   Schema-1 records migrate when read; the existing key stays in use.
 *
 * `idb-keyval` is ~1 KB gzip and gives us an async key-value API on top of
 * IndexedDB without writing the boilerplate ourselves.
 */

import type { Circuit } from '@electrasim/domain';
import { get, set } from 'idb-keyval';
import { CIRCUIT_SCHEMA_VERSION, normalizeCircuit, validateCircuitJSON } from '../lib/exportImport';
import { useCircuitStore } from './circuitStore';
import { saveChallengeCircuit } from './declarativeChallengePersistence';
import { useUiStore } from './uiStore';

// Bump when the persisted shape changes incompatibly.
const SCHEMA_VERSION = CIRCUIT_SCHEMA_VERSION;
// Upgrade records in place; changing the key would orphan existing autosaves.
const STORAGE_KEY = 'electrasim:circuit:v1';
const DEBOUNCE_MS = 250;
let lastSaveError = '';

interface PersistedCircuit {
  version: typeof SCHEMA_VERSION;
  savedAt: number;
  circuit: Circuit;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Try to hydrate the circuit store from IndexedDB. Resolves to `true` if a
 * valid saved circuit was found and applied; `false` otherwise (in which
 * case the seed circuit set in `circuitStore.ts` remains in place).
 *
 * MUST be awaited before the editor renders the first frame, otherwise the
 * user sees a flash-of-seed before their saved circuit takes over.
 */
export async function hydrateCircuit(): Promise<boolean> {
  try {
    const raw = await get(STORAGE_KEY);
    if (validateCircuitJSON(raw) !== null) return false;
    const persisted = raw as PersistedCircuit;
    useCircuitStore.getState().setCircuit(normalizeCircuit(persisted.circuit));
    // Drop undo history — pre-reload edits aren't meaningfully undoable.
    useCircuitStore.temporal.getState().clear();
    return true;
  } catch (err) {
    console.warn('[persistence] hydrate failed, using seed:', err);
    return false;
  }
}

/**
 * Persist a known-valid circuit immediately, including imported share links.
 * Returns whether IndexedDB confirmed the write; storage failures stay
 * non-throwing so autosave cannot interrupt editor interactions.
 */
export async function persistCircuit(circuit: Circuit): Promise<boolean> {
  const payload: PersistedCircuit = {
    version: SCHEMA_VERSION,
    savedAt: Date.now(),
    circuit: normalizeCircuit(circuit),
  };

  try {
    await set(STORAGE_KEY, payload);
    lastSaveError = '';
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message !== lastSaveError) {
      console.warn('[persistence] save failed:', message);
      lastSaveError = message;
    }
    return false;
  }
}

/**
 * Subscribe to circuit changes and write to IDB after a quiet period.
 * Returns an unsubscribe function (call on app teardown / HMR).
 *
 * Implementation notes:
 *   - We subscribe outside React via `zustand.subscribe` so saves happen
 *     even when the editor isn't mounted (e.g. during a stress test).
 *   - Document edits, including supply-only and fault changes, trigger saves;
 *     selection clicks don't trigger writes.
 *   - Errors are logged once per session, never thrown. A failed write
 *     should not break the app.
 */
export function startAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: Circuit | null = null;

  const flushPending = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!pending) return;
    const circuit = pending;
    pending = null;
    // Plan §12: during an active challenge, autosave routes to the challenge
    // workspace — the normal circuit (already snapshotted) stays untouched.
    // This eager UI mirror keeps persistence synchronous on pagehide without
    // importing the entire Challenge Mode store into the first-paint bundle.
    const ui = useUiStore.getState();
    if (ui.challengeAttemptId) {
      void saveChallengeCircuit(ui.challengeAttemptId, circuit);
      return;
    }
    void persistCircuit(circuit);
  };

  const handlePageHide = () => flushPending();
  window.addEventListener('pagehide', handlePageHide);

  const unsub = useCircuitStore.subscribe((state, prev) => {
    if (
      state.components === prev.components &&
      state.wires === prev.wires &&
      state.globalVoltage === prev.globalVoltage &&
      state.supply === prev.supply &&
      state.faults === prev.faults
    ) {
      return;
    }
    if (timer) clearTimeout(timer);
    pending = {
      components: state.components,
      wires: state.wires,
      globalVoltage: state.globalVoltage,
      supply: state.supply,
      faults: state.faults,
    };
    timer = setTimeout(flushPending, DEBOUNCE_MS);
  });

  return () => {
    unsub();
    window.removeEventListener('pagehide', handlePageHide);
    flushPending();
  };
}

/**
 * Wipe the saved circuit. Used by tests and (eventually) a "Reset workspace"
 * menu item.
 */
export async function clearPersistedCircuit(): Promise<void> {
  try {
    await set(STORAGE_KEY, undefined);
  } catch (err) {
    console.warn('[persistence] clear failed:', err);
  }
}

/** Exposed for tests — the IDB key in use this build. */
export const __STORAGE_KEY = STORAGE_KEY;
