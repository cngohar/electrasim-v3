/** Versioned checklist history, separate from a current circuit assessment. */
import { ELECTRICAL_MODEL_VERSION } from '@electrasim/domain/core/contracts';
import { getGuideProgress } from '@electrasim/domain/guideProgress';
import type { GuidedCircuitTemplate } from '@electrasim/domain/templates';
import type { Circuit, SimulationResult } from '@electrasim/domain/types';

const STORAGE_KEY = 'electrasim:guide-progress:v2';
const HISTORICAL_KEYS = ['electrasim:guide-progress:v1', 'electrasim:challenge-progress:v1'];
export const GUIDE_PROGRESS_VERSION = 2;
interface Completion {
  version: number;
  completedAt: number;
  modelVersion?: string;
  engineVersion?: string;
  inputRevision?: string;
}
type ProgressMap = Record<string, Completion>;

function read(): ProgressMap {
  if (typeof window === 'undefined') return {};
  const result: ProgressMap = {};
  for (const key of [...HISTORICAL_KEYS, STORAGE_KEY]) {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) ?? '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue;
      for (const [id, value] of Object.entries(parsed)) {
        if (typeof value === 'number' && Number.isFinite(value) && value > 0)
          result[id] = { version: 0, completedAt: value };
        else if (value && typeof value === 'object') {
          const entry = value as Completion;
          if (
            Number.isFinite(entry.completedAt) &&
            entry.completedAt > 0 &&
            typeof entry.version === 'number'
          )
            result[id] = entry;
        }
      }
    } catch {
      /* Optional storage. */
    }
  }
  return result;
}

export function getCompletedGuideIds(): string[] {
  return Object.keys(read()).filter(isGuideCompleted);
}
export function isGuideCompleted(id: string): boolean {
  const record = read()[id];
  return (
    !!record &&
    record.version === GUIDE_PROGRESS_VERSION &&
    record.modelVersion === ELECTRICAL_MODEL_VERSION &&
    typeof record.inputRevision === 'string' &&
    typeof record.engineVersion === 'string'
  );
}
export function wasGuideCompletedEarlier(id: string): boolean {
  return !!read()[id] && !isGuideCompleted(id);
}

export function markGuideCompleted(
  template: GuidedCircuitTemplate,
  circuit: Circuit,
  result: SimulationResult | null,
): boolean {
  if (!result || !getGuideProgress(template, circuit, false, result).completed) return false;
  const progress = read();
  const previous = progress[template.id];
  progress[template.id] = {
    version: GUIDE_PROGRESS_VERSION,
    completedAt: previous?.completedAt ?? Date.now(),
    modelVersion: result.electricalContract?.modelVersion,
    engineVersion: result.electricalContract?.engineVersion,
    inputRevision: result.inputRevision,
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* Optional storage. */
  }
  return true;
}
export function clearGuideProgress(): void {
  for (const key of [...HISTORICAL_KEYS, STORAGE_KEY]) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* Optional storage. */
    }
  }
}
