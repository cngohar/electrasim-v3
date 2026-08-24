import { Activity } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatedNumber } from './AnimatedNumber';

interface VoltagePoint {
  time: number; // epoch ms
  voltage: number;
}

interface Props {
  componentId: string;
  componentLabel: string;
  liveVoltage: number;
  isEnergized: boolean;
  simRunning: boolean;
  nominalVoltage?: number;
}

const WINDOW_MS = 30_000; // 30 seconds
const SAMPLE_INTERVAL_MS = 400; // Sample every 400ms for smooth real-time sparkline
const PAD_LEFT = 28;
const PAD_RIGHT = 10;
const PAD_TOP = 8;
const PAD_BOTTOM = 16;
const SVG_WIDTH = 280;
const SVG_HEIGHT = 76;
const PLOT_W = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;

/**
 * ComponentVoltageSparkline — Real-time voltage fluctuation visualizer for the
 * selected component over the last 30 seconds with min/max, delta, and interactive scrubber.
 */
export const ComponentVoltageSparkline: React.FC<Props> = ({
  componentId,
  componentLabel,
  liveVoltage,
  isEnergized,
  simRunning,
  nominalVoltage = 230,
}) => {
  const [history, setHistory] = useState<VoltagePoint[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<SVGSVGElement | null>(null);

  // Initialize or reset history when selected component changes
  useEffect(() => {
    const now = Date.now();
    const initialPoints: VoltagePoint[] = [];
    const baseV = simRunning && isEnergized ? liveVoltage : 0;

    // Seed historical window
    for (let i = 20; i >= 0; i--) {
      const jitter = simRunning && isEnergized ? (Math.random() - 0.5) * 0.8 : 0;
      initialPoints.push({
        time: now - i * 1500,
        voltage: Math.max(0, baseV + jitter),
      });
    }
    setHistory(initialPoints);
  }, [simRunning, isEnergized, liveVoltage]);

  // Periodic sampler to capture live voltage fluctuations over 30s
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - WINDOW_MS;

      // Realistic minor grid impedance / AC phase ripple fluctuation when simulation is active
      const dynamicJitter =
        simRunning && isEnergized && liveVoltage > 0
          ? Math.sin(now / 1200) * 0.4 + (Math.random() - 0.5) * 0.35
          : 0;

      const currentSampledVoltage = Math.max(0, (simRunning ? liveVoltage : 0) + dynamicJitter);

      setHistory((prev) => {
        const filtered = prev.filter((pt) => pt.time >= cutoff);
        return [...filtered, { time: now, voltage: currentSampledVoltage }];
      });
    }, SAMPLE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [simRunning, isEnergized, liveVoltage]);

  // Metric stats over 30s
  const { minV, maxV, avgV, deltaV, fluctuationPct } = useMemo(() => {
    if (history.length === 0) {
      return { minV: 0, maxV: 0, avgV: 0, deltaV: 0, fluctuationPct: 0 };
    }
    const voltages = history.map((h) => h.voltage);
    const min = Math.min(...voltages);
    const max = Math.max(...voltages);
    const sum = voltages.reduce((acc, v) => acc + v, 0);
    const avg = sum / voltages.length;
    const delta = max - min;
    const pct = avg > 0 ? (delta / avg) * 100 : 0;
    return { minV: min, maxV: max, avgV: avg, deltaV: delta, fluctuationPct: pct };
  }, [history]);

  // Scaling
  const effectiveMin = Math.max(0, Math.floor(Math.min(minV * 0.95, nominalVoltage * 0.8)));
  const effectiveMax = Math.max(
    effectiveMin + 10,
    Math.ceil(Math.max(maxV * 1.05, nominalVoltage * 1.1, 10)),
  );
  const vRange = Math.max(1, effectiveMax - effectiveMin);

  const now = Date.now();
  const startTime = now - WINDOW_MS;

  const points = useMemo(() => {
    if (history.length < 2) return [];
    return history.map((pt) => {
      const timeOffset = Math.max(0, Math.min(WINDOW_MS, pt.time - startTime));
      const x = PAD_LEFT + (timeOffset / WINDOW_MS) * PLOT_W;
      const yNorm = (pt.voltage - effectiveMin) / vRange;
      const y = PAD_TOP + PLOT_H - Math.max(0, Math.min(1, yNorm)) * PLOT_H;
      return { x, y, pt };
    });
  }, [history, startTime, effectiveMin, vRange]);

  // Generate SVG Path
  const linePath = useMemo(() => {
    if (points.length < 2) return '';
    return points.reduce((acc, curr, idx) => {
      return idx === 0
        ? `M ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`
        : `${acc} L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }, '');
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length < 2) return '';
    const first = points[0];
    const last = points[points.length - 1];
    const baselineY = PAD_TOP + PLOT_H;
    return `${linePath} L ${last.x.toFixed(1)} ${baselineY} L ${first.x.toFixed(1)} ${baselineY} Z`;
  }, [linePath, points]);

  const activePoint =
    hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : points[points.length - 1];

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * SVG_WIDTH;
    let closestIdx = 0;
    let minDistance = Number.POSITIVE_INFINITY;
    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = idx;
      }
    });
    setHoverIndex(closestIdx);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between text-[11px]">
        <div className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Activity className="size-3.5 text-cyan-500 animate-pulse" />
          <span>Voltage Fluctuation (Last 30s)</span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <span className="text-slate-400">ΔV:</span>
          <span className={`font-semibold ${deltaV > 5 ? 'text-amber-500' : 'text-cyan-500'}`}>
            ±{(deltaV / 2).toFixed(1)}V ({fluctuationPct.toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Real-time Metric Badges */}
      <div className="grid grid-cols-4 gap-1.5 py-0.5">
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 p-1.5 text-center">
          <div className="text-[8px] uppercase tracking-wider text-slate-400 font-medium">
            Live Head
          </div>
          <div className="font-mono text-xs font-bold text-cyan-500 dark:text-cyan-400">
            <AnimatedNumber
              value={simRunning && isEnergized ? liveVoltage : 0}
              decimals={1}
              suffix="V"
            />
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 p-1.5 text-center">
          <div className="text-[8px] uppercase tracking-wider text-slate-400 font-medium">
            30s Min
          </div>
          <div className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
            {minV.toFixed(1)}V
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 p-1.5 text-center">
          <div className="text-[8px] uppercase tracking-wider text-slate-400 font-medium">
            30s Max
          </div>
          <div className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
            {maxV.toFixed(1)}V
          </div>
        </div>
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 p-1.5 text-center">
          <div className="text-[8px] uppercase tracking-wider text-slate-400 font-medium">Avg</div>
          <div className="font-mono text-xs font-semibold text-emerald-500 dark:text-emerald-400">
            {avgV.toFixed(1)}V
          </div>
        </div>
      </div>

      {/* SVG Sparkline Canvas */}
      <div className="relative rounded-lg bg-slate-950/90 dark:bg-slate-950 border border-slate-800 p-1.5 overflow-hidden">
        <svg
          ref={containerRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-20 overflow-visible select-none cursor-crosshair"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        >
          <title>{`${componentLabel} 30-Second Voltage Fluctuation Sparkline`}</title>
          <defs>
            <linearGradient id={`volt-grad-${componentId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
              <stop offset="90%" stopColor="#06b6d4" stopOpacity="0.02" />
            </linearGradient>
            <filter id={`glow-${componentId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Gridlines */}
          <line
            x1={PAD_LEFT}
            y1={PAD_TOP}
            x2={SVG_WIDTH - PAD_RIGHT}
            y2={PAD_TOP}
            stroke="#334155"
            strokeWidth="0.75"
            strokeDasharray="2 2"
          />
          <line
            x1={PAD_LEFT}
            y1={PAD_TOP + PLOT_H / 2}
            x2={SVG_WIDTH - PAD_RIGHT}
            y2={PAD_TOP + PLOT_H / 2}
            stroke="#1e293b"
            strokeWidth="0.75"
            strokeDasharray="2 2"
          />
          <line
            x1={PAD_LEFT}
            y1={PAD_TOP + PLOT_H}
            x2={SVG_WIDTH - PAD_RIGHT}
            y2={PAD_TOP + PLOT_H}
            stroke="#334155"
            strokeWidth="0.75"
          />

          {/* Y-Axis Value Labels */}
          <text
            x={PAD_LEFT - 3}
            y={PAD_TOP + 4}
            textAnchor="end"
            fontSize="7"
            fontFamily="monospace"
            fill="#64748b"
          >
            {effectiveMax}V
          </text>
          <text
            x={PAD_LEFT - 3}
            y={PAD_TOP + PLOT_H}
            textAnchor="end"
            fontSize="7"
            fontFamily="monospace"
            fill="#64748b"
          >
            {effectiveMin}V
          </text>

          {/* Area Fill */}
          {areaPath && <path d={areaPath} fill={`url(#volt-grad-${componentId})`} />}

          {/* Line Stroke */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#glow-${componentId})`}
            />
          )}

          {/* Time Axis Labels */}
          <text
            x={PAD_LEFT}
            y={SVG_HEIGHT - 2}
            textAnchor="start"
            fontSize="7"
            fontFamily="monospace"
            fill="#475569"
          >
            -30s
          </text>
          <text
            x={PAD_LEFT + PLOT_W / 2}
            y={SVG_HEIGHT - 2}
            textAnchor="middle"
            fontSize="7"
            fontFamily="monospace"
            fill="#475569"
          >
            -15s
          </text>
          <text
            x={SVG_WIDTH - PAD_RIGHT}
            y={SVG_HEIGHT - 2}
            textAnchor="end"
            fontSize="7"
            fontFamily="monospace"
            fill="#38bdf8"
            fontWeight="bold"
          >
            NOW
          </text>

          {/* Active Point Cursor / Hover Scrubber */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={PAD_TOP}
                x2={activePoint.x}
                y2={PAD_TOP + PLOT_H}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.8"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="3.5"
                fill="#38bdf8"
                stroke="#0f172a"
                strokeWidth="1.5"
              />
              {/* Pulse ring on live head point */}
              {hoverIndex === null && simRunning && isEnergized && (
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="6"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1"
                  opacity="0.6"
                  className="animate-ping"
                />
              )}
            </g>
          )}
        </svg>

        {/* Hover Tooltip Readout */}
        {hoverIndex !== null && activePoint && (
          <div className="absolute top-1 right-2 bg-slate-900/90 border border-slate-700 px-2 py-0.5 rounded text-[9px] font-mono text-cyan-300 shadow-md">
            <span>
              {((activePoint.pt.time - now) / 1000).toFixed(1)}s:{' '}
              {activePoint.pt.voltage.toFixed(2)}V
            </span>
          </div>
        )}
      </div>

      {/* Stability and Tolerance Status */}
      <div className="flex items-center justify-between text-[9.5px] text-slate-500 dark:text-slate-400 pt-0.5 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-1">
          <span
            className={`inline-block size-1.5 rounded-full ${
              simRunning && isEnergized
                ? deltaV < 8
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
                : 'bg-slate-400'
            }`}
          />
          <span>
            {simRunning && isEnergized
              ? deltaV < 8
                ? 'Nominal Grid Stability (±3% Compliant)'
                : 'Elevated Voltage Ripple'
              : 'Standby / De-energized'}
          </span>
        </div>
        <span className="font-mono">{points.length} samples</span>
      </div>
    </div>
  );
};
