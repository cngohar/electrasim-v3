import { type CoilModel, isCoilModel } from '@electrasim/domain/core/coilModel';
import type { ComponentInstance } from '@electrasim/domain/types';
import { useState } from 'react';
import { useCircuitStore } from '../../../store/circuitStore';

const input =
  'w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900';

export default function CoilModelEditor({
  component,
  locked,
}: { component: ComponentInstance; locked: string | null }) {
  const existing = component.state.coilModel;
  const [waveform, setWaveform] = useState(existing?.supply.kind ?? 'dc');
  const [frequency, setFrequency] = useState(
    existing?.supply.kind === 'ac-single-phase' ? String(existing.supply.frequencyHz) : '50',
  );
  const [values, setValues] = useState({
    voltage: existing ? String(existing.supply.voltage) : '',
    power: existing ? String(existing.nominalPowerWatts) : '',
    pickup: String(existing?.pickupRatio ?? 0.8),
    dropout: String(existing?.dropoutRatio ?? 0.2),
    onDelay: String(existing?.onDelaySeconds ?? (component.type === 'delay-timer' ? 1 : 0)),
    offDelay: String(existing?.offDelaySeconds ?? 0),
  });
  const [error, setError] = useState('');
  const fields = [
    ['voltage', 'Coil nominal voltage (V)'],
    ['power', 'Coil nominal real power (W)'],
    ['pickup', 'Pickup voltage ratio'],
    ['dropout', 'Dropout voltage ratio'],
    ['onDelay', 'Coil on delay (s)'],
    ['offDelay', 'Coil off delay (s)'],
  ] as const;
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const model = {
          version: 1,
          supply:
            waveform === 'dc'
              ? { kind: 'dc', voltage: Number(values.voltage) }
              : {
                  kind: 'ac-single-phase',
                  voltage: Number(values.voltage),
                  frequencyHz: Number(frequency),
                },
          nominalPowerWatts: Number(values.power),
          pickupRatio: Number(values.pickup),
          dropoutRatio: Number(values.dropout),
          onDelaySeconds: Number(values.onDelay),
          offDelaySeconds: Number(values.offDelay),
        };
        if (Object.values(values).some((value) => !value.trim()) || !isCoilModel(model)) {
          setError(
            'Enter positive voltage and power, 0 ≤ dropout < pickup ≤ 1, and delays from 0 to 3600 seconds.',
          );
          return;
        }
        setError('');
        useCircuitStore
          .getState()
          .updateComponentState(component.id, { coilModel: model as CoilModel });
      }}
      className="space-y-2"
    >
      <p>
        Declare a resistive coil teaching model. Ratings are independent of the contacts.
        Inductance, inrush and damage remain unassessed.
      </p>
      <fieldset disabled={!!locked} className="space-y-2">
        <label className="block">
          Coil waveform
          <select
            aria-label="Coil waveform"
            className={input}
            value={waveform}
            onChange={(e) => setWaveform(e.target.value as typeof waveform)}
          >
            <option value="dc">DC</option>
            <option value="ac-single-phase">Single-phase AC</option>
          </select>
        </label>
        {waveform === 'ac-single-phase' && (
          <label className="block">
            Coil frequency (Hz)
            <input
              type="number"
              required
              min="1"
              step="any"
              aria-label="Coil frequency (Hz)"
              className={input}
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            />
          </label>
        )}
        {fields.map(([key, label]) => (
          <label key={key} className="block">
            {label}
            <input
              type="number"
              required
              step="any"
              min={key === 'voltage' || key === 'power' ? '0.001' : '0'}
              aria-label={label}
              className={input}
              value={values[key]}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            />
          </label>
        ))}
        <p>Ratios and delays are explicit teaching settings, not manufacturer curves.</p>
        <button
          type="submit"
          className="rounded border px-2 py-1 font-semibold disabled:opacity-50"
        >
          Apply coil model
        </button>
        {existing && (
          <button
            type="button"
            className="ml-2 rounded border px-2 py-1"
            onClick={() =>
              useCircuitStore
                .getState()
                .updateComponentState(component.id, { coilModel: undefined })
            }
          >
            Remove coil model
          </button>
        )}
      </fieldset>
      {locked && <p>{locked}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
