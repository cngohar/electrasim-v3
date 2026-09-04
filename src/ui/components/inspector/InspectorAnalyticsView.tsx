/**
 * InspectorAnalyticsView — analytics tab (waveforms, energy, cost).
 * Moved verbatim from the previous monolithic `Inspector.tsx`.
 */

import { Activity, Sparkles, Thermometer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { COMPONENT_DEFS, type ComponentInstance, type SimulationResult } from '../../../domain';
import { useCircuitStore, useSettingsStore, useUiStore } from '../../../store';
import { AnimatedNumber } from '../AnimatedNumber';

interface Props {
  simResult: SimulationResult | null;
  /** When a single component is selected, the analytics reflect that
   *  component's live telemetry; otherwise they show circuit totals. */
  selectedComp?: ComponentInstance | null;
}

export function InspectorAnalyticsView({ simResult, selectedComp }: Props) {
  const simRunning = useUiStore((s) => s.simRunning);
  const components = useCircuitStore((s) => s.components);
  const globalVoltage = useCircuitStore((s) => s.globalVoltage);
  const wires = useCircuitStore((s) => s.wires);
  const componentGroups = useCircuitStore((s) => s.componentGroups);
  const diagnosticOverlayMode = useSettingsStore((s) => s.diagnosticOverlayMode);
  const setSetting = useSettingsStore((s) => s.setSetting);

  const [runtimeSeconds, setRuntimeSeconds] = useState(0);
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (simRunning) {
      timeoutId = setInterval(() => {
        setRuntimeSeconds((r) => r + 0.035); // 35ms interval
      }, 35);
    }
    return () => {
      if (timeoutId) clearInterval(timeoutId);
    };
  }, [simRunning]);

  const liveSupplyVoltage = simResult?.supplyVoltage ?? globalVoltage;
  const hasAcSupply =
    components.some(
      (c) =>
        c.type.includes('ac') ||
        c.type.includes('mains') ||
        c.type.includes('generator') ||
        c.type.includes('inverter'),
    ) || liveSupplyVoltage > 48;

  // Component-aware telemetry: if a component is selected, scope the
  // measurements to it; otherwise aggregate the whole energized circuit.
  const focusComp =
    selectedComp && !selectedComp.state?.isBlown && !selectedComp.state?.isTripped
      ? selectedComp
      : null;
  const focusDef = focusComp ? COMPONENT_DEFS[focusComp.type] : null;
  const focusCalc = focusComp ? simResult?.componentCalculations?.[focusComp.id] : undefined;

  let activePowerW = 0;
  if (focusComp && focusCalc) {
    activePowerW = focusCalc.powerWatts ?? focusComp.state?.customPowerWatts ?? 0;
  } else if (simRunning && simResult && simResult.energizedComponents.size > 0) {
    for (const id of simResult.energizedComponents) {
      const comp = components.find((c) => c.id === id);
      if (!comp || comp.state?.isBlown) continue;
      const def = COMPONENT_DEFS[comp.type];
      const pWatts = comp.state?.customPowerWatts ?? def?.powerWatts;
      if (pWatts !== undefined && pWatts > 0) {
        activePowerW += pWatts;
      }
    }
  }

  const focusVoltage = focusCalc?.voltage ?? liveSupplyVoltage;
  const focusCurrent =
    focusCalc?.currentAmps ??
    (activePowerW > 0 ? activePowerW / Math.max(1, liveSupplyVoltage) : 0);

  // Realistic dynamic calculations for Calculated Live Measurements
  // Use actual calculation data from the simulation, with minor realistic noise
  // to represent measurement uncertainty and component variations
  const voltageNoise =
    simRunning && focusCalc
      ? 0.1 * (Math.random() - 0.5) // ±0.05V random noise
      : 0;
  const voltageLive = simRunning ? focusVoltage + voltageNoise : focusVoltage;

  const currentNoise =
    simRunning && activePowerW > 0 && focusCalc
      ? 0.02 * (Math.random() - 0.5) // ±0.01A random noise
      : 0;
  const currentLive =
    simRunning && activePowerW > 0
      ? (focusCalc?.currentAmps ?? focusCurrent) + currentNoise
      : (focusCalc?.currentAmps ?? focusCurrent);

  const powerNoise = simRunning && activePowerW > 0 ? 0.5 * (Math.random() - 0.5) : 0;
  const powerLive = simRunning && activePowerW > 0 ? activePowerW + powerNoise : activePowerW;

  // Power factor based on actual load mix, not a sine wave
  // Calculate from components connected: inductive loads lower power factor
  const hasInductive =
    (focusComp ? /motor|transformer|fan|pump/.test(focusComp.type) : false) ||
    components.some(
      (c) =>
        c.type.includes('motor') ||
        c.type.includes('transformer') ||
        c.type.includes('fan') ||
        c.type.includes('pump'),
    );
  // Weighted power factor based on total power from inductive vs resistive loads
  let totalInductivePower = 0;
  let totalResistivePower = 0;
  const powerComponents =
    focusComp || simRunning
      ? simRunning && simResult && simResult.energizedComponents.size > 0
        ? [...simResult.energizedComponents].filter((id) => {
            const comp = components.find((c) => c.id === id);
            return comp && !comp.state?.isBlown;
          })
        : []
      : components;
  for (const id of powerComponents) {
    const comp = components.find((c) => c.id === id);
    if (!comp || comp.state?.isBlown) continue;
    const def = COMPONENT_DEFS[comp.type];
    const powerWatts = comp.state?.customPowerWatts ?? def?.powerWatts ?? 0;
    if (powerWatts <= 0) continue;
    // Check if this component type is typically inductive
    const isInductive =
      /motor|transformer|fan|pump/.test(comp.type) ||
      /bulb-(cfl|fluorescent|incandescent|halogen)/.test(comp.type);
    if (isInductive) {
      totalInductivePower += powerWatts;
    } else {
      totalResistivePower += powerWatts;
    }
  }
  const totalPower = totalInductivePower + totalResistivePower;
  // Typical power factor: inductive loads ~0.9, resistive ~1.0, mixed in between
  const powerFactorLive =
    totalPower > 0 ? 1.0 - 0.1 * (totalInductivePower / totalPower) : hasInductive ? 0.94 : 0.98;

  // Frequency is stable based on supply, not modulated by time
  const frequencyLive = hasAcSupply
    ? liveSupplyVoltage === 110 || liveSupplyVoltage === 120
      ? 60.0
      : 50.0
    : 0.0;

  // Real-time sparklines for Calculated Live Measurements cards
  /* Stroke colour is set on the <path> by the caller, so this only produces
     geometry — the old `color` first argument was never read. */
  const generateSineSparkline = (
    omega = 0.12,
    speed = 4,
    phaseOffset = 0,
    width = 120,
    height = 24,
  ) => {
    const midY = height / 2;
    if (!simRunning) {
      return `M 0,${midY} L ${width},${midY}`;
    }
    const points: string[] = [];
    const amplitude = height * 0.36;
    const phase = runtimeSeconds * speed + phaseOffset;

    for (let x = 0; x <= width; x += 2) {
      const y = midY - Math.sin(x * omega - phase) * amplitude;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return `M ${points.join(' L ')}`;
  };

  const generatePowerSparkline = (width = 120, height = 24) => {
    const midY = height / 2;
    if (!simRunning || activePowerW === 0) {
      return `M 0,${midY} L ${width},${midY}`;
    }
    const points: string[] = [];
    const amplitude = height * 0.32;
    const phase = runtimeSeconds * 8;

    for (let x = 0; x <= width; x += 2) {
      const y = hasAcSupply
        ? height - 4 - (1 - Math.cos(x * 0.24 - phase)) * amplitude
        : midY - Math.min(amplitude, (powerLive / 3000) * amplitude);
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return `M ${points.join(' L ')}`;
  };

  const generateFrequencyTransientSparkline = (width = 180, height = 36) => {
    const midY = height / 2;
    if (!simRunning || !hasAcSupply) {
      return `M 0,${midY} L ${width},${midY}`;
    }
    const points: string[] = [];
    const amplitude = height * 0.38;
    const phase = runtimeSeconds * 10;

    for (let x = 0; x <= width; x += 1.5) {
      const y =
        midY -
        (Math.sin(x * 0.1 - phase) * 0.85 + Math.sin(x * 0.3 - phase * 3) * 0.15) * amplitude;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return `M ${points.join(' L ')}`;
  };

  const generateWaveformPath = (width = 280, height = 80) => {
    const midY = height / 2;
    if (!simRunning || liveSupplyVoltage === 0) {
      return `M 0,${midY} L ${width},${midY}`;
    }
    const points: string[] = [];
    if (hasAcSupply) {
      const amplitude = Math.min(
        height * 0.4,
        Math.max(12, (liveSupplyVoltage / 240) * (height * 0.38)),
      );
      const omega = (4 * Math.PI) / width;
      const phase = runtimeSeconds * 8;
      for (let x = 0; x <= width; x += 1.5) {
        const y = midY - Math.sin(x * omega - phase) * amplitude;
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    } else {
      const dcOffset = Math.min(height * 0.38, (liveSupplyVoltage / 240) * (height * 0.35));
      const y = midY - dcOffset;
      return `M 0,${y.toFixed(1)} L ${width},${y.toFixed(1)}`;
    }
    return `M ${points.join(' L ')}`;
  };

  const generateCurrentWaveformPath = (width = 280, height = 80) => {
    const midY = height / 2;
    if (!simRunning || activePowerW === 0 || currentLive === 0) {
      return `M 0,${midY} L ${width},${midY}`;
    }
    const points: string[] = [];
    if (hasAcSupply) {
      const normalizedCurrent = Math.min(1, currentLive / 20);
      const amplitude = Math.min(height * 0.36, Math.max(8, normalizedCurrent * (height * 0.34)));
      const omega = (4 * Math.PI) / width;
      const phaseLag = Math.acos(Math.max(0, Math.min(1, powerFactorLive)));
      const phase = runtimeSeconds * 8 - phaseLag;
      for (let x = 0; x <= width; x += 1.5) {
        const y = midY - Math.sin(x * omega - phase) * amplitude;
        points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
    } else {
      const normalizedCurrent = Math.min(1, currentLive / 20);
      const dcOffset = Math.max(4, normalizedCurrent * (height * 0.3));
      const y = midY - dcOffset;
      return `M 0,${y.toFixed(1)} L ${width},${y.toFixed(1)}`;
    }
    return `M ${points.join(' L ')}`;
  };

  // Statistics data
  const stats = {
    runtime: simRunning ? runtimeSeconds : 0,
    activeNodes: simResult?.energizedComponents.size ?? 0,
    tickRate: simRunning ? 60 : 0,
    totalComponents: components.length,
    totalWires: wires.length,
    totalGroups: componentGroups.length,
  };

  return (
    <div className="p-3.5 space-y-3.5 text-xs select-none">
      {/* ─── LIVE MEASUREMENTS PANEL (AS PER REFERENCE IMAGE) ─── */}
      <div className="rounded-2xl border border-slate-800 bg-[#0c1322] p-3.5 shadow-xl text-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px] shadow-emerald-400 animate-pulse" />
            Calculated Live Measurements
          </div>
          <span className="flex items-center gap-1.5">
            {focusComp && (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                {focusDef?.label ?? 'Component'}
              </span>
            )}
            <span className="font-mono text-[10px] text-slate-400">
              {simRunning ? 'REAL-TIME 60Hz' : 'PAUSED'}
            </span>
          </span>
        </div>

        {/* 2x2 Grid for Voltage, Current, Power, Power Factor */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: Voltage (L-N) */}
          <div className="rounded-xl border border-slate-800/80 bg-[#131d31] p-3 flex flex-col justify-between overflow-hidden shadow-xs hover:border-slate-700/80 transition">
            <div className="text-[11px] font-medium text-slate-300">Voltage (L-N)</div>
            <div className="font-mono text-xl font-bold tracking-tight text-white my-1">
              <AnimatedNumber value={voltageLive} decimals={1} suffix=" V" duration={250} />
            </div>
            <div className="h-6 w-full pt-1">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 120 24">
                <title>Voltage Waveform</title>
                <path
                  d={generateSineSparkline(0.12, 3, 0, 120, 24)}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 2: Current (A) */}
          <div className="rounded-xl border border-slate-800/80 bg-[#131d31] p-3 flex flex-col justify-between overflow-hidden shadow-xs hover:border-slate-700/80 transition">
            <div className="text-[11px] font-medium text-slate-300">Current (A)</div>
            <div className="font-mono text-xl font-bold tracking-tight text-white my-1">
              <AnimatedNumber value={currentLive} decimals={1} suffix=" A" duration={250} />
            </div>
            <div className="h-6 w-full pt-1">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 120 24">
                <title>Current Waveform</title>
                <path
                  d={generateSineSparkline(0.12, 3, -0.35, 120, 24)}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 3: Power (W) */}
          <div className="rounded-xl border border-slate-800/80 bg-[#131d31] p-3 flex flex-col justify-between overflow-hidden shadow-xs hover:border-slate-700/80 transition">
            <div className="text-[11px] font-medium text-slate-300">Power (W)</div>
            <div className="font-mono text-xl font-bold tracking-tight text-white my-1">
              <AnimatedNumber value={powerLive} decimals={0} suffix=" W" duration={250} />
            </div>
            <div className="h-6 w-full pt-1">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 120 24">
                <title>Power Waveform</title>
                <path
                  d={generatePowerSparkline(120, 24)}
                  fill="none"
                  stroke="#eab308"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* Card 4: Power Factor */}
          <div className="rounded-xl border border-slate-800/80 bg-[#131d31] p-3 flex flex-col justify-between overflow-hidden shadow-xs hover:border-slate-700/80 transition">
            <div className="text-[11px] font-medium text-slate-300">Power Factor</div>
            <div className="font-mono text-xl font-bold tracking-tight text-white my-1">
              <AnimatedNumber value={powerFactorLive} decimals={2} duration={250} />
            </div>
            <div className="h-6 w-full pt-1">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 120 24">
                <title>Power Factor Waveform</title>
                <path
                  d={generateSineSparkline(0.14, 2.6, 0.4, 120, 24)}
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 5: Frequency (Wide Card with Harmonic Transient Waveform) */}
        <div className="rounded-xl border border-slate-800/80 bg-[#131d31] p-3 flex items-center justify-between gap-3 overflow-hidden shadow-xs hover:border-slate-700/80 transition">
          <div className="flex-shrink-0">
            <div className="text-[11px] font-medium text-slate-300">Frequency</div>
            <div className="font-mono text-xl font-bold tracking-tight text-white mt-1">
              {hasAcSupply ? (
                <AnimatedNumber value={frequencyLive} decimals={2} suffix=" Hz" duration={250} />
              ) : (
                '0.00 Hz (DC)'
              )}
            </div>
          </div>
          <div className="h-9 flex-1 pl-2">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 180 36">
              <title>Frequency Waveform</title>
              <defs>
                <filter id="glow-freq" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.2" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <path
                d={generateFrequencyTransientSparkline(180, 36)}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2.2"
                strokeLinecap="round"
                filter="url(#glow-freq)"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* ─── Waveform Oscilloscope ─── */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-emerald-500" /> DSO Waveform Scope
          </span>
          <div className="flex items-center gap-1.5 font-mono text-[9px]">
            <span className="rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5">
              CH1: {liveSupplyVoltage}V
            </span>
            <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold px-1.5 py-0.5">
              CH2: {activePowerW}W
            </span>
          </div>
        </div>

        <div className="relative h-28 w-full overflow-hidden rounded-lg bg-slate-950 p-1 border border-slate-800 shadow-inner">
          <svg
            className="absolute inset-0 h-full w-full pointer-events-none opacity-20"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Oscilloscope Graticule Grid</title>
            <defs>
              <pattern id="scope-grid" width="28" height="16" patternUnits="userSpaceOnUse">
                <path d="M 28 0 L 0 0 0 16" fill="none" stroke="#22d3ee" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#scope-grid)" />
            <line
              x1="50%"
              y1="0"
              x2="50%"
              y2="100%"
              stroke="#22d3ee"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            <line
              x1="0"
              y1="50%"
              x2="100%"
              y2="50%"
              stroke="#22d3ee"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          </svg>

          <svg
            className="h-full w-full relative z-10"
            viewBox="0 0 280 80"
            preserveAspectRatio="none"
          >
            <title>Waveform Oscilloscope View</title>
            <defs>
              <filter id="glow-ch1" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glow-ch2" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {simRunning && activePowerW > 0 && (
              <path
                d={generateCurrentWaveformPath(280, 80)}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.8"
                strokeLinecap="round"
                filter="url(#glow-ch2)"
                opacity="0.85"
              />
            )}

            <path
              d={generateWaveformPath(280, 80)}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              filter="url(#glow-ch1)"
            />
          </svg>

          <div className="absolute bottom-1 left-2 right-2 flex items-center justify-between text-[8px] font-mono text-slate-400 pointer-events-none z-20">
            <span>5.0ms/div • 50V/div</span>
            <span>
              {hasAcSupply ? '50.0 Hz AC' : 'DC Steady'} • {simRunning ? 'TRIG: AUTO' : 'HOLD'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Runtime Statistics ─── */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="size-3.5 text-green-500" /> Runtime Statistics
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-50/80 p-2 dark:bg-slate-950/60">
            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
              Active Nodes
            </div>
            <div className="font-mono text-sm font-bold text-green-600 dark:text-green-400">
              {stats.activeNodes}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50/80 p-2 dark:bg-slate-950/60">
            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
              Tick Rate
            </div>
            <div className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
              {stats.tickRate} Hz
            </div>
          </div>
          <div className="rounded-lg bg-slate-50/80 p-2 dark:bg-slate-950/60">
            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">Runtime</div>
            <div className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">
              {(stats.runtime / 10).toFixed(1)}s
            </div>
          </div>
          <div className="rounded-lg bg-slate-50/80 p-2 dark:bg-slate-950/60">
            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">
              Components
            </div>
            <div className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
              {stats.totalComponents}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50/80 p-2 dark:bg-slate-950/60">
            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">Wires</div>
            <div className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
              {stats.totalWires}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50/80 p-2 dark:bg-slate-950/60">
            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">Groups</div>
            <div className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
              {stats.totalGroups}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Unified diagnostic overlay ─── */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 mb-2">
          <label
            htmlFor="diagnostic-overlay-mode"
            className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5"
          >
            <Thermometer className="size-3.5 text-red-500" /> Diagnostic Overlay
          </label>
          <select
            id="diagnostic-overlay-mode"
            aria-label="Diagnostic overlay"
            value={diagnosticOverlayMode}
            onChange={(event) =>
              setSetting(
                'diagnosticOverlayMode',
                event.currentTarget.value as 'off' | 'heat' | 'heat-vdrop',
              )
            }
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <option value="off">Off</option>
            <option value="heat">Heat only</option>
            <option value="heat-vdrop">Heat + V-drop</option>
          </select>
        </div>
        <p className="mb-2 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
          Heat + V-drop compares routed conductors with the active regulation limit.
        </p>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#22c55e]"></div>
            <span>Normal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#eab308]"></div>
            <span>Warm</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#f97316]"></div>
            <span>Hot</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#ef4444]"></div>
            <span>Danger</span>
          </div>
        </div>
      </div>
    </div>
  );
}
