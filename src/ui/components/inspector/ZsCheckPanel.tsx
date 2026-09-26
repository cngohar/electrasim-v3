/** UK TN educational loop estimate with explicit unsupported results. */

import { Activity } from 'lucide-react';
import { useMemo, useState } from 'react';
import { type ZsAssessment, type ZsEarthArrangement, runZsChecks } from '../../../domain/zsCheck';
import { useCircuitStore, useSettingsStore } from '../../../store';

function Row({ result }: { result: ZsAssessment }) {
  if (result.status === 'not-assessed')
    return (
      <div
        data-zs-verdict="not-assessed"
        className="rounded-lg border border-amber-200 p-2 text-xs"
      >
        <strong>{result.deviceLabel}: Not assessed</strong>
        <p>{result.reason}</p>
      </div>
    );
  const verdict = result.passCold
    ? 'Within cold model limit'
    : result.passHot
      ? 'Within model limit'
      : 'Exceeds model limit';
  const verdictClass = result.passCold
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    : result.passHot
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
      : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white/70 p-2 dark:border-slate-700/60 dark:bg-slate-900/40">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-800 dark:text-slate-200">
          {result.deviceLabel}
        </span>
        <span
          data-zs-verdict={result.passCold ? 'pass-cold' : result.passHot ? 'pass-hot' : 'fail'}
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${verdictClass}`}
        >
          {verdict}
        </span>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[10px] text-slate-600 dark:text-slate-400">
        <span>
          Zs = Ze {result.zeOhms.toFixed(2)} + R1+R2 {result.r1r2Ohms.toFixed(3)} ={' '}
          <strong>{result.zsOhms.toFixed(3)} Ω</strong>
        </span>
        <span>
          Max Zs (Type {result.curve} {result.ratingAmps}A) ={' '}
          <strong>{result.maxZsOhms.toFixed(2)} Ω</strong>
        </span>
        <span>
          Run: {result.runLengthMeters.toFixed(0)} m of {result.smallestCableMm2}/{result.cpcMm2}{' '}
          mm² T&E
          {result.runLengthEstimated ? ' (assumed 10 m/wire — set wire lengths!)' : ''}
        </span>
        <span>
          Estimated fault current: {Math.round(result.prospectiveFaultCurrentAmps)} A. Model
          threshold: {result.assuredFaultCurrentAmps} A.
          {result.passHot
            ? ' Within assumed instantaneous threshold.'
            : ' Disconnection time not established.'}
        </span>
        {result.furthestComponentLabel && (
          <span className="col-span-2">Furthest point: {result.furthestComponentLabel}</span>
        )}
      </div>
    </div>
  );
}

export function ZsCheckPanel() {
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const standard = useSettingsStore((s) => s.regulationStandard);
  const globalVoltage = useCircuitStore((s) => s.globalVoltage);
  const [earthing, setEarthing] = useState<ZsEarthArrangement>('TN-C-S');

  const circuit = useMemo(
    () => ({ components, wires, globalVoltage }),
    [components, wires, globalVoltage],
  );
  const rows = useMemo(
    () => runZsChecks(circuit, { standard, earthing }),
    [circuit, standard, earthing],
  );

  return (
    <div className="space-y-2" data-testid="zs-check-panel">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
          <Activity className="size-3.5 text-sky-500" />
          <span className="text-xs">Zs / Loop Estimate</span>
        </div>
        <select
          aria-label="Earthing arrangement (Ze)"
          value={earthing}
          onChange={(e) => setEarthing(e.target.value as ZsEarthArrangement)}
          className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="TN-C-S">TN-C-S · assumed Ze 0.35 Ω</option>
          <option value="TN-S">TN-S · assumed Ze 0.80 Ω</option>
          <option value="TT">TT · not assessed</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          No MCB/RCBO/AFDD guarding a wired load yet — add a protective device with an overcurrent
          curve (B/C/D) to check earth-fault disconnection.
        </p>
      ) : (
        rows.map((r) => <Row key={r.deviceId} result={r} />)
      )}

      <p className="text-[10px] leading-snug text-slate-400 dark:text-slate-500">
        Educational estimate for UK TN final circuits up to 32 A, U0 = 230 V and copper T&E at 20
        °C. Uses assumed CPC sizes, Ze and network paths; it does not verify protective continuity
        or certify disconnection. Unsupported profiles, TT and unspecified line-to-earth voltage are
        not assessed.
      </p>
    </div>
  );
}
