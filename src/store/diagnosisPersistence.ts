/**
 * Diagnosis persistence — active exercise + aggregate stats (plan §20, §21).
 *
 * Same discipline as `challengePersistence.ts`: the existing `idb-keyval`
 * store, its own keys, its own schema version. "Use the existing IndexedDB
 * infrastructure. Do not create another persistence mechanism."
 *
 * Two records:
 *   - `activeDiagnosis` (§21) — the resumable slice. Only seed / version /
 *     difficulty describe the *scenario*, because generation is deterministic:
 *     the faulted circuit is regenerated on resume, never stored. That also
 *     means a saved exercise can never disagree with the generator.
 *   - `diagnosisStats` (§20) — small aggregate counters, not an event log.
 *
 * Diagnosis keeps its own counters rather than sharing Challenge Mode's,
 * because the two measure different skills: `attempts` in Challenge Mode means
 * "times the circuit was submitted", whereas here a submission splits into a
 * misdiagnosis (wrong answer) and an incomplete repair (right answer, unfixed
 * circuit) — §41's third state. Folding them into one counter would make both
 * statistics meaningless.
 *
 * Every function is non-throwing: storage failure must never break the editor.
 */

import type { ChallengeDifficulty, RageTierId } from '@electrasim/domain/challenges';
import { isRageTierId } from '@electrasim/domain/challenges';
import type { FaultType } from '@electrasim/domain/types';
import { get, set } from 'idb-keyval';

const SCHEMA_VERSION = 1 as const;
const ACTIVE_KEY = `electrasim:diagnosis:active:v${SCHEMA_VERSION}`;
const STATS_KEY = `electrasim:diagnosis:stats:v${SCHEMA_VERSION}`;

/** Lifecycle of a diagnosis run (plan §34). */
export type DiagnosisStatus =
  | 'idle'
  | 'generating'
  | 'active'
  | 'evaluating'
  | 'completed'
  | 'timed-out'
  | 'abandoned';

/** The resumable slice of a diagnosis run (plan §21). */
export interface ActiveDiagnosisRecord {
  version: typeof SCHEMA_VERSION;
  seed: number;
  generatorVersion: number;
  difficulty: ChallengeDifficulty;
  mode: 'diagnosis';
  /**
   * Ohmageddon tier, when the run is a rage exercise (plan §23).
   *
   * Stored alongside the seed because it is a *generation input*: the same
   * seed with a different tier is a different scenario, so resuming without it
   * would silently hand the learner a different puzzle.
   */
  rageTier?: RageTierId;
  challengeId: string;
  status: Extract<DiagnosisStatus, 'active' | 'evaluating'>;
  /**
   * Faults already named correctly, by fault id (plan §26 multi-fault runs).
   *
   * Safe to persist and safe to regenerate against: scenario fault ids are
   * derived from `challengeId | candidateKey`, so the same seed always mints
   * the same ids. It is also *not* a leak — it records what the learner has
   * already worked out, never what they have not. Absent on records written
   * before multi-fault scenarios existed, and on every single-fault run that
   * has made no progress.
   */
  identifiedFaultIds?: string[];
  misdiagnoses: number;
  incompleteRepairs: number;
  hintsUsed: number;
  startedAt: number;
  /** Accumulated time, excluding the currently running segment. */
  elapsedMs: number;
  savedAt: number;
}

/** Aggregate performance counters (plan §20). */
export interface DiagnosisStatsRecord {
  version: typeof SCHEMA_VERSION;
  totalStarted: number;
  completed: number;
  abandoned: number;
  totalMisdiagnoses: number;
  totalIncompleteRepairs: number;
  totalHints: number;
  totalTimeMs: number;
  bestTimeMs: number | null;
  totalPoints: number;
  /** Exercises finished with a correct first answer — the headline skill number. */
  firstTimeRight: number;
  byDifficulty: Record<
    ChallengeDifficulty,
    { started: number; completed: number; bestTimeMs: number | null }
  >;
  /**
   * Per-fault-type record. This is the pedagogically useful one: it shows
   * which kinds of fault the learner reliably spots and which they miss.
   */
  byFaultType: Record<string, { seen: number; solved: number; misdiagnoses: number }>;
  updatedAt: number;
}

export const EMPTY_DIAGNOSIS_STATS: DiagnosisStatsRecord = {
  version: SCHEMA_VERSION,
  totalStarted: 0,
  completed: 0,
  abandoned: 0,
  totalMisdiagnoses: 0,
  totalIncompleteRepairs: 0,
  totalHints: 0,
  totalTimeMs: 0,
  bestTimeMs: null,
  totalPoints: 0,
  firstTimeRight: 0,
  byDifficulty: {
    beginner: { started: 0, completed: 0, bestTimeMs: null },
    intermediate: { started: 0, completed: 0, bestTimeMs: null },
    advanced: { started: 0, completed: 0, bestTimeMs: null },
  },
  byFaultType: {},
  updatedAt: 0,
};

/** Derived view used by the stats panel. */
export interface DiagnosisStatsSummary {
  totalStarted: number;
  completed: number;
  abandoned: number;
  completionRate: number;
  firstTimeRightRate: number;
  averageMisdiagnoses: number;
  averageHints: number;
  averageTimeMs: number;
  bestTimeMs: number | null;
  totalPoints: number;
  /** Fault types ranked by how often they were misdiagnosed — the weak spots. */
  weakestFaultTypes: { type: string; seen: number; solved: number; misdiagnoses: number }[];
}

// ── Guards ─────────────────────────────────────────────────────────────────

const DIFFICULTIES: ChallengeDifficulty[] = ['beginner', 'intermediate', 'advanced'];

function isActiveRecord(value: unknown): value is ActiveDiagnosisRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<ActiveDiagnosisRecord>;
  return (
    record.version === SCHEMA_VERSION &&
    record.mode === 'diagnosis' &&
    typeof record.seed === 'number' &&
    Number.isFinite(record.seed) &&
    typeof record.generatorVersion === 'number' &&
    typeof record.challengeId === 'string' &&
    typeof record.misdiagnoses === 'number' &&
    typeof record.incompleteRepairs === 'number' &&
    typeof record.hintsUsed === 'number' &&
    typeof record.startedAt === 'number' &&
    typeof record.elapsedMs === 'number' &&
    typeof record.difficulty === 'string' &&
    DIFFICULTIES.includes(record.difficulty as ChallengeDifficulty) &&
    // Absent is valid (a normal exercise); present-but-unrecognised is not.
    (record.rageTier === undefined || isRageTierId(record.rageTier)) &&
    // Absent is valid (pre-multi-fault record, or no progress yet).
    (record.identifiedFaultIds === undefined ||
      (Array.isArray(record.identifiedFaultIds) &&
        record.identifiedFaultIds.every((id) => typeof id === 'string')))
  );
}

function isStatsRecord(value: unknown): value is DiagnosisStatsRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<DiagnosisStatsRecord>;
  return (
    record.version === SCHEMA_VERSION &&
    typeof record.totalStarted === 'number' &&
    typeof record.completed === 'number' &&
    typeof record.byDifficulty === 'object' &&
    record.byDifficulty !== null
  );
}

// ── Active exercise (§21) ──────────────────────────────────────────────────

export async function loadActiveDiagnosis(): Promise<ActiveDiagnosisRecord | null> {
  try {
    const raw = await get(ACTIVE_KEY);
    return isActiveRecord(raw) ? raw : null;
  } catch (err) {
    console.warn('[diagnosis] load active failed:', err);
    return null;
  }
}

export async function saveActiveDiagnosis(
  record: Omit<ActiveDiagnosisRecord, 'version' | 'savedAt'>,
): Promise<boolean> {
  try {
    await set(ACTIVE_KEY, { ...record, version: SCHEMA_VERSION, savedAt: Date.now() });
    return true;
  } catch (err) {
    console.warn('[diagnosis] save active failed:', err);
    return false;
  }
}

/** Clear the active exercise — on completion or abandonment (plan §21). */
export async function clearActiveDiagnosis(): Promise<void> {
  try {
    await set(ACTIVE_KEY, undefined);
  } catch (err) {
    console.warn('[diagnosis] clear active failed:', err);
  }
}

// ── Aggregate stats (§20) ──────────────────────────────────────────────────

export async function loadDiagnosisStats(): Promise<DiagnosisStatsRecord> {
  try {
    const raw = await get(STATS_KEY);
    if (!isStatsRecord(raw)) return { ...EMPTY_DIAGNOSIS_STATS };
    return {
      ...EMPTY_DIAGNOSIS_STATS,
      ...raw,
      byDifficulty: { ...EMPTY_DIAGNOSIS_STATS.byDifficulty, ...raw.byDifficulty },
      byFaultType: { ...raw.byFaultType },
    };
  } catch (err) {
    console.warn('[diagnosis] load stats failed:', err);
    return { ...EMPTY_DIAGNOSIS_STATS };
  }
}

async function writeStats(stats: DiagnosisStatsRecord): Promise<boolean> {
  try {
    await set(STATS_KEY, { ...stats, version: SCHEMA_VERSION, updatedAt: Date.now() });
    return true;
  } catch (err) {
    console.warn('[diagnosis] save stats failed:', err);
    return false;
  }
}

function bumpDifficulty(
  stats: DiagnosisStatsRecord,
  difficulty: ChallengeDifficulty,
  patch: Partial<{ started: number; completed: number; bestTimeMs: number | null }>,
): DiagnosisStatsRecord['byDifficulty'] {
  const current = stats.byDifficulty[difficulty] ?? { started: 0, completed: 0, bestTimeMs: null };
  return {
    ...stats.byDifficulty,
    [difficulty]: {
      started: current.started + (patch.started ?? 0),
      completed: current.completed + (patch.completed ?? 0),
      bestTimeMs:
        patch.bestTimeMs === undefined || patch.bestTimeMs === null
          ? current.bestTimeMs
          : current.bestTimeMs === null
            ? patch.bestTimeMs
            : Math.min(current.bestTimeMs, patch.bestTimeMs),
    },
  };
}

function bumpFaultType(
  stats: DiagnosisStatsRecord,
  faultType: string,
  patch: { seen?: number; solved?: number; misdiagnoses?: number },
): DiagnosisStatsRecord['byFaultType'] {
  const current = stats.byFaultType[faultType] ?? { seen: 0, solved: 0, misdiagnoses: 0 };
  return {
    ...stats.byFaultType,
    [faultType]: {
      seen: current.seen + (patch.seen ?? 0),
      solved: current.solved + (patch.solved ?? 0),
      misdiagnoses: current.misdiagnoses + (patch.misdiagnoses ?? 0),
    },
  };
}

/**
 * Apply one patch to every distinct fault type in a scenario.
 *
 * De-duplicated: a scenario carrying two open circuits met one *kind* of
 * fault, and counting it twice would quietly overstate the learner's exposure.
 */
function bumpFaultTypes(
  stats: DiagnosisStatsRecord,
  faultTypes: readonly FaultType[],
  patch: { seen?: number; solved?: number; misdiagnoses?: number },
): DiagnosisStatsRecord['byFaultType'] {
  let byFaultType = stats.byFaultType;
  for (const type of new Set(faultTypes)) {
    byFaultType = bumpFaultType({ ...stats, byFaultType }, type, patch);
  }
  return byFaultType;
}

/**
 * Record that a diagnosis exercise was started.
 *
 * `faultTypes` is a list because a scenario may carry more than one fault
 * (plan §26). Every distinct type is credited a `seen`, so the per-type record
 * still answers "how often has this learner met an earth fault?" correctly
 * when the earth fault arrived alongside something else. A repeated type
 * counts once — the learner met the *kind* once.
 */
export async function recordDiagnosisStarted(input: {
  difficulty: ChallengeDifficulty;
  faultTypes: readonly FaultType[];
}): Promise<DiagnosisStatsRecord> {
  const stats = await loadDiagnosisStats();
  const next: DiagnosisStatsRecord = {
    ...stats,
    totalStarted: stats.totalStarted + 1,
    byDifficulty: bumpDifficulty(stats, input.difficulty, { started: 1 }),
    byFaultType: bumpFaultTypes(stats, input.faultTypes, { seen: 1 }),
    updatedAt: Date.now(),
  };
  await writeStats(next);
  return next;
}

/**
 * Record a successful diagnosis + repair (plan §20/§21).
 *
 * The misdiagnosis count is attributed to every fault type in the scenario:
 * with several faults in play there is no honest way to say which one a wrong
 * answer was aimed at, and silently blaming the first would corrupt exactly
 * the statistic the panel uses to pick out a learner's weak spots.
 */
export async function recordDiagnosisCompleted(input: {
  difficulty: ChallengeDifficulty;
  faultTypes: readonly FaultType[];
  elapsedMs: number;
  misdiagnoses: number;
  incompleteRepairs: number;
  hintsUsed: number;
  points: number;
}): Promise<DiagnosisStatsRecord> {
  const stats = await loadDiagnosisStats();
  const misdiagnoses = Math.max(0, input.misdiagnoses);
  const next: DiagnosisStatsRecord = {
    ...stats,
    completed: stats.completed + 1,
    totalMisdiagnoses: stats.totalMisdiagnoses + misdiagnoses,
    totalIncompleteRepairs: stats.totalIncompleteRepairs + Math.max(0, input.incompleteRepairs),
    totalHints: stats.totalHints + Math.max(0, input.hintsUsed),
    totalTimeMs: stats.totalTimeMs + Math.max(0, input.elapsedMs),
    totalPoints: stats.totalPoints + Math.max(0, input.points),
    firstTimeRight: stats.firstTimeRight + (misdiagnoses === 0 ? 1 : 0),
    bestTimeMs:
      stats.bestTimeMs === null ? input.elapsedMs : Math.min(stats.bestTimeMs, input.elapsedMs),
    byDifficulty: bumpDifficulty(stats, input.difficulty, {
      completed: 1,
      bestTimeMs: input.elapsedMs,
    }),
    byFaultType: bumpFaultTypes(stats, input.faultTypes, { solved: 1, misdiagnoses }),
    updatedAt: Date.now(),
  };
  await writeStats(next);
  await clearActiveDiagnosis();
  return next;
}

/** Record an abandoned exercise (plan §22). */
export async function recordDiagnosisAbandoned(input: {
  difficulty: ChallengeDifficulty;
  faultTypes: readonly FaultType[];
  misdiagnoses: number;
  hintsUsed: number;
}): Promise<DiagnosisStatsRecord> {
  const stats = await loadDiagnosisStats();
  const misdiagnoses = Math.max(0, input.misdiagnoses);
  const next: DiagnosisStatsRecord = {
    ...stats,
    abandoned: stats.abandoned + 1,
    totalMisdiagnoses: stats.totalMisdiagnoses + misdiagnoses,
    totalHints: stats.totalHints + Math.max(0, input.hintsUsed),
    byFaultType: bumpFaultTypes(stats, input.faultTypes, { misdiagnoses }),
    updatedAt: Date.now(),
  };
  await writeStats(next);
  await clearActiveDiagnosis();
  return next;
}

/** Derived averages for the stats panel. */
export function summariseDiagnosisStats(stats: DiagnosisStatsRecord): DiagnosisStatsSummary {
  const completed = stats.completed;
  const weakestFaultTypes = Object.entries(stats.byFaultType)
    .map(([type, entry]) => ({ type, ...entry }))
    .filter((entry) => entry.misdiagnoses > 0)
    .sort((a, b) => b.misdiagnoses - a.misdiagnoses || a.type.localeCompare(b.type))
    .slice(0, 5);

  return {
    totalStarted: stats.totalStarted,
    completed,
    abandoned: stats.abandoned,
    completionRate: stats.totalStarted === 0 ? 0 : completed / stats.totalStarted,
    firstTimeRightRate: completed === 0 ? 0 : stats.firstTimeRight / completed,
    averageMisdiagnoses: completed === 0 ? 0 : stats.totalMisdiagnoses / completed,
    averageHints: completed === 0 ? 0 : stats.totalHints / completed,
    averageTimeMs: completed === 0 ? 0 : stats.totalTimeMs / completed,
    bestTimeMs: stats.bestTimeMs,
    totalPoints: stats.totalPoints,
    weakestFaultTypes,
  };
}

/** Test-only handles on the IDB keys in use. */
export const __DIAGNOSIS_ACTIVE_KEY = ACTIVE_KEY;
export const __DIAGNOSIS_STATS_KEY = STATS_KEY;
