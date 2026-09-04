/**
 * not-found.js — 404 page behaviour
 *   1. Rotates a random "bench riddle" (weird but physically plausible
 *      electrical question + reveal answer), with an on-demand next button.
 *   2. Fires occasional heavier arc bursts at the severed conductor.
 *   3. Freezes SMIL electron motion when the user prefers reduced motion
 *      (CSS covers the CSS keyframes; SVG pauseAnimations covers SMIL).
 *   4. Reports the broken path to the readout (progressive, reversible).
 *
 * Lifecycle: re-runs after every view transition (see boot.js), and the arc
 * scheduler's pending timeout is cancelled on cleanup so a self-rescheduling
 * chain cannot outlive the page it animates.
 */
window.ElectraSim.onReady(({ signal, onCleanup }) => {
  const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

  // NOTE: keep index 0 in sync with the SSR fallback riddle in 404.astro.
  const RIDDLES = [
    {
      q: 'Your multimeter shows 90 V on a cable you definitely disconnected. Why?',
      a: 'Ghost (phantom) voltage: the dead cable runs parallel to live ones, so capacitive coupling between conductors lifts it to a readable voltage. Your high-impedance meter (10 MΩ) barely loads it down. Touch it with a solenoid tester and the phantom collapses to zero — no phantom, no problem.',
    },
    {
      q: 'A bird lands with both feet on a bare 132 kV transmission line. Why doesn’t it fry?',
      a: 'Current needs a potential difference to flow. Both feet sit on the same conductor at (almost) the same potential, so the voltage across the bird is milli­volts. It only becomes lunch if it bridges to a tower, another phase, or ground.',
    },
    {
      q: 'Why do LED bulbs sometimes glow faintly even after you’ve switched them off?',
      a: 'The switched line still runs parallel to live cables for metres, so capacitive coupling feeds a few microamps through the LED driver. An incandescent bulb needs watts to glow; an LED driver lights up on almost nothing.',
    },
    {
      q: 'How can lightning kilometres away trip the breakers in your living room?',
      a: 'The strike dumps enormous current into the ground and nearby lines, and the fast-changing magnetic field induces a voltage surge onto LV wiring. Your consumer unit’s RCD/SPD sees the spike and drops the circuit before the wiring does.',
    },
    {
      q: 'Why does the bathroom fan or garden socket trip the RCD only on rainy days?',
      a: 'Moisture soaks into outdoor junction boxes and cracked insulation, lowering the line-to-earth resistance. Once leakage creeps past 30 mA the RCD calls it a fault and opens. Dry day, leakage falls, mystery “fixes itself”.',
    },
    {
      q: 'If you hang in mid-air and grab a live 230 V conductor, why does nothing happen?',
      a: 'Shock severity depends on current, and current depends on a completed loop. Hanging in the air, there is no return path to earth or neutral, so the circuit stays open and the body simply charges to line potential. Difficult party trick — do not attempt.',
    },
    {
      q: 'Why does a cable reel overheat only if you forget to unwind it fully?',
      a: 'Coiled on the reel, each loop lies against its neighbour like a bundled circuit: the load current is fine per metre, but the drum can’t shed heat, so temperature climbs loop on loop — and the magnetic layers add a little induction heating on top.',
    },
    {
      q: 'Old street lights sometimes glowed dimly from a cable that was cut and buried. How?',
      a: 'A severed conductor lying parallel to live ones for tens of metres picks up charge capacitively — enough microamps for a small discharge lamp (or an LED retro-fit) to ghost-glow at night, haunting street-lighting crews for years.',
    },
    {
      q: 'Why did a whole terrace of houses once see 300 V in their 230 V sockets at the same moment?',
      a: 'They shared one three-phase street supply. When the neutral/PEN conductor broke at the intake, each house’s loads ended up in series across 400 V phases — light-loaded homes saw overvoltage, heavy-loaded ones brown-out, until the DNO re-made the joint.',
    },
    {
      q: 'Your phone sips power from the charger even when nothing is plugged into it. Where does it go?',
      a: 'The charger’s switch-mode converter never fully sleeps: its control IC ticks over, its X-capacitors sip reactive current, and the regulation loop stays warm. It is milliwatts — but millions of chargers make it a measurable grid load.',
    },
    {
      q: 'Why does carpet static measure thousands of volts yet barely sting?',
      a: 'Voltage says nothing about energy. The charge is microcoulombs and the source impedance enormous, so the microsecond spark carries microjoules — dramatic crack, fizzled energy. It is the amps’ staying power, not the volts’ height, that hurts.',
    },
    {
      q: 'Why does a fluorescent tube flicker the instant your finger approaches the switch — before the click?',
      a: 'As the contacts close, the microscopic gap breaks down and pre-arcs: the starter sees a sliver of current first, ignites the tube momentarily, then the bounced contact repeats it. You’re watching the switch arc before it is technically “on”.',
    },
    {
      q: 'Why does a freezer usually trip the breaker at 3 AM rather than at dinner time?',
      a: 'The compressor’s start surge (5–7× running current) is harmless alone — but overnight it often coincides with the defrost-heater element and low line load elsewhere. A marginal breaker, a cold start and the heater landing together cross the trip curve silently.',
    },
    {
      q: 'How can a fish-tank heater show a tingle voltage yet never trip the 30 mA RCD?',
      a: 'A cracked heater element leaks into the water continuously, but if the leakage sits at 20 mA the RCD stays armed — below threshold yet above comfort. The tingle is real; the RCD’s conscience is numerical, and 20 mA is “safe enough”.',
    },
  ];

  /* ── Riddle rotation ─────────────────────────────────────────────── */
  const section = document.querySelector('.nf-riddle');
  const qEl = document.getElementById('nf-riddle-q');
  const aEl = document.getElementById('nf-riddle-a');
  const nextBtn = document.getElementById('nf-riddle-next');
  const details = document.querySelector('.nf-riddle-details');

  let current = 0;

  function showRiddle(index, animate) {
    const riddle = RIDDLES[index];
    if (!(qEl && aEl && riddle)) return;
    current = index;
    const apply = () => {
      qEl.textContent = riddle.q;
      aEl.textContent = riddle.a;
      if (details) details.removeAttribute('open');
      section?.classList.remove('is-swapping');
    };
    if (animate && section && !REDUCED_MOTION.matches) {
      section.classList.add('is-swapping');
      later(apply, 190);
    } else {
      apply();
    }
  }

  function nextIndex(exclude) {
    if (RIDDLES.length < 2) return exclude;
    let idx;
    do {
      idx = Math.floor(Math.random() * RIDDLES.length);
    } while (idx === exclude);
    return idx;
  }

  const timers = new Set();
  const later = (fn, delay) => {
    const id = window.setTimeout(() => {
      timers.delete(id);
      fn();
    }, delay);
    timers.add(id);
    return id;
  };
  onCleanup(() => {
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
  });

  if (section && qEl && aEl) {
    // Swap the SSR riddle for a random one once the page has painted.
    later(() => showRiddle(nextIndex(current), true), 900);

    if (nextBtn) {
      nextBtn.hidden = false;
      nextBtn.addEventListener('click', () => showRiddle(nextIndex(current), true), { signal });
    }
  }

  /* ── Arc bursts at the severed conductor ─────────────────────────── */
  const spark = document.querySelector('.nf-spark');
  function scheduleArc() {
    if (!spark || REDUCED_MOTION.matches) return;
    const delay = 1600 + Math.random() * 3800;
    later(() => {
      spark.classList.add('arc-burst');
      later(() => spark.classList.remove('arc-burst'), 480);
      scheduleArc();
    }, delay);
  }
  scheduleArc();

  /* ── Reduced motion: freeze SMIL electron/ghost motion too ───────── */
  if (REDUCED_MOTION.matches) {
    for (const svg of document.querySelectorAll('svg.nf-scene')) {
      if (typeof svg.pauseAnimations === 'function') svg.pauseAnimations();
    }
  }

  /* ── Readout: name the missing route (cosmetic) ──────────────────── */
  const readout = document.querySelector('.nf-readout');
  if (readout && location.pathname.length > 1 && location.pathname !== '/404/') {
    const missing = document.createElement('span');
    missing.className = 'nf-readout-path';
    missing.textContent = ` · open conductor: ${location.pathname.replace(/\/$/, '')}`;
    const caret = readout.querySelector('.nf-caret');
    if (caret) readout.insertBefore(missing, caret);
    else readout.appendChild(missing);
  }
});
