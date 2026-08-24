(() => {
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

  button.addEventListener('click', () => setOpen(!isOpen()));

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => close(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close(true);
  });

  document.addEventListener('pointerdown', (e) => {
    if (!menu.contains(e.target) && !button.contains(e.target)) close(false);
  });

  window.matchMedia('(min-width: 681px)').addEventListener('change', (e) => {
    if (e.matches) close(false);
  });
})();
