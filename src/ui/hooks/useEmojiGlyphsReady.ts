/**
 * useEmojiGlyphsReady — re-render hook for the lazily-loaded Twemoji table.
 *
 * The artwork lives outside the initial bundle (see src/lib/emoji/emojiSvg).
 * Any component that draws emoji artwork adds this hook so it re-renders
 * once, the moment the table is available — before that, resolvers return
 * null and the component's sized placeholder / text fallback is shown.
 *
 * The hook returns true when artwork resolvers can succeed.
 */
import { useSyncExternalStore } from 'react';
import { emojiGlyphsLoaded, subscribeToEmojiGlyphs } from '../../lib/emoji/emojiSvg';

export function useEmojiGlyphsReady(): boolean {
  return useSyncExternalStore(subscribeToEmojiGlyphs, emojiGlyphsLoaded);
}
