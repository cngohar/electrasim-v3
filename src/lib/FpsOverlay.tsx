/**
 * FpsOverlay — dev-only HUD that reports rolling FPS, frame time, and
 * heap usage (Chromium only) in the bottom-left corner.
 *
 * Mounted by main.tsx behind `import.meta.env.DEV`, so it never ships to
 * production. Toggle visibility with Ctrl+Shift+F (or Cmd+Shift+F on macOS).
 *
 * This is the harness we'll use to record perf numbers in progress.md as
 * each rewrite phase lands. See PLAN.md §2 (Performance Budget).
 */
import { useEffect, useRef, useState } from 'react';

interface Stats {
  fps: number;
  frameMs: number;
  jsHeapMb: number | null;
}

const SMOOTHING = 0.9;
const STORAGE_KEY = 'electrasim:fps-overlay-visible';

export function FpsOverlay() {
  // Phase 6.2.2: default visible=false. The previous default ran an
  // unconditional `requestAnimationFrame` loop in dev forever, which
  // (a) added ~3-8% idle CPU on weak hardware, and (b) prevented the
  // browser from background-throttling the tab. Now the overlay starts
  // hidden, the rAF effect is gated on `visible`, and toggling it on with
  // Ctrl/Cmd+Shift+F re-mounts the loop only when actually wanted.
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [stats, setStats] = useState<Stats>({ fps: 0, frameMs: 0, jsHeapMb: null });
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(performance.now());
  const fpsRef = useRef<number>(60);
  const frameMsRef = useRef<number>(16.67);
  const lastSampleRef = useRef<number>(0);

  useEffect(() => {
    if (!visible) return; // <-- the whole point: zero work when hidden.
    lastRef.current = performance.now();
    const tick = (now: number) => {
      const dt = now - lastRef.current;
      lastRef.current = now;

      const instant = 1000 / Math.max(dt, 0.0001);
      fpsRef.current = SMOOTHING * fpsRef.current + (1 - SMOOTHING) * instant;
      frameMsRef.current = SMOOTHING * frameMsRef.current + (1 - SMOOTHING) * dt;

      // Sample at ~5Hz to avoid React state churn.
      if (now - lastSampleRef.current > 200) {
        lastSampleRef.current = now;
        const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        setStats({
          fps: Math.round(fpsRef.current),
          frameMs: Number(frameMsRef.current.toFixed(2)),
          jsHeapMb: memory ? Math.round(memory.usedJSHeapSize / 1024 / 1024) : null,
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [visible]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setVisible((v) => {
          const next = !v;
          try {
            window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
          } catch {
            // ignore quota / privacy errors
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!visible) return null;

  const fpsColor = stats.fps >= 55 ? '#10b981' : stats.fps >= 30 ? '#f59e0b' : '#ef4444';

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        bottom: 56,
        zIndex: 9999,
        pointerEvents: 'none',
        font: '11px/1.4 ui-monospace, "JetBrains Mono", monospace',
        color: '#0f172a',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '6px 10px',
        border: '1px solid rgba(15,23,42,0.08)',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(15,23,42,0.06)',
        userSelect: 'none',
      }}
      title="Ctrl/Cmd + Shift + F to toggle"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: fpsColor,
            boxShadow: `0 0 6px ${fpsColor}`,
          }}
        />
        <span style={{ color: fpsColor, fontWeight: 600 }}>{stats.fps} fps</span>
        <span style={{ color: '#64748b' }}>·</span>
        <span style={{ color: '#475569' }}>{stats.frameMs.toFixed(2)} ms</span>
        {stats.jsHeapMb !== null && (
          <>
            <span style={{ color: '#64748b' }}>·</span>
            <span style={{ color: '#475569' }}>{stats.jsHeapMb} MB</span>
          </>
        )}
      </div>
    </div>
  );
}
