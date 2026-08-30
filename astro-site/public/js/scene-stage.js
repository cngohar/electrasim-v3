/**
 * scene-stage.js — shared runtime for the toolbox' full-bleed visual stages.
 *
 * Used by every tool page that renders a live scene: it owns (a) fitting an
 * authored SVG canvas to whatever the stage box actually is, so the artwork is
 * edge-to-edge at every aspect ratio instead of letterboxed in page colour,
 * (b) the reduced-motion / pause plumbing, and (c) the small "paint" helper the
 * tools use to push calculator output into CSS custom properties.
 *
 * The same numbers live in `src/lib/tools/stage-spec.ts`, which the server render
 * uses for the initial viewBox; keep the two in step when tuning the caps.
 *
 * Load before the tool engine (both are `defer`, so document order is honoured).
 */
(() => {
  const REDUCED_MOTION = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener() {}, removeEventListener() {} };

  const CAPS = {
    /** scenery may widen to 2.6× the artwork before the view starts cropping */
    maxWiden: 2.6,
    /** …and heighten to 1.9× for tall/portrait stages */
    maxTaller: 1.9,
    /** never crop tighter than 72% of the artwork width (labels stay in frame) */
    minCropWidthRatio: 0.72,
  };

  /**
   * Measure the floating panels sitting over the frame and turn them into
   * padding. A panel only counts when it overlaps the frame vertically, so in a
   * stacked layout (where the panels move below the scene) the padding collapses
   * to zero on its own — no second copy of the media query to keep in sync.
   */
  function panelPadding(frame, selector) {
    const pad = { left: 0, right: 0, top: 0, bottom: 0 };
    const frameRect = frame.getBoundingClientRect();
    if (!(frameRect.width > 0) || !(frameRect.height > 0)) return pad;
    for (const el of document.querySelectorAll(selector || '#panel-wrap .ts-panel')) {
      // defensive: an unmatched/odd node must never abort the fit (an
      // exception here silently leaves the artwork at its authored viewBox,
      // which looks exactly like the letterboxing bug this file exists to fix)
      if (el.hidden || typeof el.getBoundingClientRect !== 'function') continue;
      const r = typeof el.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : null;
      if (!r) continue;
      if (!(r.width > 1) || !(r.height > 1)) continue;
      const overlapY = Math.min(r.bottom, frameRect.bottom) - Math.max(r.top, frameRect.top);
      if (overlapY <= 4) continue;
      const centre = r.left + r.width / 2;
      if (centre < frameRect.left + frameRect.width / 2) {
        pad.left = Math.max(pad.left, r.right - frameRect.left);
      } else {
        pad.right = Math.max(pad.right, frameRect.right - r.left);
      }
    }
    // a panel wider than half the frame must not squeeze the scene out entirely
    const maxPad = Math.max(24, frameRect.width * 0.42);
    pad.left = Math.min(pad.left, maxPad);
    pad.right = Math.min(pad.right, maxPad);
    return pad;
  }

  /**
   * Fit a viewBox to the stage box. The returned box always carries the stage's
   * exact aspect ratio — that is what removes the flat side bars on wide and
   * ultrawide screens — while guaranteeing the authored composition is honoured
   * in at least one axis (cropping only scenery, and only at extreme ratios).
   */
  function viewBoxFor(stageRect, baseW, baseH, opts) {
    const options = opts || {};
    const width = stageRect.width;
    const height = stageRect.height;
    if (!(width > 0) || !(height > 0)) {
      return { x: 0, y: 0, width: baseW, height: baseH };
    }

    // Panel-aware fit: the *informative* box of the artwork is guaranteed to land
    // in the free band between the floating panels, while decoration (sky,
    // plate tips, heat glow) may run underneath them. Because the scale is the
    // only freedom, the viewBox keeps the frame's exact aspect ratio, so there
    // is still no letterboxing.
    const { pad, content } = options;
    if (content && pad) {
      const cw = Math.max(1, content.x1 - content.x0);
      const ch = Math.max(1, content.y1 - content.y0);
      const availW = Math.max(48, width - pad.left - pad.right);
      const availH = Math.max(48, height - pad.top - pad.bottom);
      // never zoom out further than the scenery is painted for (the same caps as
      // the fallback branch below), so the backdrop always covers the view even
      // when the free band between panels has collapsed to nothing
      const floor = Math.min(width / (baseW * CAPS.maxWiden), height / (baseH * CAPS.maxTaller));
      const scale = Math.max(Math.min(availW / cw, availH / ch), floor);
      if (Number.isFinite(scale) && scale > 0) {
        return {
          x: (content.x0 + content.x1) / 2 - (pad.left + availW / 2) / scale,
          y: (content.y0 + content.y1) / 2 - (pad.top + availH / 2) / scale,
          width: width / scale,
          height: height / scale,
        };
      }
    }

    const ratio = width / height;
    const baseRatio = baseW / baseH;
    let vbW;
    let vbH;

    if (ratio >= baseRatio) {
      vbW = Math.min(baseH * ratio, baseW * CAPS.maxWiden);
      vbH = vbW / ratio;
    } else {
      vbH = Math.min(baseW / ratio, baseH * CAPS.maxTaller);
      vbW = Math.max(vbH * ratio, baseW * CAPS.minCropWidthRatio);
      vbH = vbW / ratio;
    }

    const x = (baseW - vbW) / 2;
    // Extreme aspect ratios crop: give up sky, never the ground line.
    const y = vbH <= baseH ? baseH - vbH : -(vbH - baseH) * 0.35;
    return { x, y, width: vbW, height: vbH };
  }

  function viewBoxAttribute(stageRect, baseW, baseH, opts) {
    const b = viewBoxFor(stageRect, baseW, baseH, opts);
    return `${b.x.toFixed(1)} ${b.y.toFixed(1)} ${b.width.toFixed(1)} ${b.height.toFixed(1)}`;
  }

  /**
   * Attach a stage: fits the SVG viewBox on load, on every resize/orientation,
   * on browser zoom, and whenever the stage box itself changes size (split
   * screen, mobile URL bar) via ResizeObserver.
   *
   * @returns {{ fit: () => void, destroy: () => void }}
   */
  function attach(options) {
    const opts = options || {};
    const stage =
      opts.stage instanceof Element
        ? opts.stage
        : document.getElementById(opts.stageId || 'interactive-stage');
    const svg = opts.svg instanceof Element ? opts.svg : document.getElementById(opts.svgId || '');
    if (!stage || !svg) {
      return {
        fit() {},
        destroy() {},
      };
    }

    const baseW = opts.baseWidth || 1440;
    const baseH = opts.baseHeight || 810;
    let frame = null;
    const useLayout = opts.layout !== false;
    const stopVisibility = useLayout ? trackVisibility(stage) : () => {};

    function fit() {
      frame = null;
      // the layout mode decides the frame's geometry, so it is settled first
      if (useLayout) applyLayout(stage);
      const rect = stage.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      // collapsing a panel or expanding the inputs changes the free band, so the
      // panels are observed too, not just the frame
      watchPanels(opts.panelSelector);
      const pad = panelPadding(stage, opts.panelSelector);
      const hasPad = pad.left > 0 || pad.right > 0 || pad.top > 0 || pad.bottom > 0;
      // Honouring the authored band is what keeps the art out from under the
      // panels. It is only the right rule while that band is asymmetric *with
      // respect to the canvas*: a scene whose interesting region sits left of
      // centre (voltage drop's landscape) would slide off-centre in a banner
      // layout, where there is nothing to avoid. So band fitting is either
      // panel-driven or explicitly opted into per stage.
      const useBand = Boolean(opts.content) && (hasPad || opts.fitContentInBanner);
      const next = viewBoxAttribute(
        rect,
        baseW,
        baseH,
        useBand ? { pad, content: opts.content } : { pad: null, content: null },
      );
      if (svg.getAttribute('viewBox') !== next) svg.setAttribute('viewBox', next);
      // Markup ships `slice` (cover) so the pre-JS paint never shows page
      // colour; once the viewBox is fitted exactly, `meet` is lossless.
      if (svg.getAttribute('preserveAspectRatio') !== 'xMidYMid meet') {
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }
      if (typeof opts.onFit === 'function') opts.onFit(rect, svg);
    }

    function schedule() {
      if (frame !== null) return;
      frame = requestAnimationFrame(fit);
    }

    const listeners = [
      ['resize', schedule],
      ['orientationchange', schedule],
    ];
    listeners.forEach(([evt, fn]) => window.addEventListener(evt, fn));
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', schedule);
    }

    let observer = null;
    const extraObservers = [];
    function watchPanels(selector) {
      if (typeof ResizeObserver !== 'function' || watchPanels.done) return;
      watchPanels.done = true;
      for (const el of document.querySelectorAll(selector || '#panel-wrap .ts-panel')) {
        if (typeof el.getBoundingClientRect !== 'function') continue;
        const ro = new ResizeObserver(schedule);
        ro.observe(el);
        extraObservers.push(ro);
      }
    }
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(schedule);
      observer.observe(stage);
    }

    // First fit, plus a nudge after fonts/layout settle (the stage height is
    // viewport-relative, so a scrollbar appearing changes it).
    fit();
    setTimeout(schedule, 150);
    if (useLayout) wireCollapse(stage);

    return {
      fit: schedule,
      layout: () => currentLayout(),
      destroy() {
        listeners.forEach(([evt, fn]) => window.removeEventListener(evt, fn));
        if (window.visualViewport) window.visualViewport.removeEventListener('resize', schedule);
        if (observer) observer.disconnect();
        extraObservers.forEach((ro) => ro.disconnect());
        stopVisibility();
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
      },
    };
  }

  /* ─────────────────────────────────────────────────────────────────────
   * Layout mode: one place decides whether panels float over the scene, sit
   * below it, or fold into a bottom drawer. `tool-stage.css` keys its geometry off
   * `stage.dataset.layout`, and the stacked flow is also the no-JS default — so
   * the mode only ever *adds* the drawer, never a panel that cannot be opened.
   *
   *   float   a desktop viewport with room for a full-height scene
   *   stack   narrow or short: the scene becomes a banner, panels flow beneath
   *   drawer  phone width: panels fold into a bottom sheet with a grab handle
   * ──────────────────────────────────────────────────────────────────── */
  const LAYOUT = { drawerMaxWidth: 768, stackMaxWidth: 1360, stackMaxHeight: 700 };
  /*
   * A stage that opts into stacking (`data-stage="stackable"` — the cable
   * calculator) no longer stacks. Stacking was the answer to a real problem —
   * a floating inputs panel is ~336px wide, which turns a 1000px-tall form into
   * a scroll column — but it moved the *results* off screen: on a 1024x700
   * window the results panel started at y=1084, so reading the answer meant
   * scrolling past the run that explains it. The panels now dock over a
   * full-height scene and fold to a labelled rail (see `wireCollapse`), which
   * keeps the answer AND the scenery on screen and leaves the choice of what
   * gets the room to the reader.
   *
   * The stack thresholds are deliberately unreachable: they are kept so the
   * stacked flow stays one edit away, and `layoutFor` only reaches `stack`
   * below them.
   */
  const WIDE_STACK = { drawerMaxWidth: 768, stackMaxWidth: 0, stackMaxHeight: 0 };

  function limitsFor(stage) {
    return stage?.dataset?.stage === 'stackable' ? WIDE_STACK : LAYOUT;
  }

  function layoutFor(w, h, limits) {
    const L = limits || LAYOUT;
    if (w <= L.drawerMaxWidth) return 'drawer';
    if (w <= L.stackMaxWidth || h <= L.stackMaxHeight) return 'stack';
    return 'float';
  }

  function currentLayout(stage) {
    const w =
      window.visualViewport?.width || window.innerWidth || document.documentElement.clientWidth;
    const h = window.visualViewport?.height || window.innerHeight || 0;
    return layoutFor(w, h, limitsFor(stage));
  }

  /** The `.ts-stage` ancestor of a frame: the element that owns the layout mode. */
  function stageHost(el) {
    if (!el || typeof el.closest !== 'function') return el || null;
    return el.closest('.ts-stage') || el;
  }

  /**
   * Publish the mode on the stage and tell anyone listening. Called before the
   * viewBox fit: a mode change moves the frame, and the fit must measure where
   * the frame ends up, not where it was.
   */
  function applyLayout(target) {
    const stage = stageHost(target);
    if (!stage || !stage.dataset) return '';
    const next = currentLayout(stage);
    const prev = stage.dataset.layout || '';
    if (next !== prev) {
      stage.dataset.layout = next;
      if (!prev) {
        // first pass: let the CSS settle one frame, then fit against real boxes
        requestAnimationFrame(() => {
          window.dispatchEvent(new Event('resize'));
        });
      }
    }
    if (prev && prev !== next) {
      document.dispatchEvent(
        new CustomEvent('electra:layout', { detail: { layout: next, previous: prev } }),
      );
    }
    return next;
  }

  /** Mark the stage as scrolled out of view, so its pinned handle can get out of the way. */
  function trackVisibility(target) {
    const stage = stageHost(target);
    if (!stage || typeof IntersectionObserver !== 'function') return () => {};
    let raf = null;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (raf !== null) cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            raf = null;
            const off = entry.isIntersecting ? '0' : '1';
            if (stage.dataset.offscreen !== off) stage.dataset.offscreen = off;
          });
        }
      },
      { rootMargin: '0px 0px -1px 0px', threshold: [0, 0.02] },
    );
    io.observe(stage);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      io.disconnect();
    };
  }

  /** Clamp to a 0..1-ish range and keep numbers out of CSS garbage. */
  function num(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  /**
   * Paint a scene from calculator output: set the shared custom properties and
   * attributes on the scene root. CSS owns the visual response, so a tool can
   * add a look without touching the engine.
   *
   * @param {Element} root     scene root (`.scene-container` / stage element)
   * @param {Object}  vars      numeric CSS custom properties (`--heat`, `--gauge`, …)
   * @param {Object}  attrs     string attributes (`data-method`, `data-status`, …)
   */
  function paint(root, vars, attrs) {
    if (!root) return;
    if (vars) {
      for (const [key, value] of Object.entries(vars)) {
        if (value === null || value === undefined) continue;
        root.style.setProperty(key, String(value));
      }
    }
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value === null || value === undefined) continue;
        root.setAttribute(`data-${key}`, String(value));
      }
    }
  }

  /** True when the visitor asked for reduced motion (scenes then freeze). */
  function reducedMotion() {
    return Boolean(REDUCED_MOTION.matches);
  }

  /**
   * Collapsible docks. A panel floating over the scene is only welcome while it
   * is being used, so each one folds to a rail that still says what it is.
   *
   * No refit plumbing is needed: `watchPanels` puts a ResizeObserver on every
   * panel, so a dock changing size re-runs the fit by itself and the scene grows
   * into the space the dock handed back.
   */
  /**
   * Two open docks are a luxury: at 312px each they leave the run a band of
   * `width - 684px`, which is 136px on an 820px window — narrower than the
   * comparison strip itself. Under the threshold the docks start folded, so the
   * scenery gets the window on arrival and the rails say where the panels went.
   * It is an *initial* state only: a later resize never fights the reader.
   */
  const NARROW_DOCKS = 1100;

  function wireCollapse(target) {
    // `attach` is handed the scene frame (that is the box the viewBox is fitted
    // to), but the docks are siblings of it inside the stage proper
    const stage = stageHost(target) || target;
    if (!stage || stage.dataset.docks) return;
    const panels = [...stage.querySelectorAll('.ts-panel')];
    if (!panels.length) return;
    // a drawer is already a folding panel: its sheets open and close on their
    // own, and folding one here would open it empty
    const startFolded =
      currentLayout(stage) !== 'drawer' &&
      (window.innerWidth || document.documentElement.clientWidth || 0) < NARROW_DOCKS;

    for (const button of stage.querySelectorAll('.ts-panel-collapse')) {
      const panel = button.closest('.ts-panel');
      if (!panel) continue;
      const name = (panel.querySelector('.ts-panel-title span')?.textContent || 'panel')
        .trim()
        .toLowerCase();
      const fold = (on) => {
        panel.dataset.collapsed = on ? 'true' : 'false';
        button.setAttribute('aria-expanded', on ? 'false' : 'true');
        button.setAttribute('aria-label', `${on ? 'Expand' : 'Collapse'} the ${name} panel`);
        // publish which docks are open, so the survivor and the strip can take
        // the width the folded one gave back
        const open = panels.filter((p) => p.dataset.collapsed !== 'true');
        if (open.length > 1) stage.dataset.docks = 'both';
        else if (open.length === 1) {
          stage.dataset.docks = open[0].classList.contains('ts-panel--results')
            ? 'results'
            : 'inputs';
        } else stage.dataset.docks = 'none';
      };
      if (panel.dataset.collapsed !== 'true') panel.dataset.collapsed = 'false';
      if (startFolded) fold(true);
      button.addEventListener('click', () => fold(panel.dataset.collapsed !== 'true'));
    }
    if (!startFolded) stage.dataset.docks = 'both';
  }

  window.ElectraStage = {
    attach,
    viewBoxFor,
    viewBoxAttribute,
    panelPadding,
    paint,
    num,
    reducedMotion,
    layout: currentLayout,
    layoutFor,
    stageHost,
    LIMITS: LAYOUT,
  };
})();
