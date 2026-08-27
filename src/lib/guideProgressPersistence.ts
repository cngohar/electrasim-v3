/**
 * guideProgressPersistence — remembers which Guided Circuits the user has
 * completed.
 *
 * Fully separate from Challenge Mode (which persists through
 * `declarativeChallengePersistence`). The old key
 * `electrasim:challenge-progress:v1` was retired when Guided Circuits stopped
 * presenting as challenges — completed guides stored under it are migrated
 * into the new key on read, so nobody loses their progress.
 */

const STORAGE_KEY = 'electrasim:guide-progress:v1';
const LEGACY_STORAGE_KEY = 'electrasim:challenge-progress:v1';

type ProgressMap = Record<string, number>;

function readMap(key: string): ProgressMap | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeMap(key: string, progress: ProgressMap): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    // Storage is optional; the active guide remains fully usable.
  }
}

function read(): ProgressMap {
  const current = readMap(STORAGE_KEY);
  if (current) return current;

  // One-time migration from the retired challenge-labelled key.
  const legacy = readMap(LEGACY_STORAGE_KEY);
  if (legacy && Object.keys(legacy).length > 0) {
    writeMap(STORAGE_KEY, legacy);
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Best-effort cleanup.
    }
    return legacy;
  }
  return {};
}

export function getCompletedGuideIds(): string[] {
  return Object.keys(read());
}

export function isGuideCompleted(id: string): boolean {
  return Boolean(read()[id]);
}

export function markGuideCompleted(id: string): void {
  const progress = read();
  progress[id] ??= Date.now();
  writeMap(STORAGE_KEY, progress);
}

export function clearGuideProgress(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Storage is optional.
  }
}
