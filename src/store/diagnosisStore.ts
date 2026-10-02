import { buildAccessibleDiagnosis, scenarioRequirements } from '@electrasim/access/diagnosis';
import { exportJSON, importJSON } from '@electrasim/domain/circuitFormat';
import type { Circuit } from '@electrasim/domain/types';
import {
  accessGeneration,
  accessMessage,
  apiJSON,
  authorizeCircuit,
  canUseRequirements,
  useSimulatorAccess,
} from './simulatorAccess';
/**
 * diagnosisStore — Diagnosis Lab session state (plan §34).
 *
 * Mirrors `challengeStore`, with one structural difference forced by §41: a
 * submission has three outcomes, not two, so the store tracks *two* failure
 * counters instead of one `attempts`:
 *
 *   - `misdiagnoses`     — wrong type and/or wrong location (verdict `failure`)
 *   - `incompleteRepairs`— right answer, circuit still broken (`incomplete`)
 *
 * They are scored differently (§17: finding the fault is the hard part) and
 * they mean different things to a learner, so collapsing them would lose the
 * only signal worth keeping.
 *
 * The learner's circuit lives in `circuitStore` exactly as in Challenge Mode —
 * the Diagnosis Lab loads the *faulted* circuit into the ordinary editor and
 * lets them repair it with the ordinary tools. Nothing here duplicates a
 * domain type.
 *
 * Phase 1.5 preserves the original scenario and repair circuit alongside the
 * generator identity. Paid attempts use server-owned progress and scores;
 * finished attempts leave the active record and enter local aggregate stats.
 */

import {
  type ChallengeDifficulty,
  type DiagnosisAnswer,
  type DiagnosisEvaluation,
  type DiagnosisScenario,
  type DiagnosisScore,
  GENERATOR_VERSION,
  type RageTierId,
  evaluateDiagnosis,
  scoreDiagnosis,
} from '@electrasim/domain/challenges';
import { create } from 'zustand';
import { useCircuitStore } from './circuitStore';
import {
  type DiagnosisStatsRecord,
  type DiagnosisStatus,
  clearActiveDiagnosis,
  loadActiveDiagnosis,
  loadDiagnosisStats,
  recordDiagnosisAbandoned,
  recordDiagnosisCompleted,
  recordDiagnosisStarted,
  saveActiveDiagnosis,
} from './diagnosisPersistence';
import { useSettingsStore } from './settingsStore';
import { useUiStore } from './uiStore';

interface ServerAttempt {
  id: string;
  version: number;
  scenario: DiagnosisScenario;
  circuit: Circuit;
  readOnly?: boolean;
  progress: {
    status: 'active' | 'completed' | 'timed-out' | 'abandoned';
    misdiagnoses: number;
    incompleteRepairs: number;
    hintsUsed: number;
    identifiedFaultIds: string[];
    elapsedMs: number;
  };
  evaluation?: DiagnosisEvaluation | null;
  score?: DiagnosisScore | null;
}
export interface DiagnosisState {
  serverAttemptId: string | null;
  serverVersion: number;
  accessBlocked: boolean;
  checkpoint: () => Promise<void>;
  status: DiagnosisStatus;
  scenario: DiagnosisScenario | null;
  evaluation: DiagnosisEvaluation | null;
  score: DiagnosisScore | null;

  /** Wrong-answer count (§41 `failure`). */
  misdiagnoses: number;
  /** Right answer, unrepaired circuit (§41 `incomplete`). */
  incompleteRepairs: number;
  hintsUsed: number;

  /**
   * Faults the learner has already named correctly, in the order they found
   * them (plan §26: a scenario may carry more than one).
   *
   * This is *progress*, not the answer key — it only ever holds faults the
   * learner worked out themselves, so exposing it to the panel leaks nothing.
   * On a single-fault exercise it is empty until the run is won.
   */
  identifiedFaultIds: string[];

  /** Pending selection in the "what is wrong?" question (§15A). */
  selectedFaultType: DiagnosisAnswer['faultType'] | null;
  /** Pending selection in the "where is it?" question (§15B). */
  selectedLocationKey: string | null;

  /** Epoch ms when the current timing segment began. */
  startedAt: number | null;
  /** Time banked from previous segments (survives reload). */
  elapsedMs: number;
  stats: DiagnosisStatsRecord | null;
  /** Set when generation fails (plan §47). */
  error: string | null;
  /** True while a "start a new exercise?" confirmation is pending (§22). */
  confirmingNew: boolean;

  /**
   * Begin an exercise. `rageTier` is only honoured when Ohmageddon Mode is
   * enabled in Settings — see the §24 gate in the implementation.
   */
  start: (
    difficulty: ChallengeDifficulty,
    seed?: number,
    rageTier?: RageTierId,
    generatorVersion?: number,
  ) => Promise<void>;
  selectFaultType: (type: DiagnosisAnswer['faultType'] | null) => void;
  selectLocation: (key: string | null) => void;
  submit: () => DiagnosisEvaluation | null;
  revealHint: () => void;
  abandon: () => Promise<void>;
  requestNew: () => boolean;
  cancelNew: () => void;
  exit: () => void;
  resume: () => Promise<boolean>;
  refreshStats: () => Promise<void>;
  /** Total elapsed time including the running segment. */
  totalElapsedMs: () => number;
  /** True once both halves of the answer are chosen (§15). */
  canSubmit: () => boolean;
  /**
   * Remaining time on a Rage 4 countdown, or `null` when the exercise is
   * untimed. Hits zero and stays there.
   */
  remainingMs: () => number | null;
  /**
   * End an active timed exercise. Scores whatever the learner has already
   * found — a timeout is not a fabricated fail (§18 / §26).
   */
  expire: () => void;
}

function randomSeed(): number {
  // Session seed only. Generation itself stays deterministic given this value.
  return Math.floor(Math.random() * 1_000_000);
}

export const useDiagnosisStore = create<DiagnosisState>((set, get) => ({
  serverAttemptId: null,
  serverVersion: 0,
  accessBlocked: false,
  checkpoint: async () => {
    if (get().serverAttemptId && get().status === 'active' && !get().accessBlocked)
      await serverAction('checkpoint');
  },
  status: 'idle',
  scenario: null,
  evaluation: null,
  score: null,
  misdiagnoses: 0,
  incompleteRepairs: 0,
  hintsUsed: 0,
  identifiedFaultIds: [],
  selectedFaultType: null,
  selectedLocationKey: null,
  startedAt: null,
  elapsedMs: 0,
  stats: null,
  error: null,
  confirmingNew: false,

  totalElapsedMs: () => {
    const { startedAt, elapsedMs, status } = get();
    if (
      startedAt === null ||
      status === 'completed' ||
      status === 'abandoned' ||
      status === 'timed-out'
    ) {
      return elapsedMs;
    }
    return elapsedMs + Math.max(0, Date.now() - startedAt);
  },

  remainingMs: () => {
    const { scenario } = get();
    const limit = scenario?.rage?.timeLimitSeconds;
    if (limit === null || limit === undefined) return null;
    return Math.max(0, limit * 1000 - get().totalElapsedMs());
  },

  canSubmit: () => {
    const { status, selectedFaultType, selectedLocationKey } = get();
    return (
      !get().accessBlocked &&
      status === 'active' &&
      selectedFaultType !== null &&
      selectedLocationKey !== null
    );
  },

  expire: () => {
    const state = get();
    const scenario = state.scenario;
    if (!scenario || state.status !== 'active') return;
    if (state.accessBlocked) return;
    if (state.serverAttemptId) {
      void serverAction('expire');
      return;
    }
    const limit = scenario.rage?.timeLimitSeconds;
    if (limit === null || limit === undefined) return;
    if (state.totalElapsedMs() < limit * 1000) return;

    const elapsedMs = Math.min(state.totalElapsedMs(), limit * 1000);
    const identified = state.identifiedFaultIds.length;
    const score = scoreDiagnosis({
      difficulty: scenario.difficulty,
      elapsedMs,
      misdiagnoses: state.misdiagnoses,
      incompleteRepairs: state.incompleteRepairs,
      hintsUsed: state.hintsUsed,
      faultCount: scenario.faults.length,
      faultsIdentified: identified,
    });
    set({
      score,
      status: 'timed-out',
      elapsedMs,
      startedAt: null,
    });
    void recordDiagnosisAbandoned({
      difficulty: scenario.difficulty,
      faultTypes: scenario.faults.map((entry) => entry.fault.type),
      misdiagnoses: state.misdiagnoses,
      hintsUsed: state.hintsUsed,
    }).then((stats) => set({ stats }));
  },

  start: async (difficulty, seed, rageTier, generatorVersion) => {
    const previous = get();
    const previousExercise = useSimulatorAccess.getState().exercise;
    const generation = accessGeneration();
    set({ status: 'generating', error: null, confirmingNew: false });
    const chosenSeed = seed ?? randomSeed();
    /**
     * Plan §24, the safety rule: "Normal users must never accidentally enter
     * Ohmageddon Mode."
     *
     * This single line is the enforcement point. The domain has no idea the
     * settings store exists — `buildDiagnosisScenario` applies modifiers if and
     * only if it is handed a tier — so gating here means a stale UI, a resumed
     * record or a future caller cannot conjure a rage exercise while the
     * setting is off. Turning the setting off mid-session downgrades the next
     * exercise to a normal one rather than erroring.
     */
    const effectiveTier = useSettingsStore.getState().ohmageddonMode ? rageTier : undefined;
    try {
      const request = {
        seed: chosenSeed,
        difficulty,
        ...(generatorVersion !== undefined ? { generatorVersion } : {}),
        ...(effectiveTier ? { rageTier: effectiveTier } : {}),
      };
      const remote =
        difficulty === 'advanced' ||
        effectiveTier ||
        (generatorVersion === 1 &&
          scenarioRequirements(buildAccessibleDiagnosis(request)).length > 0)
          ? await apiJSON<ServerAttempt>('/diagnosis/attempts', 'POST', request)
          : null;
      const scenario = remote?.scenario ?? buildAccessibleDiagnosis(request);
      if (generation !== accessGeneration())
        throw new Error('Session changed. Start the exercise again.');
      useSimulatorAccess.setState({
        exercise: {
          circuit: scenario.faultedCircuit,
          mode: scenario.rage
            ? 'ohmageddon'
            : scenario.difficulty === 'advanced'
              ? 'advanced'
              : 'basic',
        },
      });
      await authorizeCircuit(scenario.faultedCircuit);
      set({
        serverAttemptId: remote?.id ?? null,
        serverVersion: remote?.version ?? 0,
        accessBlocked: false,
      });
      // The learner works on the *faulted* installation in the normal editor.
      useCircuitStore.getState().setCircuit(scenario.faultedCircuit);
      const startedAt = Date.now();
      set({
        status: 'active',
        scenario,
        evaluation: null,
        score: null,
        misdiagnoses: 0,
        incompleteRepairs: 0,
        hintsUsed: 0,
        identifiedFaultIds: [],
        selectedFaultType: null,
        selectedLocationKey: null,
        startedAt,
        elapsedMs: 0,
      });
      await saveActiveDiagnosis({
        seed: scenario.seed,
        generatorVersion: scenario.generatorVersion,
        difficulty: scenario.difficulty,
        mode: 'diagnosis',
        serverAttemptId: remote?.id,
        scenario,
        circuit: scenario.faultedCircuit,
        ...(effectiveTier ? { rageTier: effectiveTier } : {}),
        challengeId: scenario.challengeId,
        status: 'active',
        misdiagnoses: 0,
        incompleteRepairs: 0,
        hintsUsed: 0,
        startedAt,
        elapsedMs: 0,
      });
      const stats = await recordDiagnosisStarted({
        difficulty: scenario.difficulty,
        faultTypes: scenario.faults.map((entry) => entry.fault.type),
      });
      set({ stats });
    } catch (err) {
      // Plan §47: never leave the user on a blank screen.
      const message = err instanceof Error ? err.message : String(err);
      console.warn('[diagnosis] generation failed:', message);
      useSimulatorAccess.setState({ exercise: previousExercise });
      set({ ...previous, error: message });
      accessMessage(message);
    }
  },

  selectFaultType: (type) => {
    if (get().status !== 'active') return;
    set({ selectedFaultType: type });
  },

  selectLocation: (key) => {
    if (get().status !== 'active') return;
    set({ selectedLocationKey: key });
  },

  submit: () => {
    const state = get();
    const scenario = state.scenario;
    if (!scenario || state.status !== 'active' || state.accessBlocked) return null;
    if (state.serverAttemptId) {
      void serverAction('submit');
      return null;
    }
    if (scenarioRequirements(scenario).length) {
      accessMessage('Resume this saved exercise online before submitting.');
      return null;
    }
    if (state.selectedFaultType === null || state.selectedLocationKey === null) return null;

    const { components, wires, globalVoltage, supply, faults } = useCircuitStore.getState();
    const evaluation = evaluateDiagnosis(
      scenario,
      { components, wires, globalVoltage, supply, faults },
      { faultType: state.selectedFaultType, locationKey: state.selectedLocationKey },
      // Carrying prior correct answers forward is what makes a multi-fault run
      // solvable: without it the learner would have to name both faults in a
      // single submission, which the one-type/one-location form cannot express.
      { identifiedFaultIds: state.identifiedFaultIds },
    );

    // The evaluator has already filtered stale ids against this scenario.
    const identifiedFaultIds = evaluation.identifiedFaultIds.slice();

    if (evaluation.verdict === 'failure') {
      // Plan §18: a wrong diagnosis never ends the exercise.
      const misdiagnoses = state.misdiagnoses + 1;
      set({ evaluation, misdiagnoses, identifiedFaultIds, status: 'active' });
      void persistProgress(scenario, {
        misdiagnoses,
        incompleteRepairs: state.incompleteRepairs,
        hintsUsed: state.hintsUsed,
        identifiedFaultIds,
        startedAt: state.startedAt,
        elapsedMs: state.elapsedMs,
      });
      return evaluation;
    }

    if (evaluation.verdict === 'incomplete') {
      // §16: correct answer, circuit still broken — stay on this scenario.
      //
      // Two different situations land here, and they are counted differently
      // on purpose. Naming a *new* fault while others are still hidden is
      // forward progress in the hunt, not a failed repair, so the §41
      // `incompleteRepairs` penalty is withheld — otherwise a two-fault
      // scenario would dock the learner for the very submission that solved
      // half of it. Once every fault has been named, though, an unrepaired
      // circuit is the ordinary §41 case and counts, exactly as it always did
      // for a single-fault exercise: there is nothing left to discover, only
      // work left to do.
      const huntAdvanced = evaluation.progressed && evaluation.outstandingCount > 0;
      const incompleteRepairs = huntAdvanced
        ? state.incompleteRepairs
        : state.incompleteRepairs + 1;
      // Finding one of several faults clears the form so the next one can be
      // entered; with nothing left to name the selection stays, since the
      // diagnosis was right and the learner is being asked to finish the
      // repair rather than answer again.
      const selection = huntAdvanced ? { selectedFaultType: null, selectedLocationKey: null } : {};
      set({ evaluation, incompleteRepairs, identifiedFaultIds, status: 'active', ...selection });
      void persistProgress(scenario, {
        misdiagnoses: state.misdiagnoses,
        incompleteRepairs,
        hintsUsed: state.hintsUsed,
        identifiedFaultIds,
        startedAt: state.startedAt,
        elapsedMs: state.elapsedMs,
      });
      return evaluation;
    }

    const elapsedMs = state.totalElapsedMs();
    const score = scoreDiagnosis({
      difficulty: scenario.difficulty,
      elapsedMs,
      misdiagnoses: state.misdiagnoses,
      incompleteRepairs: state.incompleteRepairs,
      hintsUsed: state.hintsUsed,
      faultCount: evaluation.faultCount,
      faultsIdentified: evaluation.faultCount,
    });
    set({
      evaluation,
      score,
      identifiedFaultIds,
      status: 'completed',
      elapsedMs,
      startedAt: null,
    });
    void recordDiagnosisCompleted({
      difficulty: scenario.difficulty,
      faultTypes: scenario.faults.map((entry) => entry.fault.type),
      elapsedMs,
      misdiagnoses: state.misdiagnoses,
      incompleteRepairs: state.incompleteRepairs,
      hintsUsed: state.hintsUsed,
      points: score.points,
    }).then((stats) => set({ stats }));
    return evaluation;
  },

  revealHint: () => {
    if (get().accessBlocked) return;
    if (get().serverAttemptId) {
      void serverAction('hint');
      return;
    }
    const { scenario, hintsUsed, status } = get();
    if (!scenario || status !== 'active') return;
    if (hintsUsed >= scenario.hints.length) return;
    // §17: hints are always available. The budget only affects the score.
    set({ hintsUsed: hintsUsed + 1 });
  },

  abandon: async () => {
    if (get().accessBlocked) return;
    const serverAttempt = !!get().serverAttemptId;
    if (serverAttempt && !(await serverAction('abandon'))) return;
    const { scenario, misdiagnoses, hintsUsed } = get();
    if (scenario && !serverAttempt) {
      const stats = await recordDiagnosisAbandoned({
        difficulty: scenario.difficulty,
        faultTypes: scenario.faults.map((entry) => entry.fault.type),
        misdiagnoses,
        hintsUsed,
      });
      set({ stats });
    }
    set({
      status: 'abandoned',
      scenario: null,
      evaluation: null,
      score: null,
      misdiagnoses: 0,
      incompleteRepairs: 0,
      hintsUsed: 0,
      identifiedFaultIds: [],
      selectedFaultType: null,
      selectedLocationKey: null,
      startedAt: null,
      elapsedMs: 0,
      confirmingNew: false,
    });
  },

  /**
   * Plan §22: never silently discard an exercise in progress. Returns true
   * when a confirmation is required.
   */
  requestNew: () => {
    const { status, misdiagnoses, incompleteRepairs, hintsUsed, identifiedFaultIds, scenario } =
      get();
    if (status !== 'active' || !scenario) return false;
    // Any edit to the faulted circuit counts as work in progress — the learner
    // may have already lifted a conductor while testing.
    const edited =
      useCircuitStore.getState().wires.length !== scenario.faultedCircuit.wires.length ||
      useCircuitStore.getState().components.length !== scenario.faultedCircuit.components.length;
    const meaningful =
      misdiagnoses > 0 ||
      incompleteRepairs > 0 ||
      hintsUsed > 0 ||
      identifiedFaultIds.length > 0 ||
      edited;
    if (meaningful) {
      set({ confirmingNew: true });
      return true;
    }
    return false;
  },

  cancelNew: () => set({ confirmingNew: false }),

  exit: () => {
    // Keep interrupted work resumable; explicit abandonment clears it.
    const state = get();
    if (state.scenario && state.status === 'active') void persistProgress(state.scenario, state);
    useSimulatorAccess.setState({ exercise: null });
    set({
      status: 'idle',
      serverAttemptId: null,
      serverVersion: 0,
      accessBlocked: false,
      scenario: null,
      evaluation: null,
      score: null,
      misdiagnoses: 0,
      incompleteRepairs: 0,
      hintsUsed: 0,
      identifiedFaultIds: [],
      selectedFaultType: null,
      selectedLocationKey: null,
      startedAt: null,
      elapsedMs: 0,
      confirmingNew: false,
      error: null,
    });
  },

  /**
   * Restore repairs after a reload, retaining the seed/version identity check.
   * Legacy records without a circuit reopen the generated faulted installation.
   */
  resume: async () => {
    const record = await loadActiveDiagnosis();
    if (!record) return false;
    try {
      const scenario = buildAccessibleDiagnosis({
        seed: record.seed,
        difficulty: record.difficulty,
        generatorVersion: record.generatorVersion,
        ...(record.rageTier ? { rageTier: record.rageTier } : {}),
      });
      if (scenario.challengeId !== record.challengeId)
        throw new Error(
          'Saved generator identity does not match. The original record is preserved.',
        );
      const circuit = record.circuit
        ? importJSON(exportJSON(record.circuit))
        : scenario.faultedCircuit;
      useSimulatorAccess.setState({
        exercise: {
          circuit: scenario.faultedCircuit,
          mode: scenario.rage
            ? 'ohmageddon'
            : scenario.difficulty === 'advanced'
              ? 'advanced'
              : 'basic',
        },
      });
      useCircuitStore.getState().setCircuit(circuit);
      set({
        scenario,
        status: 'active',
        serverAttemptId: record.serverAttemptId ?? null,
        accessBlocked: false,
        misdiagnoses: record.misdiagnoses,
        incompleteRepairs: record.incompleteRepairs,
        hintsUsed: record.hintsUsed,
        identifiedFaultIds: record.identifiedFaultIds ?? [],
        elapsedMs: record.elapsedMs,
        startedAt: null,
      });
      if (scenarioRequirements(scenario).length) {
        try {
          if (record.rageTier && !useSettingsStore.getState().ohmageddonMode)
            throw new Error('Enable Ohmageddon Mode to resume this exercise.');
          await authorizeCircuit(circuit);
          let remote: ServerAttempt;
          if (record.serverAttemptId)
            remote = await apiJSON<ServerAttempt>(`/diagnosis/attempts/${record.serverAttemptId}`);
          else
            remote = await apiJSON<ServerAttempt>('/diagnosis/attempts', 'POST', {
              seed: record.seed,
              difficulty: record.difficulty,
              generatorVersion: record.generatorVersion,
              ...(record.rageTier ? { rageTier: record.rageTier } : {}),
            });
          if (remote.scenario.challengeId !== record.challengeId || remote.readOnly)
            throw new Error('Exercise is read-only. Membership is required to continue.');
          // Local repair backup is preserved; server owns accepted answers/counters.
          set({
            ...remote.progress,
            score: remote.score ?? null,
            accessBlocked: false,
            serverAttemptId: remote.id,
            serverVersion: remote.version,
            startedAt: remote.progress.status === 'active' ? Date.now() : null,
            error: null,
          });
          await persistServerProgress(scenario, remote);
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Exercise could not be resumed.';
          set({ accessBlocked: true, startedAt: null, error: message });
          accessMessage(message);
          return true;
        }
      }
      const limitMs =
        scenario.rage?.timeLimitSeconds === null || scenario.rage?.timeLimitSeconds === undefined
          ? null
          : scenario.rage.timeLimitSeconds * 1000;
      if (limitMs !== null && record.elapsedMs >= limitMs) {
        // The clock already ran out before the reload. Settle as a timeout
        // rather than handing back an untimed-looking active session.
        const score = scoreDiagnosis({
          difficulty: scenario.difficulty,
          elapsedMs: Math.min(record.elapsedMs, limitMs),
          misdiagnoses: record.misdiagnoses,
          incompleteRepairs: record.incompleteRepairs,
          hintsUsed: record.hintsUsed,
          faultCount: scenario.faults.length,
          faultsIdentified: (record.identifiedFaultIds ?? []).filter((id) =>
            scenario.faults.some((entry) => entry.fault.id === id),
          ).length,
        });
        set({
          status: 'timed-out',
          scenario,
          evaluation: null,
          score,
          misdiagnoses: record.misdiagnoses,
          incompleteRepairs: record.incompleteRepairs,
          hintsUsed: record.hintsUsed,
          identifiedFaultIds: (record.identifiedFaultIds ?? []).filter((id) =>
            scenario.faults.some((entry) => entry.fault.id === id),
          ),
          selectedFaultType: null,
          selectedLocationKey: null,
          startedAt: null,
          elapsedMs: Math.min(record.elapsedMs, limitMs),
          error: null,
        });
        void clearActiveDiagnosis();
        return true;
      }
      set({
        status: 'active',
        scenario,
        evaluation: null,
        score: null,
        misdiagnoses: record.misdiagnoses,
        incompleteRepairs: record.incompleteRepairs,
        hintsUsed: record.hintsUsed,
        // Filtered against the regenerated scenario: `challengeId` already
        // matched, so these ids belong to it, but a defensive filter keeps a
        // hand-edited record from parking a phantom id in the progress list.
        identifiedFaultIds: record.identifiedFaultIds
          ? record.identifiedFaultIds.filter((id) =>
              scenario.faults.some((entry) => entry.fault.id === id),
            )
          : [],
        selectedFaultType: null,
        selectedLocationKey: null,
        startedAt: Date.now(),
        elapsedMs: record.elapsedMs,
        error: null,
      });
      return true;
    } catch (err) {
      console.warn('[diagnosis] resume failed:', err);
      set({ error: 'Saved exercise could not be restored. Its backup has been preserved.' });
      return false;
    }
  },

  refreshStats: async () => {
    const stats = await loadDiagnosisStats();
    set({ stats });
  },
}));

/** Shared write-back for the two non-terminal verdicts. */
function persistProgress(
  scenario: DiagnosisScenario,
  progress: {
    misdiagnoses: number;
    incompleteRepairs: number;
    hintsUsed: number;
    identifiedFaultIds: readonly string[];
    startedAt: number | null;
    elapsedMs: number;
  },
): Promise<boolean> {
  return saveActiveDiagnosis({
    seed: scenario.seed,
    generatorVersion: scenario.generatorVersion,
    difficulty: scenario.difficulty,
    mode: 'diagnosis',
    serverAttemptId: useDiagnosisStore.getState().serverAttemptId ?? undefined,
    scenario,
    circuit: snapshotCircuit(),
    // Derived from the scenario itself, so progress writes can never disagree
    // with what was actually generated.
    ...(scenario.rage ? { rageTier: scenario.rage.tier } : {}),
    challengeId: scenario.challengeId,
    status: 'active',
    misdiagnoses: progress.misdiagnoses,
    incompleteRepairs: progress.incompleteRepairs,
    hintsUsed: progress.hintsUsed,
    // Omitted when empty so a single-fault record stays byte-identical to the
    // pre-multi-fault shape.
    ...(progress.identifiedFaultIds.length > 0
      ? { identifiedFaultIds: [...progress.identifiedFaultIds] }
      : {}),
    startedAt: progress.startedAt ?? Date.now(),
    // Bank the running segment so a Rage 4 reload cannot reset the clock.
    elapsedMs: useDiagnosisStore.getState().totalElapsedMs(),
  });
}

/**
 * Mirror `status === 'active'` onto the UI store (plan §14).
 *
 * `useSimulation` must know whether an exercise is in progress so it can
 * withhold the fault reason from trip alerts and narration. It used to read
 * this store directly, but `useSimulation` is eagerly loaded, so that import
 * pulled the whole challenge generator into the first-paint bundle. A one-way
 * subscription keeps the behaviour identical while letting the learning modes
 * stay in their own lazy chunk.
 *
 * Declared as a subscription rather than folded into each `set` call so no
 * future status transition can forget to update it.
 */
useDiagnosisStore.subscribe((state, previous) => {
  const active = state.status === 'active';
  if (active !== (previous.status === 'active')) {
    useUiStore.getState().setDiagnosisActive(active);
  }
});

/** Non-hook accessor mirroring the other stores' convention. */
let serverBusy = false;
function snapshotCircuit(): Circuit {
  const { components, wires, faults, globalVoltage, supply } = useCircuitStore.getState();
  return { components, wires, faults, globalVoltage, supply };
}
async function serverAction(
  action: 'submit' | 'hint' | 'checkpoint' | 'abandon' | 'expire',
): Promise<boolean> {
  const state = useDiagnosisStore.getState();
  if (
    serverBusy ||
    !state.serverAttemptId ||
    !state.scenario ||
    state.status !== 'active' ||
    state.accessBlocked
  )
    return false;
  if (action === 'submit' && !state.canSubmit()) return false;
  serverBusy = true;
  const generation = accessGeneration();
  try {
    await authorizeCircuit(snapshotCircuit());
    const result = await apiJSON<ServerAttempt>(
      `/diagnosis/attempts/${state.serverAttemptId}`,
      'POST',
      {
        action,
        version: state.serverVersion,
        circuit: snapshotCircuit(),
        ...(action === 'submit'
          ? {
              answer: {
                faultType: state.selectedFaultType,
                locationKey: state.selectedLocationKey,
              },
            }
          : {}),
      },
    );
    if (
      generation !== accessGeneration() ||
      useDiagnosisStore.getState().scenario !== state.scenario
    )
      return false;
    useDiagnosisStore.setState({
      ...result.progress,
      serverVersion: result.version,
      ...(result.evaluation ? { evaluation: result.evaluation } : {}),
      ...(result.score ? { score: result.score } : {}),
      startedAt: result.progress.status === 'active' ? Date.now() : null,
      ...(result.evaluation?.progressed && result.evaluation.outstandingCount > 0
        ? { selectedFaultType: null, selectedLocationKey: null }
        : {}),
    });
    await persistServerProgress(state.scenario, result);
    return true;
  } catch (error) {
    if (useDiagnosisStore.getState().scenario !== state.scenario) return false;
    const message = error instanceof Error ? error.message : 'Exercise could not be verified.';
    useDiagnosisStore.setState({
      accessBlocked: true,
      elapsedMs: state.totalElapsedMs(),
      startedAt: null,
      error: message,
    });
    accessMessage(message);
    await persistProgress(state.scenario, useDiagnosisStore.getState());
    return false;
  } finally {
    serverBusy = false;
  }
}
/** A server-confirmed finish must never be written back as an active exercise. */
async function persistServerProgress(scenario: DiagnosisScenario, result: ServerAttempt) {
  if (result.progress.status === 'active') {
    await persistProgress(scenario, useDiagnosisStore.getState());
    return;
  }
  const common = {
    difficulty: scenario.difficulty,
    faultTypes: scenario.faults.map((entry) => entry.fault.type),
    misdiagnoses: result.progress.misdiagnoses,
    hintsUsed: result.progress.hintsUsed,
  };
  const stats =
    result.progress.status === 'completed'
      ? await recordDiagnosisCompleted({
          ...common,
          elapsedMs: result.progress.elapsedMs,
          incompleteRepairs: result.progress.incompleteRepairs,
          points: result.score?.points ?? 0,
        })
      : await recordDiagnosisAbandoned(common);
  if (useDiagnosisStore.getState().scenario === scenario) useDiagnosisStore.setState({ stats });
}
useSimulatorAccess.subscribe(() => {
  const state = useDiagnosisStore.getState();
  if (
    state.scenario &&
    state.status === 'active' &&
    !state.accessBlocked &&
    !canUseRequirements(scenarioRequirements(state.scenario))
  ) {
    useDiagnosisStore.setState({
      accessBlocked: true,
      elapsedMs: state.totalElapsedMs(),
      startedAt: null,
      error: 'Membership must be verified to continue. Your exercise and repairs are preserved.',
    });
    void persistProgress(state.scenario, useDiagnosisStore.getState());
  }
});
// Bank repair work as well as counters; selection changes do not write to IDB.
useCircuitStore.subscribe((state, previous) => {
  const diagnosis = useDiagnosisStore.getState();
  if (
    diagnosis.status === 'active' &&
    diagnosis.scenario &&
    (state.components !== previous.components ||
      state.wires !== previous.wires ||
      state.faults !== previous.faults ||
      state.globalVoltage !== previous.globalVoltage ||
      state.supply !== previous.supply)
  )
    void persistProgress(diagnosis.scenario, diagnosis);
});
export const diagnosisState = () => useDiagnosisStore.getState();

export { GENERATOR_VERSION };
