/**
 * seed.test.ts — locks the deterministic seed layer (plan §5, §6, §29, §31).
 *
 * The whole generator's reproducibility rests on this module, so the tests
 * cover determinism, independence, distribution and the identity format.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ChallengeDifficulty, ChallengeMode } from '../types';
import {
  GENERATOR_VERSION,
  computeChallengeIdentity,
  createRng,
  createSeededRng,
  dailyChallengeSeed,
  fnv1a32,
  normalizeSeed,
  seedFingerprint,
} from './seed';

/** Absolute path of `src/domain/challenges`, used by the purity guards. */
const CHALLENGES_ROOT = path.resolve(__dirname, '..');

const BASE = {
  generatorVersion: GENERATOR_VERSION,
  seed: 482_917,
  difficulty: 'intermediate' as ChallengeDifficulty,
  mode: 'diagnosis' as ChallengeMode,
};

describe('fnv1a32', () => {
  it('is deterministic and returns a 32-bit unsigned integer', () => {
    for (const input of ['', 'a', 'electrasim', 'v1|s1|dbeginner|mchallenge|rnone']) {
      const hash = fnv1a32(input);
      expect(fnv1a32(input)).toBe(hash);
      expect(Number.isInteger(hash)).toBe(true);
      expect(hash).toBeGreaterThanOrEqual(0);
      expect(hash).toBeLessThanOrEqual(0xff_ff_ff_ff);
    }
  });

  it('separates inputs that differ by one character', () => {
    expect(fnv1a32('seed-1')).not.toBe(fnv1a32('seed-2'));
    expect(fnv1a32('ab')).not.toBe(fnv1a32('ba'));
  });

  it('has no collisions across 20k sequential seed fingerprints', () => {
    const hashes = new Set<number>();
    for (let seed = 0; seed < 20_000; seed++) {
      hashes.add(fnv1a32(seedFingerprint({ ...BASE, seed })));
    }
    expect(hashes.size).toBe(20_000);
  });
});

describe('normalizeSeed', () => {
  it('maps any finite number onto a 32-bit unsigned integer', () => {
    expect(normalizeSeed(0)).toBe(0);
    expect(normalizeSeed(42)).toBe(42);
    expect(normalizeSeed(-42)).toBe(42);
    expect(normalizeSeed(0xff_ff_ff_ff + 5)).toBeLessThan(0x1_0000_0000);
  });

  it('treats non-finite input as seed 0', () => {
    expect(normalizeSeed(Number.NaN)).toBe(0);
    expect(normalizeSeed(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('distinguishes fractional seeds from their integer part', () => {
    expect(normalizeSeed(1.5)).not.toBe(normalizeSeed(1));
  });
});

describe('createRng — determinism', () => {
  it('replays the identical sequence for the same state', () => {
    const first = createRng(2024);
    const second = createRng(2024);
    const a = Array.from({ length: 64 }, () => first.next());
    const b = Array.from({ length: 64 }, () => second.next());
    expect(a).toEqual(b);
  });

  it('produces different sequences for adjacent seeds', () => {
    const a = Array.from({ length: 16 }, () => createRng(1).next());
    const b = Array.from({ length: 16 }, () => createRng(2).next());
    expect(a).not.toEqual(b);
  });

  it('keeps every draw inside [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 10_000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('distributes uniformly across ten buckets', () => {
    const rng = createRng(99);
    const buckets = new Array(10).fill(0);
    const draws = 100_000;
    for (let i = 0; i < draws; i++) buckets[Math.floor(rng.next() * 10)]++;
    for (const count of buckets) {
      // Uniform expectation is 10 %; allow a generous ±1.5 % band.
      expect(count / draws).toBeGreaterThan(0.085);
      expect(count / draws).toBeLessThan(0.115);
    }
  });
});

describe('createRng — helpers', () => {
  it('int() stays within the inclusive bounds and reaches both ends', () => {
    const rng = createRng(5);
    const seen = new Set<number>();
    for (let i = 0; i < 5_000; i++) {
      const value = rng.int(3, 7);
      expect(value).toBeGreaterThanOrEqual(3);
      expect(value).toBeLessThanOrEqual(7);
      expect(Number.isInteger(value)).toBe(true);
      seen.add(value);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6, 7]);
  });

  it('int() rejects an inverted range', () => {
    expect(() => createRng(1).int(5, 2)).toThrow(/max/);
  });

  it('float() stays within its half-open range', () => {
    const rng = createRng(11);
    for (let i = 0; i < 1_000; i++) {
      const value = rng.float(1.5, 4);
      expect(value).toBeGreaterThanOrEqual(1.5);
      expect(value).toBeLessThan(4);
    }
  });

  it('bool() honours its probability', () => {
    const rng = createRng(13);
    let trues = 0;
    for (let i = 0; i < 20_000; i++) if (rng.bool(0.25)) trues++;
    expect(trues / 20_000).toBeGreaterThan(0.23);
    expect(trues / 20_000).toBeLessThan(0.27);
  });

  it('pick() only returns members and throws on an empty collection', () => {
    const rng = createRng(17);
    const items = ['a', 'b', 'c'] as const;
    for (let i = 0; i < 500; i++) expect(items).toContain(rng.pick(items));
    expect(() => rng.pick([])).toThrow(/empty/);
  });

  it('pickWeighted() approximates the requested weights', () => {
    const rng = createRng(19);
    const items = ['a', 'b'] as const;
    const counts = { a: 0, b: 0 };
    for (let i = 0; i < 40_000; i++) counts[rng.pickWeighted(items, [3, 1])]++;
    expect(counts.a / 40_000).toBeGreaterThan(0.73);
    expect(counts.a / 40_000).toBeLessThan(0.77);
  });

  it('pickWeighted() rejects malformed weights', () => {
    const rng = createRng(23);
    expect(() => rng.pickWeighted(['a', 'b'], [1])).toThrow(/mismatch/);
    expect(() => rng.pickWeighted(['a', 'b'], [1, 0])).toThrow(/positive/);
  });

  it('shuffle() permutes without mutating the input', () => {
    const rng = createRng(29);
    const source = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rng.shuffle(source);
    expect(source).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(source);
  });

  it('fork() derives independent but reproducible child streams', () => {
    const parentA = createRng(31);
    const parentB = createRng(31);
    expect(parentA.fork('x').next()).toBe(parentB.fork('x').next());
    expect(createRng(31).fork('x').next()).not.toBe(createRng(31).fork('y').next());
  });
});

describe('seedFingerprint / createSeededRng', () => {
  it('folds every identity input into the fingerprint', () => {
    expect(seedFingerprint(BASE)).toBe('v1|s482917|dintermediate|mdiagnosis|rnone');
    expect(seedFingerprint({ ...BASE, rageProfile: 'chaos' })).toBe(
      'v1|s482917|dintermediate|mdiagnosis|rchaos',
    );
  });

  it('gives the same seed a different stream per difficulty', () => {
    const beginner = createSeededRng({ ...BASE, difficulty: 'beginner' }).next();
    const advanced = createSeededRng({ ...BASE, difficulty: 'advanced' }).next();
    expect(beginner).not.toBe(advanced);
  });

  it('gives the same seed a different stream per generator version', () => {
    const v1 = createSeededRng({ ...BASE, generatorVersion: 1 }).next();
    const v2 = createSeededRng({ ...BASE, generatorVersion: 2 }).next();
    expect(v1).not.toBe(v2);
  });

  it('gives the same seed a different stream per mode', () => {
    const challenge = createSeededRng({ ...BASE, mode: 'challenge' }).next();
    const rage = createSeededRng({ ...BASE, mode: 'rage' }).next();
    expect(challenge).not.toBe(rage);
  });
});

describe('computeChallengeIdentity (plan §29)', () => {
  it('renders the documented ES-<MODE>-<6 digits> shape', () => {
    expect(computeChallengeIdentity({ ...BASE, mode: 'diagnosis' }).displayId).toMatch(
      /^ES-DIAG-\d{6}$/,
    );
    expect(computeChallengeIdentity({ ...BASE, mode: 'rage' }).displayId).toMatch(
      /^ES-RAGE-\d{6}$/,
    );
    expect(computeChallengeIdentity({ ...BASE, mode: 'challenge' }).displayId).toMatch(
      /^ES-CHAL-\d{6}$/,
    );
  });

  it('is stable for identical inputs', () => {
    expect(computeChallengeIdentity(BASE)).toEqual(computeChallengeIdentity(BASE));
  });

  it('changes when any identity input changes', () => {
    const base = computeChallengeIdentity(BASE).displayId;
    expect(computeChallengeIdentity({ ...BASE, seed: BASE.seed + 1 }).displayId).not.toBe(base);
    expect(computeChallengeIdentity({ ...BASE, difficulty: 'advanced' }).displayId).not.toBe(base);
    expect(computeChallengeIdentity({ ...BASE, generatorVersion: 2 }).displayId).not.toBe(base);
    expect(computeChallengeIdentity({ ...BASE, rageProfile: 'chaos' }).displayId).not.toBe(base);
  });

  it('always zero-pads the short code to six digits', () => {
    for (let seed = 0; seed < 3_000; seed++) {
      expect(computeChallengeIdentity({ ...BASE, seed }).shortCode).toHaveLength(6);
    }
  });
});

describe('dailyChallengeSeed (plan §31 hook)', () => {
  it('derives a stable seed from a calendar date', () => {
    expect(dailyChallengeSeed('2026-08-18')).toBe(dailyChallengeSeed('2026-08-18'));
    expect(dailyChallengeSeed('2026-08-18')).not.toBe(dailyChallengeSeed('2026-08-19'));
  });

  it('changes with the generator version', () => {
    expect(dailyChallengeSeed('2026-08-18', 1)).not.toBe(dailyChallengeSeed('2026-08-18', 2));
  });

  it('never reads the clock — the caller supplies the date', () => {
    // Guards against a future refactor sneaking `new Date()` in, which would
    // make the generator impure.
    const source = readFileSync(path.join(CHALLENGES_ROOT, 'generator/seed.ts'), 'utf8');
    expect(source).not.toMatch(/new Date\(|Date\.now\(/);
  });
});

describe('generator purity (plan §5, §58)', () => {
  it('never calls Math.random in any challenge source file', () => {
    const offenders: string[] = [];
    // Built from fragments so this assertion does not match its own source.
    const bannedCall = new RegExp(['Math', '\\.', 'random'].join(''));

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(full)) continue;
        // Tests may reference the identifier when asserting on it.
        if (/\.(test|spec)\.tsx?$/.test(full)) continue;

        // Strip comments so the ban notice in the docblocks is not a hit.
        const code = readFileSync(full, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/(^|[^:])\/\/.*$/gm, '$1');
        if (bannedCall.test(code)) offenders.push(path.relative(CHALLENGES_ROOT, full));
      }
    };

    walk(CHALLENGES_ROOT);
    expect(offenders).toEqual([]);
  });

  it('imports no React, store, worker or persistence module', () => {
    const forbidden =
      /from '(react|zustand|idb-keyval|\.\.\/\.\.\/\.\.\/(store|ui|lib|sim-worker))/;
    const offenders: string[] = [];

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        const full = path.join(dir, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.tsx?$/.test(full) || /\.(test|spec)\.tsx?$/.test(full)) continue;
        if (forbidden.test(readFileSync(full, 'utf8'))) {
          offenders.push(path.relative(CHALLENGES_ROOT, full));
        }
      }
    };

    walk(CHALLENGES_ROOT);
    expect(offenders).toEqual([]);
  });
});
