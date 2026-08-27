/**
 * WireInspectorView — selected-wire properties tab. Moved verbatim
 * from the previous monolithic `Inspector.tsx`.
 */

import { AlertTriangle, Flame, RefreshCw, Trash2 } from 'lucide-react';
import type { InstallationMethod, SimulationResult, WireInstance } from '../../../domain';
import { getCableAmpacity } from '../../../domain/simulation/tripCurves';
import { useCircuitStore, useUiStore } from '../../../store';
import { requestDeleteWire } from '../../canvas-actions';

export function WireInspectorView({
  wire,
  simResult,
}: {
  wire: WireInstance;
  simResult: SimulationResult | null;
}) {
  const isEnergized = simResult?.energizedWires.has(wire.id) ?? false;
  const currentLength = wire.lengthMeters ?? 10;
  const currentGauge = wire.customCableMm2 ?? 2.5;
  const currentPathKind = wire.pathKind ?? 'orthogonal';
  const currentDerating = wire.deratingFactor ?? 1.0;
  const currentMethod: InstallationMethod = wire.installationMethod ?? 'C';
  const hasWireFault = Boolean(wire.fault || wire.isBusted);

  const handleClearFault = () => {
    const faultEntry = useCircuitStore
      .getState()
      .faults.find((f) => f.target.type === 'wire' && f.target.id === wire.id);
    if (faultEntry) {
      useCircuitStore.getState().removeFault(faultEntry.id);
    }
    useCircuitStore.getState().setWireFault(wire.id, undefined);
    useCircuitStore.getState().setWireBusted(wire.id, false, undefined);
    useUiStore.getState().addLog('Cleared fault from wire', 'success');
  };

  const handleLengthChange = (m: number) => {
    useCircuitStore.getState().updateWireProperties(wire.id, { lengthMeters: m });
  };

  const handleGaugeChange = (mm2: number) => {
    useCircuitStore.getState().updateWireProperties(wire.id, { customCableMm2: mm2 });
  };

  const handlePathKindChange = (kind: 'orthogonal' | 'bezier') => {
    useCircuitStore.getState().updateWireProperties(wire.id, { pathKind: kind });
  };

  const handleDeratingChange = (f: number) => {
    useCircuitStore.getState().updateWireProperties(wire.id, { deratingFactor: f });
  };

  const handleMethodChange = (method: InstallationMethod) => {
    useCircuitStore.getState().updateWireProperties(wire.id, { installationMethod: method });
  };

  const handleDeleteWire = () => requestDeleteWire(wire.id);

  /** Base (pre-Cg) ampacity for the current size + reference method — BS 7671. */
  const baseAmpacity = getCableAmpacity(currentGauge, currentMethod);

  return (
    <div className="p-3.5 space-y-4 text-xs">
      {/* Wire Status Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-200">Wire Status</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
              isEnergized
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                : wire.isBusted
                  ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                  : wire.fault
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {isEnergized
              ? 'ENERGIZED'
              : wire.isBusted
                ? 'BUSTED (MELTED)'
                : wire.fault
                  ? `FAULT: ${wire.fault}`
                  : 'IDLE'}
          </span>
        </div>

        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
          ID: {wire.id}
        </div>
      </div>

      {/* Wire Fault Alert & Action Card */}
      {hasWireFault && (
        <div className="rounded-xl border border-red-300 bg-red-50/90 p-3 dark:border-red-900/60 dark:bg-red-950/40 space-y-2">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold">
            {wire.isBusted ? (
              <Flame className="size-4 text-red-600 dark:text-red-400" />
            ) : (
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            )}
            <span>
              {wire.isBusted ? 'Cable Melted / Thermal Overload' : `Wire Fault: ${wire.fault}`}
            </span>
          </div>
          {wire.bustedReason && (
            <p className="text-[11px] text-red-700 dark:text-red-300 leading-snug">
              {wire.bustedReason}
            </p>
          )}
          <button
            type="button"
            onClick={handleClearFault}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 py-1.5 px-3 text-xs font-bold text-white shadow-xs transition cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            <span>Clear Wire Fault & Repair</span>
          </button>
        </div>
      )}

      {/* Length Setting */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="wire-length-slider"
            className="font-bold text-slate-800 dark:text-slate-200"
          >
            Wire Length (Meters)
          </label>
          <span className="font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
            {currentLength} m
          </span>
        </div>

        <input
          id="wire-length-slider"
          type="range"
          min="1"
          max="50"
          step="0.5"
          value={currentLength}
          onChange={(e) => handleLengthChange(Number(e.target.value))}
          className="w-full accent-blue-600 cursor-pointer"
        />

        <div className="flex flex-wrap gap-1 pt-1">
          {[1, 2.5, 5, 10, 15, 25, 50].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleLengthChange(m)}
              className={`rounded border px-2 py-0.5 text-[10px] font-semibold transition ${
                currentLength === m
                  ? 'border-blue-500 bg-blue-600 text-white dark:bg-blue-600'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Cable Gauge Size */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Cable Cross-Section (mm²)
          </span>
          <span className="font-mono text-xs font-bold text-purple-600 dark:text-purple-400">
            {currentGauge} mm²
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {[1.0, 1.5, 2.5, 4.0, 6.0, 10.0, 16.0].map((mm2) => (
            <button
              key={mm2}
              type="button"
              onClick={() => handleGaugeChange(mm2)}
              className={`rounded border px-2 py-1 text-[10px] font-semibold font-mono transition ${
                currentGauge === mm2
                  ? 'border-purple-500 bg-purple-600 text-white dark:bg-purple-600'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {mm2}mm²
            </button>
          ))}
        </div>
      </div>

      {/* Installation Method (BS 7671) */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Installation Method (BS 7671)
          </span>
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {baseAmpacity} A base
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {(
            [
              { method: 'C', label: 'Method C', hint: 'Clipped direct' },
              { method: 'B1', label: 'Method B1', hint: 'Conduit on wall' },
              { method: 'A', label: 'Method A', hint: 'Thermal insulation' },
            ] as const
          ).map((option) => (
            <button
              key={option.method}
              type="button"
              onClick={() => handleMethodChange(option.method)}
              className={`rounded-lg border p-1.5 text-center transition ${
                currentMethod === option.method
                  ? 'border-emerald-500 bg-emerald-600 text-white dark:bg-emerald-600'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              <span className="block text-[10px] font-bold">{option.label}</span>
              <span
                className={`block text-[9px] ${
                  currentMethod === option.method
                    ? 'text-emerald-100'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {option.hint}
              </span>
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          Reference installation method sets the base ampacity for {currentGauge} mm²; the Cg
          derating factor below then applies on top ({baseAmpacity} A × {currentDerating.toFixed(2)}{' '}
          = {(baseAmpacity * currentDerating).toFixed(1)} A effective).
        </p>
      </div>

      {/* Routing Style */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
        <span className="font-bold text-slate-800 dark:text-slate-200">Routing Style</span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handlePathKindChange('orthogonal')}
            className={`rounded-lg border py-1.5 text-xs font-semibold transition ${
              currentPathKind === 'orthogonal'
                ? 'border-blue-500 bg-blue-600 text-white shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            Orthogonal (90°)
          </button>

          <button
            type="button"
            onClick={() => handlePathKindChange('bezier')}
            className={`rounded-lg border py-1.5 text-xs font-semibold transition ${
              currentPathKind === 'bezier'
                ? 'border-blue-500 bg-blue-600 text-white shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            Curved (Bezier)
          </button>
        </div>
      </div>

      {/* Derating Factor */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="derating-factor-slider"
            className="font-bold text-slate-800 dark:text-slate-200"
          >
            Derating Factor (Cg)
          </label>
          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
            {currentDerating.toFixed(2)}
          </span>
        </div>

        <input
          id="derating-factor-slider"
          type="range"
          min="0.4"
          max="1.0"
          step="0.05"
          value={currentDerating}
          onChange={(e) => handleDeratingChange(Number(e.target.value))}
          className="w-full accent-indigo-600 cursor-pointer"
        />

        <div className="grid grid-cols-2 gap-1 text-[10px]">
          {[
            { label: 'Direct Air (1.0)', val: 1.0 },
            { label: 'In Conduit (0.8)', val: 0.8 },
            { label: 'Thermal Insulation (0.7)', val: 0.7 },
            { label: 'Grouped Cables (0.5)', val: 0.5 },
          ].map((preset) => (
            <button
              key={preset.val}
              type="button"
              onClick={() => handleDeratingChange(preset.val)}
              className={`rounded border p-1 text-center font-medium transition ${
                Math.abs(currentDerating - preset.val) < 0.01
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Wire Material */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
        <span className="font-bold text-slate-800 dark:text-slate-200">Wire Material</span>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() =>
              useCircuitStore.getState().updateWireProperties(wire.id, { material: 'copper' })
            }
            className={`rounded-lg border py-1.5 text-xs font-semibold transition ${
              wire.material === 'copper'
                ? 'border-amber-500 bg-amber-600 text-white shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            Copper
          </button>

          <button
            type="button"
            onClick={() =>
              useCircuitStore.getState().updateWireProperties(wire.id, { material: 'aluminum' })
            }
            className={`rounded-lg border py-1.5 text-xs font-semibold transition ${
              wire.material === 'aluminum'
                ? 'border-gray-500 bg-gray-600 text-white shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            Aluminum
          </button>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          {wire.material === 'aluminum'
            ? 'Aluminum: Lower conductivity, lighter weight, lower cost'
            : 'Copper: Higher conductivity, better durability'}
        </p>
      </div>

      {/* Wire Gauge (AWG) */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-200">Wire Gauge (AWG)</span>
          <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
            {wire.gauge ?? 14} AWG
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {[10, 12, 14, 16, 18, 20, 22].map((awg) => (
            <button
              key={awg}
              type="button"
              onClick={() =>
                useCircuitStore.getState().updateWireProperties(wire.id, { gauge: awg })
              }
              className={`rounded border px-2 py-1 text-[10px] font-semibold font-mono transition ${
                wire.gauge === awg
                  ? 'border-cyan-500 bg-cyan-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {awg} AWG
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          Lower AWG = thicker wire = higher ampacity
        </p>
      </div>

      {/* Delete Wire Action */}
      <button
        type="button"
        onClick={handleDeleteWire}
        className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/40 transition"
      >
        <Trash2 className="size-4" />
        <span>Delete Selected Wire</span>
      </button>
    </div>
  );
}
