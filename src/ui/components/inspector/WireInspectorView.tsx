/**
 * WireInspectorView — selected-wire properties tab. Moved verbatim
 * from the previous monolithic `Inspector.tsx`.
 */

import type { InstallationMethod, SimulationResult, WireInstance } from '@electrasim/domain';
import { assessWireCapacity } from '@electrasim/domain/core/wireCapacity';
import { WIRE_AWG_MM2, resolveWireProperties } from '@electrasim/domain/core/wireProperties';
import { AlertTriangle, Flame, RefreshCw, Trash2 } from 'lucide-react';
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
  const running = useUiStore((s) => s.simRunning);
  const components = useCircuitStore((s) => s.components);
  const properties = resolveWireProperties(wire, new Map(components.map((c) => [c.id, c])));
  const currentLength = properties.lengthMeters;
  const currentGauge = properties.cableMm2;
  const currentAwg =
    wire.gauge !== undefined && WIRE_AWG_MM2[wire.gauge] === currentGauge ? wire.gauge : undefined;
  const currentPathKind = wire.pathKind ?? 'orthogonal';
  const currentDerating = properties.deratingFactor;
  const currentMethod: InstallationMethod = properties.installationMethod;
  const hasWireFault = Boolean(wire.fault || wire.isBusted);

  const handleClearFault = async () => {
    if (await useCircuitStore.getState().setWireFault(wire.id, undefined))
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

  /** Base (pre-Cg) ampacity for the current size, method and material — BS 7671. */
  const capacity = assessWireCapacity(properties);
  const baseAmpacity = capacity.baseAmps;

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
              {wire.isBusted ? 'Damaged wire — replacement required' : `Wire Fault: ${wire.fault}`}
            </span>
          </div>
          {wire.bustedReason && (
            <p className="text-[11px] text-red-700 dark:text-red-300 leading-snug">
              {wire.bustedReason}
            </p>
          )}
          {wire.fault && (
            <button
              type="button"
              onClick={handleClearFault}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 py-1.5 px-3 text-xs font-bold text-white shadow-xs transition cursor-pointer"
            >
              <RefreshCw className="size-3.5" />
              <span>Clear Wire Fault</span>
            </button>
          )}
          {wire.isBusted && (
            <button
              type="button"
              disabled={running}
              onClick={() => useCircuitStore.getState().setWireBusted(wire.id, false)}
              className="w-full rounded border px-3 py-1.5 font-semibold disabled:opacity-50"
            >
              Replace damaged wire
            </button>
          )}
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
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          Size source:{' '}
          {
            {
              wire: 'wire setting',
              'wire-awg': 'saved AWG',
              endpoint: 'endpoint setting',
              default: 'default assumption',
            }[properties.provenance.cableMm2]
          }
          . Component recommendations do not override this wire.
        </p>
      </div>

      {/* Installation Method (BS 7671) */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-200">
            Installation Method (BS 7671)
          </span>
          <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
            {baseAmpacity === null ? 'Capacity unassessed' : `${baseAmpacity} A base estimate`}
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
          {baseAmpacity === null
            ? capacity.basis
            : `At 70 °C PVC insulation and 30 °C ambient: ${baseAmpacity} A × ${currentDerating.toFixed(2)} = ${capacity.deratedAmps!.toFixed(1)} A estimated capacity. Installation suitability remains unassessed.`}
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
              properties.material === 'copper'
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
              properties.material === 'aluminum'
                ? 'border-gray-500 bg-gray-600 text-white shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            Aluminum
          </button>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          {properties.material === 'aluminum'
            ? 'Aluminum: Lower conductivity, lighter weight, lower cost'
            : 'Copper: Higher conductivity, better durability'}
        </p>
      </div>

      {/* Wire Gauge (AWG) — writes the equivalent mm² so the engine, validator,
          compliance rules and Zs check all keep reading one size field. */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800 dark:text-slate-200">Wire Gauge (AWG)</span>
          <span className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
            {currentAwg ? `${currentAwg} AWG` : '—'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {[10, 12, 14, 16, 18, 20, 22].map((awg) => (
            <button
              key={awg}
              type="button"
              onClick={() =>
                useCircuitStore.getState().updateWireProperties(wire.id, {
                  gauge: awg,
                })
              }
              className={`rounded border px-2 py-1 text-[10px] font-semibold font-mono transition ${
                currentAwg === awg
                  ? 'border-cyan-500 bg-cyan-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
              }`}
            >
              {awg} AWG
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          Lower AWG = thicker wire = higher ampacity. Selecting a gauge sets the cross-section above
          to the metric equivalent.
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
