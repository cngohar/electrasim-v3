import { calculationLabel, operationLabel } from '@electrasim/domain/simulation/presentation';
import type { SimulationResult } from '@electrasim/domain/types';

const reading = (value: number | null | undefined, unit: string) =>
  value != null && Number.isFinite(value) ? `${Number(value.toFixed(4))} ${unit}` : 'Unavailable';

export function ElectricalReadings({
  componentId,
  result,
}: { componentId: string; result: SimulationResult | null }) {
  const electrical = result?.electrical;
  const calculated = electrical?.status === 'converged' && !result?.legacyObservation;
  const load = electrical?.loads.find((item) => item.componentId === componentId);
  const transformer = electrical?.transformers.find((item) => item.componentId === componentId);
  const control = electrical?.controls?.find((item) => item.componentId === componentId);
  const timer = electrical?.timers?.find((item) => item.componentId === componentId);
  const dimmer = electrical?.dimming?.controls.find((item) => item.componentId === componentId);
  const poles = electrical?.deviceCurrents.filter((item) => item.componentId === componentId) ?? [];
  const values = calculated ? result?.componentCalculations?.[componentId] : undefined;
  return (
    <section
      className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2 dark:border-slate-800 dark:bg-slate-950/60"
      data-electrical-readings={componentId}
    >
      <h3 className="font-semibold">Simulation readings</h3>
      <p>{result ? calculationLabel(result) : 'Run to calculate measurements.'}</p>
      {result?.legacyObservation && <p>{result.legacyObservation.reason}</p>}
      {timer && (
        <>
          <p>
            Simulated time:{' '}
            <output data-reading="simulation-time">
              {reading(result?.simulationState?.elapsedSeconds, 's')}
            </output>
          </p>
          <p>
            Timed contact:{' '}
            <output data-reading="timer-contact">{timer.closed ? 'CLOSED' : 'OPEN'}</output>.
          </p>
          <p>
            Clock:{' '}
            {timer.clock === 'external'
              ? 'independent external clock'
              : timer.powered
                ? 'declared supply available'
                : 'control supply unavailable'}
            .
          </p>
          {timer.pending && (
            <p>
              Next {timer.pending.closed ? 'close' : 'open'} at{' '}
              <output data-reading="timer-deadline">{reading(timer.pending.atSeconds, 's')}</output>
              .
            </p>
          )}
          <p>
            {timer.clock === 'declared-supply'
              ? 'The readings below describe the timer electronics; contact currents are separate.'
              : 'Clock supply consumption is unassessed; actual contact currents appear below.'}
          </p>
        </>
      )}
      {dimmer && (
        <p>
          Conducted energy setting: {reading(dimmer.powerFraction * 100, '%')}. Readings are across
          L-in / L-out; inspect the lamp for its delivered voltage. The ideal switch dissipates no
          real power.
        </p>
      )}
      {electrical?.dimming && (
        <p>
          RMS switching model: current and voltage use each switching state; power is the cycle
          mean. RMS magnitudes cannot be added for a shared feeder.
        </p>
      )}
      {control && (
        <>
          <p>
            Simulated time:{' '}
            <output data-reading="simulation-time">
              {reading(result?.simulationState?.elapsedSeconds, 's')}
            </output>
          </p>
          <p>Coil contact drive: {control.closed ? 'operated' : 'released'}.</p>
          {control.pending && (
            <p>
              Pending {control.pending.closed ? 'pickup' : 'dropout'} at{' '}
              {reading(control.pending.atSeconds, 's')}.
            </p>
          )}
          <p>
            The voltage, current and power below describe the coil. Contact currents are separate.
          </p>
        </>
      )}
      {transformer ? (
        <>
          <p>Primary terminal voltage: {reading(transformer.primaryVoltageVolts, 'V')}</p>
          <p>Secondary terminal voltage: {reading(transformer.secondaryVoltageVolts, 'V')}</p>
          <p>Primary current: {reading(transformer.primaryCurrentAmps, 'A')}</p>
          <p>Secondary current: {reading(transformer.secondaryCurrentAmps, 'A')}</p>
          <p>Primary power: {reading(transformer.primaryPowerWatts, 'W')}</p>
          <p>Secondary power: {reading(transformer.secondaryPowerWatts, 'W')}</p>
          <p>
            Ideal winding model · {transformer.connection}. Winding losses and saturation are
            unassessed.
          </p>
        </>
      ) : (
        <>
          <p>
            Terminal-pair voltage:{' '}
            <output data-reading="voltage">{reading(values?.voltage, 'V')}</output>
          </p>
          <p>
            Branch current:{' '}
            <output data-reading="current">{reading(values?.currentAmps, 'A')}</output>
          </p>
          <p>
            Power: <output data-reading="power">{reading(values?.powerWatts, 'W')}</output>
          </p>
        </>
      )}
      {calculated && load && (
        <p>
          Load response: {load.response}. Compatibility: {load.compatibility.status}. Power relative
          to nameplate: {reading(load.powerRatio === null ? null : load.powerRatio * 100, '%')}.
        </p>
      )}
      {poles.map((pole) => (
        <div
          key={pole.branchId}
          className="border-t border-slate-200 pt-2 dark:border-slate-700"
          data-pole-reading={pole.groupId}
        >
          <p>
            {pole.groupId} · Pole current: {reading(pole.currentAmps, 'A')}
          </p>
          <p>
            {pole.overcurrentRatingAmps ? 'Overcurrent rating (In)' : 'Carrying capacity'}:{' '}
            {reading(
              pole.currentCapacityAmps.status === 'known' ? pole.currentCapacityAmps.value : null,
              'A',
            )}
          </p>
          {pole.protection.residual && (
            <p>
              Rated residual sensitivity: {reading(pole.ratedResidualMilliAmps, 'mA')}. Measured
              residual current: Unavailable.
            </p>
          )}
          <p>Current rating: {pole.capacityComparison}. Trip and damage: unassessed.</p>
        </div>
      ))}
      <p className="text-[10px]">
        {result ? operationLabel(result) : 'Operation unassessed'}. Standards assessment:
        unassessed.
      </p>
      <p className="text-[10px]">
        Values use the declared circuit model. Voltage is across the named terminal pair; current
        follows its port direction. Negative source or winding power means delivery. AC values use
        RMS. A live conductor can carry zero current.
      </p>
    </section>
  );
}
