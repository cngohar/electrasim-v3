(() => {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;
  window.addEventListener(
    'scroll',
    () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    },
    { passive: true },
  );
  btn.addEventListener('click', () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  });
})();
