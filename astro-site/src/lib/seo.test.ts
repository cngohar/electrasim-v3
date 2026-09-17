/**
 * The helpers behind the snippet-length gate.
 *
 * Their job is not "make it shorter" — it is "cut it somewhere a human would
 * have chosen", because Google truncates at roughly the same point and does it
 * mid-word if we leave it to. These tests pin the decisions: sentence over
 * word boundary, brand segment before clause, clause before a bare cut, and
 * punctuation that is not a sentence end left alone.
 */

import { describe, expect, it } from 'vitest';
import { MAX_DESCRIPTION, MAX_TITLE, metaDescription, metaTitle } from './seo';

describe('metaDescription', () => {
  it('leaves copy that already fits alone', () => {
    const text = 'Inside a cooker control unit: what each terminal does.';
    expect(metaDescription(text)).toBe(text);
  });

  it('collapses whitespace', () => {
    expect(metaDescription('  spaced   out   copy  ')).toBe('spaced out copy');
  });

  it('prefers to end on a complete sentence', () => {
    const text =
      'A socket outlet fed through an RCBO, rather than a plain MCB. Its protective earth runs straight from the earth terminal to the metal back box and beyond, sleeved at every accessory, with a fly-lead at each.';
    const result = metaDescription(text);
    expect(result).toBe('A socket outlet fed through an RCBO, rather than a plain MCB.');
    expect(result.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
  });

  it('falls back to a word boundary when no sentence fits', () => {
    const text = 'word '.repeat(60).trim();
    const result = metaDescription(text);
    expect(result.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
    expect(result.endsWith(' ')).toBe(false);
    expect(result).toBe(text.slice(0, result.length));
  });

  it('does not end a snippet at an abbreviation', () => {
    /* "etc." sits well inside the budget; a naive cut would have stopped the
       snippet there instead of at the real sentence end further along. */
    const text =
      'Protective devices, enclosures, cable routing and other items etc. are all covered here. Then the page carries on describing the rest of the wiring at considerable length.';
    const result = metaDescription(text);
    expect(result).toBe(
      'Protective devices, enclosures, cable routing and other items etc. are all covered here.',
    );
    expect(result.endsWith('etc.')).toBe(false);
  });

  it('does not end a snippet at a decimal point', () => {
    const text =
      'A 1.5 mm conductor sized for the load, plus its CPC, the enclosure and the fixings. Then a much longer tail that pushes the copy well past the snippet budget and keeps on going for a while.';
    const result = metaDescription(text);
    expect(result).toBe(
      'A 1.5 mm conductor sized for the load, plus its CPC, the enclosure and the fixings.',
    );
    expect(result.startsWith('A 1.5 mm')).toBe(true);
  });

  it('honours a custom limit', () => {
    expect(metaDescription('one two three four five six seven', 11).length).toBeLessThanOrEqual(11);
  });

  it('does not end a snippet on a connector word', () => {
    /* A word-boundary cut can land right after "and" or "to the", which reads
       as truncation rather than an ending — the exact thing this helper is
       here to prevent. The cut in this copy falls after "and". */
    const text = `${'cable '.repeat(14)}and the earthing conductor is then run to the main earthing terminal and labelled`;
    const result = metaDescription(text);
    expect(result.endsWith('terminal')).toBe(true);
    expect(/\s(?:and|the|to|of)$/.test(result)).toBe(false);
  });

  it('never returns copy longer than the limit', () => {
    const long = `${'A fairly long clause about wiring. '.repeat(12)}`;
    expect(metaDescription(long).length).toBeLessThanOrEqual(MAX_DESCRIPTION);
  });
});

describe('metaTitle', () => {
  it('leaves a title that fits alone', () => {
    const title = 'MCB Anatomy — ElectraSim';
    expect(metaTitle(title)).toBe(title);
  });

  it('drops the brand segment when the rest stands on its own', () => {
    const result = metaTitle(
      'How to Wire a Bathroom: Complete Zone-by-Zone UK Guide | ElectraSim Blog',
    );
    expect(result).toBe('How to Wire a Bathroom: Complete Zone-by-Zone UK Guide');
    expect(result.length).toBeLessThanOrEqual(MAX_TITLE);
  });

  it('falls back to the leading clause when the whole head is still too long', () => {
    const result = metaTitle(
      'How to Wire a Ceiling Rose and Light Fitting: Loop-In, Junction Box and 3-Plate Methods | ElectraSim Blog',
    );
    expect(result).toBe('How to Wire a Ceiling Rose and Light Fitting');
    expect(result.length).toBeLessThanOrEqual(MAX_TITLE);
  });

  it('does not leave a dangling ampersand when the cut lands before a conjunction', () => {
    /* The homepage title was 70 characters, so the word-boundary cut fell
       between "Simulator" and "Circuit Trainer" and shipped "…Simulator &".
       The landing copy now fits, but a title that does not must not end here. */
    const result = metaTitle(
      'ElectraSim — Free Online Electrical Wiring Simulator & Circuit Trainer',
    );
    expect(result).toBe('ElectraSim — Free Online Electrical Wiring Simulator');
    expect(result.endsWith('&')).toBe(false);
  });

  it('keeps the subject rather than shaving to a stub', () => {
    /* "ElectraSim — Electrical Components Anatomy Guide" would collapse to the
       brand alone if the floor were not enforced, which is worse than a cut. */
    const result = metaTitle(
      'ElectraSim — Electrical Components Anatomy Guide (MCB, RCD, Bulb, Socket)',
    );
    expect(result.length).toBeGreaterThan(20);
    expect(result.length).toBeLessThanOrEqual(MAX_TITLE);
  });

  it('never returns a title longer than the limit', () => {
    const long = 'Kirchhoff’s Laws Explained: KCL and KVL with Worked Examples | ElectraSim Blog';
    expect(metaTitle(long).length).toBeLessThanOrEqual(MAX_TITLE);
  });
});
