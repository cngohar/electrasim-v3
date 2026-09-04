/**
 * site-nav.js — burger menu open/close, focus handling and dismissal.
 *
 * Re-binds after every view transition (see boot.js). All listeners carry the
 * run's AbortSignal, including the `matchMedia` change listener, so repeated
 * navigations cannot stack duplicate handlers that fight over `body.overflow`.
 */
window.ElectraSim.onReady(({ signal, onCleanup }) => {
  const button = document.getElementById('nav-toggle');
  const menu = document.getElementById('nav-mobile-menu');
  if (!button || !menu) return;

  const focusables = () => menu.querySelectorAll('a[href], button:not([disabled])');

  const isOpen = () => menu.classList.contains('open');

  const setOpen = (open) => {
    menu.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      const first = focusables()[0];
      if (first) first.focus();
    }
  };

  const close = (restoreFocus) => {
    if (!isOpen()) return;
    setOpen(false);
    if (restoreFocus) button.focus();
  };

  button.addEventListener('click', () => setOpen(!isOpen()), { signal });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => close(false), { signal });
  });

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') close(true);
    },
    { signal },
  );

  document.addEventListener(
    'pointerdown',
    (e) => {
      if (!menu.contains(e.target) && !button.contains(e.target)) close(false);
    },
    { signal },
  );

  window.matchMedia('(min-width: 681px)').addEventListener(
    'change',
    (e) => {
      if (e.matches) close(false);
    },
    { signal },
  );

  // A soft navigation while the menu is open would otherwise leave the scroll
  // lock applied to the incoming page.
  onCleanup(() => {
    document.body.style.overflow = '';
  });
});
