/**
 * InspectorFaultLabView — the Fault Lab, living as an Inspector tab (fault
 * mode no longer opens a separate floating window).
 *
 * Sections:
 *  - Target: the selected component *or wire*; injections are choreographed
 *    on the canvas (`beginFaultInjection`): the fault's animation plays
 *    first, then the fault commits (instant under reduced motion).
 *  - Inject fault: the catalogue, grouped by category for scannability.
 *  - Active faults: every injected fault with Focus / Replay / Clear — the
 *    command centre for multi-fault demos; also hosts the live "arming…"
 *    entry with a cancel affordance.
 *  - Threshold Overrides (component targets): moved here from Component
 *    Properties so every manual-fault control lives in one place.
 */

import {
  COMPONENT_DEFS,
  type FaultType,
  type InjectedFault,
  isWireFaultType,
  normalizeCircuitFaults,
} from '@electrasim/domain';
import {
  AlertTriangle,
  Crosshair,
  Eraser,
  Flame,
  FlaskConical,
  Link2Off,
  RotateCw,
  Scissors,
  ShieldCheck,
  Sliders,
  Unlink,
  Unplug,
  Waves,
  Zap,
} from 'lucide-react';
import { Suspense, lazy } from 'react';
import { focusFaultTarget, useCircuitStore, useUiStore } from '../../../store';
import { useConfigurationLockReason } from '../../../store/electricalEditing';
import { faultFxConfig } from '../../canvas/faultFx';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const FaultRepairPanel = lazy(() => import('./FaultRepairPanel'));

interface FaultDef {
  type: FaultType;
  label: string;
  hint?: string;
  /** What the user will see on the canvas — one line per fault kind. */
  fx: string;
  icon: typeof Scissors;
  scope?: 'switch' | 'protection';
  /** Grouping in the grid (components); wire faults form their own group. */
  cat: 'conductor' | 'polarity' | 'leakage' | 'device';
}

const FAULTS: FaultDef[] = [
  {
    type: 'open-circuit',
    label: 'Open Circuit',
    hint: 'Break a conductor',
    fx: 'Conductor fades out at the cut',
    icon: Scissors,
    cat: 'conductor',
  },
  {
    type: 'open-neutral',
    label: 'Open Neutral',
    hint: 'Cut the neutral return',
    fx: 'Neutral run fades out',
    icon: Unplug,
    cat: 'conductor',
  },
  {
    type: 'short-circuit',
    label: 'Short Circuit',
    hint: 'L–N bolted fault',
    fx: 'Sparks first, then fire',
    icon: Zap,
    cat: 'conductor',
  },
  {
    type: 'reverse-polarity',
    label: 'Reverse Polarity',
    hint: 'L↔N swap',
    fx: 'Wires swap identity colours',
    icon: Link2Off,
    cat: 'polarity',
  },
  {
    type: 'switched-neutral',
    label: 'Switched Neutral',
    hint: 'Neutral through switch — identities swap through the device; ports keep legal mates (L never connects to N)',
    fx: 'Runs swap L↔N through device',
    icon: AlertTriangle,
    scope: 'switch',
    cat: 'polarity',
  },
  {
    type: 'earth-fault',
    label: 'Earth Fault',
    hint: 'Live-to-earth leakage',
    fx: 'Leakage rings sink to ground',
    icon: Unlink,
    cat: 'leakage',
  },
  {
    type: 'smooth-dc-residual',
    label: 'Smooth DC',
    hint: 'EV/PV — blinds RCD',
    fx: 'DC wave drifts off component',
    icon: Waves,
    cat: 'leakage',
  },
  {
    type: 'arc-fault',
    label: 'Arc Fault',
    hint: 'Only AFDD detects',
    fx: 'White-hot arc strobe',
    icon: Flame,
    cat: 'leakage',
  },
  {
    type: 'protection-bypass',
    label: 'Bypass Breaker',
    hint: 'Bridged protection',
    fx: 'Bridge arc draws across device',
    icon: ShieldCheck,
    scope: 'protection',
    cat: 'device',
  },
  {
    type: 'protection-forced-open',
    label: 'Jam Breaker',
    hint: 'Stuck open',
    fx: 'Jammed lock shakes',
    icon: Sliders,
    scope: 'protection',
    cat: 'device',
  },
];

/** Faults injectable on a wire target (mirror of the wire context menu). */
const WIRE_FAULTS: FaultDef[] = [
  {
    type: 'open-circuit',
    label: 'Open Circuit',
    hint: 'Cut this conductor',
    fx: 'Wire fades out at the cut',
    icon: Scissors,
    cat: 'conductor',
  },
  {
    type: 'open-neutral',
    label: 'Open Neutral',
    hint: 'Neutral return cut',
    fx: 'Neutral run fades out',
    icon: Unplug,
    cat: 'conductor',
  },
  {
    type: 'short-circuit',
    label: 'Short Circuit',
    hint: 'L–N bolted fault on this run',
    fx: 'Sparks first, then fire',
    icon: Zap,
    cat: 'conductor',
  },
];

const CATEGORY_LABELS: Record<FaultDef['cat'], string> = {
  conductor: 'Conductor',
  polarity: 'Polarity & Wiring',
  leakage: 'Leakage & Residual',
  device: 'Protection Device',
};
const CATEGORY_ORDER: FaultDef['cat'][] = ['conductor', 'polarity', 'leakage', 'device'];

type StoreTarget = { componentId: string } | { wireId: string };

/** Map a stored injected-fault target back to a choreography/focus target. */
function toStoreTarget(fault: InjectedFault): StoreTarget | null {
  if (fault.target.type === 'component') return { componentId: fault.target.id };
  if (fault.target.type === 'wire') return { wireId: fault.target.id };
  if (fault.target.type === 'port') return { componentId: fault.target.componentId };
  return null;
}

export function InspectorFaultLabView() {
  const selectedId = useCircuitStore((s) => s.selectedComponentId);
  const selectedWireIds = useCircuitStore((s) => s.selectedWireIds);
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const injectedFaults = useCircuitStore((s) => s.faults);
  const faults = normalizeCircuitFaults({ components, wires, faults: injectedFaults }).filter(
    (fault) => !fault.resolved,
  );
  const simResult = useUiStore((s) => s.simResult);
  const simRunning = useUiStore((s) => s.simRunning);
  const configurationLock = useConfigurationLockReason();
  const pendingFaultFx = useUiStore((s) => s.pendingFaultFx);
  const reducedMotion = useReducedMotion();

  const selectedComp = selectedId ? (components.find((c) => c.id === selectedId) ?? null) : null;
  const selectedWire =
    !selectedComp && selectedWireIds.length === 1
      ? (wires.find((w) => w.id === selectedWireIds[0]) ?? null)
      : null;
  const def = selectedComp ? COMPONENT_DEFS[selectedComp.type] : null;
  const isSwitch = def?.isSwitch ?? false;
  const isProtection = def?.isProtection ?? false;

  const targetLabel = selectedComp
    ? (def?.label ?? selectedComp.type)
    : selectedWire
      ? `Wire #${selectedWire.id.slice(0, 8)}`
      : null;
  const targetFault = selectedComp
    ? (selectedComp.state?.fault ?? null)
    : (selectedWire?.fault ?? null);
  const storeTarget: StoreTarget | null = selectedComp
    ? { componentId: selectedComp.id }
    : selectedWire
      ? { wireId: selectedWire.id }
      : null;

  const armingType =
    pendingFaultFx &&
    ((selectedComp &&
      'componentId' in pendingFaultFx.target &&
      pendingFaultFx.target.componentId === selectedComp.id) ||
      (selectedWire &&
        'wireId' in pendingFaultFx.target &&
        pendingFaultFx.target.wireId === selectedWire.id))
      ? pendingFaultFx.type
      : null;
  /** Serialize choreography: while any injection arms, the grid is locked. */
  const arming = pendingFaultFx !== null;

  const logInjection = (type: FaultType, label: string) => {
    useUiStore
      .getState()
      .addLog(
        reducedMotion
          ? `Fault Lab: injected ${type} on ${label}`
          : `Fault Lab: arming ${type} on ${label} — watch the canvas`,
        'warning',
      );
  };

  const inject = (type: FaultType) => {
    if (!storeTarget || !targetLabel) return;
    useUiStore.getState().beginFaultInjection(type, storeTarget);
    logInjection(type, targetLabel);
  };

  const clearSelectionFault = async () => {
    if (!selectedComp && !selectedWire) return;
    useUiStore.getState().clearPendingFaultFx();
    if (selectedComp) {
      if (!(await useCircuitStore.getState().setComponentFault(selectedComp.id, undefined))) return;
    } else if (selectedWire) {
      if (!(await useCircuitStore.getState().setWireFault(selectedWire.id, undefined))) return;
    }
    useUiStore
      .getState()
      .addLog(`Fault Lab: cleared fault on ${targetLabel ?? 'selection'}`, 'success');
  };

  const clearAll = async () => {
    useUiStore.getState().clearPendingFaultFx();
    if (!(await useCircuitStore.getState().clearAllFaults())) return;
    useUiStore.getState().addLog('Fault Lab: cleared all injected faults.', 'success');
  };

  const replayFault = (fault: InjectedFault) => {
    const tgt = toStoreTarget(fault);
    if (!tgt) return;
    useUiStore.getState().beginFaultInjection(fault.type, tgt);
    logInjection(fault.type, faultTargetLabel(fault));
  };

  const clearFaultEntry = async (fault: InjectedFault) => {
    if (!(await useCircuitStore.getState().removeFault(fault.id))) return;
    useUiStore
      .getState()
      .addLog(`Fault Lab: cleared ${fault.type} on ${faultTargetLabel(fault)}.`, 'success');
  };

  /** Human label for an injected fault's target. */
  function faultTargetLabel(fault: InjectedFault): string {
    const target = fault.target; // hoisting keeps TS narrowing inside the branches
    if (target.type === 'component') {
      const comp = components.find((c) => c.id === target.id);
      return comp ? (COMPONENT_DEFS[comp.type]?.label ?? comp.type) : 'component';
    }
    if (target.type === 'wire') return `Wire #${target.id.slice(0, 8)}`;
    const comp = components.find((c) => c.id === target.componentId);
    return `port ${target.portIndex + 1} · ${comp ? (COMPONENT_DEFS[comp.type]?.label ?? comp.type) : 'component'}`;
  }

  // Grid contents: component faults grouped by category; wire faults are a
  // single conductor group.
  const componentFaults = FAULTS.filter((f) => {
    if (f.scope === 'switch') return isSwitch;
    if (f.scope === 'protection') return isProtection;
    return true;
  });
  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: (selectedComp ? componentFaults : WIRE_FAULTS).filter((f) => f.cat === cat),
  })).filter((g) => g.items.length > 0);

  // Threshold-override telemetry (component targets only).
  const compCalc = selectedComp ? simResult?.componentCalculations?.[selectedComp.id] : undefined;
  const voltageLimit = selectedComp?.state.customMaxVolts ?? def?.maxVolts;
  const currentLimit = selectedComp?.state.customMaxAmps ?? def?.maxAmps;
  const powerRating = selectedComp?.state.customPowerWatts ?? def?.powerWatts;
  const read = (value: number | undefined, unit: string) =>
    simRunning && value !== undefined && Number.isFinite(value)
      ? `${Number(value.toFixed(4))} ${unit}`
      : 'Unavailable';

  return (
    <div aria-label="Fault Lab panel" className="flex flex-col gap-3 p-3">
      {/* Intro strip */}
      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/40">
        <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-amber-500 text-white shadow-sm shadow-amber-500/30">
          <FlaskConical className="size-3.5" />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100">
            Fault Lab · manual injection
          </div>
          <p className="text-[10px] leading-snug text-amber-800 dark:text-amber-300/80">
            Select a component or wire, inject, and watch the canvas — every fault plays its own
            animation. {reducedMotion ? 'Reduced-motion is on: faults apply instantly.' : ''}
          </p>
        </div>
      </div>

      {/* Target */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/40">
        {targetLabel ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Target
            </span>
            <span className="truncate rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
              {targetLabel}
            </span>
            {armingType && (
              <span className="animate-pulse rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                arming {armingType}…
              </span>
            )}
            {targetFault && !armingType && (
              <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-700 dark:bg-red-950/60 dark:text-red-300">
                {targetFault}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <AlertTriangle className="size-3.5 text-amber-500" />
            Click a component or a wire on the canvas to target it with a fault.
          </div>
        )}
      </div>

      <Suspense fallback={<p className="text-xs">Loading repair controls…</p>}>
        <FaultRepairPanel component={selectedComp} wire={selectedWire} />
      </Suspense>

      {/* Fault grid (grouped) */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Inject fault
          </div>
          <button
            type="button"
            onClick={clearAll}
            title="Clear all injected faults"
            className="flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-1.5 py-1 text-[10px] font-semibold text-amber-700 shadow-sm transition hover:bg-amber-100 dark:border-amber-800 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-amber-950/60"
          >
            <Eraser className="size-3" />
            Clear all
          </button>
        </div>
        {groups.length === 0 && (
          <p className="py-2 text-center text-[11px] text-slate-400">
            No faults apply to the selected target.
          </p>
        )}
        {groups.map((group) => (
          <div key={group.cat} className="mb-2 last:mb-0">
            <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {CATEGORY_LABELS[group.cat]}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map((f) => {
                const isActive = targetFault === f.type;
                const isArming = armingType === f.type;
                return (
                  <button
                    key={f.type}
                    type="button"
                    disabled={!storeTarget || (arming && !isArming)}
                    title={
                      storeTarget
                        ? `${f.hint ?? ''} · Canvas: ${f.fx}`
                        : 'Select a component or wire first'
                    }
                    onClick={() => inject(f.type)}
                    className={[
                      'flex flex-col items-center gap-0.5 rounded-xl border px-1.5 py-2 text-[10px] font-semibold shadow-sm transition',
                      isActive
                        ? 'border-red-300 bg-red-50 text-red-700 ring-1 ring-red-200 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300'
                        : isArming
                          ? 'animate-pulse border-amber-300 bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200'
                          : storeTarget
                            ? 'border-slate-200 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-amber-600 dark:hover:bg-amber-950/40'
                            : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-600',
                    ].join(' ')}
                  >
                    <f.icon className="size-4" />
                    {isArming ? 'Arming…' : f.label}
                    <span className="text-center text-[8px] leading-tight font-normal opacity-70">
                      {f.fx}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {storeTarget && (targetFault || armingType) && (
          <button
            type="button"
            onClick={clearSelectionFault}
            className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
          >
            <ShieldCheck className="size-3.5" />
            {armingType ? 'Cancel arming' : 'Clear fault on selection'}
          </button>
        )}
      </div>

      {/* Active faults command centre */}
      {(faults.length > 0 || pendingFaultFx) && (
        <div className="rounded-xl border border-red-200 bg-red-50/60 p-2.5 dark:border-red-900/60 dark:bg-red-950/30 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
              Active faults ({faults.length})
            </div>
            <button
              type="button"
              onClick={clearAll}
              aria-label="Clear all injected faults from the active list"
              className="text-[10px] font-semibold text-red-700 underline-offset-2 hover:underline dark:text-red-300"
            >
              Clear all
            </button>
          </div>

          {pendingFaultFx && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-100/70 px-2 py-1.5 animate-pulse dark:border-amber-800 dark:bg-amber-950/50">
              <span
                className="grid size-5 shrink-0 place-items-center rounded text-[8px] font-bold text-white"
                style={{ backgroundColor: faultFxConfig(pendingFaultFx.type).color }}
              >
                {faultFxConfig(pendingFaultFx.type).code}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[10px] font-semibold text-amber-900 dark:text-amber-200">
                  Arming {faultFxConfig(pendingFaultFx.type).label}…
                </div>
                <div className="truncate text-[9px] text-amber-700/80 dark:text-amber-400/70">
                  animation playing on canvas
                </div>
              </div>
              <button
                type="button"
                onClick={() => useUiStore.getState().clearPendingFaultFx()}
                title="Cancel pending injection"
                className="rounded px-1.5 py-0.5 text-[9px] font-bold text-amber-800 hover:bg-amber-200/70 dark:text-amber-200 dark:hover:bg-amber-900/60"
              >
                Cancel
              </button>
            </div>
          )}

          {faults.map((fault) => {
            const config = faultFxConfig(fault.type);
            const focus = toStoreTarget(fault);
            return (
              <div
                key={fault.id}
                className="flex items-center gap-2 rounded-lg border border-red-200/70 bg-white/80 px-2 py-1.5 dark:border-red-900/50 dark:bg-slate-900/60"
                data-active-fault={fault.type}
              >
                <span
                  className="grid size-5 shrink-0 place-items-center rounded text-[8px] font-bold text-white"
                  style={{ backgroundColor: config.color }}
                >
                  {config.code}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[10px] font-semibold text-slate-800 dark:text-slate-200">
                    {config.label}
                  </div>
                  <div className="truncate text-[9px] text-slate-500 dark:text-slate-400">
                    {faultTargetLabel(fault)}
                  </div>
                </div>
                {focus && (
                  <button
                    type="button"
                    onClick={() => focusFaultTarget(focus)}
                    title="Focus on canvas"
                    aria-label={`Focus ${config.label} on canvas`}
                    className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                  >
                    <Crosshair className="size-3.5" />
                  </button>
                )}
                {focus && (!('wireId' in focus) || isWireFaultType(fault.type)) && (
                  <button
                    type="button"
                    onClick={() => replayFault(fault)}
                    title="Replay canvas animation"
                    aria-label={`Replay ${config.label} animation`}
                    className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-amber-700 dark:hover:bg-slate-800 dark:hover:text-amber-300"
                  >
                    <RotateCw className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => clearFaultEntry(fault)}
                  title={`Clear ${config.label}`}
                  aria-label={`Clear ${config.label}`}
                  className="rounded p-1 text-slate-400 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/60 dark:hover:text-red-300"
                >
                  <Eraser className="size-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {selectedComp && def && (
        <fieldset
          disabled={!!configurationLock}
          className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 dark:border-amber-800 dark:bg-amber-950/30 space-y-2.5"
        >
          <legend className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">
            Threshold Overrides
          </legend>
          <p className="text-[10px]">
            Declared ratings are separate from measured values. Timed trips require a protection
            model; damage requires a declared stress budget. A rating alone does not predict
            failure.
          </p>
          {configurationLock && <p className="text-[10px]">{configurationLock}</p>}
          <p className="text-[10px]">
            Terminal voltage: {read(compCalc?.voltage, 'V')}. Branch current:{' '}
            {read(compCalc?.currentAmps, 'A')}. Power: {read(compCalc?.powerWatts, 'W')}.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['customMaxVolts', 'Max Voltage (V)', voltageLimit],
                ['customMaxAmps', 'Max Current (A)', currentLimit],
                ['customPowerWatts', 'Design power (W)', powerRating],
              ] as const
            ).map(([field, label, value]) => (
              <label key={field} className="text-[10px] text-slate-600 dark:text-slate-300">
                {label}
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  aria-label={label}
                  placeholder="Not declared"
                  value={value ?? ''}
                  onChange={(event) =>
                    useCircuitStore.getState().updateComponentState(selectedComp.id, {
                      [field]: event.target.value === '' ? undefined : Number(event.target.value),
                    })
                  }
                  className="w-full rounded border border-slate-200 px-2 py-1 font-mono text-xs disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900"
                />
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
