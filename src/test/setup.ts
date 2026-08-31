/**
 * Vitest global setup — runs before each test file.
 *
 * Adds @testing-library/jest-dom matchers (toBeInTheDocument, etc.) and
 * cleans up the DOM after each test to prevent cross-test leakage.
 */
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll } from 'vitest';
import { ensureEmojiGlyphs } from '../lib/emoji/emojiSvg';

// The Twemoji artwork table is lazy-loaded in the app; tests assert on the
// rendered artwork synchronously, so load it once before every test file.
beforeAll(async () => {
  await ensureEmojiGlyphs();
});

afterEach(() => {
  cleanup();
});

// Polyfill: jsdom doesn't implement matchMedia; useDevice and others need it.
if (typeof window !== 'undefined' && !window.matchMedia) {
  // biome-ignore lint/suspicious/noExplicitAny: minimal polyfill
  (window as any).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
