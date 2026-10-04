import { readinessLabel } from '@electrasim/domain/core/readinessPresentation';
import { resolveDocumentSupply } from '@electrasim/domain/core/supplies';
import { calculationLabel, operationLabel } from '@electrasim/domain/simulation/presentation';
import { Activity, Boxes, Cable, Grid, Magnet, MousePointer2, ScanSearch, Zap } from 'lucide-react';
import { useCircuitStore, useSettingsStore, useUiStore, useViewportStore } from '../../store';
import { useElectricalEditing } from '../../store/electricalEditing';
import { useCircuitReadiness } from '../../store/electricalReadiness';
import { fitCanvasView } from '../canvas/fitView';

interface Props {
  simRunning: boolean;
  components: number;
  wires: number;
  active: number;
  dashboardOpen?: boolean;
}

export function StatusPill({
  simRunning,
  components,
  wires,
  active,
  dashboardOpen = false,
}: Props) {
  const showGrid = useSettingsStore((s) => s.showGrid);
  const snapToGrid = useSettingsStore((s) => s.snapToGrid);
  const setSetting = useSettingsStore((s) => s.setSetting);
  const globalVoltage = useCircuitStore((s) => s.globalVoltage);
  const supply = useCircuitStore((s) => s.supply);
  const simResult = useUiStore((s) => s.simResult);
  const paletteOpen = useUiStore((s) => s.paletteOpen);
  const inspectorCollapsed = useUiStore((s) => s.inspectorCollapsed);
  const mode = useUiStore((s) => s.mode);
  const zoom = useViewportStore((s) => s.zoom);

  const sourceModel = resolveDocumentSupply({ supply, globalVoltage }).model;
  const readiness = useCircuitReadiness();
  const hasErrors = (simResult?.errors.length ?? 0) > 0;
  const hasWarnings = (simResult?.warnings.length ?? 0) > 0;

  if (dashboardOpen) {
    return null;
  }

  const leftClass = paletteOpen ? 'left-[260px]' : 'left-0';
  const rightClass = !inspectorCollapsed ? 'right-76 md:right-84 lg:right-92' : 'right-14';

  const modeLabel = mode === 'wiring' ? 'Wire' : mode === 'placing' ? 'Place' : 'Select';

  return (
    <div
      className={`absolute bottom-0 ${leftClass} ${rightClass} z-10 hidden items-center justify-between border-t border-slate-200/80 bg-white/95 px-3 py-1 text-[11px] font-medium text-slate-600 shadow-lg backdrop-blur-xl transition-all duration-150 md:flex dark:border-slate-800/80 dark:bg-slate-900/95 dark:text-slate-300`}
    >
      {/* Left: supply + health */}
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-1.5 rounded-md border border-amber-200/80 bg-amber-50/70 px-2 py-0.5 font-mono text-[11px] font-bold text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
          title="Document supply setting — change from the context bar"
        >
          <Zap className="size-3 fill-amber-500 text-amber-500" />
          <span>
            Supply: {sourceModel.voltage} V{' '}
            {sourceModel.kind === 'dc'
              ? 'DC'
              : sourceModel.kind === 'ac-three-phase'
                ? 'AC · 3-phase L-N'
                : 'AC'}
          </span>
        </div>

        <div
          className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200"
          title="Live circuit health"
        >
          <span
            className={`size-2 rounded-full ${
              hasErrors
                ? 'bg-rose-500'
                : hasWarnings
                  ? 'bg-amber-500'
                  : simRunning && active > 0
                    ? 'bg-emerald-500 shadow-[0_0_6px] shadow-emerald-400'
                    : 'bg-slate-400'
            }`}
          />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Live Check:
          </span>
          <button type="button" onClick={() => useElectricalEditing.setState({ reviewOpen: true })}>
            {simResult && simResult.electrical?.status !== 'converged'
              ? calculationLabel(simResult)
              : hasErrors
                ? 'Fault findings'
                : simResult?.electrical?.status === 'converged'
                  ? `${operationLabel(simResult)}${hasWarnings ? ' · warnings' : ''}`
                  : hasWarnings
                    ? `${readinessLabel(readiness)} · warnings`
                    : readinessLabel(readiness)}
          </button>
        </div>
      </div>

      {/* Center: counts */}
      <div className="hidden items-center gap-3 md:flex">
        <div
          className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200"
          title="Total components on canvas"
        >
          <Boxes className="size-3.5 text-blue-500" />
          <span>{components}</span>
          <span className="font-normal text-slate-500 dark:text-slate-400">
            comp{components === 1 ? '' : 's'}
          </span>
        </div>
        <span className="text-slate-300 dark:text-slate-700">•</span>
        <div
          className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200"
          title="Total connecting wires"
        >
          <Cable className="size-3.5 text-indigo-500" />
          <span>{wires}</span>
          <span className="font-normal text-slate-500 dark:text-slate-400">
            wire{wires === 1 ? '' : 's'}
          </span>
        </div>
        {simRunning && (
          <>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <div
              className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400"
              title="Active energized components"
            >
              <Activity className="size-3.5 text-emerald-500" />
              <span>{active}</span>
              <span className="font-normal text-emerald-700/80 dark:text-emerald-300/80">
                energized
              </span>
            </div>
          </>
        )}
      </div>

      {/* Right: snap / grid / mode / zoom */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSetting('snapToGrid', !snapToGrid)}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Toggle Snap to Grid"
        >
          <Magnet className="size-3 text-slate-400" />
          <span className="text-slate-500 dark:text-slate-400">Snap:</span>
          <span
            className={`font-bold ${snapToGrid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
          >
            {snapToGrid ? 'ON' : 'OFF'}
          </span>
        </button>

        <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />

        <button
          type="button"
          onClick={() => setSetting('showGrid', !showGrid)}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Toggle Canvas Grid Display"
        >
          <Grid className="size-3 text-slate-400" />
          <span className="text-slate-500 dark:text-slate-400">Grid:</span>
          <span
            className={`font-bold ${showGrid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
          >
            {showGrid ? 'ON' : 'OFF'}
          </span>
        </button>

        <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />

        <div className="flex items-center gap-1" title="Active tool">
          <MousePointer2 className="size-3 text-slate-400" />
          <span className="text-slate-500 dark:text-slate-400">Mode:</span>
          <span className="font-bold text-slate-700 dark:text-slate-200">{modeLabel}</span>
        </div>

        <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={fitCanvasView}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Zoom to fit (F)"
          >
            <ScanSearch className="size-3 text-slate-400" />
            <span className="text-slate-500 dark:text-slate-400">Fit</span>
          </button>
          <button
            type="button"
            onClick={() => useViewportStore.getState().resetView()}
            className="font-mono font-bold text-slate-700 hover:text-blue-600 dark:text-slate-200 dark:hover:text-blue-400 rounded px-1.5 py-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Click to reset zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
        </div>
      </div>
    </div>
  );
}
