/**
 * Challenge practice-workspace persistence (plan §11, §14, §33).
 *
 * The normal workspace (autosaved circuit) and the challenge workspace are
 * STRICTLY separated (plan §11 "This is non-negotiable"):
 *
 *   - `returnWorkspace` — the learner's normal circuit, snapshotted the moment
 *     a challenge starts. Restored exactly on exit. Never overwritten by
 *     challenge edits.
 *   - `activeChallenge` — the resumable slice of an in-flight challenge:
 *     challenge id, attempt id, hints used, elapsed time. The starter circuit
 *     itself is NOT persisted — it is rebuilt from the declarative definition,
 *     so a resumed challenge can never drift.
 *   - `progress` — completed challenges (plan §33), never stored inside
 *     circuit JSON (plan §34: Circuit JSON ≠ Challenge Progress).
 *
 * Every function is non-throwing: a storage failure must never break the
 * editor, exactly like the existing circuit autosave.
 */

import type { Circuit } from '@electrasim/domain';
import type { ChallengeId } from '@electrasim/domain/challenges/declarative';
import { get, set } from 'idb-keyval';

const SCHEMA_VERSION = 1 as const;
const ACTIVE_KEY = `electrasim:challenge2:active:v${SCHEMA_VERSION}`;
const RETURN_KEY = `electrasim:challenge2:return:v${SCHEMA_VERSION}`;
const PROGRESS_KEY = `electrasim:challenge2:progress:v${SCHEMA_VERSION}`;

/** Lifecycle of a challenge session (plan §6 overall state). */
export type DeclarativeChallengeStatus = 'idle' | 'active' | 'completed' | 'abandoned' | 'exited';

/** The resumable slice of an active challenge (plan §14, §33). */
export interface ActiveDeclarativeChallengeRecord {
  version: typeof SCHEMA_VERSION;
  challengeId: ChallengeId;
  /** Unique attempt id — new on every start (plan §12). */
  attemptId: string;
  startedAt: number;
  /** Time banked from previous segments (survives reload). */
  elapsedMs: number;
  hintsUsed: number;
  attempts: number;
  /** Whether the learner intentionally paused the session. Optional for v1 records. */
  paused?: boolean;
  savedAt: number;
}

/** Progress for one completed challenge (plan §33). */
export interface ChallengeProgressRecord {
  challengeId: ChallengeId;
  completed: boolean;
  completionDate: number;
  attempts: number;
  bestCompletionTimeMs: number | null;
  hintsUsed: number;
}

export type ChallengeProgressMap = Partial<Record<ChallengeId, ChallengeProgressRecord>>;

/** The snapshotted normal workspace, restored on exit (plan §11). */
export interface ReturnWorkspaceRecord {
  version: typeof SCHEMA_VERSION;
  savedAt: number;
  circuit: Circuit;
}

// ── Guards ─────────────────────────────────────────────────────────────────

const CHALLENGE_IDS: readonly ChallengeId[] = [
  'first-lamp-tutorial',
  'protected-lamp',
  'push-button-doorbell',
  'rcbo-socket',
  'two-way-staircase',
  'open-neutral-repair',
  'reverse-polarity',
  'missing-earth',
  'distribution-board',
  'smart-lighting-relay',
  'rcbo-pump-feeder',
];

function isChallengeId(value: unknown): value is ChallengeId {
  return typeof value === 'string' && (CHALLENGE_IDS as readonly string[]).includes(value);
}

function isActiveRecord(value: unknown): value is ActiveDeclarativeChallengeRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<ActiveDeclarativeChallengeRecord>;
  return (
    record.version === SCHEMA_VERSION &&
    isChallengeId(record.challengeId) &&
    typeof record.attemptId === 'string' &&
    typeof record.startedAt === 'number' &&
    typeof record.elapsedMs === 'number' &&
    typeof record.hintsUsed === 'number' &&
    typeof record.attempts === 'number'
  );
}

function isReturnRecord(value: unknown): value is ReturnWorkspaceRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Partial<ReturnWorkspaceRecord>;
  return (
    record.version === SCHEMA_VERSION &&
    typeof record.circuit === 'object' &&
    record.circuit !== null &&
    Array.isArray(record.circuit.components) &&
    Array.isArray(record.circuit.wires)
  );
}

// ── Return workspace (§11) ─────────────────────────────────────────────────

/** Snapshot the normal circuit before starting a challenge. */
export async function saveReturnWorkspace(circuit: Circuit): Promise<boolean> {
  try {
    await set(RETURN_KEY, {
      version: SCHEMA_VERSION,
      savedAt: Date.now(),
      circuit: JSON.parse(JSON.stringify(circuit)) as Circuit,
    } satisfies ReturnWorkspaceRecord);
    return true;
  } catch (err) {
    console.warn('[challenge2] save return workspace failed:', err);
    return false;
  }
}

/** Read the snapshot, if one exists. */
export async function loadReturnWorkspace(): Promise<ReturnWorkspaceRecord | null> {
  try {
    const raw = await get(RETURN_KEY);
    return isReturnRecord(raw) ? raw : null;
  } catch (err) {
    console.warn('[challenge2] load return workspace failed:', err);
    return null;
  }
}

/** Drop the snapshot once the learner is safely back (plan §13). */
export async function clearReturnWorkspace(): Promise<void> {
  try {
    await set(RETURN_KEY, undefined);
  } catch (err) {
    console.warn('[challenge2] clear return workspace failed:', err);
  }
}

// ── Active challenge (§14) ─────────────────────────────────────────────────

export async function saveActiveDeclarativeChallenge(
  record: Omit<ActiveDeclarativeChallengeRecord, 'version' | 'savedAt'>,
): Promise<boolean> {
  try {
    await set(ACTIVE_KEY, { ...record, version: SCHEMA_VERSION, savedAt: Date.now() });
    return true;
  } catch (err) {
    console.warn('[challenge2] save active failed:', err);
    return false;
  }
}

export async function loadActiveDeclarativeChallenge(): Promise<ActiveDeclarativeChallengeRecord | null> {
  try {
    const raw = await get(ACTIVE_KEY);
    return isActiveRecord(raw) ? raw : null;
  } catch (err) {
    console.warn('[challenge2] load active failed:', err);
    return null;
  }
}

export async function clearActiveDeclarativeChallenge(): Promise<void> {
  try {
    await set(ACTIVE_KEY, undefined);
  } catch (err) {
    console.warn('[challenge2] clear active failed:', err);
  }
}

// ── Progress (§33) ─────────────────────────────────────────────────────────

export async function loadChallengeProgress(): Promise<ChallengeProgressMap> {
  try {
    const raw = await get(PROGRESS_KEY);
    if (typeof raw !== 'object' || raw === null) return {};
    const map: ChallengeProgressMap = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (!isChallengeId(key) || typeof value !== 'object' || value === null) continue;
      const record = value as Partial<ChallengeProgressRecord>;
      if (typeof record.completed !== 'boolean') continue;
      map[key as ChallengeId] = {
        challengeId: key as ChallengeId,
        completed: record.completed,
        completionDate: typeof record.completionDate === 'number' ? record.completionDate : 0,
        attempts: typeof record.attempts === 'number' ? record.attempts : 0,
        bestCompletionTimeMs:
          typeof record.bestCompletionTimeMs === 'number' ? record.bestCompletionTimeMs : null,
        hintsUsed: typeof record.hintsUsed === 'number' ? record.hintsUsed : 0,
      };
    }
    return map;
  } catch (err) {
    console.warn('[challenge2] load progress failed:', err);
    return {};
  }
}

/** Record a completion, keeping the best time (plan §33). */
export async function recordChallengeProgress(
  challengeId: ChallengeId,
  input: { elapsedMs: number; attempts: number; hintsUsed: number },
): Promise<ChallengeProgressMap> {
  const progress = await loadChallengeProgress();
  const previous = progress[challengeId];
  const next: ChallengeProgressRecord = {
    challengeId,
    completed: true,
    completionDate: Date.now(),
    attempts: Math.max(1, input.attempts),
    bestCompletionTimeMs:
      previous?.bestCompletionTimeMs === null || previous?.bestCompletionTimeMs === undefined
        ? input.elapsedMs
        : Math.min(previous.bestCompletionTimeMs, input.elapsedMs),
    hintsUsed: input.hintsUsed,
  };
  progress[challengeId] = next;
  try {
    await set(PROGRESS_KEY, progress);
  } catch (err) {
    console.warn('[challenge2] save progress failed:', err);
  }
  return progress;
}

/** Test-only handles on the IDB keys in use. */
export const __CHALLENGE2_ACTIVE_KEY = ACTIVE_KEY;
export const __CHALLENGE2_RETURN_KEY = RETURN_KEY;
export const __CHALLENGE2_PROGRESS_KEY = PROGRESS_KEY;

// ── Challenge workspace circuit (plan §12 "Route autosave → challenge") ─────

/** Where the in-progress challenge circuit is autosaved (per attempt). */
function challengeCircuitKey(attemptId: string): string {
  return `electrasim:challenge2:circuit:${attemptId}`;
}

/** Save the in-progress challenge circuit. Never touches the normal key. */
export async function saveChallengeCircuit(attemptId: string, circuit: Circuit): Promise<boolean> {
  try {
    await set(challengeCircuitKey(attemptId), {
      version: SCHEMA_VERSION,
      savedAt: Date.now(),
      circuit,
    } satisfies ReturnWorkspaceRecord);
    return true;
  } catch (err) {
    console.warn('[challenge2] save challenge circuit failed:', err);
    return false;
  }
}

/** Load the in-progress challenge circuit, if one was autosaved. */
export async function loadChallengeCircuit(attemptId: string): Promise<Circuit | null> {
  try {
    const raw = await get(challengeCircuitKey(attemptId));
    if (!isReturnRecord(raw)) return null;
    return raw.circuit;
  } catch (err) {
    console.warn('[challenge2] load challenge circuit failed:', err);
    return null;
  }
}

/** Drop the attempt's autosaved circuit (completion, exit, reset). */
export async function clearChallengeCircuit(attemptId: string): Promise<void> {
  try {
    await set(challengeCircuitKey(attemptId), undefined);
  } catch (err) {
    console.warn('[challenge2] clear challenge circuit failed:', err);
  }
}
