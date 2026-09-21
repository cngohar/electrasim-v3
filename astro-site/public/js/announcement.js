/**
 * announcement.js — announcement modal popup and floating trigger button.
 *
 * Lifecycle: Re-binds after every view-transition swap via window.ElectraSim.onReady.
 * Auto-opens 2000ms after website load once per user (persisted in localStorage).
 * The bottom-left floating button ("Important Announcement") re-opens the popup on click.
 */
window.ElectraSim.onReady(({ signal }) => {
  const root = document.getElementById('release-popup');
  const trigger = document.getElementById('announcement-trigger');
  if (!root) return;

  const storageKey = root.dataset.releaseKey || 'electrasim:announcement-paused';
  let previouslyFocused = null;
  let autoTimer = null;

  function open() {
    if (autoTimer) {
      window.clearTimeout(autoTimer);
      autoTimer = null;
    }
    previouslyFocused = document.activeElement;
    root.removeAttribute('hidden');
    try {
      window.localStorage.setItem(storageKey, 'shown');
    } catch {
      /* private mode */
    }
    const primaryBtn = root.querySelector('.rp-btn-primary');
    primaryBtn?.focus?.();
  }

  function close() {
    root.setAttribute('hidden', '');
    try {
      window.localStorage.setItem(storageKey, 'shown');
    } catch {
      /* ignore */
    }
    previouslyFocused?.focus?.();
  }

  if (trigger) {
    trigger.addEventListener('click', open, { signal });
  }

  root.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (target?.closest('[data-rp-close]')) {
        close();
      }
    },
    { signal },
  );

  document.addEventListener(
    'keydown',
    (event) => {
      if (root.hasAttribute('hidden')) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === 'Tab') {
        const focusables = Array.from(
          root.querySelectorAll('.rp-x, .rp-btn-primary, .rp-btn-secondary'),
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    },
    { signal },
  );

  // Auto-appear after 2 seconds on website load if not previously shown
  let alreadyShown = false;
  try {
    alreadyShown = window.localStorage.getItem(storageKey) === 'shown';
  } catch {
    alreadyShown = false;
  }

  if (!alreadyShown) {
    autoTimer = window.setTimeout(open, 2000);
    signal.addEventListener('abort', () => {
      if (autoTimer) {
        window.clearTimeout(autoTimer);
        autoTimer = null;
      }
    });
  }
});
