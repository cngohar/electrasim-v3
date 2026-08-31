/**
 * emojiSvg.ts — resolve icon keys to inline Twemoji SVG markup / data URIs.
 *
 * Callers pass either a semantic icon name (`'bolt'`) or an emoji character
 * (e.g. U+26A1 HIGH VOLTAGE SIGN, including VS16/ZWJ/flag sequences) and
 * receive the matching vector artwork, so no emoji font is ever involved in
 * rendering.
 *
 * The artwork table (`./glyphs`, ~90 KB of SVG paths) is loaded **lazily**:
 * it is not part of the initial application chunk. `ensureEmojiGlyphs()`
 * starts the fetch (called once from `src/main.tsx` at startup, in parallel
 * with app boot), and every resolver degrades gracefully — returning null
 * with the caller's existing fallback — until the table arrives. UI surfaces
 * re-render when the artwork is ready via `subscribeToEmojiGlyphs` /
 * `useEmojiGlyphsReady` (src/ui/hooks), so nothing flashes a wrong glyph.
 */

type GlyphModule = typeof import('./glyphs');

// U+FE0F variation selector (written as a code point so the built bundle
// never ships a raw emoji variation selector character).
const FE0F = String.fromCodePoint(0xfe0f);

/**
 * Twemoji artwork viewBox. Duplicated from `./glyphs` so that this module —
 * and everything that imports it — stays out of the initial bundle; a unit
 * test asserts the two constants never drift apart.
 */
export const EMOJI_GLYPH_VIEWBOX = '0 0 36 36';

/** Lazily-loaded artwork table (null until `ensureEmojiGlyphs()` resolves). */
let glyphsModule: GlyphModule | null = null;
let loadPromise: Promise<void> | null = null;

/** listeners notified exactly once, when the artwork table becomes available. */
const readyListeners = new Set<() => void>();

/**
 * Load the Twemoji artwork table (idempotent). Resolves when resolvers can
 * return artwork. Never rejects — a failed fetch keeps the text fallbacks.
 */
export function ensureEmojiGlyphs(): Promise<void> {
  loadPromise ??= import('./glyphs')
    .then((module) => {
      glyphsModule = module;
      for (const listener of readyListeners) listener();
    })
    .catch(() => {
      // Allow a retry after a transient chunk failure (offline first load).
      loadPromise = null;
    });
  return loadPromise;
}

/** True once the artwork table is loaded and resolvers can succeed. */
export function emojiGlyphsLoaded(): boolean {
  return glyphsModule !== null;
}

/**
 * Subscribe to artwork readiness (for `useSyncExternalStore`). The listener
 * fires once, immediately after the table loads; returns an unsubscribe fn.
 */
export function subscribeToEmojiGlyphs(listener: () => void): () => void {
  if (emojiGlyphsLoaded()) {
    listener();
    return () => {};
  }
  readyListeners.add(listener);
  return () => {
    readyListeners.delete(listener);
  };
}

/**
 * Non-emoji symbols kept as plain text glyphs (drawn by the UI text font,
 * never by an emoji font), keyed by the semantic names used in component
 * definitions.
 */
export const EMOJI_TEXT_SYMBOLS: Record<string, string> = {
  /** U+23DA earth-ground symbol (not an emoji in any Unicode release). */
  ground: '\u23DA',
};

/** Normalise an emoji character or sequence to its Twemoji asset key
 *  (e.g. U+26A1 with VS16 → `'26a1'`, the GB flag pair → `'1f1ec-1f1e7'`,
 *  U+26A0 with VS16 → `'26a0'`). */
export function emojiAssetKey(emoji: string): string | null {
  const cps: number[] = [];
  for (const ch of emoji.replaceAll(FE0F, '')) {
    const cp = ch.codePointAt(0);
    if (cp === undefined) continue;
    if (cp === 0x200d) {
      cps.push(cp); // ZWJ sequences map to combined assets (e.g. 1f9d1-200d-1f527)
      continue;
    }
    cps.push(cp);
  }
  if (cps.length === 0) return null;
  return cps.map((c) => c.toString(16)).join('-');
}

/** Resolve a semantic name (`'bolt'`) or an emoji character (U+26A1 etc.) to
 *  the inner SVG markup (paths/shapes only). Returns null when there is no
 *  vector replica — including while the lazy table is still loading — in
 *  which case callers should fall back to a plain text glyph. */
export function emojiGlyphBody(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed || !glyphsModule) return null;
  const table = glyphsModule.EMOJI_GLYPHS;
  if (table[trimmed]) return table[trimmed];
  const asset = emojiAssetKey(trimmed);
  if (asset && table[asset]) return table[asset];
  return null;
}

/** Full standalone `<svg>` markup for an icon, or null when unavailable. */
export function emojiSvgMarkup(key: string, size?: number): string | null {
  const body = emojiGlyphBody(key);
  if (!body) return null;
  const dims = size !== undefined ? ` width="${size}" height="${size}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${EMOJI_GLYPH_VIEWBOX}"${dims}` +
    ` role="presentation" aria-hidden="true">${body}</svg>`
  );
}

/** `data:image/svg+xml` URI for use inside SVG scenes (`<image href=…>`) and
 *  generated HTML (e.g. the printable EIC report), or null when unavailable. */
export function emojiDataUri(key: string, size?: number): string | null {
  const markup = emojiSvgMarkup(key, size);
  if (!markup) return null;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(markup)}`;
}

/** Text glyph for a symbol that is intentionally not an emoji (e.g. `ground`). */
export function emojiTextSymbol(key: string): string | null {
  return EMOJI_TEXT_SYMBOLS[key.trim()] ?? null;
}
