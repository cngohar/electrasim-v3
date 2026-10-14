import { describe, expect, it } from 'vitest';
import { generateChallenge } from './generator/generator';
import { GENERATOR_VERSION } from './generator/seed';
import { type ShareTicket, formatShareCode, formatShareText, parseShareText } from './share';
import type { ChallengeDifficulty, ChallengeMode } from './types';
import { CHALLENGE_DIFFICULTIES } from './types';

const FALLBACK = {
  difficulty: 'beginner' as ChallengeDifficulty,
  mode: 'diagnosis' as ChallengeMode,
};

const TICKET: ShareTicket = {
  seed: 482_917,
  difficulty: 'advanced',
  mode: 'diagnosis',
  generatorVersion: GENERATOR_VERSION,
};

describe('formatShareText (plan §30)', () => {
  it('shows the seed, difficulty and mode the plan asks for', () => {
    const text = formatShareText(TICKET);
    expect(text).toContain('Seed: 482917');
    expect(text).toContain('Difficulty: Advanced');
    expect(text).toContain('Mode: Diagnosis');
  });

  it('embeds a machine-readable code alongside the prose', () => {
    expect(formatShareText(TICKET)).toContain(`Code: ${formatShareCode(TICKET)}`);
  });
});

describe('parseShareText (plan §30)', () => {
  it('round-trips each standard difficulty and learning mode', () => {
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      for (const mode of ['diagnosis'] as const) {
        const ticket: ShareTicket = { ...TICKET, difficulty, mode };
        expect(parseShareText(formatShareText(ticket), FALLBACK)).toMatchObject(ticket);
      }
    }
  });

  it('rejects unsupported modes and extra generation fields', () => {
    expect(parseShareText('ES3:12:beginner:unsupported', FALLBACK)).toBeNull();
    expect(parseShareText('ES3:12:beginner:challenge', FALLBACK)).toBeNull();
    expect(parseShareText('ES3:12:beginner:diagnosis:unsupported', FALLBACK)).toBeNull();
  });

  it('accepts a bare code without the surrounding prose', () => {
    const parsed = parseShareText(formatShareCode(TICKET), FALLBACK);
    expect(parsed).toMatchObject({ seed: 482_917, difficulty: 'advanced', mode: 'diagnosis' });
  });

  it('accepts a bare seed and keeps the caller\u2019s current selection', () => {
    const parsed = parseShareText('482917', {
      difficulty: 'intermediate',
      mode: 'diagnosis',
    });
    expect(parsed).toMatchObject({ seed: 482_917, difficulty: 'intermediate' });
  });

  it('reads a difficulty word out of a pasted "Seed: ..." block', () => {
    const parsed = parseShareText('Seed: 1234\nDifficulty: Advanced', FALLBACK);
    expect(parsed).toMatchObject({ seed: 1234, difficulty: 'advanced' });
  });

  it('survives the whitespace and case a real paste carries', () => {
    const parsed = parseShareText(`  \n ${formatShareCode(TICKET).toUpperCase()} \n `, FALLBACK);
    expect(parsed?.seed).toBe(482_917);
    expect(parsed?.difficulty).toBe('advanced');
  });

  it('flags a ticket minted by a different generator version (§6)', () => {
    const current = parseShareText(formatShareCode(TICKET), FALLBACK);
    expect(current?.versionMismatch).toBe(false);

    const old = parseShareText(`ES${GENERATOR_VERSION + 1}:482917:advanced:diagnosis`, FALLBACK);
    expect(old?.versionMismatch).toBe(true);
    // Still replayable — §6 asks us to notice, not to refuse.
    expect(old?.seed).toBe(482_917);
  });

  it('returns null rather than guessing at unusable text', () => {
    for (const bad of ['', '   ', 'no numbers here', 'ES1:12:nonsense:diagnosis']) {
      expect(parseShareText(bad, FALLBACK)).toBeNull();
    }
  });
});

describe('replay (plan §5, §30)', () => {
  /**
   * The actual promise made to the user: a copied ticket rebuilds the same
   * exercise. Asserted against the real scenario builder rather than a mock,
   * because a codec that round-trips but reproduces a different circuit would
   * pass every test above and still be broken.
   */
  it('a copied ticket regenerates the identical exercise', () => {
    const original = generateChallenge({
      seed: 482_917,
      difficulty: 'advanced',
      mode: 'diagnosis',
    });
    const parsed = parseShareText(
      formatShareText({
        seed: original.metadata.seed,
        difficulty: original.metadata.difficulty,
        mode: 'diagnosis',
        generatorVersion: original.metadata.generatorVersion,
      }),
      FALLBACK,
    );
    expect(parsed).not.toBeNull();

    const replayed = generateChallenge({
      seed: parsed!.seed,
      difficulty: parsed!.difficulty,
      mode: parsed!.mode,
    });
    expect(replayed.metadata.challengeId).toBe(original.metadata.challengeId);
    expect(replayed.circuit).toEqual(original.circuit);
  });
});
