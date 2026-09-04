/**
 * blog-article.js
 * ElectraSim Blog — Long-article UX enhancements for the server-rendered TOC:
 *   1. Scroll-spy: highlights the currently-read section in the TOC.
 *   2. Collapsed-by-default TOC on narrow viewports (open on desktop).
 *   3. Hover permalink ("#") buttons on H2/H3 for deep-link sharing.
 * Progressive enhancement only — links/anchors work fully without JS.
 *
 * Re-runs after every view transition (see boot.js): article → article soft
 * navigation swaps in a brand-new TOC and headings, so the previous run's
 * observer and permalink buttons are torn down and rebuilt.
 */

window.ElectraSim.onReady(({ signal, onCleanup }) => {
  const tocNav = document.querySelector('.art-toc');
  if (!tocNav) return;

  const tocBox = tocNav.querySelector('.art-toc-details');
  const links = Array.from(tocNav.querySelectorAll('a[data-toc-link]'));
  if (links.length === 0) return;

  const DESKTOP_MQ = window.matchMedia('(min-width: 1360px)');
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ── 1. Viewport-adaptive TOC collapse ───────────────────────────── */
  function applyViewportMode() {
    if (!tocBox) return;
    if (DESKTOP_MQ.matches) {
      tocBox.setAttribute('open', '');
    } else {
      tocBox.removeAttribute('open');
    }
  }
  applyViewportMode();
  if (typeof DESKTOP_MQ.addEventListener === 'function') {
    DESKTOP_MQ.addEventListener('change', applyViewportMode, { signal });
  }

  /* ── 2. Scroll-spy via IntersectionObserver ──────────────────────── */
  const targets = [];
  const bySlug = new Map();
  for (const link of links) {
    const slug = link.getAttribute('data-toc-link');
    if (!slug) continue;
    const heading = document.getElementById(slug);
    if (!(heading instanceof HTMLElement)) continue;
    const entry = { slug, link, heading };
    targets.push(entry);
    bySlug.set(slug, entry);
  }

  const visible = new Set();

  function paintActive() {
    // Active = the visible heading closest to the top; fall back to the last
    // heading scrolled past when nothing is intersecting.
    let activeSlug = null;
    if (visible.size > 0) {
      let best = null;
      for (const slug of visible) {
        const entry = bySlug.get(slug);
        if (!entry) continue;
        const top = entry.heading.getBoundingClientRect().top;
        if (!best || top < best.top) best = { top, slug };
      }
      activeSlug = best ? best.slug : null;
    } else {
      for (const entry of targets) {
        if (entry.heading.getBoundingClientRect().top < 120) activeSlug = entry.slug;
      }
    }
    for (const { link, slug } of targets) {
      const on = slug === activeSlug;
      link.classList.toggle('is-active', on);
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const id = e.target.id;
          if (e.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        paintActive();
      },
      // Active zone: top ~15% of viewport down to ~35% — matches where a
      // reader's eye sits after an anchored jump (header offset included).
      { rootMargin: '-72px 0px -62% 0px', threshold: [0, 0.01] },
    );
    for (const { heading } of targets) observer.observe(heading);
    onCleanup(() => observer.disconnect());
  }

  /* ── 3. Section deep-link sharing (permalink "#" buttons) ────────── */
  const seen = new Set();
  for (const { heading } of targets) {
    if (seen.has(heading.id)) continue;
    seen.add(heading.id);
    // A re-run on the same DOM (e.g. back-navigation restoring a cached page)
    // must not append a second "#" to every heading.
    if (heading.querySelector(':scope > .h-anchor')) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'h-anchor';
    btn.textContent = '#';
    btn.setAttribute('aria-label', `Copy link to section: ${heading.textContent || heading.id}`);
    btn.addEventListener(
      'click',
      () => {
        const url = `${location.origin}${location.pathname}#${heading.id}`;
        const markCopied = () => {
          btn.classList.add('copied');
          btn.textContent = '✓';
          window.setTimeout(() => {
            btn.classList.remove('copied');
            btn.textContent = '#';
          }, 1600);
        };
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(url).then(markCopied).catch(markCopied);
        } else {
          markCopied();
        }
        history.replaceState(null, '', `#${heading.id}`);
      },
      { signal },
    );
    heading.appendChild(btn);
  }

  /* ── 4. Smooth-ish instant jump for TOC clicks (respects reduced motion) ─ */
  tocNav.addEventListener(
    'click',
    (e) => {
      const a = e.target instanceof Element ? e.target.closest('a[data-toc-link]') : null;
      if (!a) return;
      if (!DESKTOP_MQ.matches && tocBox) tocBox.removeAttribute('open');
      const slug = a.getAttribute('data-toc-link');
      const el = slug ? document.getElementById(slug) : null;
      if (!el) return;
      e.preventDefault();
      history.replaceState(null, '', `#${slug}`);
      el.scrollIntoView({ behavior: REDUCED_MOTION.matches ? 'auto' : 'smooth', block: 'start' });
      // Move keyboard focus so screen-reader/keyboard users land on the section.
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    },
    { signal },
  );
});
