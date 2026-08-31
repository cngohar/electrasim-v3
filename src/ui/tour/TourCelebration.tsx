/**
 * TourCelebration — full-screen electrical celebration when a tour finishes.
 *
 * All-canvas, zero dependencies: repeating electrical ring pulses, glowing
 * spark bursts and jagged lightning strokes in the brand palette. Runs for a
 * few seconds, dismissible by click / Esc / button, and collapses to a calm
 * static congratulation card under `prefers-reduced-motion`.
 */

import { PartyPopper, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { EmojiGlyph } from '../components/EmojiGlyph';

const DURATION_MS = 6500;
const COLORS = ['#3b82f6', '#60a5fa', '#22d3ee', '#FFB800', '#fbbf24'];

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface Pulse {
  x: number;
  y: number;
  born: number;
  color: string;
}

interface Bolt {
  points: Array<[number, number]>;
  born: number;
  color: string;
}

function makeBolt(width: number, height: number): Bolt {
  const points: Array<[number, number]> = [];
  let x = width * (0.15 + Math.random() * 0.7);
  let y = -10;
  const targetY = height * (0.35 + Math.random() * 0.4);
  while (y < targetY) {
    points.push([x, y]);
    x += (Math.random() - 0.5) * 90;
    y += 24 + Math.random() * 42;
  }
  points.push([x, y]);
  return { points, born: performance.now(), color: Math.random() > 0.5 ? '#93c5fd' : '#fde68a' };
}

export function TourCelebration({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const [reducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  /* Esc / auto-dismiss */
  useEffect(() => {
    const timer = window.setTimeout(() => doneRef.current(), reducedMotion ? 3000 : DURATION_MS);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Enter') {
        event.stopPropagation();
        doneRef.current();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [reducedMotion]);

  /* Canvas animation */
  useEffect(() => {
    if (reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const sparks: Spark[] = [];
    const pulses: Pulse[] = [];
    const bolts: Bolt[] = [];
    const started = performance.now();
    let lastBurst = 0;
    let lastPulse = 0;
    let lastBolt = started + 200;
    let raf = 0;

    const burst = (x: number, y: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.5 + Math.random() * 5.5;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          life: 0,
          maxLife: 40 + Math.random() * 35,
          size: 1.5 + Math.random() * 2.5,
          color: COLORS[(Math.random() * COLORS.length) | 0],
        });
      }
    };

    const frame = (now: number) => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const elapsed = now - started;
      const winding = elapsed > DURATION_MS - 1600; // stop spawning near the end

      if (!winding) {
        if (now - lastBurst > 420) {
          lastBurst = now;
          burst(W * (0.1 + Math.random() * 0.8), H * (0.1 + Math.random() * 0.6), 26);
        }
        if (now - lastPulse > 700) {
          lastPulse = now;
          pulses.push({
            x: W * (0.2 + Math.random() * 0.6),
            y: H * (0.25 + Math.random() * 0.5),
            born: now,
            color: COLORS[(Math.random() * COLORS.length) | 0],
          });
        }
        if (now - lastBolt > 1300) {
          lastBolt = now;
          bolts.push(makeBolt(W, H));
        }
      }

      ctx.clearRect(0, 0, W, H);

      // Electrical ring pulses — the repeating pattern.
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        const t = (now - p.born) / 1400;
        if (t >= 1) {
          pulses.splice(i, 1);
          continue;
        }
        for (const ring of [t, Math.max(0, t - 0.18)]) {
          if (ring <= 0) continue;
          ctx.beginPath();
          ctx.arc(p.x, p.y, ring * 180, 0, Math.PI * 2);
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = (1 - ring) * 0.55;
          ctx.lineWidth = 2.5 * (1 - ring) + 0.5;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Lightning bolts with a fast flash-out.
      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        const t = (now - b.born) / 450;
        if (t >= 1) {
          bolts.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.moveTo(b.points[0][0], b.points[0][1]);
        for (const [x, y] of b.points.slice(1)) ctx.lineTo(x, y);
        ctx.strokeStyle = b.color;
        ctx.globalAlpha = (1 - t) * 0.9;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 14;
        ctx.stroke();
        ctx.shadowBlur = 0;
        const tip = b.points[b.points.length - 1];
        if (t < 0.3) burst(tip[0], tip[1], 3);
      }
      ctx.globalAlpha = 1;

      // Sparks.
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life += 1;
        if (s.life >= s.maxLife) {
          sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.07; // gentle gravity
        s.vx *= 0.985;
        const fade = 1 - s.life / s.maxLife;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * fade, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = fade;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      if (elapsed < DURATION_MS + 400) raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [reducedMotion]);

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Click-anywhere dismissal as a real button, under the visuals. */}
      <button
        type="button"
        aria-label="Dismiss celebration"
        onClick={() => doneRef.current()}
        className="absolute inset-0 cursor-pointer"
      />
      {!reducedMotion && (
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />
      )}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          aria-live="polite"
          className="pointer-events-auto flex flex-col items-center gap-2 rounded-2xl border border-sky-300/40 bg-slate-900/85 px-8 py-6 text-center shadow-2xl backdrop-blur-sm"
        >
          <span className="flex items-center gap-2 text-3xl">
            <Zap aria-hidden="true" className="size-8 text-amber-400" />
            <PartyPopper aria-hidden="true" className="size-8 text-sky-400" />
          </span>
          <h2 className="font-mono text-xl font-black uppercase tracking-widest text-white">
            Tour complete
          </h2>
          <p className="max-w-64 text-xs leading-relaxed text-slate-300">
            The workbench is yours now. Go build something — or break it beautifully.
          </p>
          <button
            type="button"
            onClick={() => doneRef.current()}
            className="mt-2 rounded-full bg-sky-600 px-5 py-1.5 text-xs font-bold text-white shadow-lg transition hover:bg-sky-500"
          >
            <span className="inline-flex items-center gap-1">
              Back to the bench <EmojiGlyph emoji="bolt" size={13} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
