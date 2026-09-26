/**
 * Inspector — right-hand floating panel showing selected component/wire
 * properties, topology connections, simulation telemetry, waveforms, safety
 * validation, and logs.
 *
 * Split out of the former 3,166-line monolith into `inspector/` modules.
 * Every view body is byte-identical to the original — pure code move.
 */

import {
  COMPONENT_DEFS,
  type ComponentInstance,
  type SimulationResult,
  type WireInstance,
} from '@electrasim/domain';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  FlaskConical,
  Layers,
  Route,
  ShieldCheck,
  Sliders,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import { Suspense, lazy } from 'react';
import { useCircuitStore, useSettingsStore, useUiStore } from '../../../store';
import { InspectorConnectionsContent } from './InspectorConnectionsContent';
import { InspectorPropertiesContent } from './InspectorPropertiesContent';
import { InspectorSimulationContent } from './InspectorSimulationContent';
import { useInspectorSelectionState } from './useInspectorSelectionState';

// Heavy Inspector tabs code-split with dynamic import (perf & initial bundle optimization)
const ValidationReportView = lazy(() =>
  import('../ValidationReportView').then((m) => ({ default: m.ValidationReportView })),
);
const InspectorAnalyticsView = lazy(() =>
  import('./InspectorAnalyticsView').then((m) => ({ default: m.InspectorAnalyticsView })),
);
const InspectorFaultLabView = lazy(() =>
  import('./InspectorFaultLabView').then((m) => ({ default: m.InspectorFaultLabView })),
);
const InspectorHistoryView = lazy(() =>
  import('./InspectorHistoryView').then((m) => ({ default: m.InspectorHistoryView })),
);
const InspectorLogsView = lazy(() =>
  import('./InspectorLogsView').then((m) => ({ default: m.InspectorLogsView })),
);
const ZsCheckPanel = lazy(() =>
  import('./ZsCheckPanel').then((m) => ({ default: m.ZsCheckPanel })),
);

function TabLoadingFallback() {
  return (
    <div className="flex h-44 w-full flex-col items-center justify-center gap-2.5 p-6 text-slate-400">
      <div className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
      <span className="text-[11px] font-medium tracking-wide">Loading tab...</span>
    </div>
  );
}

interface Props {
  selectedComp: ComponentInstance | null;
  selectedWire?: WireInstance | null;
  simResult: SimulationResult | null;
  isPhone: boolean;
  dashboardOpen?: boolean;
}

/* =========================================================================
   INSPECTOR MAIN COMPONENT (Vertical Tab Sidebar Drawer)
   ========================================================================= */

export function Inspector({
  selectedComp: initialSelectedComp,
  selectedWire: initialSelectedWire,
  simResult,
  isPhone,
}: Props) {
  const selectionState = useInspectorSelectionState({
    selectedComp: initialSelectedComp,
    selectedWire: initialSelectedWire,
  });

  const activeInspectorTab = useUiStore((s) => s.activeInspectorTab);
  const setActiveInspectorTab = useUiStore((s) => s.setActiveInspectorTab);
  const activeGuideId = useUiStore((s) => s.activeGuideId);
  const eventHistory = useUiStore((s) => s.eventHistory);
  const faultLabOpen = useUiStore((s) => s.faultLabOpen);
  const appMode = useSettingsStore((s) => s.appMode);
  const isPro = appMode === 'pro';
  // Any injected fault shows as an amber dot on the Fault Lab tab button.
  const injectedFaultCount = useCircuitStore((s) => s.faults.length);

  const validationReport = useUiStore((s) => s.validationReport);
  const runCircuitValidation = useUiStore((s) => s.runCircuitValidation);

  const isCollapsed = useUiStore((s) => s.inspectorCollapsed);
  const setIsCollapsed = (c: boolean) => useUiStore.getState().setInspectorCollapsed(c);

  if (isPhone) return null;

  // Collapsed State View
  if (isCollapsed) {
    return (
      <aside
        data-tour="inspector"
        className="fixed right-0 top-[84px] bottom-0 z-20 flex w-12 flex-col items-center justify-between border-l border-slate-200/80 bg-white/90 p-2 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 select-none"
        title="Inspector (Collapsed)"
      >
        <div className="flex flex-col items-center gap-3 pt-3">
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-xs hover:bg-blue-100 dark:bg-blue-950/80 dark:text-blue-400 dark:hover:bg-blue-900 transition"
            title="Expand Inspector Panel"
            aria-label="Expand Inspector Panel"
          >
            <ChevronLeft className="size-4" />
          </button>

          <div className="flex flex-col items-center gap-2.5 pt-3">
            <button
              type="button"
              onClick={() => {
                setIsCollapsed(false);
                setActiveInspectorTab('properties');
              }}
              className={`p-2 rounded-xl transition ${
                activeInspectorTab === 'properties'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Properties & Settings"
            >
              <Sliders className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCollapsed(false);
                setActiveInspectorTab('connections');
              }}
              className={`p-2 rounded-xl transition ${
                activeInspectorTab === 'connections'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Connections & Topology"
            >
              <Route className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCollapsed(false);
                setActiveInspectorTab('simulation');
              }}
              className={`p-2 rounded-xl transition ${
                activeInspectorTab === 'simulation'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Simulation Telemetry & Faults"
            >
              <Zap className="size-4" />
            </button>

            {isPro && (
              <button
                type="button"
                onClick={() => {
                  // Opening fault mode expands the drawer and snaps to the
                  // Fault Lab tab in one store action.
                  useUiStore.getState().setFaultLabOpen(true);
                }}
                className={`relative p-2 rounded-xl transition ${
                  activeInspectorTab === 'faultlab' && faultLabOpen
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                aria-label="Fault Lab (manual fault injection)"
                title="Fault Lab (manual fault injection)"
              >
                <FlaskConical className="size-4" />
                {injectedFaultCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white">
                    {injectedFaultCount > 9 ? '9+' : injectedFaultCount}
                  </span>
                )}
              </button>
            )}

            <div className="my-1 h-px w-6 bg-slate-200 dark:bg-slate-800" />

            <button
              type="button"
              onClick={() => {
                setIsCollapsed(false);
                setActiveInspectorTab('analytics');
              }}
              className={`p-2 rounded-xl transition ${
                activeInspectorTab === 'analytics'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Waveform Scope"
            >
              <Sparkles className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCollapsed(false);
                setActiveInspectorTab('validation');
              }}
              className={`p-2 rounded-xl transition relative ${
                activeInspectorTab === 'validation'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Circuit Safety & Validation"
            >
              <ShieldCheck className="size-4" />
              {(validationReport?.summary.errorsCount ?? 0) > 0 && (
                <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                  {validationReport?.summary.errorsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsCollapsed(false);
                setActiveInspectorTab('logs');
              }}
              className={`p-2 rounded-xl transition ${
                activeInspectorTab === 'logs'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Console Logs & CLI"
            >
              <Terminal className="size-4" />
            </button>

            {isPro && (
              <button
                type="button"
                onClick={() => {
                  setIsCollapsed(false);
                  setActiveInspectorTab('history');
                }}
                className={`relative p-2 rounded-xl transition ${
                  activeInspectorTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
                aria-label="Simulation History (audit log)"
                title="Simulation History (audit log)"
              >
                <Clock className="size-4" />
                {eventHistory.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-bold text-white">
                    {eventHistory.length > 9 ? '9+' : eventHistory.length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </aside>
    );
  }

  // Expanded Inspector Layout with Vertical Navigation Tab Bar on Right.
  // Inset below the floating header toolbar (top-4 pill ≈ 64 px tall) so it
  // can never cover — and swallow clicks for — the Menu / theme controls.
  return (
    <aside
      data-tour="inspector"
      className="fixed right-0 top-[84px] bottom-0 z-20 flex shadow-2xl border-l border-t rounded-tl-2xl border-slate-200/80 bg-white/95 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95"
    >
      {/* Main Drawer Body Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-64 md:w-72 lg:w-80">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-3.5 py-2.5 select-none dark:border-slate-800 dark:bg-slate-950/80 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {selectionState.kind === 'wire' ? (
              <Route className="size-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
            ) : selectionState.kind === 'component' ? (
              <Sliders className="size-4 flex-shrink-0 text-purple-600 dark:text-purple-400" />
            ) : (
              <Layers className="size-4 flex-shrink-0 text-slate-500 dark:text-slate-400" />
            )}
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {activeInspectorTab === 'faultlab' ? 'FAULT LAB' : activeInspectorTab.toUpperCase()}{' '}
                PANEL
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {selectionState.kind === 'wire'
                  ? `Wire #${selectionState.wire.id.slice(0, 8)}`
                  : selectionState.kind === 'component'
                    ? (COMPONENT_DEFS[selectionState.component.type]?.label ??
                      selectionState.component.type)
                    : selectionState.kind === 'multi-component'
                      ? `${selectionState.count} Items Selected`
                      : 'Circuit Canvas'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                isPro
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
              }`}
            >
              {isPro ? 'Pro' : 'Student'}
            </span>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              className="rounded p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Collapse Inspector"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Return-to-guide strip: while a Guided Circuit is active, selecting a
            component pauses its steps — surface the way back inside the drawer
            (the floating chip only covers the collapsed-rail state). */}
        {activeGuideId && selectionState.kind === 'component' && (
          <div className="flex items-center justify-between gap-2 border-b border-indigo-100 bg-indigo-50/80 px-3.5 py-2 flex-shrink-0 dark:border-indigo-900/60 dark:bg-indigo-950/40">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                Guide paused
              </p>
              <p className="truncate text-[11px] text-indigo-800 dark:text-indigo-200">
                Challenge steps hidden while inspecting
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                useCircuitStore.getState().clearSelection();
                useUiStore.getState().setInspectorCollapsed(true);
              }}
              className="flex-shrink-0 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-blue-700"
            >
              Close inspector and return to guide
            </button>
          </div>
        )}

        {/* Dynamic Tab Body View */}
        <div className="flex-1 overflow-y-auto">
          {activeInspectorTab === 'properties' && (
            <InspectorPropertiesContent
              selectionState={selectionState}
              simResult={simResult}
              runCircuitValidation={runCircuitValidation}
            />
          )}

          {activeInspectorTab === 'connections' && (
            <InspectorConnectionsContent selectionState={selectionState} />
          )}

          {activeInspectorTab === 'simulation' && (
            <InspectorSimulationContent selectionState={selectionState} simResult={simResult} />
          )}

          {/* Fault Lab tab — Pro fault mode. Falls back to Properties when
              the tab is somehow active without fault mode armed. */}
          {activeInspectorTab === 'faultlab' &&
            (isPro && faultLabOpen ? (
              <Suspense fallback={<TabLoadingFallback />}>
                <InspectorFaultLabView />
              </Suspense>
            ) : (
              <InspectorPropertiesContent
                selectionState={selectionState}
                simResult={simResult}
                runCircuitValidation={runCircuitValidation}
              />
            ))}

          {activeInspectorTab === 'analytics' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <InspectorAnalyticsView
                simResult={simResult}
                selectedComp={selectionState.kind === 'component' ? selectionState.component : null}
              />
            </Suspense>
          )}

          {activeInspectorTab === 'validation' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <div className="h-full overflow-y-auto">
                <div className="border-b border-slate-200/70 p-3 dark:border-slate-800/70">
                  <ZsCheckPanel />
                </div>
                {validationReport ? (
                  <ValidationReportView
                    report={validationReport}
                    onRunValidation={runCircuitValidation}
                  />
                ) : (
                  <div className="p-5 text-center flex flex-col items-center justify-center h-full">
                    <ShieldCheck className="size-10 text-emerald-500 mb-2" />
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mb-1">
                      Circuit Safety Check
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                      Run automated safety and code compliance checks.
                    </p>
                    <button
                      type="button"
                      onClick={runCircuitValidation}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-xs cursor-pointer"
                    >
                      Run Validation Check
                    </button>
                  </div>
                )}
              </div>
            </Suspense>
          )}

          {activeInspectorTab === 'logs' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <InspectorLogsView />
            </Suspense>
          )}

          {activeInspectorTab === 'history' && isPro && (
            <Suspense fallback={<TabLoadingFallback />}>
              <InspectorHistoryView />
            </Suspense>
          )}
        </div>
      </div>

      {/* Vertical Navigation Tab Bar (Right side edge) */}
      <div className="w-12 border-l border-slate-200/80 bg-slate-50/90 py-3 flex flex-col items-center justify-between dark:border-slate-800 dark:bg-slate-950/80 flex-shrink-0 select-none">
        <div className="flex flex-col items-center gap-2">
          {/* Properties Tab */}
          <button
            type="button"
            onClick={() => setActiveInspectorTab('properties')}
            className={`p-2 rounded-xl transition relative ${
              activeInspectorTab === 'properties'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            title="Properties & Specs"
          >
            <Sliders className="size-4" />
            {activeInspectorTab === 'properties' && (
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-blue-600 rounded-r" />
            )}
          </button>

          {/* Connections Tab */}
          <button
            type="button"
            onClick={() => setActiveInspectorTab('connections')}
            className={`p-2 rounded-xl transition relative ${
              activeInspectorTab === 'connections'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            title="Connections & Topology"
          >
            <Route className="size-4" />
            {activeInspectorTab === 'connections' && (
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-blue-600 rounded-r" />
            )}
          </button>

          {/* Simulation Tab */}
          <button
            type="button"
            onClick={() => setActiveInspectorTab('simulation')}
            className={`p-2 rounded-xl transition relative ${
              activeInspectorTab === 'simulation'
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            title="Simulation Telemetry & Faults"
          >
            <Zap className="size-4" />
            {activeInspectorTab === 'simulation' && (
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-amber-500 rounded-r" />
            )}
          </button>

          {/* Fault Lab Tab (Pro) — arms fault mode as a side effect. */}
          {isPro && (
            <button
              type="button"
              onClick={() => useUiStore.getState().setFaultLabOpen(true)}
              className={`p-2 rounded-xl transition relative ${
                activeInspectorTab === 'faultlab' && faultLabOpen
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
              aria-label="Fault Lab (manual fault injection)"
              title="Fault Lab — manual fault injection"
            >
              <FlaskConical className="size-4" />
              {activeInspectorTab === 'faultlab' && faultLabOpen && (
                <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-amber-600 rounded-r" />
              )}
              {injectedFaultCount > 0 && (
                <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-amber-500 text-[8px] font-bold text-white">
                  {injectedFaultCount > 9 ? '9+' : injectedFaultCount}
                </span>
              )}
            </button>
          )}

          <div className="my-1.5 h-px w-6 bg-slate-200 dark:bg-slate-800" />

          {/* Scope Tab */}
          <button
            type="button"
            onClick={() => setActiveInspectorTab('analytics')}
            className={`p-2 rounded-xl transition relative ${
              activeInspectorTab === 'analytics'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            title="Waveform Oscilloscope"
          >
            <Sparkles className="size-4" />
            {activeInspectorTab === 'analytics' && (
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-purple-600 rounded-r" />
            )}
          </button>

          {/* Validation Tab */}
          <button
            type="button"
            onClick={() => setActiveInspectorTab('validation')}
            className={`p-2 rounded-xl transition relative ${
              activeInspectorTab === 'validation'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            title="Circuit Safety & Compliance"
          >
            <ShieldCheck className="size-4" />
            {activeInspectorTab === 'validation' && (
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-emerald-600 rounded-r" />
            )}
            {(validationReport?.summary.errorsCount ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                {validationReport?.summary.errorsCount}
              </span>
            )}
          </button>

          {/* Console Tab */}
          <button
            type="button"
            onClick={() => setActiveInspectorTab('logs')}
            className={`p-2 rounded-xl transition relative ${
              activeInspectorTab === 'logs'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
            title="Console Logs & CLI"
          >
            <Terminal className="size-4" />
            {activeInspectorTab === 'logs' && (
              <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-blue-600 rounded-r" />
            )}
          </button>

          {isPro && (
            <button
              type="button"
              onClick={() => setActiveInspectorTab('history')}
              className={`p-2 rounded-xl transition relative ${
                activeInspectorTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
              aria-label="Simulation History (audit log)"
              title="Simulation History (audit log)"
            >
              <Clock className="size-4" />
              {activeInspectorTab === 'history' && (
                <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-3 bg-indigo-600 rounded-r" />
              )}
              {eventHistory.length > 0 && activeInspectorTab !== 'history' && (
                <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-bold text-white">
                  {eventHistory.length > 9 ? '9+' : eventHistory.length}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Collapse Button */}
        <button
          type="button"
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          title="Collapse Inspector"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </aside>
  );
}
