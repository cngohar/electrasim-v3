/**
 * Deterministic seed handling for the challenge generator (plan §5, §6, §29, §31).
 *
 * Two primitives live here:
 *
 *   1. `mulberry32` — a tiny, fast, well-distributed 32-bit PRNG. Given the
 *      same 32-bit state it always emits the same sequence, on every engine,
 *      forever. `Math.random()` is BANNED in `src/domain/challenges/**`
 *      (plan §58) and `seed.test.ts` asserts that.
 *
 *   2. `fnv1a32` — a stable string hash used to fold the whole generation
 *      request (version + seed + difficulty + mode + rage profile) into the
 *      PRNG state and into the human-facing challenge id.
 *
 * Nothing here touches `Date`, storage, or any store. The module is pure.
 */

import type { ChallengeDifficulty, ChallengeIdentity, ChallengeMode } from '../types';

/**
 * Generator algorithm version (plan §6).
 *
 * Bump this whenever recipe output, topology, layout or the accepted
 * electrical envelope changes. A seed is only stable *within* one version.
 */
export const GENERATOR_VERSION = 1;

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** FNV-1a, 32-bit. Deterministic across engines; used for all seed folding. */
export function fnv1a32(input: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // `Math.imul` keeps the multiply in 32-bit space on every JS engine.
    hash = Math.imul(hash, FNV_PRIME);
  }
  return hash >>> 0;
}

/** Coerce any finite number into a stable 32-bit unsigned seed value. */
export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 0;
  // Fold the fractional part in so `1.5` and `1` are different seeds.
  const scaled = Number.isInteger(seed) ? seed : Math.round(seed * 1_000_000);
  return (Math.abs(scaled) % 0x1_0000_0000) >>> 0;
}

/**
 * A deterministic random source.
 *
 * Every method is derived from `next()`, so the whole generator's behaviour is
 * a pure function of the initial state.
 */
export interface Rng {
  /** Raw float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Float in [min, max). */
  float(min: number, max: number): number;
  /** True with the given probability (0..1). */
  bool(probability?: number): boolean;
  /** Uniform pick from a non-empty array. */
  pick<T>(items: readonly T[]): T;
  /** Weighted pick; weights must be positive and align with `items`. */
  pickWeighted<T>(items: readonly T[], weights: readonly number[]): T;
  /** Fisher–Yates shuffle returning a NEW array (input untouched). */
  shuffle<T>(items: readonly T[]): T[];
  /** Derive an independent child RNG — used for per-attempt isolation. */
  fork(label: string): Rng;
  /** Current internal state, for debugging and regression fixtures. */
  state(): number;
}

/**
 * Mulberry32 PRNG.
 *
 * Chosen over xorshift for its better avalanche on sequential seeds — the
 * generator is routinely called with seeds 1, 2, 3, … in tests and stress
 * runs, and consecutive seeds must not produce correlated circuits.
 */
export function createRng(initialState: number): Rng {
  let state = normalizeSeed(initialState);

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };

  const rng: Rng = {
    next,
    int(min, max) {
      if (max < min) throw new Error(`rng.int: max (${max}) < min (${min})`);
      return min + Math.floor(next() * (max - min + 1));
    },
    float(min, max) {
      return min + next() * (max - min);
    },
    bool(probability = 0.5) {
      return next() < probability;
    },
    pick(items) {
      if (items.length === 0) throw new Error('rng.pick: empty collection');
      return items[Math.floor(next() * items.length)]!;
    },
    pickWeighted(items, weights) {
      if (items.length === 0) throw new Error('rng.pickWeighted: empty collection');
      if (items.length !== weights.length) {
        throw new Error('rng.pickWeighted: items and weights length mismatch');
      }
      let total = 0;
      for (const weight of weights) {
        if (!(weight > 0)) throw new Error('rng.pickWeighted: weights must be positive');
        total += weight;
      }
      let threshold = next() * total;
      for (let i = 0; i < items.length; i++) {
        threshold -= weights[i]!;
        if (threshold <= 0) return items[i]!;
      }
      return items[items.length - 1]!;
    },
    shuffle(items) {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        const a = copy[i]!;
        copy[i] = copy[j]!;
        copy[j] = a;
      }
      return copy;
    },
    fork(label) {
      return createRng(fnv1a32(`${state}:${label}`));
    },
    state() {
      return state;
    },
  };

  return rng;
}

/** Identity inputs shared by the PRNG seed and the challenge id (plan §29). */
export interface SeedComponents {
  generatorVersion: number;
  seed: number;
  difficulty: ChallengeDifficulty;
  mode: ChallengeMode;
  rageProfile?: string;
}

/**
 * Canonical string form of the identity inputs.
 *
 * Exposed so tests can assert the exact folding and so bug reports can quote
 * a single reproducible line.
 */
export function seedFingerprint(components: SeedComponents): string {
  const { generatorVersion, seed, difficulty, mode, rageProfile } = components;
  return [
    `v${generatorVersion}`,
    `s${normalizeSeed(seed)}`,
    `d${difficulty}`,
    `m${mode}`,
    `r${rageProfile ?? 'none'}`,
  ].join('|');
}

/**
 * Derive the PRNG for a generation request (plan §5).
 *
 *   (seed + difficulty + generatorVersion) → RNG sequence → decisions
 */
export function createSeededRng(components: SeedComponents): Rng {
  return createRng(fnv1a32(seedFingerprint(components)));
}

const MODE_PREFIX: Record<ChallengeMode, string> = {
  challenge: 'CHAL',
  diagnosis: 'DIAG',
  rage: 'RAGE',
};

/**
 * Stable, human-friendly challenge identity (plan §29).
 *
 *   ES-DIAG-482917 / ES-RAGE-482917 / ES-CHAL-482917
 */
export function computeChallengeIdentity(components: SeedComponents): ChallengeIdentity {
  const hash = fnv1a32(`id:${seedFingerprint(components)}`);
  const shortCode = String(hash % 1_000_000).padStart(6, '0');
  return {
    hash,
    shortCode,
    displayId: `ES-${MODE_PREFIX[components.mode]}-${shortCode}`,
  };
}

/**
 * Daily-challenge hook (plan §31).
 *
 *   dailySeed = hash(date + generatorVersion)
 *
 * Nothing consumes this in Phase A. It exists so a future daily challenge can
 * be added without touching seed derivation — and explicitly without a backend.
 *
 * @param isoDate calendar date as `YYYY-MM-DD` (caller supplies it; this
 *   module never reads the clock, which keeps it pure and testable).
 */
export function dailyChallengeSeed(isoDate: string, generatorVersion = GENERATOR_VERSION): number {
  return fnv1a32(`daily:${isoDate}:v${generatorVersion}`);
}
