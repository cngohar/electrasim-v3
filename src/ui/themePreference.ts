import type { ColorScheme } from '../store/settingsStore';

export type ResolvedTheme = 'light' | 'dark';

export const DARK_MODE_QUERY = '(prefers-color-scheme: dark)';
const THEME_HINT_KEY = 'electrasim:app-theme-hint';
const SITE_THEME_KEY = 'electrasim:color-scheme';

export function resolveThemePreference(
  preference: ColorScheme,
  systemDark = window.matchMedia(DARK_MODE_QUERY).matches,
): ResolvedTheme {
  return preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
}

export function readThemeHint(): ResolvedTheme | null {
  try {
    const value =
      window.localStorage.getItem(THEME_HINT_KEY) || window.localStorage.getItem(SITE_THEME_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export function applyDocumentTheme(theme: ResolvedTheme, persistHint = true): void {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.dataset.appTheme = theme;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#111827' : '#2563eb');
  if (!persistHint) return;
  try {
    window.localStorage.setItem(THEME_HINT_KEY, theme);
    window.localStorage.setItem(SITE_THEME_KEY, theme);
  } catch {
    // The current page still receives the theme when storage is unavailable.
  }
}
