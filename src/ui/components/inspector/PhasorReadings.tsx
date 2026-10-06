import { terminalId } from '@electrasim/domain/core/faultTopology';
import { type Phasor, phasorMagnitude, phasorVoltageBetween } from '@electrasim/domain/core/phasor';
import { assessWireCapacity } from '@electrasim/domain/core/wireCapacity';
import { resolveWireProperties } from '@electrasim/domain/core/wireProperties';
import type { ComponentInstance, SimulationResult, WireInstance } from '@electrasim/domain/types';

const number = (value: number | null | undefined, unit: string) =>
  value != null && Number.isFinite(value) ? `${Number(value.toFixed(4))} ${unit}` : 'Unavailable';
const rms = (value: Phasor | null | undefined, unit: string) =>
  value ? number(phasorMagnitude(value), unit) : 'Unavailable';
const angle = (value: Phasor | null | undefined) =>
  value && phasorMagnitude(value) > 1e-9
    ? `${Number(((Math.atan2(value.imaginary, value.real) * 180) / Math.PI).toFixed(2))}°`
    : 'unavailable at zero magnitude';
const box =
  'rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2 dark:border-slate-800 dark:bg-slate-950/60';
const basis =
  'Complex RMS readings; angles use this source system’s reference. Motor operation, automatic trips, damage and repair assessment are unassessed.';

export function PhasorReadings({
  componentId,
  result,
}: { componentId: string; result: SimulationResult }) {
  const point = result.phasorComponents?.[componentId];
  return (
    <section
      className={box}
      data-electrical-readings={componentId}
      data-phasor-readings={componentId}
    >
      <h3 className="font-semibold">Three-phase / phasor readings</h3>
      <p>
        {result.phasor?.status === 'converged'
          ? 'Calculated · complex RMS'
          : 'Measurements unavailable'}
      </p>
      {point?.branches.map((branch) => (
        <div
          key={branch.label}
          className="border-t border-slate-200 pt-2 dark:border-slate-700"
          data-phase-reading={branch.label}
        >
          <p className="font-semibold">{branch.label}</p>
          <p>
            Voltage: <output data-reading="voltage">{rms(branch.voltage, 'V')}</output> RMS ·{' '}
            {angle(branch.voltage)}
          </p>
          <p>
            Branch current: <output data-reading="current">{rms(branch.current, 'A')}</output> RMS ·{' '}
            {angle(branch.current)}
          </p>
          <p>
            Active power:{' '}
            <output data-reading="power">{number(branch.activePowerWatts, 'W')}</output>
          </p>
        </div>
      ))}
      {point?.voltagePairs.map((pair) => (
        <p key={pair.label}>
          {pair.label}: <output data-voltage-pair={pair.label}>{rms(pair.voltage, 'V')}</output> RMS
          · {angle(pair.voltage)}
        </p>
      ))}
      {point?.neutralCurrent && (
        <p>
          Neutral current (vector sum):{' '}
          <output data-reading="neutral-current">{rms(point.neutralCurrent, 'A')}</output> RMS
        </p>
      )}
      {point?.compatibility && (
        <p>
          Measured load compatibility: {point.compatibility.status}.{' '}
          {point.compatibility.reasons.map((r) => r.message).join(' ')}
        </p>
      )}
      <p>{basis}</p>
      <p>
        Current phasors follow branch direction. Negative active source power means delivery.
        Voltage between independent references is unavailable. Standards assessment: unassessed.
      </p>
    </section>
  );
}

export function PhasorWireReadings({
  wire,
  components,
  result,
}: { wire: WireInstance; components: ComponentInstance[]; result: SimulationResult }) {
  const phasor = result.phasor!;
  const valid = phasor.status === 'converged';
  const id = JSON.stringify(['wire', wire.id]);
  const current = valid ? phasor.branchCurrents[id] : undefined;
  const from = terminalId(wire.fromComponentId, wire.fromPortIndex);
  const to = terminalId(wire.toComponentId, wire.toPortIndex);
  const voltage = phasorVoltageBetween(phasor, from, to);
  const properties = resolveWireProperties(wire, new Map(components.map((c) => [c.id, c])));
  const capacity = assessWireCapacity(properties, current ? phasorMagnitude(current) : null);
  return (
    <section className={box} data-wire-readings={wire.id} data-phasor-wire={wire.id}>
      <h3 className="font-semibold">Conductor · complex RMS</h3>
      <p>
        {!valid
          ? 'UNASSESSED'
          : current && phasorMagnitude(current) > 1e-9
            ? 'CARRYING CURRENT'
            : result.energizedWires.has(wire.id)
              ? 'LIVE · ZERO CURRENT'
              : 'ZERO CURRENT'}
      </p>
      <p>
        Branch current: <output data-reading="current">{rms(current, 'A')}</output> RMS ·{' '}
        {angle(current)}
      </p>
      <p>
        Voltage across endpoints: <output data-reading="voltage">{rms(voltage, 'V')}</output> RMS
      </p>
      <p>
        Conductor loss:{' '}
        <output data-reading="power">
          {number(valid ? phasor.wireLossesWatts[wire.id] : undefined, 'W')}
        </output>
      </p>
      <p>One-conductor resistance (20 °C): {number(properties.resistanceOhms, 'Ω')}</p>
      <p>
        From potential magnitude: {rms(valid ? phasor.terminalVoltages[from] : undefined, 'V')} · To
        potential magnitude: {rms(valid ? phasor.terminalVoltages[to] : undefined, 'V')}
      </p>
      <p>Potentials use the domain’s mathematical reference, not protective earth.</p>
      <p>
        Derated capacity: {number(capacity.deratedAmps, 'A')} · {capacity.comparison}.{' '}
        {capacity.basis}
      </p>
      <p>{basis}</p>
    </section>
  );
}
