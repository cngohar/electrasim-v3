import { isMotorModel } from '@electrasim/domain/core/motorModel';
import type { ComponentInstance } from '@electrasim/domain/types';
import { useState } from 'react';
import { useCircuitStore } from '../../../store/circuitStore';

const input =
  'w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900';

export default function MotorModelEditor({
  component,
  locked,
}: { component: ComponentInstance; locked: string | null }) {
  const existing = component.state.motorModel;
  const [values, setValues] = useState({
    voltage: existing ? String(existing.nominalLineVoltage) : '',
    power: existing ? String(existing.inputPowerWatts) : '',
    frequency: existing ? String(existing.frequencyHz) : '',
    min: existing ? String(existing.operatingLineVoltageRange.min) : '',
    max: existing ? String(existing.operatingLineVoltageRange.max) : '',
    unbalance: existing ? String(existing.maximumUnbalanceRatio * 100) : '',
  });
  const [sequence, setSequence] = useState(existing?.requiredSequence ?? 'abc');
  const [error, setError] = useState('');
  const fields = [
    ['voltage', 'Motor nominal L-L voltage (V)'],
    ['power', 'Motor electrical input power (W)'],
    ['frequency', 'Motor frequency (Hz)'],
    ['min', 'Motor minimum L-L voltage (V)'],
    ['max', 'Motor maximum L-L voltage (V)'],
    ['unbalance', 'Motor maximum voltage unbalance (%)'],
  ] as const;
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const model = {
          version: 1,
          kind: 'balanced-resistive',
          nominalLineVoltage: Number(values.voltage),
          inputPowerWatts: Number(values.power),
          frequencyHz: Number(values.frequency),
          operatingLineVoltageRange: { min: Number(values.min), max: Number(values.max) },
          maximumUnbalanceRatio: Number(values.unbalance) / 100,
          requiredSequence: sequence,
        };
        if (Object.values(values).some((value) => !value.trim()) || !isMotorModel(model)) {
          setError(
            'Enter positive input power, voltage and frequency; the range must include nominal voltage, and unbalance must be 0–10%.',
          );
          return;
        }
        setError('');
        useCircuitStore.getState().updateComponentState(component.id, { motorModel: model });
      }}
    >
      <p>
        Declare a balanced unity-power-factor delta teaching equivalent. Electrical input power is
        separate from shaft/nameplate power. Reactive behavior, speed, torque, starting and
        phase-loss heating are unassessed.
      </p>
      <fieldset disabled={!!locked} className="space-y-2">
        {fields.map(([key, label]) => (
          <label key={key} className="block">
            {label}
            <input
              type="number"
              required
              step="any"
              min={key === 'unbalance' ? '0' : '0.001'}
              aria-label={label}
              className={input}
              value={values[key]}
              onChange={(e) => setValues({ ...values, [key]: e.target.value })}
            />
          </label>
        ))}
        <label className="block">
          Required motor sequence
          <select
            aria-label="Required motor sequence"
            className={input}
            value={sequence}
            onChange={(e) => setSequence(e.target.value as typeof sequence)}
          >
            <option value="abc">ABC</option>
            <option value="acb">ACB</option>
          </select>
        </label>
        <p>The voltage band and unbalance limit are explicit teaching settings.</p>
        <button
          type="submit"
          className="rounded border px-2 py-1 font-semibold disabled:opacity-50"
        >
          Apply motor model
        </button>
        {existing && (
          <button
            type="button"
            className="ml-2 rounded border px-2 py-1"
            onClick={() =>
              useCircuitStore
                .getState()
                .updateComponentState(component.id, { motorModel: undefined })
            }
          >
            Remove motor model
          </button>
        )}
      </fieldset>
      {locked && <p>{locked}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
