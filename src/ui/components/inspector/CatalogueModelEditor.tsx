import { COMPONENT_DEFS } from '@electrasim/domain/components';
import {
  type ApplianceMode,
  type DeviceProfile,
  copyProfile,
  defaultCatalogueProfile,
  defaultLampProfile,
  isCatalogueProfile,
  isElectronicLoadProfile,
} from '@electrasim/domain/core/catalogueProfiles';
import { resolveComponentState } from '@electrasim/domain/core/normalize';
import type { ComponentInstance } from '@electrasim/domain/types';
import { useState } from 'react';
import { useCircuitStore } from '../../../store/circuitStore';

const input =
  'w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900';
const explanations: Record<DeviceProfile['kind'], string> = {
  'regulated-input-power':
    'Regulated electrical input power inside the declared operating band; off outside it. Ideal unity power factor. Dimmer compatibility is unassessed.',
  appliance:
    'Declared electrical input and operating mode. Motor branches use a running impedance equivalent; heating branches use fixed resistance. These impedances still draw current outside the operating band, where running is unavailable. Shaft output, startup, automatic cycles and protocols are unassessed.',
  photovoltaic:
    'Piecewise DC current–voltage curve at explicit irradiance and temperature. Delivered power follows the connected load; the nameplate is not a fixed output.',
  ntc: 'Beta-model resistance at the selected temperature. The model does not infer self-heating or thermal response.',
  spd: 'Two declared L–PE and N–PE shunts. AC uses an RMS-envelope approximation with its own clamp setting. Surge waveforms, impulse energy and certification are unassessed.',
  autotransformer:
    'Low and high taps share a galvanic common. Connect the source to the chosen tap and common. This model does not provide isolation.',
};
export default function CatalogueModelEditor({
  component,
  locked,
}: { component: ComponentInstance; locked: string | null }) {
  const def = COMPONENT_DEFS[component.type]!;
  const normalized = resolveComponentState(component.state, def);
  const initial = normalized.electronicLoadProfile ?? normalized.catalogueProfile!;
  const [draft, setDraft] = useState<DeviceProfile>(() => copyProfile(initial));
  const [error, setError] = useState('');
  const load = draft.kind === 'regulated-input-power' || draft.kind === 'appliance' ? draft : null;
  const value = (key: string) => (draft as unknown as Record<string, unknown>)[key] as number;
  const setNumber = (key: string, n: number) => {
    const next = { ...draft, [key]: n } as DeviceProfile;
    if (
      next.kind === 'regulated-input-power' &&
      ['nominalVoltage', 'inputPowerWatts'].includes(key)
    ) {
      next.provenance = {
        ...next.provenance,
        overrides: [
          ...new Set([...next.provenance.overrides, key as 'nominalVoltage' | 'inputPowerWatts']),
        ].sort(),
      };
      if (key === 'nominalVoltage' && next.operatingRangeOrigin === 'nominal-ratio')
        next.operatingVoltageRange = { min: 0.9 * n, max: 1.1 * n };
    }
    setDraft(next);
  };
  const numeric = (key: string, label: string, min = 0.001, max = 100_000) => (
    <label key={key} className="block">
      {label}
      <input
        className={input}
        aria-label={label}
        type="number"
        step="any"
        min={min}
        max={max}
        required
        value={Number.isFinite(value(key)) ? value(key) : ''}
        onChange={(e) => setNumber(key, e.target.valueAsNumber)}
      />
    </label>
  );
  const modes: ApplianceMode[] =
    draft.kind !== 'appliance'
      ? []
      : ['smoke-alarm', 'burglar-alarm'].includes(component.type)
        ? ['off', 'standby', 'alarm']
        : draft.law === 'composite'
          ? ['off', 'standby', 'heating', 'motor', 'combined']
          : ['off', 'standby', 'active'];
  return (
    <form
      className="space-y-2"
      data-catalogue-model={draft.kind}
      onSubmit={(e) => {
        e.preventDefault();
        if (!(isElectronicLoadProfile(draft) || isCatalogueProfile(draft))) {
          setError(
            'Check the declared values. The operating band must contain nominal voltage; curve points, positive parameters and environmental limits must be valid.',
          );
          return;
        }
        setError('');
        useCircuitStore
          .getState()
          .updateComponentState(
            component.id,
            draft.kind === 'regulated-input-power'
              ? { electronicLoadProfile: draft }
              : { catalogueProfile: draft },
          );
      }}
    >
      <h3 className="font-semibold">Electrical profile</h3>
      <p>Editable generic teaching model · version 1</p>
      <p className="text-[10px]">{explanations[draft.kind]}</p>
      <fieldset disabled={!!locked} className="space-y-2">
        {load && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {numeric('nominalVoltage', 'Profile nominal voltage (V)')}
              {numeric('inputPowerWatts', 'Profile electrical input power (W)')}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['min', 'max'] as const).map((key) => (
                <label key={key}>
                  {key === 'min' ? 'Minimum' : 'Maximum'} operating voltage (V)
                  <input
                    className={input}
                    aria-label={`${key === 'min' ? 'Minimum' : 'Maximum'} operating voltage (V)`}
                    type="number"
                    min="0.001"
                    max="100000"
                    step="any"
                    required
                    value={
                      Number.isFinite(load.operatingVoltageRange[key])
                        ? load.operatingVoltageRange[key]
                        : ''
                    }
                    onChange={(e) => {
                      const next = copyProfile(load);
                      next.operatingVoltageRange[key] = e.target.valueAsNumber;
                      if (next.kind === 'regulated-input-power') {
                        next.operatingRangeOrigin = 'instance';
                        next.provenance.overrides = [
                          ...new Set([
                            ...next.provenance.overrides,
                            'operatingVoltageRange' as const,
                          ]),
                        ].sort();
                      }
                      setDraft(next);
                    }}
                  />
                </label>
              ))}
            </div>
            <label className="block">
              Declared AC frequency
              <select
                className={input}
                aria-label="Declared AC frequency"
                value={(load.kind === 'appliance'
                  ? load.frequencyHz
                  : load.supply.frequencyHz
                ).join(',')}
                onChange={(e) => {
                  const frequencies = e.target.value.split(',').map(Number);
                  setDraft(
                    load.kind === 'appliance'
                      ? { ...load, frequencyHz: frequencies }
                      : { ...load, supply: { ...load.supply, frequencyHz: frequencies } },
                  );
                }}
              >
                <option value="50">50 Hz</option>
                <option value="60">60 Hz</option>
                <option value="50,60">50 / 60 Hz</option>
              </select>
            </label>
          </>
        )}
        {draft.kind === 'appliance' && (
          <>
            <label className="block">
              Operating mode
              <select
                className={input}
                aria-label="Operating mode"
                value={draft.mode}
                onChange={(e) => setDraft({ ...draft, mode: e.target.value as ApplianceMode })}
              >
                {modes.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </label>
            {draft.law !== 'regulated-power' &&
              numeric('displacementPowerFactor', 'Running displacement power factor', 0.1, 1)}
            {numeric('standbyPowerWatts', 'Standby input power (W)', 0)}
            {['smoke-alarm', 'burglar-alarm'].includes(component.type) &&
              numeric('alarmPowerWatts', 'Test alarm input power (W)', 0)}
            {draft.law === 'composite' &&
              numeric('heatingFraction', 'Combined mode heating fraction', 0, 1)}
          </>
        )}
        {draft.kind === 'photovoltaic' && (
          <>
            {numeric('openCircuitVoltage', 'PV open-circuit voltage (V)')}
            {numeric('shortCircuitAmps', 'PV short-circuit current (A)')}
            {numeric('maximumPowerVoltage', 'PV maximum-power voltage (V)')}
            {numeric('maximumPowerAmps', 'PV maximum-power current (A)')}
            {numeric('irradianceWattsPerM2', 'Irradiance (W/m²)', 0, 2000)}
            {numeric('temperatureC', 'PV temperature (°C)', -40, 125)}
            {numeric(
              'currentTemperatureCoefficient',
              'PV current coefficient (fraction/°C)',
              -0.01,
              0.01,
            )}
            {numeric(
              'voltageTemperatureCoefficient',
              'PV voltage coefficient (fraction/°C)',
              -0.01,
              0.01,
            )}
            <p className="text-[10px]">
              A zero temperature coefficient explicitly leaves that temperature effect unmodeled. No
              MPPT controller or inverter is included.
            </p>
          </>
        )}
        {draft.kind === 'ntc' && (
          <>
            {numeric('resistanceAt25Ohms', 'NTC resistance at 25 °C (Ω)', 0.001, 1e9)}
            {numeric('betaKelvin', 'NTC beta (K)', 1, 10000)}
            {numeric('temperatureC', 'NTC temperature (°C)', -40, 125)}
          </>
        )}
        {draft.kind === 'spd' && (
          <>
            {numeric('leakageResistanceOhms', 'SPD leakage resistance (Ω)', 1, 1e12)}
            {numeric('dynamicResistanceOhms', 'SPD dynamic resistance (Ω)', 0.001, 1e6)}
            {numeric('rmsClampVoltage', 'SPD RMS-envelope clamp (V)')}
            {numeric('dcClampVoltage', 'SPD DC clamp (V)')}
          </>
        )}
        {draft.kind === 'autotransformer' && (
          <>
            {numeric('lowTapVoltage', 'Low tap to common (V)')}
            {numeric('highTapVoltage', 'High tap to common (V)')}
            <p className="text-[10px]">
              Ports 0/1: low tap/common. Ports 2/3: high tap/common. Both common terminals are
              internally connected.
            </p>
          </>
        )}
        <button type="submit" className="rounded border border-sky-500 px-3 py-1.5 font-semibold">
          Apply electrical profile
        </button>
        <button
          type="button"
          className="ml-2 rounded border px-2 py-1.5"
          onClick={() =>
            setDraft(
              draft.kind === 'regulated-input-power'
                ? defaultLampProfile(def, {})
                : defaultCatalogueProfile(component.type, def, {})!,
            )
          }
        >
          Restore teaching defaults
        </button>
      </fieldset>
      {error && (
        <p role="alert" className="text-rose-600">
          {error}
        </p>
      )}
    </form>
  );
}
