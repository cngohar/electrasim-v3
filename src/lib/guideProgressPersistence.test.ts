import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearGuideProgress,
  getCompletedGuideIds,
  isGuideCompleted,
  markGuideCompleted,
} from './guideProgressPersistence';

const NEW_KEY = 'electrasim:guide-progress:v1';
const LEGACY_KEY = 'electrasim:challenge-progress:v1';

beforeEach(() => {
  window.localStorage.clear();
});

describe('guideProgressPersistence', () => {
  it('marks a guide completed and keeps the timestamp stable', () => {
    markGuideCompleted('simple-lamp');
    expect(isGuideCompleted('simple-lamp')).toBe(true);
    expect(isGuideCompleted('other-guide')).toBe(false);
    expect(getCompletedGuideIds()).toEqual(['simple-lamp']);

    const first = JSON.parse(window.localStorage.getItem(NEW_KEY) ?? '{}') as Record<
      string,
      number
    >;
    markGuideCompleted('simple-lamp');
    const second = JSON.parse(window.localStorage.getItem(NEW_KEY) ?? '{}') as Record<
      string,
      number
    >;
    expect(second['simple-lamp']).toBe(first['simple-lamp']);
  });

  it('migrates completions from the retired challenge-labelled key', () => {
    window.localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ 'simple-lamp': 123, 'timer-bell': 456 }),
    );

    expect(isGuideCompleted('simple-lamp')).toBe(true);
    expect(getCompletedGuideIds()).toEqual(['simple-lamp', 'timer-bell']);

    // The new key holds the migrated data and the legacy key is cleaned up.
    const migrated = JSON.parse(window.localStorage.getItem(NEW_KEY) ?? '{}') as Record<
      string,
      number
    >;
    expect(migrated['simple-lamp']).toBe(123);
    expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('tolerates corrupt storage without throwing', () => {
    window.localStorage.setItem(NEW_KEY, '{not json');
    window.localStorage.setItem(LEGACY_KEY, '"also not an object"');

    expect(isGuideCompleted('simple-lamp')).toBe(false);
    expect(getCompletedGuideIds()).toEqual([]);
  });

  it('clears both the current and the legacy keys', () => {
    window.localStorage.setItem(NEW_KEY, JSON.stringify({ a: 1 }));
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify({ b: 2 }));

    clearGuideProgress();

    expect(window.localStorage.getItem(NEW_KEY)).toBeNull();
    expect(window.localStorage.getItem(LEGACY_KEY)).toBeNull();
  });
});
