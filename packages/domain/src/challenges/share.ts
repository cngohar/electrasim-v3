import { ELECTRICAL_MODEL_VERSION } from '../core/contracts';
import { DIAGNOSIS_PROFILE_VERSION, type DiagnosisAssessment } from './diagnosis/assessment';
import { GENERATOR_VERSION, normalizeSeed } from './generator/seed';
import type { ChallengeDifficulty, ChallengeMode } from './types';
import { CHALLENGE_DIFFICULTIES, CHALLENGE_MODES } from './types';

/** Everything needed to replay an exercise (plan §21, §29, §30). */
export interface ShareTicket {
  assessment?: Pick<
    DiagnosisAssessment,
    'version' | 'modelVersion' | 'engineVersion' | 'profileVersion'
  >;
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
}

/** Human-facing labels, kept out of the UI for the diagnosis panel. */
const DIFFICULTY_LABEL: Record<ChallengeDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const MODE_LABEL: Record<ChallengeMode, string> = {
  diagnosis: 'Diagnosis',
};

export const SHARE_PREFIX = 'ES';

export function formatShareCode(ticket: ShareTicket): string {
  const parts = [
    `${SHARE_PREFIX}${ticket.generatorVersion}`,
    String(normalizeSeed(ticket.seed)),
    ticket.difficulty,
    ticket.mode,
  ];
  return (
    parts.join(':') +
    (ticket.assessment
      ? `@${ticket.assessment.version},${ticket.assessment.modelVersion},${ticket.assessment.engineVersion},${ticket.assessment.profileVersion}`
      : '')
  );
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
  lines.push(`Code: ${formatShareCode(ticket)}`);
  return lines.join('\n');
}

export interface ParsedShareTicket extends ShareTicket {
  assessmentMismatch?: boolean;
  /**
   * True when the ticket came from a different generator version (§6).
   *
   * The codec retains it for inspection. New Diagnosis Lab grading requires
   * the current generator/model; saved earlier snapshots remain readable.
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

  // Preferred path: a `ES<version>:seed:difficulty:mode` code anywhere
  // in the pasted text.
  const codeMatch = text.match(
    /ES(\d+):(\d+):([a-z]+):([a-z]+)(?:@(\d+),([a-z0-9.-]+),([a-z0-9.-]+)(?:,([a-z0-9.-]+))?)?/i,
  );
  if (codeMatch) {
    const [
      ,
      rawVersion,
      rawSeed,
      rawDifficulty,
      rawMode,
      assessmentVersion,
      rawModelVersion,
      rawEngineVersion,
      rawProfileVersion,
    ] = codeMatch;
    const modelVersion = rawModelVersion?.toLowerCase();
    const engineVersion = rawEngineVersion?.toLowerCase();
    const profileVersion = rawProfileVersion?.toLowerCase();
    const suffix = text.slice((codeMatch.index ?? 0) + codeMatch[0].length);
    if (
      suffix.startsWith(':') ||
      suffix.startsWith('@') ||
      (assessmentVersion && suffix.startsWith(','))
    )
      return null;
    const difficulty = rawDifficulty?.toLowerCase() as ChallengeDifficulty;
    const mode = rawMode?.toLowerCase() as ChallengeMode;
    if (!CHALLENGE_DIFFICULTIES.includes(difficulty)) return null;
    if (!CHALLENGE_MODES.includes(mode)) return null;
    const generatorVersion = Number(rawVersion);
    return {
      ...(assessmentVersion && modelVersion && engineVersion
        ? {
            assessment: {
              version: Number(assessmentVersion) as 1,
              modelVersion,
              engineVersion,
              profileVersion: profileVersion ?? 'unversioned',
            },
            assessmentMismatch:
              Number(assessmentVersion) !== 1 ||
              modelVersion !== ELECTRICAL_MODEL_VERSION ||
              profileVersion !== DIAGNOSIS_PROFILE_VERSION,
          }
        : {}),
      seed: normalizeSeed(Number(rawSeed)),
      difficulty,
      mode,
      generatorVersion,
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
    versionMismatch: false,
  };
}
