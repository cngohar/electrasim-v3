/**
 * scroll-top.js — reveal the back-to-top button once the reader is past the fold.
 *
 * Re-binds after every view transition (see boot.js) because the button lives in
 * <body> and is replaced on swap. The scroll listener is scoped to the run's
 * AbortSignal so navigations do not leave orphaned handlers on `window`.
 */
window.ElectraSim.onReady(({ signal }) => {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;

  const sync = () => btn.classList.toggle('visible', window.scrollY > 400);

  window.addEventListener('scroll', sync, { passive: true, signal });
  btn.addEventListener(
    'click',
    () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    },
    { signal },
  );

  // A soft navigation can land mid-page (anchor or restored scroll) — paint the
  // correct state immediately instead of waiting for the first scroll event.
  sync();
});
