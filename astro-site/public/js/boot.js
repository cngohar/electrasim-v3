/**
 * boot.js — one lifecycle contract for every hand-written script on the site.
 *
 * Why this exists
 * ---------------
 * `<ClientRouter />` swaps <body> and copies the incoming <html> attributes on
 * every soft navigation, and Astro's `deselectScripts` marks any script whose
 * `src` already ran as `data-astro-exec` so it is *not* re-executed. Every
 * behaviour on this site is a classic `defer` script that binds to elements
 * found at first paint, so after one client-side navigation the burger menu,
 * scroll-to-top, section animations, search palette, article permalinks and the
 * hero canvas were all bound to nodes that no longer exist in the document.
 *
 * The contract
 * ------------
 *   ElectraSim.onReady((ctx) => { ...bind... })
 *
 * `onReady` runs the callback once for the current page, then again after every
 * view-transition swap. `ctx.signal` is an AbortSignal that fires immediately
 * before the next run, so listeners registered with `{ signal: ctx.signal }`
 * and observers torn down in `ctx.onCleanup()` never accumulate across
 * navigations. Callbacks are keyed by generation, so the initial run and the
 * initial `astro:page-load` cannot double-fire.
 *
 * This must be the first deferred script in the document — classic deferred
 * scripts execute in document order, so `Base.astro` loads it in <head>.
 */
(() => {
  if (window.ElectraSim) return;

  /** Bumped on every swap; a callback re-runs when its recorded gen is stale. */
  let generation = 0;
  const runners = new Set();

  const domReady = () =>
    document.readyState === 'interactive' || document.readyState === 'complete';

  function runOne(runner) {
    if (runner.gen === generation) return;
    runner.gen = generation;

    // Tear down whatever the previous run registered before rebuilding it.
    runner.controller?.abort();
    for (const dispose of runner.cleanups.splice(0)) {
      try {
        dispose();
      } catch (error) {
        console.warn('[ElectraSim] cleanup failed', error);
      }
    }

    const controller = new AbortController();
    runner.controller = controller;

    try {
      runner.fn({
        signal: controller.signal,
        onCleanup: (dispose) => runner.cleanups.push(dispose),
      });
    } catch (error) {
      // One broken enhancement must not stop the rest of the page working.
      console.warn('[ElectraSim] init failed', error);
    }
  }

  function flush() {
    for (const runner of runners) runOne(runner);
  }

  window.ElectraSim = {
    onReady(fn) {
      const runner = { fn, gen: -1, controller: null, cleanups: [] };
      runners.add(runner);
      if (domReady()) runOne(runner);
      else document.addEventListener('DOMContentLoaded', () => runOne(runner), { once: true });
    },
  };

  document.addEventListener('DOMContentLoaded', flush);
  // Fires after the new <body> is in place, on soft navigations and on first load.
  document.addEventListener('astro:page-load', flush);
  // Invalidate before the swap so a stale callback can never bind to dead nodes.
  document.addEventListener('astro:before-swap', () => {
    generation += 1;
  });
})();
