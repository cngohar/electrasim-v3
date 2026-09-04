/**
 * Schematic activator — "only animate what is on screen".
 *
 * Every looping animation in global.css ships `animation-play-state: paused`.
 * This flips `.is-live` on a section while it intersects the viewport, so a
 * long page never pays for pulses the reader cannot see.
 *
 * Re-runs after every view transition (see boot.js): the swapped-in <body> has
 * fresh `[data-live]` nodes that the previous observer knows nothing about, and
 * the old observer is disconnected on cleanup so they never stack up.
 */
window.ElectraSim.onReady(({ onCleanup }) => {
  const targets = document.querySelectorAll('[data-live]');
  if (targets.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    // No observer: just run everything. Correctness beats cleverness.
    for (const el of targets) el.classList.add('is-live');
    return;
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        entry.target.classList.toggle('is-live', entry.isIntersecting);
      }
    },
    { rootMargin: '120px 0px' },
  );

  for (const el of targets) io.observe(el);
  onCleanup(() => io.disconnect());
});
