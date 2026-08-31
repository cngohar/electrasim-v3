/**
 * emojiSvg — lazy Twemoji table contract.
 *
 * The artwork lives outside the initial bundle (that is the point: the app's
 * entry chunk must stay inside the check:perf initial-JS budget). These tests
 * pin the load/ready lifecycle and the guardrails that make laziness safe:
 * null-with-fallback before load, artwork after, no wrong-glyph flash, and a
 * viewbox constant that cannot drift from the table it describes.
 */
import { describe, expect, it } from 'vitest';
import {
  EMOJI_GLYPH_VIEWBOX,
  emojiAssetKey,
  emojiDataUri,
  emojiGlyphBody,
  emojiGlyphsLoaded,
  emojiSvgMarkup,
  emojiTextSymbol,
  ensureEmojiGlyphs,
  subscribeToEmojiGlyphs,
} from './emojiSvg';
import { EMOJI_GLYPH_VIEWBOX as TABLE_VIEWBOX } from './glyphs';

describe('emojiSvg lazy table', () => {
  it('loads exactly once and flips the ready flag', async () => {
    // Test order is not guaranteed across files, so this must hold whether
    // or not another file already triggered the load.
    await ensureEmojiGlyphs();
    expect(emojiGlyphsLoaded()).toBe(true);
    // A second call resolves without re-notifying or throwing.
    await expect(ensureEmojiGlyphs()).resolves.toBeUndefined();
    expect(emojiGlyphsLoaded()).toBe(true);
  });

  it('notifies subscribers on readiness and unsubscribes cleanly', async () => {
    let calls = 0;
    const unsubscribe = subscribeToEmojiGlyphs(() => {
      calls += 1;
    });
    // Already loaded in this process → the contract fires immediately.
    expect(calls).toBe(1);
    unsubscribe();
    await ensureEmojiGlyphs();
    expect(calls).toBe(1);
  });

  it('resolves semantic names to artwork', async () => {
    await ensureEmojiGlyphs();
    expect(emojiGlyphBody('bolt')).toMatch(/^<path /);
    expect(emojiSvgMarkup('bolt', 14)).toContain('width="14"');
    expect(emojiDataUri('bolt')).toMatch(/^data:image\/svg\+xml/);
    // The table is keyed by semantic names only — an emoji character such as
    // U+26A1 maps to the Twemoji asset key '26a1', which has no entry, so the
    // resolver stays null and callers use their text fallback (pre-existing
    // shipped behaviour; every component definition passes a semantic name).
    expect(emojiGlyphBody('\u26A1\uFE0F')).toBeNull();
  });

  it('maps emoji sequences to Twemoji asset keys', () => {
    expect(emojiAssetKey('\u26A1\uFE0F')).toBe('26a1');
    expect(emojiAssetKey('\u26A0\uFE0F')).toBe('26a0');
    expect(emojiAssetKey('')).toBeNull();
  });

  it('returns null for unknown keys so callers keep their fallbacks', async () => {
    await ensureEmojiGlyphs();
    expect(emojiGlyphBody('definitely-not-a-glyph')).toBeNull();
    expect(emojiGlyphBody('  ')).toBeNull();
  });

  it('keeps deliberate non-emoji symbols as text glyphs', () => {
    expect(emojiTextSymbol('ground')).toBe('\u23DA');
    expect(emojiTextSymbol('bolt')).toBeNull();
  });

  it('exposes a viewbox identical to the artwork table it wraps', async () => {
    await ensureEmojiGlyphs();
    expect(EMOJI_GLYPH_VIEWBOX).toBe(TABLE_VIEWBOX);
  });
});
