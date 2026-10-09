/**
 * InspectorConnectionsContent — topology connections tab. Moved
 * verbatim from the previous monolithic `Inspector.tsx`.
 */

import { COMPONENT_DEFS, type ComponentInstance, type WireInstance } from '@electrasim/domain';
import { ArrowRightLeft, ChevronRight, Eye, Route } from 'lucide-react';
import { useCircuitStore, useUiStore } from '../../../store';
import type { InspectorSelectionState } from './useInspectorSelectionState';

export function InspectorConnectionsContent({
  selectionState,
}: {
  selectionState: InspectorSelectionState;
}) {
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const tracePathMode = useUiStore((s) => s.tracePathMode);
  const toggleTracePathMode = useUiStore((s) => s.toggleTracePathMode);

  if (selectionState.kind === 'wire') {
    const wire: WireInstance = selectionState.wire;
    const fromComp = components.find((c) => c.id === wire.fromComponentId);
    const toComp = components.find((c) => c.id === wire.toComponentId);

    const fromDef = fromComp ? COMPONENT_DEFS[fromComp.type] : null;
    const toDef = toComp ? COMPONENT_DEFS[toComp.type] : null;

    const fromPortLabel = fromDef?.ports[wire.fromPortIndex]?.label ?? `Port ${wire.fromPortIndex}`;
    const toPortLabel = toDef?.ports[wire.toPortIndex]?.label ?? `Port ${wire.toPortIndex}`;

    return (
      <div className="p-3.5 space-y-3.5 text-xs">
        {/* Origin Node Card */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 dark:border-blue-900/50 dark:bg-blue-950/40 space-y-1.5">
          <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Origin Terminal (From)
          </div>
          <div className="font-bold text-slate-800 dark:text-slate-100">
            {fromDef?.label ?? 'Unknown Component'}
          </div>
          <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
            Terminal: {fromPortLabel} (Port #{wire.fromPortIndex})
          </div>
          {fromComp && (
            <button
              type="button"
              onClick={() => useCircuitStore.getState().selectComponent(fromComp.id)}
              className="mt-1 flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 underline"
            >
              <span>Inspect Origin Component</span>
              <ChevronRight className="size-3" />
            </button>
          )}
        </div>

        {/* Direction Flow Visualizer */}
        <div className="flex items-center justify-center gap-2 py-1 text-slate-400">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          <div className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 font-mono text-[10px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <span>Flow Axis</span>
            <ArrowRightLeft className="size-3 text-blue-500" />
          </div>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>

        {/* Destination Node Card */}
        <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-3 dark:border-purple-900/50 dark:bg-purple-950/40 space-y-1.5">
          <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Destination Terminal (To)
          </div>
          <div className="font-bold text-slate-800 dark:text-slate-100">
            {toDef?.label ?? 'Unknown Component'}
          </div>
          <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
            Terminal: {toPortLabel} (Port #{wire.toPortIndex})
          </div>
          {toComp && (
            <button
              type="button"
              onClick={() => useCircuitStore.getState().selectComponent(toComp.id)}
              className="mt-1 flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 underline"
            >
              <span>Inspect Destination Component</span>
              <ChevronRight className="size-3" />
            </button>
          )}
        </div>

        {/* Topology Actions */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={() => useCircuitStore.getState().swapWireEndpoints(wire.id)}
            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 transition"
          >
            <ArrowRightLeft className="size-3.5" />
            <span>Swap Terminal Directions</span>
          </button>

          <button
            type="button"
            onClick={toggleTracePathMode}
            className={`w-full flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition ${
              tracePathMode
                ? 'border-blue-500 bg-blue-600 text-white shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Eye className="size-3.5" />
            <span>{tracePathMode ? 'Highlight Path: ACTIVE' : 'Highlight Traced Path'}</span>
          </button>
        </div>
      </div>
    );
  }

  if (selectionState.kind === 'component') {
    const comp: ComponentInstance = selectionState.component;
    const def = COMPONENT_DEFS[comp.type];
    const compWires = wires.filter(
      (w) => w.fromComponentId === comp.id || w.toComponentId === comp.id,
    );

    return (
      <div className="p-3.5 space-y-3.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider">
            Terminal Ports ({def?.ports.length ?? 0})
          </span>
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
            {compWires.length} connected cable(s)
          </span>
        </div>

        <div className="space-y-2">
          {def?.ports.map((port, pIdx) => {
            const portWires = compWires.filter(
              (w) =>
                (w.fromComponentId === comp.id && w.fromPortIndex === pIdx) ||
                (w.toComponentId === comp.id && w.toPortIndex === pIdx),
            );

            return (
              <div
                key={pIdx}
                className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-950/60 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-100">
                    Port #{pIdx}: {port.label}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                      portWires.length > 0
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {portWires.length > 0 ? 'CONNECTED' : 'OPEN'}
                  </span>
                </div>

                {portWires.map((w) => {
                  const otherComponentId =
                    w.fromComponentId === comp.id ? w.toComponentId : w.fromComponentId;
                  const otherComp = components.find((c) => c.id === otherComponentId);
                  const otherDef = otherComp ? COMPONENT_DEFS[otherComp.type] : null;

                  return (
                    <div
                      key={w.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200/60 bg-white p-2 dark:border-slate-800 dark:bg-slate-900"
                    >
                      <div className="truncate pr-2">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {otherDef?.label ?? 'Connected Device'}
                        </span>
                        <div className="font-mono text-[10px] text-slate-400">
                          Wire #{w.id.slice(0, 6)} ({w.lengthMeters ?? 10}m)
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => useCircuitStore.getState().selectWire(w.id)}
                        className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 dark:bg-blue-950 dark:text-blue-400 hover:underline shrink-0"
                      >
                        Inspect Wire
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={toggleTracePathMode}
          className={`w-full flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition ${
            tracePathMode
              ? 'border-blue-500 bg-blue-600 text-white shadow-xs'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
          }`}
        >
          <Eye className="size-3.5" />
          <span>{tracePathMode ? 'Highlight Path: ACTIVE' : 'Highlight Traced Path'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 text-center space-y-3">
      <Route className="size-8 text-blue-500 mx-auto" />
      <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
        Circuit Network Topology
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Select any wire or component on the canvas to inspect terminal ports, trace connection
        paths, or swap wire endpoints.
      </p>
      <div className="space-y-2 text-left" aria-label="Circuit netlist">
        {components.map((component) => (
          <button
            type="button"
            key={component.id}
            className="block w-full rounded-lg border border-slate-200 p-3 text-left dark:border-slate-700"
            onClick={() => useCircuitStore.getState().selectComponent(component.id)}
          >
            {COMPONENT_DEFS[component.type]?.label ?? component.type} · {component.id}
          </button>
        ))}
        {wires.map((wire) => {
          const from = components.find((c) => c.id === wire.fromComponentId);
          const to = components.find((c) => c.id === wire.toComponentId);
          const endpoint = (c: ComponentInstance | undefined, index: number) =>
            c
              ? `${COMPONENT_DEFS[c.type]?.label ?? c.type} (${c.id}) / ${COMPONENT_DEFS[c.type]?.ports[index]?.label ?? index}`
              : 'Missing component';
          return (
            <p key={wire.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              {endpoint(from, wire.fromPortIndex)} → {endpoint(to, wire.toPortIndex)}
            </p>
          );
        })}
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left font-mono text-[11px] space-y-1 dark:border-slate-800 dark:bg-slate-950">
        <div>• Total Components: {components.length}</div>
        <div>• Total Cable Wires: {wires.length}</div>
      </div>
    </div>
  );
}
