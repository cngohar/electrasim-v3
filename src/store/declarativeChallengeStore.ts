/**
 * declarativeChallengeStore — Challenge Mode session state (plan §5, §11).
 *
 * Owns the safe practice workspace:
 *   - starting snapshots the normal circuit (§12),
 *   - the editor is loaded with the challenge's STARTER circuit,
 *   - End Challenge keeps the built circuit; the explicit Return-to-My-Circuit
 *     escape hatch still restores the snapshot EXACTLY (§13),
 *   - a reload offers Continue vs Return-to-My-Circuit (§14),
 *   - Reset restores this challenge's starter (§15), never the global default.
 *
 * The circuit itself stays in `circuitStore` (it IS an ordinary edit session);
 * everything *about* the challenge lives here. Validation is delegated to the
 * declarative domain; persistence is isolated in
 * `declarativeChallengePersistence.ts`.
 */

import { create } from 'zustand';
import type { Circuit } from '../domain';
import {
  CHALLENGE_DEFINITIONS,
  type ChallengeDefinition,
  type ChallengeId,
  type ChallengeVerdict,
  cloneStarter,
  getChallengeDefinition,
  validateChallenge,
} from '../domain/challenges/declarative';
import { downloadText, exportJSON } from '../lib/exportImport';
import { useCircuitStore } from './circuitStore';
import {
  type ChallengeProgressMap,
  type DeclarativeChallengeStatus,
  clearActiveDeclarativeChallenge,
  clearChallengeCircuit,
  clearReturnWorkspace,
  loadActiveDeclarativeChallenge,
  loadChallengeCircuit,
  loadChallengeProgress,
  loadReturnWorkspace,
  recordChallengeProgress,
  saveActiveDeclarativeChallenge,
  saveChallengeCircuit,
  saveReturnWorkspace,
} from './declarativeChallengePersistence';
import { useSettingsStore } from './settingsStore';
import { useUiStore } from './uiStore';

/** Create a fresh attempt id (plan §12). Not security-sensitive. */
function newAttemptId(): string {
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface DeclarativeChallengeState {
  status: DeclarativeChallengeStatus;
  definition: ChallengeDefinition | null;
  verdict: ChallengeVerdict | null;
  /** The learner's normal circuit, snapshotted on start (§11). */
  returnCircuit: Circuit | null;
  progress: ChallengeProgressMap;
  attemptId: string | null;
  attempts: number;
  hintsUsed: number;
  startedAt: number | null;
  elapsedMs: number;
  /** True while the exit confirmation is open (§13). */
  confirmingExit: boolean;
  /** True while the learner has paused the active mission/challenge. */
  paused: boolean;
  /** True while the reload choice is offered (§14). */
  resumePrompt: { active: boolean; record: { challengeId: ChallengeId } } | null;
  /** The independently toggled on-canvas visual hint. */
  visualHintVisible: boolean;
  /** Which progressive hint level the visual guide is showing. */
  visualHintLevel: 1 | 2 | 3 | null;

  start: (challengeId: ChallengeId) => Promise<void>;
  check: () => ChallengeVerdict | null;
  revealHint: () => void;
  showVisualHint: () => void;
  hideVisualHint: () => void;
  pauseChallenge: () => void;
  resumeChallenge: () => void;
  resetChallenge: () => void;
  requestExit: () => void;
  cancelExit: () => void;
  /** End the challenge while keeping the current challenge circuit on canvas. */
  endChallenge: () => Promise<void>;
  /** Legacy safe-exit path: restore the saved normal circuit. */
  exitToMyCircuit: () => Promise<void>;
  keepCopy: () => void;
  resumeActive: () => Promise<boolean>;
  returnFromReload: () => Promise<void>;
  refreshProgress: () => Promise<void>;
  totalElapsedMs: () => number;
  dismissResumePrompt: () => void;
}

export const useDeclarativeChallengeStore = create<DeclarativeChallengeState>((set, get) => ({
  status: 'idle',
  definition: null,
  verdict: null,
  returnCircuit: null,
  progress: {},
  attemptId: null,
  attempts: 0,
  hintsUsed: 0,
  startedAt: null,
  elapsedMs: 0,
  confirmingExit: false,
  paused: false,
  resumePrompt: null,
  visualHintVisible: false,
  visualHintLevel: null,

  totalElapsedMs: () => {
    const { startedAt, elapsedMs, status, paused } = get();
    if (paused || startedAt === null || status !== 'active') return elapsedMs;
    return elapsedMs + Math.max(0, Date.now() - startedAt);
  },

  start: async (challengeId) => {
    const definition = getChallengeDefinition(challengeId);
    if (!definition) return;
    if (definition.audience === 'pro' && useSettingsStore.getState().appMode !== 'pro') {
      useUiStore
        .getState()
        .showNoticeToast('This challenge is for Pro Electrician Mode. Switch to Pro to start it.');
      return;
    }

    // §12: flush the normal autosave (happens via persistCircuit below),
    // snapshot the normal circuit, then load the starter.
    const current = useCircuitStore.getState();
    const snapshot = {
      components: current.components.map((c) => ({ ...c, state: { ...c.state } })),
      wires: current.wires.map((w) => ({ ...w, controlPoints: [...(w.controlPoints ?? [])] })),
      globalVoltage: current.globalVoltage,
      faults: current.faults ? [...current.faults] : [],
    };
    await saveReturnWorkspace(snapshot);

    useCircuitStore.getState().setCircuit(cloneStarter(definition.starter));
    useCircuitStore.temporal.getState().clear();

    const startedAt = Date.now();
    const attemptId = newAttemptId();
    set({
      status: 'active',
      definition,
      verdict: null,
      returnCircuit: snapshot,
      attemptId,
      attempts: 0,
      hintsUsed: 0,
      startedAt,
      elapsedMs: 0,
      confirmingExit: false,
      paused: false,
      resumePrompt: null,
      visualHintVisible: false,
      visualHintLevel: null,
    });
    useUiStore.getState().setChallengeModeActive(true);
    useUiStore.getState().setChallengePaused(false);
    useUiStore.getState().setChallengeAllowedComponents(definition.allowedComponents);
    useUiStore.getState().setChallengeAttemptId(attemptId);
    useUiStore.getState().setChallengeRuleFocus(null);
    await saveActiveDeclarativeChallenge({
      challengeId,
      attemptId,
      startedAt,
      elapsedMs: 0,
      hintsUsed: 0,
      attempts: 0,
      paused: false,
    });
  },

  check: () => {
    const { definition, status, paused } = get();
    if (!definition || status !== 'active' || paused) return null;
    const { components, wires, globalVoltage } = useCircuitStore.getState();
    const verdict = validateChallenge(definition, { components, wires, globalVoltage });
    const attempts = get().attempts + 1;
    set({ verdict, attempts });
    void saveActiveDeclarativeChallenge({
      challengeId: definition.id,
      attemptId: get().attemptId ?? newAttemptId(),
      startedAt: get().startedAt ?? 0,
      elapsedMs: get().elapsedMs,
      hintsUsed: get().hintsUsed,
      attempts,
      paused: get().paused,
    });
    if (verdict.state === 'complete') {
      const elapsedMs = get().totalElapsedMs();
      set({ status: 'completed', elapsedMs, startedAt: null });
      useUiStore.getState().setChallengeAllowedComponents(null);
      useUiStore.getState().setChallengeAttemptId(null);
      void clearActiveDeclarativeChallenge();
      const attemptId = get().attemptId;
      if (attemptId) void clearChallengeCircuit(attemptId);
      void recordChallengeProgress(definition.id, {
        elapsedMs,
        attempts,
        hintsUsed: get().hintsUsed,
      }).then((progress) => set({ progress }));
    }
    return verdict;
  },

  revealHint: () => {
    const { definition, hintsUsed, status, paused } = get();
    if (!definition || status !== 'active' || paused) return;
    if (hintsUsed >= definition.hints.length) return;
    const nextHintsUsed = hintsUsed + 1;
    set({ hintsUsed: nextHintsUsed });
    void saveActiveDeclarativeChallenge({
      challengeId: definition.id,
      attemptId: get().attemptId ?? newAttemptId(),
      startedAt: get().startedAt ?? 0,
      elapsedMs: get().elapsedMs,
      hintsUsed: nextHintsUsed,
      attempts: get().attempts,
      paused: get().paused,
    });
  },

  showVisualHint: () => {
    const { definition, hintsUsed, status, paused } = get();
    if (!definition || status !== 'active' || paused || definition.hints.length === 0) return;

    // Visual hints follow the same progressive order as textual hints, but do
    // not consume a textual hint. This lets a learner choose the teaching
    // style that works best without being penalised for exploring the overlay.
    const preferredIndex = Math.min(hintsUsed, definition.hints.length - 1);
    const visualIndex = definition.hints[preferredIndex]?.visual
      ? preferredIndex
      : definition.hints.findIndex((hint) => Boolean(hint.visual));
    if (visualIndex < 0) return;
    set({
      visualHintVisible: true,
      visualHintLevel: (visualIndex + 1) as 1 | 2 | 3,
    });
  },

  hideVisualHint: () =>
    set({
      visualHintVisible: false,
      visualHintLevel: null,
    }),

  /** Freeze elapsed time and lock the editor while leaving the session resumable. */
  pauseChallenge: () => {
    const { definition, status, paused, attemptId } = get();
    if (!definition || status !== 'active' || paused) return;
    const elapsedMs = get().totalElapsedMs();
    set({ paused: true, elapsedMs, startedAt: null });
    useUiStore.getState().setChallengePaused(true);
    if (attemptId) {
      void saveActiveDeclarativeChallenge({
        challengeId: definition.id,
        attemptId,
        startedAt: 0,
        elapsedMs,
        hintsUsed: get().hintsUsed,
        attempts: get().attempts,
        paused: true,
      });
    }
  },

  /** Resume the same session and restart the elapsed-time segment. */
  resumeChallenge: () => {
    const { definition, status, paused, attemptId } = get();
    if (!definition || status !== 'active' || !paused) return;
    const startedAt = Date.now();
    set({ paused: false, startedAt });
    useUiStore.getState().setChallengePaused(false);
    if (attemptId) {
      void saveActiveDeclarativeChallenge({
        challengeId: definition.id,
        attemptId,
        startedAt,
        elapsedMs: get().elapsedMs,
        hintsUsed: get().hintsUsed,
        attempts: get().attempts,
        paused: false,
      });
    }
  },

  /** §15: restore THIS challenge's starter, keeping the learner inside. */
  resetChallenge: () => {
    const { definition, status, paused } = get();
    if (!definition || status !== 'active' || paused) return;
    useCircuitStore.getState().setCircuit(cloneStarter(definition.starter));
    useCircuitStore.temporal.getState().clear();
    set({
      verdict: null,
      attempts: 0,
      hintsUsed: 0,
      visualHintVisible: false,
      visualHintLevel: null,
    });
    const attemptId = get().attemptId;
    if (attemptId) void clearChallengeCircuit(attemptId);
  },

  /** §13: show the leave dialog, never silently overwrite. */
  requestExit: () => {
    const { status } = get();
    if (status !== 'active' && status !== 'completed') return;
    set({ confirmingExit: true });
  },
  cancelExit: () => set({ confirmingExit: false }),

  /**
   * End Challenge Mode without discarding the learner's work. The current
   * circuit becomes an ordinary circuit, so the challenge palette restriction
   * and the active-mode indicator are lifted together.
   */
  endChallenge: async () => {
    const { attemptId } = get();
    const current = useCircuitStore.getState();
    const challengeCircuit = cloneStarter({
      components: current.components,
      wires: current.wires,
      globalVoltage: current.globalVoltage,
      faults: current.faults,
    });

    // Flip the lifecycle before re-setting the circuit. The autosave
    // subscription therefore routes this preserved build to the normal
    // workspace instead of writing it back to the challenge key.
    set({
      status: 'exited',
      definition: null,
      verdict: null,
      returnCircuit: null,
      attemptId: null,
      attempts: 0,
      hintsUsed: 0,
      startedAt: null,
      elapsedMs: 0,
      confirmingExit: false,
      paused: false,
      visualHintVisible: false,
      visualHintLevel: null,
    });
    useUiStore.getState().setChallengeModeActive(false);
    useUiStore.getState().setChallengeOpen(false);
    useCircuitStore.getState().setCircuit(challengeCircuit);
    useCircuitStore.temporal.getState().clear();
    await clearReturnWorkspace();
    await clearActiveDeclarativeChallenge();
    if (attemptId) await clearChallengeCircuit(attemptId);
  },

  /** §13 "Return to My Circuit": restore the snapshot EXACTLY. */
  exitToMyCircuit: async () => {
    const { returnCircuit, attemptId } = get();
    const savedCircuit = returnCircuit ? cloneStarter(returnCircuit) : null;

    // Flip the lifecycle before restoring the snapshot so the autosave
    // subscription treats the restored circuit as the normal workspace.
    set({
      status: 'exited',
      definition: null,
      verdict: null,
      returnCircuit: null,
      attemptId: null,
      attempts: 0,
      hintsUsed: 0,
      startedAt: null,
      elapsedMs: 0,
      confirmingExit: false,
      paused: false,
      visualHintVisible: false,
      visualHintLevel: null,
    });
    // Plan §13: leaving a challenge lands the learner back in the normal
    // editor — the panel closes with the workspace.
    useUiStore.getState().setChallengeModeActive(false);
    useUiStore.getState().setChallengeOpen(false);
    if (savedCircuit) {
      useCircuitStore.getState().setCircuit(savedCircuit);
      useCircuitStore.temporal.getState().clear();
    }
    await clearReturnWorkspace();
    await clearActiveDeclarativeChallenge();
    if (attemptId) await clearChallengeCircuit(attemptId);
  },

  /** §13 "Keep a Copy": export the challenge circuit as normal JSON. */
  keepCopy: () => {
    const { components, wires, globalVoltage } = useCircuitStore.getState();
    downloadText(
      exportJSON({ components, wires, globalVoltage }),
      'challenge-circuit.electrasim.json',
      'application/json',
    );
  },

  /** §14: rebuild an in-flight challenge after a page reload. */
  resumeActive: async () => {
    const record = await loadActiveDeclarativeChallenge();
    if (!record) return false;
    const definition = getChallengeDefinition(record.challengeId);
    if (!definition) {
      await clearActiveDeclarativeChallenge();
      return false;
    }
    const returnWorkspace = await loadReturnWorkspace();
    // The learner's in-progress build (if autosaved) beats the starter.
    const savedCircuit = await loadChallengeCircuit(record.attemptId);
    useCircuitStore.getState().setCircuit(savedCircuit ?? cloneStarter(definition.starter));
    useCircuitStore.temporal.getState().clear();
    set({
      status: 'active',
      definition,
      verdict: null,
      returnCircuit: returnWorkspace?.circuit ?? null,
      attemptId: record.attemptId,
      attempts: record.attempts,
      hintsUsed: record.hintsUsed,
      startedAt: record.paused ? null : Date.now(),
      elapsedMs: record.elapsedMs,
      confirmingExit: false,
      paused: record.paused === true,
      resumePrompt: null,
      visualHintVisible: false,
      visualHintLevel: null,
    });
    useUiStore.getState().setChallengeModeActive(true);
    useUiStore.getState().setChallengePaused(record.paused === true);
    useUiStore.getState().setChallengeAllowedComponents(definition.allowedComponents);
    useUiStore.getState().setChallengeAttemptId(record.attemptId);
    useUiStore.getState().setChallengeRuleFocus(null);
    return true;
  },

  /** §14 "Return to My Circuit" from the reload prompt. */
  returnFromReload: async () => {
    const returnWorkspace = await loadReturnWorkspace();
    if (returnWorkspace) {
      useCircuitStore.getState().setCircuit(returnWorkspace.circuit);
      useCircuitStore.temporal.getState().clear();
    }
    await clearReturnWorkspace();
    await clearActiveDeclarativeChallenge();
    useUiStore.getState().setChallengeModeActive(false);
    useUiStore.getState().setChallengeOpen(false);
    set({
      status: 'idle',
      definition: null,
      verdict: null,
      returnCircuit: null,
      resumePrompt: null,
      confirmingExit: false,
      paused: false,
      visualHintVisible: false,
      visualHintLevel: null,
    });
  },

  refreshProgress: async () => {
    set({ progress: await loadChallengeProgress() });
  },

  dismissResumePrompt: () => set({ resumePrompt: null }),
}));

/** Non-hook accessor mirroring the other stores' convention. */
export const declarativeChallengeState = () => useDeclarativeChallengeStore.getState();

/** Every shipped challenge, in recommended order (plan §17). */
export { CHALLENGE_DEFINITIONS };
