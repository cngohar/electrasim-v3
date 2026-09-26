/**
 * Share / replay a generated exercise (plan §30).
 *
 * §30 asks for one thing and explicitly limits the scope:
 *
 *   > Initial implementation can simply provide: `Copy Seed`
 *   > Do not add a backend just for this feature.
 *
 * So this module is a pure, offline, two-way text codec over the identity
 * inputs the generator already treats as canonical (§5, §6, §29):
 *
 *   seed + difficulty + mode (+ rage tier)
 *
 * It deliberately does NOT serialise the circuit. The circuit is a *function*
 * of those inputs, so a ticket that carries them reproduces the exercise
 * exactly — which is the whole point of the deterministic generator, and the
 * reason a shared ticket stays a handful of bytes instead of a whole graph.
 *
 * Nothing here reads the clock, storage, `navigator` or `window`: the
 * clipboard call belongs to the UI layer, so this stays unit-testable and
 * obeys the "domain logic is pure TypeScript" rule (§2, §58).
 */

import { GENERATOR_VERSION, normalizeSeed } from './generator/seed';
import { isRageTierId } from './rage/tiers';
import type { RageTierId } from './rage/types';
import type { ChallengeDifficulty, ChallengeMode } from './types';
import { CHALLENGE_DIFFICULTIES, CHALLENGE_MODES } from './types';

/** Everything needed to replay an exercise (plan §21, §29, §30). */
export interface ShareTicket {
  seed: number;
  difficulty: ChallengeDifficulty;
  mode: ChallengeMode;
  /**
   * The generator that produced it (§6).
   *
   * Carried so a ticket minted by an older build can be *detected* rather than
   * silently replayed into a different circuit — §6: "Do not treat a seed as
   * permanently stable across incompatible generator versions."
   */
  generatorVersion: number;
  /** Ohmageddon tier, or `null` for an ordinary exercise (§23, §24). */
  rageTier: RageTierId | null;
}

/** Human-facing labels, kept out of the UI so both panels read the same. */
const DIFFICULTY_LABEL: Record<ChallengeDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const MODE_LABEL: Record<ChallengeMode, string> = {
  challenge: 'Challenge',
  diagnosis: 'Diagnosis',
  rage: 'Ohmageddon',
};

/**
 * The compact machine-readable form, e.g. `ES1:482917:advanced:diagnosis:rage-3`.
 *
 * Prefixed and versioned so a future format change is detectable instead of
 * being mis-parsed, and lower-cased on parse so a seed copied out of a chat
 * client that capitalised it still works.
 */
export const SHARE_PREFIX = 'ES';

export function formatShareCode(ticket: ShareTicket): string {
  const parts = [
    `${SHARE_PREFIX}${ticket.generatorVersion}`,
    String(normalizeSeed(ticket.seed)),
    ticket.difficulty,
    ticket.mode,
  ];
  if (ticket.rageTier) parts.push(ticket.rageTier);
  return parts.join(':');
}

/**
 * The block §30 shows the user, e.g.
 *
 *   Seed: 482917
 *   Difficulty: Advanced
 *   Mode: Diagnosis
 *   Code: ES1:482917:advanced:diagnosis
 *
 * The prose lines are for the human; the `Code:` line is what
 * {@link parseShareText} reads back, so a learner can paste the whole block
 * they were sent rather than having to pick the code out of it.
 */
export function formatShareText(ticket: ShareTicket): string {
  const lines = [
    `Seed: ${normalizeSeed(ticket.seed)}`,
    `Difficulty: ${DIFFICULTY_LABEL[ticket.difficulty]}`,
    `Mode: ${MODE_LABEL[ticket.mode]}`,
  ];
  if (ticket.rageTier) lines.push(`Ohmageddon: ${ticket.rageTier}`);
  lines.push(`Code: ${formatShareCode(ticket)}`);
  return lines.join('\n');
}

export interface ParsedShareTicket extends ShareTicket {
  /**
   * True when the ticket came from a different generator version (§6).
   *
   * The caller decides what to do about it. The Diagnosis Lab replays it on
   * the *current* generator and says so, because refusing outright would make
   * every old bug report unreplayable — but it never pretends the circuit is
   * guaranteed identical.
   */
  versionMismatch: boolean;
}

/**
 * Read a ticket back from arbitrary pasted text.
 *
 * Accepts the full §30 block, a bare code, or a bare seed number, and returns
 * `null` for anything it cannot honestly interpret. Tolerant by design:
 * pasted text arrives with stray whitespace, quotes and trailing punctuation.
 */
export function parseShareText(
  input: string,
  fallback: { difficulty: ChallengeDifficulty; mode: ChallengeMode },
): ParsedShareTicket | null {
  const text = input.trim();
  if (!text) return null;

  // Preferred path: a `ES<version>:seed:difficulty:mode[:tier]` code anywhere
  // in the pasted text.
  const codeMatch = text.match(/ES(\d+):(\d+):([a-z]+):([a-z]+)(?::([a-z0-9-]+))?/i);
  if (codeMatch) {
    const [, rawVersion, rawSeed, rawDifficulty, rawMode, rawTier] = codeMatch;
    const difficulty = rawDifficulty?.toLowerCase() as ChallengeDifficulty;
    const mode = rawMode?.toLowerCase() as ChallengeMode;
    if (!CHALLENGE_DIFFICULTIES.includes(difficulty)) return null;
    if (!CHALLENGE_MODES.includes(mode)) return null;
    const tier = rawTier?.toLowerCase();
    const generatorVersion = Number(rawVersion);
    return {
      seed: normalizeSeed(Number(rawSeed)),
      difficulty,
      mode,
      generatorVersion,
      rageTier: tier && isRageTierId(tier) ? tier : null,
      versionMismatch: generatorVersion !== GENERATOR_VERSION,
    };
  }

  // Fallback: a bare seed, optionally introduced by "Seed:". This is what
  // people actually paste out of a screenshot or a bug report, and §30's own
  // example block leads with exactly that line.
  const seedMatch = text.match(/(?:^|seed\s*[:=]\s*)(\d{1,10})\b/i);
  if (!seedMatch?.[1]) return null;
  const seedValue = Number(seedMatch[1]);
  if (!Number.isFinite(seedValue)) return null;

  // A difficulty word in the pasted text wins over the caller's current
  // selection; otherwise we keep what the panel already has selected.
  const difficulty =
    CHALLENGE_DIFFICULTIES.find((value) => new RegExp(`\\b${value}\\b`, 'i').test(text)) ??
    fallback.difficulty;

  return {
    seed: normalizeSeed(seedValue),
    difficulty,
    mode: fallback.mode,
    generatorVersion: GENERATOR_VERSION,
    rageTier: null,
    versionMismatch: false,
  };
}
