/**
 * InspectorSimulationContent — live simulation telemetry tab. Moved
 * verbatim from the previous monolithic `Inspector.tsx`.
 */

import {
  COMPONENT_DEFS,
  type ComponentInstance,
  type SimulationResult,
  type WireInstance,
} from '@electrasim/domain';
import { assessWireCapacity } from '@electrasim/domain/core/wireCapacity';
import { resolveWireProperties } from '@electrasim/domain/core/wireProperties';
import { AlertTriangle, Lock, OctagonAlert, Zap } from 'lucide-react';
import { useCircuitStore, useSettingsStore, useUiStore } from '../../../store';
import { EmojiGlyph } from '../EmojiGlyph';
import type { InspectorSelectionState } from './useInspectorSelectionState';

export function InspectorSimulationContent({
  selectionState,
  simResult,
}: {
  selectionState: InspectorSelectionState;
  simResult: SimulationResult | null;
}) {
  const simRunning = useUiStore((s) => s.simRunning);
  const appMode = useSettingsStore((s) => s.appMode);
  const manualFaultInjection = useSettingsStore((s) => s.manualFaultInjection);
  const components = useCircuitStore((s) => s.components);
  const isPro = appMode === 'pro';
  // Manual fault injection is Pro-only and gated behind the SubHeaderBar
  // master toggle. Student Mode never exposes the fault buttons.
  const faultsArmed = isPro && manualFaultInjection;

  if (selectionState.kind === 'wire') {
    const wire: WireInstance = selectionState.wire;
    const calc = simResult?.wireCalculations?.[wire.id];
    const isEnergized = simResult?.energizedWires.has(wire.id) ?? false;

    const current = calc?.currentAmps;
    const voltageDrop = calc?.voltageDropVolts;
    const vDropPercent = calc?.voltageDropPercent;
    const resistance = calc?.resistanceOhms;
    const available = simRunning && calc !== undefined;
    const capacity = assessWireCapacity(
      resolveWireProperties(
        wire,
        new Map(components.map((component) => [component.id, component])),
      ),
      current,
    );

    return (
      <div className="p-3.5 space-y-3.5 text-xs">
        {/* Energisation badge — the component panel already had one, and the
            wire panel needs it more: every metric below reads 0.00 both when a
            conductor is dead and when it is live with no load behind it, so
            without this the two states are indistinguishable. */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200">Conductor</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Cable Calculation</div>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
              isEnergized
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {!simRunning
              ? 'NOT RUNNING'
              : !calc
                ? 'UNASSESSED'
                : isEnergized
                  ? 'ENERGIZED'
                  : 'NO LIVE RESULT'}
          </span>
        </div>

        {/* Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Current Estimate
            </div>
            <div className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
              {available && current !== undefined ? `${current.toFixed(2)} A` : 'Unavailable'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Design Loop Drop (70 °C)
            </div>
            <div className="font-mono text-base font-bold text-indigo-600 dark:text-indigo-400">
              {available && voltageDrop !== undefined && vDropPercent !== undefined
                ? `${voltageDrop.toFixed(2)} V (${vDropPercent.toFixed(1)}%)`
                : 'Unavailable'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Design Loop Resistance (70 °C)
            </div>
            <div className="font-mono text-base font-bold text-amber-600 dark:text-amber-400">
              {available && resistance !== undefined ? `${resistance.toFixed(3)} Ω` : 'Unavailable'}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Derated Capacity Estimate
            </div>
            <div className="font-mono text-base font-bold text-purple-600 dark:text-purple-400">
              {available && capacity.deratedAmps !== null
                ? `${capacity.deratedAmps} A`
                : 'Unavailable'}
            </div>
          </div>
        </div>

        {/* Fault Injection Section — Pro Mode + master toggle only. */}
        {faultsArmed && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="size-3.5 text-amber-500" /> Fault Injection Testing
            </div>

            <div className="grid grid-cols-3 gap-1 pt-1">
              <button
                type="button"
                onClick={() => useCircuitStore.getState().setWireFault(wire.id, 'open-circuit')}
                className={`rounded border py-1.5 text-[10px] font-bold transition ${
                  wire.fault === 'open-circuit'
                    ? 'border-red-500 bg-red-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Open Circuit
              </button>

              <button
                type="button"
                onClick={() => useCircuitStore.getState().setWireFault(wire.id, 'open-neutral')}
                className={`rounded border py-1.5 text-[10px] font-bold transition ${
                  wire.fault === 'open-neutral'
                    ? 'border-red-500 bg-red-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Broken Neutral
              </button>

              <button
                type="button"
                onClick={() => useCircuitStore.getState().setWireFault(wire.id, 'short-circuit')}
                className={`rounded border py-1.5 text-[10px] font-bold transition ${
                  wire.fault === 'short-circuit'
                    ? 'border-red-500 bg-red-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Short Circuit
              </button>

              <button
                type="button"
                onClick={() => useCircuitStore.getState().setWireFault(wire.id, 'live-to-earth')}
                className={`col-span-2 rounded border py-1.5 text-[10px] font-bold transition ${
                  wire.fault === 'live-to-earth'
                    ? 'border-red-500 bg-red-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Live-to-Earth Breakdown
              </button>

              <button
                type="button"
                onClick={() => useCircuitStore.getState().setWireFault(wire.id, undefined)}
                className="rounded border border-emerald-300 bg-emerald-50 py-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 transition"
              >
                Clear Fault
              </button>
            </div>
          </div>
        )}

        {!faultsArmed && isPro && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-slate-800 dark:bg-slate-900/60">
            <Lock className="mx-auto mb-1 size-4 text-slate-400" />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Fault injection is off. Toggle <strong>Faults</strong> in the SubHeaderBar to inject
              open/short/earth faults.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (selectionState.kind === 'component') {
    const comp: ComponentInstance = selectionState.component;
    const def = COMPONENT_DEFS[comp.type];
    const isEnergized = simResult?.energizedComponents.has(comp.id) ?? false;

    // Manual MCB trip toggle for protection components
    const isProtectionComponent = def?.isProtection ?? false;
    const isTripped = comp.state.isTripped ?? false;

    return (
      <div className="p-3.5 space-y-3.5 text-xs">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-800 dark:text-slate-200">{def?.label}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Component Operating Telemetry
            </div>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
              isEnergized
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {isEnergized ? 'ENERGIZED' : 'IDLE / OFF'}
          </span>
        </div>

        {/* Manual MCB Trip Toggle for Protection Devices.
            Gated by the Pro-mode master fault toggle — Student Mode
            never shows manual breaker fault injection. */}
        {isProtectionComponent && faultsArmed && (
          <div className="rounded-xl border border-orange-200 bg-orange-50/80 p-3 dark:border-orange-800 dark:bg-orange-950/40 space-y-2">
            <div className="font-bold text-orange-900 dark:text-orange-200 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <OctagonAlert className="size-3.5 text-orange-600" />
              Manual Breaker Control
            </div>
            <p className="text-[10px] text-orange-700 dark:text-orange-300">
              Manually trip or reset the breaker to simulate fault conditions and test circuit
              protection behavior.
            </p>
            <div className="flex gap-2 pt-1">
              {!isTripped ? (
                <button
                  type="button"
                  onClick={() =>
                    useCircuitStore.getState().updateComponentState(comp.id, {
                      isTripped: true,
                      tripReason: 'manual-fault',
                    })
                  }
                  className="flex-1 rounded-lg border border-red-300 bg-red-600 py-2 text-xs font-bold text-white hover:bg-red-500 transition shadow-xs"
                >
                  <span className="inline-flex items-center gap-1">
                    <EmojiGlyph emoji="bolt" size={13} /> TRIP Breaker (Manual Fault)
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => useCircuitStore.getState().resetTrippedComponent(comp.id)}
                  disabled={!(simResult?.faultsCleared ?? true)}
                  className="flex-1 rounded-lg border border-emerald-300 bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ↻ RESET Breaker
                </button>
              )}
            </div>
            {isTripped && (
              <div className="rounded-lg bg-red-100 dark:bg-red-950/60 p-2 text-[10px] text-red-800 dark:text-red-300">
                <strong>Status:</strong> TRIPPED ({comp.state.tripReason ?? 'manual-fault'})
                <br />
                <strong>Action:</strong> Clear faults before resetting
              </div>
            )}
          </div>
        )}

        {/* Faults / Blown Device State */}
        {comp.state.isBlown && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/60 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-red-800 dark:text-red-300 text-xs">
              <OctagonAlert className="size-4 text-red-600" />
              <span>Device Fault: {comp.state.blownReason ?? 'Overload Melted'}</span>
            </div>
            <button
              type="button"
              onClick={() =>
                useCircuitStore.getState().updateComponentState(comp.id, {
                  isBlown: false,
                  blownReason: undefined,
                })
              }
              className="w-full rounded-lg bg-red-600 py-1.5 text-xs font-bold text-white hover:bg-red-500 transition"
            >
              Reset Fault / Replace Device
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 text-center space-y-3">
      <Zap className="size-8 text-amber-500 mx-auto animate-pulse" />
      <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
        Circuit Simulation Telemetry
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Select any wire or component on canvas to inspect live voltage, branch current draw, or
        inject open/short faults for testing.
      </p>
    </div>
  );
}
