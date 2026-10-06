import {
  type DamageModel,
  type DamageTarget,
  isDamageModel,
} from '@electrasim/domain/core/damageModel';
import { useState } from 'react';
import { useCircuitStore } from '../../../store/circuitStore';

const input =
  'w-full min-w-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900';
const button = 'rounded border px-2 py-1 font-semibold disabled:opacity-50';

export default function DamageModelEditor({
  target,
  existing,
  locked,
}: {
  target: DamageTarget;
  existing?: DamageModel;
  locked: string | null;
}) {
  const [kind, setKind] = useState<DamageModel['kind']>(existing?.kind ?? 'overcurrent');
  const [threshold, setThreshold] = useState(
    existing
      ? String(
          existing.kind === 'overcurrent'
            ? existing.continuousCurrentAmps
            : existing.maximumVoltageVolts,
        )
      : '',
  );
  const [budget, setBudget] = useState(
    existing
      ? String(
          existing.kind === 'overcurrent'
            ? existing.withstandAmpSquaredSeconds
            : existing.withstandVoltSquaredSeconds,
        )
      : '',
  );
  const [error, setError] = useState('');
  const save = (model?: DamageModel) => {
    if (target.type === 'component')
      useCircuitStore.getState().updateComponentState(target.id, { damageModel: model });
    else if (!model || model.kind === 'overcurrent')
      useCircuitStore.getState().updateWireProperties(target.id, { damageModel: model });
  };
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const model: unknown =
          kind === 'overcurrent'
            ? {
                version: 1,
                kind,
                continuousCurrentAmps: Number(threshold),
                withstandAmpSquaredSeconds: Number(budget),
              }
            : {
                version: 1,
                kind,
                maximumVoltageVolts: Number(threshold),
                withstandVoltSquaredSeconds: Number(budget),
              };
        if (!threshold || !budget || !isDamageModel(model)) {
          setError(
            'Enter a positive threshold up to 100000 and a stress budget from 0.000001 to 1000000000000.',
          );
          return;
        }
        setError('');
        save(model);
      }}
    >
      <p>Optional cumulative stress model. No damage is predicted without a declared budget.</p>
      <fieldset disabled={!!locked} className="space-y-2">
        {target.type === 'component' && (
          <label className="block">
            Stress source
            <select
              aria-label="Damage stress source"
              className={input}
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as DamageModel['kind']);
                setThreshold('');
                setBudget('');
              }}
            >
              <option value="overcurrent">Branch current</option>
              <option value="overvoltage">Terminal voltage</option>
            </select>
          </label>
        )}
        <label className="block">
          {kind === 'overcurrent'
            ? 'Continuous current threshold (A)'
            : 'Maximum voltage threshold (V)'}
          <input
            aria-label="Damage threshold"
            required
            type="number"
            min="0.001"
            max="100000"
            step="any"
            className={input}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </label>
        <label className="block">
          Stress budget ({kind === 'overcurrent' ? 'A²s' : 'V²s'})
          <input
            aria-label="Damage stress budget"
            required
            type="number"
            min="0.000001"
            max="1000000000000"
            step="any"
            className={input}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </label>
        <p>
          Exposure accumulates from max(measured² − threshold², 0) each simulated second. Reaching
          the budget opens this element. This does not predict temperature or fire.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={button}>
            Apply damage model
          </button>
          {existing && (
            <button type="button" className={button} onClick={() => save()}>
              Remove damage model
            </button>
          )}
        </div>
      </fieldset>
      {locked && <p>{locked}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
