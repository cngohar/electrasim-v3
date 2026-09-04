/**
 * InspectorPropertiesContent — properties-tab router. Moved verbatim
 * from the previous monolithic `Inspector.tsx`.
 */

import { Copy, Lightbulb, MousePointerClick, RotateCw, ShieldCheck, Trash2 } from 'lucide-react';
import type { SimulationResult } from '../../../domain';
import { useCircuitStore, useUiStore } from '../../../store';
import { requestDeleteSelection } from '../../canvas-actions';
import { ComponentPropertiesView } from './ComponentPropertiesView';
import { WireInspectorView } from './WireInspectorView';
import type { InspectorSelectionState } from './useInspectorSelectionState';

interface InspectorPropertiesContentProps {
  selectionState: InspectorSelectionState;
  simResult: SimulationResult | null;
  runCircuitValidation: () => void;
}

export function InspectorPropertiesContent({
  selectionState,
  simResult,
  runCircuitValidation,
}: InspectorPropertiesContentProps) {
  if (selectionState.kind === 'multi-component') {
    const multiCount = selectionState.count;
    const selectedIds = useCircuitStore.getState().selectedComponentIds;
    return (
      <div className="p-4 space-y-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs leading-relaxed text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
          <strong>Multi-Selection Active:</strong> {multiCount} items selected.
          <br />• Drag any item to move the entire group.
          <br />• Group items together into a movable block.
          <br />• Delete removes all selected items simultaneously.
        </div>

        <button
          type="button"
          onClick={() => {
            useCircuitStore
              .getState()
              .createGroup(
                `Group ${useCircuitStore.getState().componentGroups.length + 1}`,
                selectedIds,
              );
            useUiStore.getState().addLog(`Grouped ${multiCount} components`, 'success');
          }}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 py-2.5 text-xs font-bold text-blue-700 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
        >
          <Copy className="size-3.5" />
          <span>Group Selected ({multiCount} Items)</span>
        </button>

        <button
          type="button"
          disabled={useUiStore.getState().simRunning}
          onClick={() => {
            useCircuitStore.getState().rotateSelected(90);
            useUiStore.getState().addLog(`Rotated ${multiCount} components 90°`, 'info');
          }}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
        >
          <RotateCw className="size-3.5" />
          <span>Rotate All Selected 90° (Shift+R)</span>
        </button>

        <button
          type="button"
          disabled={useUiStore.getState().simRunning}
          onClick={requestDeleteSelection}
          className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/40"
        >
          <Trash2 className="size-3.5" />
          <span>Delete {multiCount} Selected Items</span>
        </button>

        <button
          type="button"
          onClick={() => useCircuitStore.getState().clearSelection()}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Clear Selection
        </button>
      </div>
    );
  }

  if (selectionState.kind === 'wire') {
    return <WireInspectorView wire={selectionState.wire} simResult={simResult} />;
  }

  if (selectionState.kind === 'component') {
    return (
      <ComponentPropertiesView selectedComp={selectionState.component} simResult={simResult} />
    );
  }

  return (
    <div className="p-5 flex flex-col items-center justify-center text-center h-full">
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-50/80 text-blue-600 border border-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/50 shadow-2xs">
        <MousePointerClick className="size-7" />
      </div>

      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
        Select Canvas Item
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed max-w-xs">
        Click any component or wire on the canvas to inspect and edit properties, wire lengths,
        gauges, and switch states.
      </p>

      <div className="w-full text-left rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-700/60 dark:bg-slate-800/50 space-y-2">
        <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Lightbulb className="size-3.5 text-amber-500" /> Canvas Actions
        </div>
        <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1.5 leading-snug">
          <li>• Click wire to change length, gauge, and routing</li>
          <li>• Click switch to toggle state (ON / OFF)</li>
          <li>• Shift-click items to select multiple</li>
        </ul>
      </div>

      <div className="mt-6 w-full">
        <button
          type="button"
          onClick={runCircuitValidation}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
        >
          <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span>Run Circuit Safety Check</span>
        </button>
      </div>
    </div>
  );
}
