/**
 * theme.js — pre-paint theme resolution, ClientRouter-safe.
 *
 * Loaded blocking in <head> so `data-theme` is on <html> before first paint.
 *
 * View-transition contract: Astro's `swapRootAttributes` copies the incoming
 * document's <html> attributes verbatim, which deletes the `data-theme` we set
 * at runtime. `astro:after-swap` fires inside the transition callback (before
 * the new frame is painted), so re-applying there restores the theme with no
 * flash. `deselectScripts` stops this file re-executing, so every listener is
 * registered once on `document` — which survives the swap — and the toggle is
 * handled by delegation rather than per-node binding, so a re-render can never
 * double-bind (which would toggle twice and appear to do nothing).
 */
(() => {
  const STORAGE_KEY = 'electrasim:color-scheme';
  const APP_HINT_KEY = 'electrasim:app-theme-hint';
  const DARK_QUERY = '(prefers-color-scheme: dark)';
  const LIGHT_THEME_COLOR = '#3b82f6';
  const DARK_THEME_COLOR = '#11161a';
  const root = document.documentElement;
  const media = window.matchMedia(DARK_QUERY);

  const readPreference = () => {
    try {
      const stored =
        window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(APP_HINT_KEY);
      return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    } catch {
      return 'system';
    }
  };

  const resolvePreference = (preference) =>
    preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;

  /** Idempotent: only writes attributes, so it is safe to call on every swap. */
  const updateControls = (resolved) => {
    const nextLabel = resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.setAttribute('aria-label', nextLabel);
      button.setAttribute('aria-pressed', String(resolved === 'dark'));
      button.setAttribute('title', nextLabel);
      button.dataset.resolvedTheme = resolved;
    });
  };

  const applyPreference = (preference) => {
    const resolved = resolvePreference(preference);
    root.dataset.theme = resolved;
    root.dataset.resolvedTheme = resolved;
    root.style.colorScheme = resolved;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', resolved === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
    updateControls(resolved);
  };

  let preference = readPreference();
  applyPreference(preference);

  /* Delegated toggle: immune to <body> being replaced by a view transition. */
  document.addEventListener('click', (event) => {
    const target = event.target;
    const toggle = target instanceof Element ? target.closest('[data-theme-toggle]') : null;
    if (!toggle) return;
    const next = resolvePreference(preference) === 'dark' ? 'light' : 'dark';
    preference = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
      window.localStorage.setItem(APP_HINT_KEY, next);
    } catch {
      // The selected theme still applies for this page when storage is unavailable.
    }
    applyPreference(preference);
  });

  /* Root attributes are wiped by the swap — restore them before the repaint. */
  document.addEventListener('astro:after-swap', () => {
    applyPreference(preference);
  });

  /* New <body> means new toggle buttons; re-sync their labels. */
  document.addEventListener('astro:page-load', () => {
    updateControls(resolvePreference(preference));
  });

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => updateControls(resolvePreference(preference)),
      { once: true },
    );
  } else {
    updateControls(resolvePreference(preference));
  }

  media.addEventListener('change', () => {
    if (preference === 'system') applyPreference(preference);
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY && event.key !== APP_HINT_KEY) return;
    preference = readPreference();
    applyPreference(preference);
  });
})();
