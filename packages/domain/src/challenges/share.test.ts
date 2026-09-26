/**
 * share.test.ts — the §30 copy/replay ticket.
 *
 * The contract that matters is the round trip: whatever we put in front of the
 * user must come back as the *same* identity inputs, because the generator
 * turns those inputs into the circuit. A codec that loses the rage tier or the
 * difficulty would silently hand someone a different exercise.
 */

import { describe, expect, it } from 'vitest';
import { buildDiagnosisScenario } from './diagnosis/scenario';
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
  rageTier: null,
};

describe('formatShareText (plan §30)', () => {
  it('shows the seed, difficulty and mode the plan asks for', () => {
    const text = formatShareText(TICKET);
    expect(text).toContain('Seed: 482917');
    expect(text).toContain('Difficulty: Advanced');
    expect(text).toContain('Mode: Diagnosis');
  });

  it('names the Ohmageddon tier only when one is set (§24)', () => {
    expect(formatShareText(TICKET)).not.toMatch(/Ohmageddon/);
    expect(formatShareText({ ...TICKET, rageTier: 'rage-3' })).toContain('Ohmageddon: rage-3');
  });

  it('embeds a machine-readable code alongside the prose', () => {
    expect(formatShareText(TICKET)).toContain(`Code: ${formatShareCode(TICKET)}`);
  });
});

describe('parseShareText (plan §30)', () => {
  it('round-trips every difficulty and tier', () => {
    const tiers = [null, 'rage-1', 'rage-2', 'rage-3', 'rage-4'] as const;
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      for (const rageTier of tiers) {
        const ticket: ShareTicket = { ...TICKET, difficulty, rageTier };
        const parsed = parseShareText(formatShareText(ticket), FALLBACK);
        expect(parsed).toMatchObject({
          seed: ticket.seed,
          difficulty,
          mode: 'diagnosis',
          rageTier,
        });
      }
    }
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
    const original = buildDiagnosisScenario({ seed: 482_917, difficulty: 'advanced' });
    const parsed = parseShareText(
      formatShareText({
        seed: original.seed,
        difficulty: original.difficulty,
        mode: 'diagnosis',
        generatorVersion: original.generatorVersion,
        rageTier: null,
      }),
      FALLBACK,
    );
    expect(parsed).not.toBeNull();

    const replayed = buildDiagnosisScenario({
      seed: parsed!.seed,
      difficulty: parsed!.difficulty,
    });
    expect(replayed.challengeId).toBe(original.challengeId);
    expect(replayed.faultedCircuit).toEqual(original.faultedCircuit);
    expect(replayed.faults.map((f) => f.fault.type)).toEqual(
      original.faults.map((f) => f.fault.type),
    );
  });

  it('a rage ticket replays the same rage exercise', () => {
    const original = buildDiagnosisScenario({
      seed: 77_001,
      difficulty: 'intermediate',
      rageTier: 'rage-3',
    });
    const parsed = parseShareText(
      formatShareText({
        seed: original.seed,
        difficulty: original.difficulty,
        mode: 'rage',
        generatorVersion: original.generatorVersion,
        rageTier: 'rage-3',
      }),
      FALLBACK,
    );
    expect(parsed?.rageTier).toBe('rage-3');

    const replayed = buildDiagnosisScenario({
      seed: parsed!.seed,
      difficulty: parsed!.difficulty,
      rageTier: parsed!.rageTier ?? undefined,
    });
    expect(replayed.challengeId).toBe(original.challengeId);
    expect(replayed.faultedCircuit).toEqual(original.faultedCircuit);
  });
});
