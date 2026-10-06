import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  HelpCircle,
  RefreshCw,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useCircuitStore, useUiStore } from '../../store';
import { useSettingsStore } from '../../store/settingsStore';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { MECHANISM_LABEL, formatClearingTime } from './faultAlertFormat';

export function WhatHappenedModal() {
  const whatHappenedOpen = useUiStore((s) => s.whatHappenedOpen);
  const setWhatHappenedOpen = useUiStore((s) => s.setWhatHappenedOpen);
  const lastFaultAlert = useUiStore((s) => s.lastFaultAlert);
  const faultAlert = useUiStore((s) => s.faultAlert);
  const repairAllFaults = useCircuitStore((s) => s.repairAllFaults);
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const appMode = useSettingsStore((s) => s.appMode);
  const running = useUiStore((s) => s.simRunning);

  const [mounted, setMounted] = useState(whatHappenedOpen);
  const [isClosing, setIsClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (whatHappenedOpen) {
      setMounted(true);
      setIsClosing(false);
    } else if (mounted && !isClosing) {
      setIsClosing(true);
      const timer = window.setTimeout(() => {
        setMounted(false);
        setIsClosing(false);
      }, 200);
      return () => window.clearTimeout(timer);
    }
  }, [whatHappenedOpen, mounted, isClosing]);

  const handleClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    window.setTimeout(() => {
      setWhatHappenedOpen(false);
      setMounted(false);
      setIsClosing(false);
    }, 200);
  };

  useDialogFocus(mounted && !isClosing, handleClose, panelRef);

  if (!mounted) return null;

  const activeAlert = faultAlert ?? lastFaultAlert;
  const hasBlownComponents = components.some((c) => c.state?.isBlown);
  const hasBustedWires = wires.some((w) => w.isBusted);

  const handleRepair = async () => {
    const applied =
      hasBlownComponents || hasBustedWires
        ? await repairAllFaults()
        : await useCircuitStore.getState().resetAllTrippedComponents();
    if (!applied) return;
    useUiStore.getState().clearFaultAlert();
    useUiStore
      .getState()
      .addLog(
        'Replacement/reset applied. Remaining injected faults are unchanged; run again to reassess.',
        'success',
      );
    handleClose();
  };

  const isShort =
    activeAlert?.kind === 'short' || activeAlert?.title?.toLowerCase().includes('short');
  const isMelt = activeAlert?.kind === 'melt' || activeAlert?.title?.toLowerCase().includes('melt');

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="what-happened-title"
      className="fixed inset-0 z-110 m-0 flex h-dvh w-screen max-h-none max-w-none items-center justify-center overflow-y-auto border-0 bg-transparent p-4"
    >
      <button
        type="button"
        aria-label="Close"
        className={`absolute inset-0 cursor-default bg-slate-950/75 backdrop-blur-md transition-all ${
          isClosing ? 'animate-backdrop-fade-out' : 'animate-backdrop-fade-in'
        }`}
        onClick={handleClose}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 outline-none ${
          isClosing ? 'animate-dialog-fade-out' : 'animate-dialog-fade-in'
        }`}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400">
              <HelpCircle className="size-6" />
            </div>
            <div>
              <h2
                id="what-happened-title"
                className="text-lg font-bold text-slate-900 dark:text-slate-100"
              >
                What Happened? Electrical Fault Analysis
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Diagnostic summary and step-by-step resolution guide
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close fault analysis"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-4 text-sm max-h-[70vh] overflow-y-auto pr-1">
          {/* Active Fault Status Card */}
          {activeAlert ? (
            <div
              className={`rounded-xl border p-4 ${
                isShort
                  ? 'border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40'
                  : isMelt
                    ? 'border-orange-300 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/40'
                    : 'border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
                {isShort ? (
                  <Zap className="size-4 text-red-600" />
                ) : isMelt ? (
                  <Flame className="size-4 text-orange-600" />
                ) : (
                  <AlertTriangle className="size-4 text-amber-600" />
                )}
                <span>{activeAlert.title}</span>
              </div>
              <p className="mt-2 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeAlert.reason}
              </p>

              {activeAlert.currentAmps !== null && activeAlert.currentAmps > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="rounded bg-white/80 px-2 py-1 text-red-700 dark:bg-slate-900 dark:text-red-400 border border-slate-200 dark:border-slate-800">
                    Measured Current: <strong>{activeAlert.currentAmps.toFixed(1)} A</strong>
                    {activeAlert.currentMultiple !== undefined && (
                      <> ({activeAlert.currentMultiple.toFixed(2)}×)</>
                    )}
                  </span>
                  {activeAlert.limitAmps !== null && activeAlert.limitAmps > 0 && (
                    <span className="rounded bg-white/80 px-2 py-1 text-emerald-700 dark:bg-slate-900 dark:text-emerald-400 border border-slate-200 dark:border-slate-800">
                      Declared Rating: <strong>{activeAlert.limitAmps.toFixed(1)} A</strong>
                    </span>
                  )}
                  {/* Timing is the other half of a trip: the same 26 A on the
                      same 16 A breaker is a nuisance trip at 21 minutes and a
                      cleared fault at 40 ms. */}
                  {activeAlert.clearingTimeSeconds !== undefined && (
                    <span className="rounded bg-white/80 px-2 py-1 text-amber-700 dark:bg-slate-900 dark:text-amber-400 border border-slate-200 dark:border-slate-800">
                      Cleared in:{' '}
                      <strong>{formatClearingTime(activeAlert.clearingTimeSeconds)}</strong>
                      {activeAlert.mechanism && <> ({MECHANISM_LABEL[activeAlert.mechanism]})</>}
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {hasBlownComponents || hasBustedWires
                  ? 'The circuit currently contains blown or tripped components or melted cables from a previous overload.'
                  : 'No active electrical fault detected. The circuit is operating within normal safety limits.'}
              </p>
            </div>
          )}

          {/* Explanation Section */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
              Electrical Cause & Physics
            </h3>
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300 space-y-2">
              {isShort ? (
                <>
                  <p>
                    <strong>Short Circuit (Direct Live-Neutral Contact):</strong> When Live wire is
                    connected directly to Neutral without passing through an electrical load (bulb,
                    heater, motor), circuit impedance drops to near 0 Ω.
                  </p>
                  <p>
                    By Ohm's Law (<em>I = V / R</em>), dividing supply voltage by negligible
                    resistance generates an extreme current spike (&gt; 100 A), instantly tripping
                    breakers or burning components.
                  </p>
                </>
              ) : isMelt ? (
                <>
                  <p>
                    <strong>
                      Cable Thermal Overload (<em>I²R</em> Heating):
                    </strong>{' '}
                    Electric current flowing through a copper wire encounters internal electrical
                    resistance. High current generates thermal power loss (<em>P = I²R</em>).
                  </p>
                  <p>
                    When current exceeds the thermal capacity of thin cables (e.g., 1.0 mm² rated at
                    11A carrying 25A) without an MCB breaker to trip, the copper core overheats and
                    melts the insulation.
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>Protection Device Trip / Overcurrent:</strong> Circuit breakers (MCBs,
                    RCDs, Fuses) monitor total active load current.
                  </p>
                  <p>
                    When connected electrical appliances demand more current than the protection
                    device's rated threshold (e.g. 28A total demand on a 16A breaker), the
                    bimetallic strip or magnetic coil opens the contacts to isolate the circuit
                    safely before wires catch fire.
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Step-by-Step Resolution Suggestions */}
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
              How to Fix & Prevent This Fault
            </h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-800/80">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                <div>
                  <strong>Check Wire Connections:</strong> Ensure the Live wire passes through a
                  load device (lamp, motor, appliance) before returning to Neutral.
                </div>
              </li>
              <li className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-800/80">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                <div>
                  <strong>Adjust Power (W) or Current (A):</strong> Click any load in the canvas and
                  use the Inspector panel to lower its power rating or adjust device resistance.
                </div>
              </li>
              <li className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-800/80">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500 mt-0.5" />
                <div>
                  <strong>Upgrade Protection or Cable Gauge:</strong> In Pro mode, increase cable
                  cross-sectional area (2.5 mm² or 4.0 mm²) or select a higher-rated MCB breaker
                  (e.g. 32A Type B).
                </div>
              </li>
            </ul>
          </div>

          {appMode === 'basic' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200 flex items-center gap-2">
              <Wrench className="size-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Student Mode Active:</strong> You can click{' '}
                <em>"Repair & Reset Circuit"</em> below to restore all blown components and cables
                and resume learning right away!
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
          >
            Close Guide
          </button>
          <button
            type="button"
            onClick={handleRepair}
            disabled={running}
            className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-all active:scale-95 dark:bg-emerald-600 dark:hover:bg-emerald-500 cursor-pointer"
          >
            <RefreshCw className="size-4" />
            {hasBlownComponents || hasBustedWires
              ? 'Replace damaged items'
              : 'Reset tripped devices'}
          </button>
        </div>
      </div>
    </dialog>
  );
}
