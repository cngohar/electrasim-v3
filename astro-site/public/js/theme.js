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

  const bindControls = () => {
    updateControls(resolvePreference(preference));
    document.querySelectorAll('[data-theme-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
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
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindControls, { once: true });
  } else {
    bindControls();
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
