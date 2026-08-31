/**
 * EmojiGlyph — inline SVG replica of a pictograph, for the simulator UI.
 *
 * Drop-in replacement for a literal emoji character: it draws the official
 * Twemoji artwork (see src/lib/emoji/glyphs.ts) as a vector, so the glyph is
 * pixel-identical on every OS/browser — no emoji-font dependency, no blurry
 * scaling, no missing-glyph boxes — and it never triggers a font fallback.
 *
 * Accepts semantic names (`'bolt'`), emoji characters (U+26A1 etc., flags,
 * VS16 variants) and space-separated lists (`'flag-gb flag-eu'`). Purely
 * decorative: hidden from assistive tech by default, like the emoji it
 * replaces — the visible text next to it always carries the meaning.
 */

import type { CSSProperties } from 'react';
import {
  EMOJI_GLYPH_VIEWBOX,
  emojiGlyphBody,
  emojiGlyphsLoaded,
  emojiTextSymbol,
} from '../../lib/emoji/emojiSvg';
import { useEmojiGlyphsReady } from '../hooks/useEmojiGlyphsReady';

interface EmojiGlyphProps {
  /** Icon name (e.g. "bolt") or emoji character (e.g. U+26A1); may be a
   *  space-separated list for multi-icon rows (e.g. dual flags). */
  emoji: string;
  /** Rendered pixel size; defaults to 20px. */
  size?: number;
  className?: string;
  style?: CSSProperties;
}

/** Renders one or more Twemoji replicas sized to the surrounding text. */
export function EmojiGlyph({ emoji, size = 20, className, style }: EmojiGlyphProps) {
  // The artwork table loads lazily (outside the initial bundle); re-render
  // once when it arrives so the vector replicas replace the placeholders.
  useEmojiGlyphsReady();
  const ready = emojiGlyphsLoaded();
  const parts = emoji.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;

  return (
    <span
      className={['inline-flex items-center justify-center align-[-0.15em]', className ?? '']
        .filter(Boolean)
        .join(' ')}
      style={style}
      aria-hidden="true"
    >
      {parts.map((part, index) => {
        const body = emojiGlyphBody(part);
        const text = emojiTextSymbol(part);
        if (body) {
          return (
            <svg
              key={index}
              viewBox={EMOJI_GLYPH_VIEWBOX}
              width={size}
              height={size}
              focusable="false"
              aria-hidden="true"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: body is build-time Twemoji artwork from src/lib/emoji/glyphs.ts (never user input)
              dangerouslySetInnerHTML={{ __html: body }}
            />
          );
        }
        if (!ready) {
          // Artwork table still loading — hold a sized, invisible placeholder
          // so layout does not shift and no wrong glyph flashes.
          return (
            <span
              key={index}
              aria-hidden="true"
              style={{ display: 'inline-block', width: size, height: size }}
            />
          );
        }
        // No vector replica (rare: deliberate non-emoji symbols) — draw the
        // plain text glyph, which comes from the UI font, never an emoji font.
        return (
          <span
            key={index}
            className="font-medium leading-none"
            style={{ fontSize: Math.round(size * 0.95) }}
          >
            {text ?? part}
          </span>
        );
      })}
    </span>
  );
}
