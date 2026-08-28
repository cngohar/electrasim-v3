/**
 * tool-share.js — shareable calculator URLs (common helper)
 *
 * Electricians send each other scenarios by link: the inputs are encoded in
 * the query string, and every state change also rewrites the URL via
 * history.replaceState (no reloads, no history spam) so "copy link" always
 * captures the live calculation. Load order: include this file BEFORE the
 * tool engine (both defer → document order preserved).
 *
 *   ToolShare.pushParams({ standard, system, voltage, ... })  // sync URL
 *   ToolShare.readParams().get('voltage')                     // parse query
 *   ToolShare.copyCurrentUrl(buttonEl)                        // clipboard+toast
 */
(() => {
  /** Merge the given entries into the page URL's query string (clean). */
  function pushParams(entries) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(entries)) {
      if (value === undefined || value === null || value === '') continue;
      qs.set(key, String(value));
    }
    const next = qs.toString() ? `${location.pathname}?${qs.toString()}` : location.pathname;
    if (next !== `${location.pathname}${location.search}`) {
      history.replaceState(null, '', next);
    }
  }

  function readParams() {
    return new URLSearchParams(location.search);
  }

  /** Number from params within bounds, else `fallback` (NaN-safe). */
  function numParam(
    params,
    key,
    { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY, fallback = undefined } = {},
  ) {
    const raw = params.get(key);
    if (raw === null || raw === '') return fallback;
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n) || n < min || n > max) return fallback;
    return n;
  }

  /**
   * Copy the current URL; flashes "copied" state on the invoking button.
   * Only the button's [data-share-label] text is swapped when it has one, so
   * inline SVG icons in the button survive the temporary label change.
   */
  function copyCurrentUrl(btn) {
    const label = btn ? btn.querySelector('[data-share-label]') : null;
    const target = label || btn;
    const mark = () => {
      if (!target) return;
      const prev = target.textContent;
      target.textContent = 'Link copied ✓';
      btn.classList.add('copied');
      window.setTimeout(() => {
        target.textContent = prev;
        btn.classList.remove('copied');
      }, 1600);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(location.href).then(mark, mark);
    } else {
      const ta = document.createElement('textarea');
      ta.value = location.href;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        // @ts-ignore legacy fallback for pre-Clipboard-API browsers
        document.execCommand?.('copy');
      } catch {
        /* ignore */
      }
      ta.remove();
      mark();
    }
  }

  window.ToolShare = { pushParams, readParams, numParam, copyCurrentUrl };
})();
