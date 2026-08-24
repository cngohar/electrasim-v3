/**
 * ZsCheckPanel — earth-fault loop impedance / disconnection-time checker
 * (BS 7671 Reg 411.3, Tables 41.2–41.4 with A4:2026 Cmin correction; OSG
 * Table I1 R1+R2). One row per protective device that carries an overcurrent
 * curve; plain RCDs are listed as relying on upstream disconnection.
 *
 * Educational estimates — see zsCheck.ts header for the simplifications.
 */

import { Activity } from 'lucide-react';
import { useMemo, useState } from 'react';
import { COMPONENT_DEFS } from '../../../domain';
import {
  ZE_DEFAULT_OHMS,
  type ZsCheckResult,
  type ZsEarthArrangement,
  runZsChecks,
} from '../../../domain/zsCheck';
import { useCircuitStore } from '../../../store';

function Row({ result }: { result: ZsCheckResult }) {
  const verdict = result.passCold ? 'PASS (cold ≤80%)' : result.passHot ? 'PASS (table)' : 'FAIL';
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
          Psvc fault ≈ {Math.round(result.prospectiveFaultCurrentAmps)} A ≥{' '}
          {result.assuredFaultCurrentAmps} A → clears in ≤{result.disconnectionSeconds} s
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
  const [earthing, setEarthing] = useState<ZsEarthArrangement>('TN-C-S');

  const circuit = useMemo(() => ({ components, wires }), [components, wires]);
  const rows = useMemo(() => runZsChecks(circuit, ZE_DEFAULT_OHMS[earthing]), [circuit, earthing]);
  const curveFreeCount = useMemo(
    () =>
      components.filter((c) => {
        const def = COMPONENT_DEFS[c.type];
        return def?.isProtection && !def.mcbType;
      }).length,
    [components],
  );

  return (
    <div className="space-y-2" data-testid="zs-check-panel">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
          <Activity className="size-3.5 text-sky-500" />
          <span className="text-xs">Zs / Disconnection Check (Reg 411.3)</span>
        </div>
        <select
          aria-label="Earthing arrangement (Ze)"
          value={earthing}
          onChange={(e) => setEarthing(e.target.value as ZsEarthArrangement)}
          className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
        >
          <option value="TN-C-S">TN-C-S · Ze 0.35 Ω</option>
          <option value="TN-S">TN-S · Ze 0.80 Ω</option>
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

      {curveFreeCount > 0 && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400">
          {curveFreeCount} curve-free residual device(s) on the canvas rely on upstream overcurrent
          protection for earth-fault disconnection and are not listed.
        </p>
      )}

      <p className="text-[10px] leading-snug text-slate-400 dark:text-slate-500">
        Educational estimate: Zs = Ze + (R1+R2), R1+R2 at 20 °C from OSG Table I1 on the smallest
        cable in the run; max Zs = 230 V × 0.95 (Cmin) ÷ (upper magnetic × rating) per BS 7671
        Tables 41.2–41.4 (A4:2026). “PASS (table)” but not “cold ≤80%” means a real 20 °C
        measurement might exceed the GN3 site limit — shorten the run or upsize the cable. TT
        systems rely on RCD disconnection (Table 41.5) and are out of scope here.
      </p>
    </div>
  );
}
