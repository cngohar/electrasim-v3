/**
 * Inspector — right-hand floating panel showing selected component/wire
 * properties, topology connections, simulation estimates, safety validation
 * and logs. Unavailable waveform/energy measurements are labeled explicitly.
 */

import {
  COMPONENT_DEFS,
  type ComponentInstance,
  type SimulationResult,
  type WireInstance,
} from '@electrasim/domain';
import { getSimulationLimitations } from '@electrasim/domain/simulationCoverage';
import { isCurrentSimulation } from '@electrasim/domain/simulationEvidence';
import { ShieldCheck, X } from 'lucide-react';
import { Suspense, lazy, useRef, useState } from 'react';
import { useCircuitStore, useSettingsStore, useUiStore } from '../../../store';
import { useSurfacePresence } from '../../hooks/useSurfacePresence';
import { Modal } from '../Modal';
import { InspectorOverview } from './InspectorOverview';
import { useInspectorSelectionState } from './useInspectorSelectionState';

// Heavy Inspector tabs code-split with dynamic import (perf & initial bundle optimization)
const InspectorQuickSettings = lazy(() =>
  import('./InspectorQuickSettings').then((m) => ({ default: m.InspectorQuickSettings })),
);
const InspectorPropertiesContent = lazy(() =>
  import('./InspectorPropertiesContent').then((m) => ({ default: m.InspectorPropertiesContent })),
);
const InspectorConnectionsContent = lazy(() =>
  import('./InspectorConnectionsContent').then((m) => ({ default: m.InspectorConnectionsContent })),
);
const InspectorSimulationContent = lazy(() =>
  import('./InspectorSimulationContent').then((m) => ({ default: m.InspectorSimulationContent })),
);
const ValidationReportView = lazy(() =>
  import('../ValidationReportView').then((m) => ({ default: m.ValidationReportView })),
);
const InspectorFaultLabView = lazy(() =>
  import('./InspectorFaultLabView').then((m) => ({ default: m.InspectorFaultLabView })),
);
const InspectorAnalyticsView = lazy(() =>
  import('./InspectorAnalyticsView').then((m) => ({ default: m.InspectorAnalyticsView })),
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
   INSPECTOR: three-tab drawer with shared detail and tool windows
   ========================================================================= */

export function Inspector({
  selectedComp: initialSelectedComp,
  selectedWire: initialSelectedWire,
  simResult: providedResult,
  isPhone,
}: Props) {
  const circuit = useCircuitStore((s) => s);
  const simResult = isCurrentSimulation(circuit, providedResult) ? providedResult : null;
  const selectionState = useInspectorSelectionState({
    selectedComp: initialSelectedComp,
    selectedWire: initialSelectedWire,
  });

  const activeInspectorTab = useUiStore((s) => s.activeInspectorTab);
  const setActiveInspectorTab = useUiStore((s) => s.setActiveInspectorTab);
  const activeGuideId = useUiStore((s) => s.activeGuideId);
  const faultLabOpen = useUiStore((s) => s.faultLabOpen);
  const isPro = useSettingsStore((s) => s.appMode === 'pro');
  const [modelOpen, setModelOpen] = useState(false);
  const modelBlocked = useCircuitStore((s) =>
    getSimulationLimitations({ components: s.components, wires: [] }).some((l) => l.blocking),
  );

  const validationReport = useUiStore((s) => s.validationReport);
  const runCircuitValidation = useUiStore((s) => s.runCircuitValidation);

  const isCollapsed = useUiStore((s) => s.inspectorCollapsed);
  const setIsCollapsed = (c: boolean) => useUiStore.getState().setInspectorCollapsed(c);

  const presence = useSurfacePresence(!isCollapsed);
  const secondary = !['properties', 'simulation', 'configure'].includes(activeInspectorTab);
  const tab = secondary ? 'properties' : activeInspectorTab;
  const title =
    selectionState.kind === 'component'
      ? (COMPONENT_DEFS[selectionState.component.type]?.label ?? selectionState.component.type)
      : selectionState.kind === 'wire'
        ? `Wire ${selectionState.wire.label || selectionState.wire.id.slice(0, 8)}`
        : selectionState.kind === 'multi-component'
          ? `${selectionState.count} components selected`
          : 'Your circuit';
  // Keep the visible title and content throughout the retained exit.
  const detailRef = useRef({
    modelOpen,
    tab: activeInspectorTab,
    selectionState,
    title,
    isPro,
    faultLabOpen,
  });
  if (modelOpen || secondary)
    detailRef.current = {
      modelOpen,
      tab: activeInspectorTab,
      selectionState,
      title,
      isPro,
      faultLabOpen,
    };
  const detail = detailRef.current;
  if (!presence.mounted) return null;
  return (
    <>
      <aside
        style={activeInspectorTab === 'faultlab' ? { display: 'none' } : undefined}
        className="table-inspector table-surface"
        aria-label="Inspector"
        data-tour="inspector"
        data-phone-inspector={isPhone}
        data-canvas-occluder
        data-surface-state={presence.exiting ? 'closing' : 'open'}
        inert={presence.exiting || undefined}
      >
        <div className="table-surface-heading">
          <div>
            <small>Inspector</small>
            <h2>{title}</h2>
          </div>
          <button
            type="button"
            aria-label="Collapse Inspector"
            title="Collapse Inspector"
            onClick={() => setIsCollapsed(true)}
          >
            <X size={17} />
          </button>
        </div>
        <nav className="table-inspector-tabs" aria-label="Inspector sections">
          {(
            [
              ['properties', 'Properties'],
              ['simulation', 'Readings'],
              ['configure', 'Configure'],
            ] as const
          ).map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-current={tab === id ? 'page' : undefined}
              onClick={() => setActiveInspectorTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        {activeGuideId && selectionState.kind === 'component' && (
          <div className="table-guide-return">
            <span>Guide paused while inspecting.</span>
            <button
              type="button"
              onClick={() => {
                useCircuitStore.getState().clearSelection();
                setIsCollapsed(true);
              }}
            >
              Close inspector and return to guide
            </button>
          </div>
        )}
        <div className="table-inspector-body">
          {tab === 'properties' && (
            <InspectorOverview
              selection={selectionState}
              result={simResult}
              onAdvanced={() => setModelOpen(true)}
            />
          )}
          {modelBlocked && activeInspectorTab === 'simulation' && (
            <output className="block p-4 text-sm text-amber-800 dark:text-amber-200">
              Electrical measurements are not assessed because this drawing contains an unsupported
              model. You can edit and export the drawing.
            </output>
          )}
          {activeInspectorTab === 'simulation' && !modelBlocked && (
            <Suspense fallback={<TabLoadingFallback />}>
              <InspectorSimulationContent selectionState={selectionState} simResult={simResult} />
            </Suspense>
          )}

          {tab === 'configure' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <InspectorQuickSettings
                selection={selectionState}
                onAdvanced={() => setModelOpen(true)}
              />
            </Suspense>
          )}
        </div>
        {tab !== 'configure' && (
          <div className="table-inspector-links">
            <button type="button" onClick={() => setActiveInspectorTab('connections')}>
              Connections
            </button>
            <button
              type="button"
              onClick={() => {
                runCircuitValidation();
              }}
            >
              Validation
            </button>
            <button type="button" onClick={() => setActiveInspectorTab('analytics')}>
              Analysis
            </button>
            {isPro && (
              <>
                <button type="button" onClick={() => useUiStore.getState().setFaultLabOpen(true)}>
                  Fault Lab
                </button>
                <button type="button" onClick={() => setActiveInspectorTab('history')}>
                  History
                </button>
              </>
            )}
          </div>
        )}
      </aside>
      <Modal
        open={modelOpen || secondary}
        interactiveCanvas={detail.tab === 'faultlab'}
        onClose={() => {
          setModelOpen(false);
          if (activeInspectorTab === 'faultlab') useUiStore.getState().setFaultLabOpen(false);
          setActiveInspectorTab('properties');
        }}
        title={
          detail.modelOpen
            ? `${detail.title} · detailed settings`
            : (
                {
                  connections: 'Connections and netlist',
                  analytics: 'Circuit analysis',
                  validation: 'Validation and Zs',
                  logs: 'Console logs',
                  history: 'Simulation history',
                  faultlab: 'Fault Lab',
                } as Record<string, string>
              )[detail.tab]
        }
        widthClass="max-w-3xl"
      >
        <div className={detail.modelOpen ? 'table-model-content' : 'table-detail-content'}>
          {detail.modelOpen && (
            <Suspense fallback={<TabLoadingFallback />}>
              <InspectorPropertiesContent
                selectionState={detail.selectionState}
                simResult={simResult}
                runCircuitValidation={runCircuitValidation}
              />
            </Suspense>
          )}
          {detail.tab === 'connections' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <InspectorConnectionsContent selectionState={detail.selectionState} />
            </Suspense>
          )}

          {/* Fault Lab tab — Pro fault mode. Falls back to Properties when
              the tab is somehow active without fault mode armed. */}
          {detail.tab === 'faultlab' &&
            (detail.isPro && detail.faultLabOpen ? (
              <Suspense fallback={<TabLoadingFallback />}>
                <InspectorFaultLabView
                  onAdvanced={() => {
                    useUiStore.getState().setFaultLabOpen(false);
                    setModelOpen(true);
                  }}
                />
              </Suspense>
            ) : (
              <Suspense fallback={<TabLoadingFallback />}>
                <InspectorPropertiesContent
                  selectionState={detail.selectionState}
                  simResult={simResult}
                  runCircuitValidation={runCircuitValidation}
                />
              </Suspense>
            ))}

          {detail.tab === 'analytics' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <InspectorAnalyticsView
                simResult={simResult}
                selectedComp={
                  detail.selectionState.kind === 'component'
                    ? detail.selectionState.component
                    : null
                }
              />
            </Suspense>
          )}

          {detail.tab === 'validation' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <div className="h-full overflow-y-auto">
                {faultLabOpen && (
                  <button
                    type="button"
                    className="table-return-lab"
                    onClick={() => useUiStore.getState().setFaultLabOpen(true)}
                  >
                    Return to Fault Lab
                  </button>
                )}
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

          {detail.tab === 'logs' && (
            <Suspense fallback={<TabLoadingFallback />}>
              <InspectorLogsView />
            </Suspense>
          )}

          {detail.tab === 'history' && isPro && (
            <Suspense fallback={<TabLoadingFallback />}>
              <InspectorHistoryView />
            </Suspense>
          )}
        </div>
      </Modal>
    </>
  );
}
