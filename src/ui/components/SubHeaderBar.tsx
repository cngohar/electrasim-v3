import { COMPONENT_DEFS } from '@electrasim/domain/components';
import { readinessLabel } from '@electrasim/domain/core/readinessPresentation';
import { resolveDocumentSupply } from '@electrasim/domain/core/supplies';
import { resolveWireProperties } from '@electrasim/domain/core/wireProperties';
import { ChevronDown, ChevronRight, Edit2, Layers, Route, Sliders, X } from 'lucide-react';
import { useState } from 'react';
import { useCircuitStore, useUiStore } from '../../store';
import {
  requestSupplyEdit,
  useConfigurationLockReason,
  useElectricalEditing,
} from '../../store/electricalEditing';
import { useCircuitReadiness } from '../../store/electricalReadiness';

export function SubHeaderBar() {
  const simRunning = useUiStore((s) => s.simRunning);
  const globalVoltage = useCircuitStore((s) => s.globalVoltage);
  const supply = useCircuitStore((s) => s.supply);
  const supplyLocked = useConfigurationLockReason();
  const readiness = useCircuitReadiness();
  const diagnosisActive = useUiStore((s) => s.diagnosisActive);
  const supplyRequest = useElectricalEditing((s) => s.request);
  const simResult = useUiStore((s) => s.simResult);

  const selectedComponentIds = useCircuitStore((s) => s.selectedComponentIds);
  const selectedWireIds = useCircuitStore((s) => s.selectedWireIds);
  const selectedId = useCircuitStore((s) => s.selectedComponentId);
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);

  const [projectName, setProjectName] = useState(() => {
    try {
      return localStorage.getItem('electrasim:project-name') || 'Kitchen Lighting & Sockets';
    } catch {
      return 'Kitchen Lighting & Sockets';
    }
  });
  const [isEditing, setIsEditing] = useState(false);

  const handleProjectNameChange = (val: string) => {
    setProjectName(val);
    try {
      localStorage.setItem('electrasim:project-name', val);
    } catch {
      // Storage unavailable
    }
  };

  const sourceModel = resolveDocumentSupply({ supply, globalVoltage }).model;
  const effectiveVoltage = sourceModel.voltage;

  // Selected item calculations
  const totalSelectedCount =
    (selectedComponentIds.length > 0 ? selectedComponentIds.length : selectedId ? 1 : 0) +
    selectedWireIds.length;

  const singleCompId =
    selectedId ?? (selectedComponentIds.length === 1 ? selectedComponentIds[0] : null);
  const selectedComponent = singleCompId ? components.find((c) => c.id === singleCompId) : null;

  const singleWireId = selectedWireIds.length === 1 ? selectedWireIds[0] : null;
  const selectedWire = singleWireId ? wires.find((w) => w.id === singleWireId) : null;

  const clearSelection = () => {
    useCircuitStore.getState().clearSelection();
  };

  const openInspector = (tab: 'properties' | 'connections' | 'simulation' = 'properties') => {
    useUiStore.getState().setInspectorCollapsed(false);
    useUiStore.getState().setActiveInspectorTab(tab);
  };

  const voltagePicker = (
    <>
      <button
        type="button"
        onClick={() => requestSupplyEdit()}
        disabled={!!supplyLocked}
        className="flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium hover:bg-slate-100 disabled:opacity-60 dark:hover:bg-slate-800"
        title={supplyLocked ?? 'Click to change Global Supply Voltage'}
        aria-expanded={supplyRequest?.kind === 'supply'}
        aria-haspopup="dialog"
      >
        <span className="text-slate-500 dark:text-slate-400">Supply:</span>
        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
          {effectiveVoltage} V{' '}
          {sourceModel.kind === 'dc'
            ? 'DC'
            : `AC ${sourceModel.frequencyHz} Hz${sourceModel.kind === 'ac-three-phase' ? ' · 3-phase L-N' : ''}`}
        </span>
        <ChevronDown className="size-3 text-slate-400" />
      </button>
      <button
        type="button"
        data-readiness-status={readiness.topology}
        className="rounded-full px-2 py-0.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
        onClick={() => useElectricalEditing.setState({ reviewOpen: true })}
        title="Review circuit readiness and compatibility"
      >
        {readinessLabel(readiness, diagnosisActive)} · Review
      </button>
      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />

      {/* COMBINED SELECTED ITEM SECTION */}
      {totalSelectedCount > 1 ? (
        <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-400/30 text-blue-700 dark:text-blue-300">
          <Layers className="size-3 text-blue-600 dark:text-blue-400" />
          <span className="font-bold">{totalSelectedCount} Selected</span>
          <span className="font-mono text-[10px] text-blue-600 dark:text-blue-300">
            ({selectedComponentIds.length} comps, {selectedWireIds.length} wires)
          </span>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 transition"
            title="Deselect"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : selectedComponent ? (
        (() => {
          const def = COMPONENT_DEFS[selectedComponent.type];
          const label = def?.label ?? selectedComponent.type;
          const isOn = selectedComponent.state.on === true;
          const isEnergized = simResult?.energizedComponents.has(selectedComponent.id) ?? false;
          return (
            <div className="flex items-center gap-1.5 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-400/30 text-purple-700 dark:text-purple-300">
              <Sliders className="size-3 text-purple-600 dark:text-purple-400" />
              <span className="font-bold truncate max-w-[130px]">{label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase font-mono ${
                  isOn || isEnergized
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                    : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {isOn ? 'ON' : isEnergized ? 'ACTIVE' : 'IDLE'}
              </span>
              <button
                type="button"
                onClick={() => openInspector('properties')}
                className="flex items-center gap-0.5 text-[10px] font-bold text-purple-700 hover:text-purple-900 dark:text-purple-300 dark:hover:text-purple-100"
                title="Inspect in side panel"
              >
                <span>Inspect</span>
                <ChevronRight className="size-3" />
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full p-0.5 hover:bg-purple-200/60 dark:hover:bg-purple-900/60 text-purple-600 dark:text-purple-300 transition"
                title="Deselect"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })()
      ) : selectedWire ? (
        (() => {
          const isEnergized = simResult?.energizedWires.has(selectedWire.id) ?? false;
          const properties = resolveWireProperties(
            selectedWire,
            new Map(components.map((c) => [c.id, c])),
          );
          const length = properties.lengthMeters;
          const gauge = properties.cableMm2;
          return (
            <div className="flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-400/30 text-blue-700 dark:text-blue-300">
              <Route className="size-3 text-blue-600 dark:text-blue-400" />
              <span className="font-bold font-mono">Wire #{selectedWire.id.slice(0, 5)}</span>
              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                {length}m • {gauge}mm²
              </span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[9px] font-bold uppercase font-mono ${
                  isEnergized
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                    : selectedWire.fault
                      ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                      : 'bg-slate-200/80 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {isEnergized ? 'LIVE' : selectedWire.fault ? 'FAULT' : 'IDLE'}
              </span>
              <button
                type="button"
                onClick={() => openInspector('properties')}
                className="flex items-center gap-0.5 text-[10px] font-bold text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
                title="Inspect in side panel"
              >
                <span>Inspect</span>
                <ChevronRight className="size-3" />
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="rounded-full p-0.5 hover:bg-blue-200/60 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-300 transition"
                title="Deselect"
              >
                <X className="size-3" />
              </button>
            </div>
          );
        })()
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px] shadow-emerald-400" />
            <span className="font-medium text-slate-500 dark:text-slate-400">System:</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">TN-S</span>
          </div>

          <div className="hidden h-3 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

          <div className="hidden items-center gap-1.5 sm:flex">
            <span className="font-medium text-slate-500 dark:text-slate-400">Project:</span>
            {isEditing ? (
              <input
                type="text"
                value={projectName}
                onChange={(e) => handleProjectNameChange(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setIsEditing(false);
                }}
                className="rounded border border-blue-400 bg-white px-1.5 py-0.5 text-xs font-semibold text-slate-900 focus:outline-none dark:bg-slate-800 dark:text-slate-100"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="group flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>{projectName}</span>
                <Edit2 className="size-3 text-slate-400 opacity-60 group-hover:opacity-100" />
              </button>
            )}
          </div>
        </>
      )}

      <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />

      {/* Simulation Running status indicator */}
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-slate-500 dark:text-slate-400">Sim:</span>
        <span
          className={`flex items-center gap-1 font-semibold ${
            simRunning
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {simRunning ? 'Running' : 'Paused'}
          <span
            className={`size-2 rounded-full ${
              simRunning ? 'bg-emerald-500 shadow-[0_0_6px] shadow-emerald-400' : 'bg-slate-400'
            }`}
          />
        </span>
      </div>
    </>
  );

  return (
    <div className="absolute inset-x-0 top-12 z-40 border-b border-slate-200/80 bg-white/95 shadow-sm ring-1 ring-slate-900/5 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/95 dark:ring-slate-700/50">
      {/* Scroll layer: when the content fits, the centered row sits dead
          center; when it overflows it scrolls from the left edge. */}
      <div className="overflow-x-auto">
        <div className="mx-auto flex w-max items-center gap-2.5 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
          {voltagePicker}
        </div>
      </div>
    </div>
  );
}
