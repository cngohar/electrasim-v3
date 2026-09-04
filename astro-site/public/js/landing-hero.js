/**
 * Hero circuit engine — the animated node graph behind the headline, the
 * lamp glow sync, and the main-breaker toggle.
 *
 * PERFORMANCE
 * - The rAF loop only runs while the hero is actually on screen. Scroll past
 *   it and the loop is cancelled outright, not throttled.
 * - Particle count and device-pixel-ratio scale with viewport size, so a
 *   phone paints roughly a quarter of the pixels a desktop does.
 * - `prefers-reduced-motion` renders one static, fully-lit frame and stops.
 * - Nothing here touches layout: only canvas paint plus `filter`/`opacity`
 *   on four <img> elements.
 *
 * LIFECYCLE
 * Re-runs after every view transition (see boot.js). Returning to `/` by soft
 * navigation gives a fresh <canvas> at its unsized 300×150 default, so without
 * a re-run the hero painted into the wrong buffer. The rAF loop, interval timer
 * and observers are all torn down on cleanup before the next run starts.
 */
window.ElectraSim.onReady(({ signal, onCleanup }) => {
  const canvas = document.getElementById('circuit-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Headline word flipper ─────────────────────────────────────────────── */
  const WORDS = ['Build.', 'Energise.', 'Break.', 'Diagnose.'];
  const flipper = document.getElementById('flipper-word');
  let flipTimer = 0;

  const startFlipper = () => {
    if (!flipper || reduceMotion || flipTimer) return;
    let i = 0;
    flipTimer = setInterval(() => {
      flipper.classList.add('out');
      setTimeout(() => {
        i = (i + 1) % WORDS.length;
        flipper.textContent = WORDS[i];
        flipper.classList.remove('out');
        flipper.classList.add('in');
        void flipper.offsetWidth;
        flipper.classList.remove('in');
      }, 380);
    }, 2800);
  };
  const stopFlipper = () => {
    clearInterval(flipTimer);
    flipTimer = 0;
  };

  /* ── Node graph ────────────────────────────────────────────────────────── */
  const NODES = [
    [0.07, 0.15],
    [0.16, 0.15],
    [0.3, 0.15],
    [0.5, 0.15],
    [0.68, 0.15],
    [0.84, 0.13],
    [0.95, 0.15],
    [0.07, 0.4],
    [0.16, 0.4],
    [0.3, 0.4],
    [0.5, 0.4],
    [0.68, 0.4],
    [0.84, 0.4],
    [0.95, 0.4],
    [0.07, 0.54],
    [0.16, 0.54],
    [0.3, 0.54],
    [0.5, 0.54],
    [0.68, 0.54],
    [0.84, 0.54],
    [0.95, 0.54],
    [0.07, 0.76],
    [0.16, 0.76],
    [0.3, 0.76],
    [0.5, 0.76],
    [0.68, 0.76],
    [0.84, 0.76],
    [0.95, 0.76],
    [0.07, 0.92],
    [0.3, 0.92],
    [0.5, 0.92],
    [0.68, 0.92],
    [0.95, 0.92],
  ];

  const EDGES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [5, 6],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [12, 13],
    [14, 15],
    [15, 16],
    [16, 17],
    [17, 18],
    [18, 19],
    [19, 20],
    [21, 22],
    [22, 23],
    [23, 24],
    [24, 25],
    [25, 26],
    [26, 27],
    [28, 29],
    [29, 30],
    [30, 31],
    [31, 32],
    [0, 7],
    [1, 8],
    [2, 9],
    [3, 10],
    [4, 11],
    [5, 12],
    [6, 13],
    [7, 14],
    [8, 15],
    [9, 16],
    [10, 17],
    [11, 18],
    [12, 19],
    [13, 20],
    [14, 21],
    [15, 22],
    [16, 23],
    [17, 24],
    [18, 25],
    [19, 26],
    [20, 27],
    [21, 28],
    [23, 29],
    [24, 30],
    [25, 31],
    [27, 32],
  ];

  const ADJ = NODES.map(() => []);

  /* ── Off-canvas bleed ──────────────────────────────────────────────────
     The core lattice used to frame a box inside the hero (x .07–.95,
     y .13–.92). These stub nodes extend every row past both side edges and
     every column past the top/bottom edge, so the grid wires run off the
     canvas and current pulses visibly leave and re-enter the scene.
     Cost: +22 nodes / +22 edges of static line drawing, no extra particles
     and no extra per-frame allocations — frame cost is effectively flat. */
  const CORE_NODE_COUNT = NODES.length; // lamps only ever bind below this
  const BLEED = 0.08;
  const stub = (from, x, y) => {
    NODES.push([x, y]);
    EDGES.push([from, NODES.length - 1]);
    ADJ.push([]);
  };
  // Rows: run off the left and right edges.
  stub(0, -BLEED, 0.15);
  stub(6, 1 + BLEED, 0.15);
  stub(7, -BLEED, 0.4);
  stub(13, 1 + BLEED, 0.4);
  stub(14, -BLEED, 0.54);
  stub(20, 1 + BLEED, 0.54);
  stub(21, -BLEED, 0.76);
  stub(27, 1 + BLEED, 0.76);
  stub(28, -BLEED, 0.92);
  stub(32, 1 + BLEED, 0.92);
  // Columns: run off the top edge…
  stub(0, 0.07, -BLEED);
  stub(1, 0.16, -BLEED);
  stub(2, 0.3, -BLEED);
  stub(3, 0.5, -BLEED);
  stub(4, 0.68, -BLEED);
  stub(5, 0.84, -BLEED);
  stub(6, 0.95, -BLEED);
  // …and the five full-height columns off the bottom edge.
  stub(28, 0.07, 1 + BLEED);
  stub(29, 0.3, 1 + BLEED);
  stub(30, 0.5, 1 + BLEED);
  stub(31, 0.68, 1 + BLEED);
  stub(32, 0.95, 1 + BLEED);

  for (const [a, b] of EDGES) {
    ADJ[a].push(b);
    ADJ[b].push(a);
  }

  /* Lamp → junction mapping. `node` seeds are placeholders — placeLamps()
     randomises the on-screen position on wide viewports each page load and
     bindLampsToNodes() re-resolves the junction at runtime for every
     breakpoint, so the glow always lands on the node under the lamp. */
  const LAMPS = [
    { node: 5, rgb: '255,200,80', img: 'img-0', aura: 'aura-0' },
    { node: 13, rgb: '255,225,150', img: 'img-1', aura: 'aura-1' },
    { node: 18, rgb: '210,235,255', img: 'img-2', aura: 'aura-2' },
    { node: 26, rgb: '255,244,214', img: 'img-3', aura: 'aura-3' },
  ].map((lamp) => ({
    ...lamp,
    imgEl: document.getElementById(lamp.img),
    auraEl: document.getElementById(lamp.aura),
  }));

  const LAMP_COUNT = LAMPS.length;

  /* ── Random lamp placement (fresh on every page load) ──────────────────
     On wide screens each lamp lives in one of the four gutter quadrants
     beside the centred copy. Every quadrant offers several real junctions,
     so on each load the lamps shuffle across the quadrants and land on a
     random junction — the hero reads slightly differently every refresh.
     This runs synchronously at script evaluation (the script is deferred,
     so it executes before first paint): the lamps are absolutely
     positioned, which means no layout shift, and there is zero per-frame
     cost. Below 900px the CSS corner positions apply untouched — those
     gutters are too narrow to roam. The CSS positions also remain the
     no-JS fallback. */
  const QUADRANTS_WIDE = [
    [0, 1, 7, 8], // upper left
    [14, 15, 21, 22], // lower left
    [5, 6, 12, 13], // upper right
    [19, 20, 26, 27], // lower right
  ];
  /* 900–1099px gutters are 16–20% wide — only the outermost columns keep
     the lamps clear of the copy block. */
  const QUADRANTS_NARROW = [
    [0, 7],
    [14, 21],
    [6, 13],
    [20, 27],
  ];
  const roamQuery = window.matchMedia('(min-width: 900px)');
  const roomyQuery = window.matchMedia('(min-width: 1100px)');

  /* One plan per page load: a shuffled quadrant order plus a random pick
     per lamp. The pick is stored as a 0–1 fraction so the same plan maps
     onto either pool when the viewport crosses the 1100px breakpoint,
     instead of re-rolling mid-session. */
  const roamPlan = (() => {
    const order = [0, 1, 2, 3];
    for (let i = order.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order.map((quadrant) => ({ quadrant, pick: Math.random() }));
  })();

  const placeLamps = () => {
    const pools = roomyQuery.matches ? QUADRANTS_WIDE : QUADRANTS_NARROW;

    if (roamQuery.matches) {
      const chosen = roamPlan.map(({ quadrant, pick }) => {
        const pool = pools[quadrant];
        return pool[(pick * pool.length) | 0];
      });

      /* Resolve the one collision the pools allow: an upper lamp on the
         y=0.40 row directly above a lower lamp on y=0.54 in the same column
         would nearly touch on short heroes — push the lower lamp down to
         the y=0.76 junction of that column instead. */
      const DROP_ROW = { 14: 21, 15: 22, 19: 26, 20: 27 };
      for (let i = 0; i < chosen.length; i++) {
        const drop = DROP_ROW[chosen[i]];
        if (drop === undefined) continue;
        const [x] = NODES[chosen[i]];
        const crowded = chosen.some((n, j) => j !== i && NODES[n][0] === x && NODES[n][1] === 0.4);
        if (crowded) chosen[i] = drop;
      }

      for (let i = 0; i < LAMP_COUNT; i++) {
        const fig = document.getElementById(`bulb-${i}`);
        if (!fig) continue;
        const [nx, ny] = NODES[chosen[i]];
        fig.style.left = `${(nx * 100).toFixed(2)}%`;
        fig.style.top = `${(ny * 100).toFixed(2)}%`;
      }
      return;
    }

    // Hand control back to the responsive CSS corner positions.
    for (let i = 0; i < LAMP_COUNT; i++) {
      const fig = document.getElementById(`bulb-${i}`);
      if (fig) {
        fig.style.left = '';
        fig.style.top = '';
      }
    }
  };

  /** Snap every visible lamp to the closest node in the graph. */
  const bindLampsToNodes = () => {
    const cr = canvas.getBoundingClientRect();
    if (!cr.width || !cr.height) return;
    for (const lamp of LAMPS) {
      const el = lamp.imgEl;
      if (!el) continue;
      const b = el.getBoundingClientRect();
      if (!b.width) {
        lamp.node = -1; // hidden at this breakpoint
        continue;
      }
      const x = (b.left + b.width / 2 - cr.left) / cr.width;
      const y = (b.top + b.height / 2 - cr.top) / cr.height;
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < CORE_NODE_COUNT; i++) {
        const dx = NODES[i][0] - x;
        const dy = NODES[i][1] - y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      lamp.node = best;
    }
  };

  const glow = new Float32Array(NODES.length);
  let powerOn = true;

  /* A random walk with a small particle budget can starve a corner junction
     for tens of seconds — on a phone the bottom-left lamp simply never lit.
     Track the last time each lamp fired and top it up if the walk has not
     reached it, so every lamp on screen always participates. */
  const lastLit = new Float64Array(LAMP_COUNT);
  const STARVE_MS = 3200;

  /* ── Theme-aware palette ───────────────────────────────────────────────── */
  let palette;
  const readPalette = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    palette = dark
      ? {
          wash: 'rgba(23, 27, 31, 0.5)',
          grid: 'rgba(154, 193, 255, 0.055)',
          wire: 'rgba(154, 193, 255, 0.15)',
          node: 'rgba(154, 193, 255, 0.28)',
          nodeLamp: 'rgba(154, 193, 255, 0.5)',
        }
      : {
          wash: 'rgba(247, 249, 252, 0.45)',
          grid: 'rgba(37, 99, 235, 0.05)',
          wire: 'rgba(37, 99, 235, 0.13)',
          node: 'rgba(37, 99, 235, 0.22)',
          nodeLamp: 'rgba(37, 99, 235, 0.36)',
        };
  };
  readPalette();
  new MutationObserver(readPalette).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  /* ── Sizing: cap DPR, scale particle budget to the viewport ────────────── */
  const particles = [];
  const spawn = () => {
    const [a, b] = EDGES[(Math.random() * EDGES.length) | 0];
    return {
      from: Math.random() > 0.5 ? a : b,
      to: Math.random() > 0.5 ? b : a,
      t: Math.random(),
      speed: 0.005 + Math.random() * 0.006,
      amber: Math.random() > 0.45,
    };
  };

  const resize = () => {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const budget = w < 720 ? 12 : w < 1200 ? 20 : 30;
    if (particles.length > budget) particles.length = budget;
    while (particles.length < budget) particles.push(spawn());

    placeLamps();
    bindLampsToNodes();
  };

  /* ── Lamp glow ─────────────────────────────────────────────────────────── */
  const paintLamps = () => {
    for (const lamp of LAMPS) {
      const g = powerOn && lamp.node >= 0 ? glow[lamp.node] : 0;
      if (lamp.imgEl) {
        if (g > 0.12) {
          lamp.imgEl.style.filter = `brightness(${(1.1 + g * 1.1).toFixed(2)}) drop-shadow(0 0 ${Math.round(g * 30)}px rgba(${lamp.rgb},0.95))`;
          lamp.imgEl.style.opacity = '1';
        } else {
          lamp.imgEl.style.filter = 'brightness(0.6) grayscale(0.45)';
          lamp.imgEl.style.opacity = '0.72';
        }
      }
      if (lamp.auraEl) {
        lamp.auraEl.style.background =
          g > 0.12
            ? `radial-gradient(circle, rgba(${lamp.rgb},${(g * 0.42).toFixed(2)}) 0%, transparent 70%)`
            : 'transparent';
      }
    }
  };

  /* ── Frame ─────────────────────────────────────────────────────────────── */
  const draw = (animate) => {
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    if (!W || !H) return;

    ctx.fillStyle = palette.wash;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = palette.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < W; x += 48) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    for (let y = 0; y < H; y += 48) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();

    ctx.strokeStyle = palette.wire;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const [a, b] of EDGES) {
      ctx.moveTo(NODES[a][0] * W, NODES[a][1] * H);
      ctx.lineTo(NODES[b][0] * W, NODES[b][1] * H);
    }
    ctx.stroke();

    for (let i = 0; i < glow.length; i++) glow[i] = Math.max(0, glow[i] - 0.035);

    if (animate && powerOn) {
      const now = performance.now();
      for (let i = 0; i < LAMP_COUNT; i++) {
        const node = LAMPS[i].node;
        if (node < 0) continue;
        if (glow[node] > 0.5) lastLit[i] = now;
        else if (now - lastLit[i] > STARVE_MS) {
          glow[node] = 1;
          lastLit[i] = now;
        }
      }
    }

    if (animate && powerOn) {
      for (const p of particles) {
        p.t += p.speed;
        if (p.t >= 1) {
          glow[p.to] = 1;
          const next = ADJ[p.to].filter((n) => n !== p.from);
          const pick = next.length ? next[(Math.random() * next.length) | 0] : p.from;
          p.from = p.to;
          p.to = pick;
          p.t = 0;
        }
        const [fx, fy] = NODES[p.from];
        const [tx, ty] = NODES[p.to];
        const px = (fx + (tx - fx) * p.t) * W;
        const py = (fy + (ty - fy) * p.t) * H;
        const tail = Math.max(0, p.t - 0.35);

        ctx.beginPath();
        ctx.moveTo((fx + (tx - fx) * tail) * W, (fy + (ty - fy) * tail) * H);
        ctx.lineTo(px, py);
        ctx.strokeStyle = p.amber ? 'rgba(255,184,0,0.72)' : 'rgba(37,99,235,0.72)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(px, py, p.amber ? 3 : 2.5, 0, 6.283185);
        ctx.fillStyle = p.amber ? '#FFB800' : '#2563EB';
        ctx.fill();
      }
    }

    /* Junction dots — stub nodes live off-canvas, so skip them. */
    for (let i = 0; i < CORE_NODE_COUNT; i++) {
      const g = glow[i];
      const isLamp = LAMPS.some((l) => l.node === i);
      ctx.beginPath();
      ctx.arc(NODES[i][0] * W, NODES[i][1] * H, g > 0.1 ? 5 + g * 3 : isLamp ? 5 : 3, 0, 6.283185);
      ctx.fillStyle =
        g > 0.1 ? `rgba(255,184,0,${0.4 + g * 0.6})` : isLamp ? palette.nodeLamp : palette.node;
      ctx.fill();
    }

    paintLamps();
  };

  /* ── Run only while visible ────────────────────────────────────────────── */
  let rafId = 0;
  const loop = () => {
    draw(true);
    rafId = requestAnimationFrame(loop);
  };
  const start = () => {
    if (rafId || reduceMotion) return;
    rafId = requestAnimationFrame(loop);
    startFlipper();
  };
  const stop = () => {
    cancelAnimationFrame(rafId);
    rafId = 0;
    stopFlipper();
  };

  const staticFrame = () => {
    for (const lamp of LAMPS) if (lamp.node >= 0) glow[lamp.node] = 1;
    draw(false);
  };

  resize();
  for (let i = 0; i < LAMP_COUNT; i++) lastLit[i] = performance.now() - i * 700;

  let resizeTimer = 0;
  window.addEventListener(
    'resize',
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (reduceMotion || !rafId) staticFrame();
      }, 150);
    },
    { passive: true, signal },
  );

  if (reduceMotion) {
    staticFrame();
  } else if ('IntersectionObserver' in window) {
    staticFrame();
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()), {
      threshold: 0,
    });
    io.observe(canvas);
    onCleanup(() => io.disconnect());
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()), {
      signal,
    });
  } else {
    start();
  }

  // Cancel the rAF loop, the flipper interval and the pending resize timer
  // before the next navigation swaps this canvas away.
  onCleanup(() => {
    stop();
    clearTimeout(resizeTimer);
  });

  /* ── Main breaker ──────────────────────────────────────────────────────── */
  const btn = document.getElementById('mcb-toggle');
  const box = document.getElementById('mcb-box');
  const state = document.getElementById('mcb-text');
  if (btn && box && state) {
    btn.addEventListener(
      'click',
      () => {
        powerOn = !powerOn;
        box.classList.toggle('off', !powerOn);
        state.classList.toggle('off', !powerOn);
        state.textContent = powerOn ? 'Closed' : 'Tripped';
        btn.setAttribute('aria-pressed', String(powerOn));
        if (!rafId) draw(false);
      },
      { signal },
    );
  }
});
