import { COMPONENT_DEFS, type ComponentInstance } from '@electrasim/domain';
import {
  type ProtectionModel,
  hasProtectionSettings,
  isProtectionModel,
  protectionModelFitsType,
} from '@electrasim/domain/core/protectionModel';
import { useState } from 'react';
import { useCircuitStore } from '../../../store/circuitStore';

const input =
  'w-full min-w-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900';
const button = 'rounded border px-2 py-1 font-semibold disabled:opacity-50';

function defaultKind(type: string): ProtectionModel['kind'] {
  if (type === 'fuse' || type === 'fused-spur') return 'fuse';
  if (type === 'rcd') return 'rcd';
  if (type === 'rcbo' || type === 'afdd') return 'rcbo';
  return 'mcb';
}

export default function ProtectionModelEditor({
  component,
  locked,
}: { component: ComponentInstance; locked: string | null }) {
  const existing = component.state.protectionModel;
  const def = COMPONENT_DEFS[component.type];
  const kind = existing?.kind ?? defaultKind(component.type);
  const [ratedCurrentAmps, setRatedCurrentAmps] = useState(
    String(existing && existing.kind !== 'rcd' ? existing.ratedCurrentAmps : (def?.maxAmps ?? '')),
  );
  const [curve, setCurve] = useState(
    String(
      existing && (existing.kind === 'mcb' || existing.kind === 'rcbo')
        ? existing.curve
        : (def?.mcbType ?? 'B'),
    ),
  );
  const [melting, setMelting] = useState(
    String(existing?.kind === 'fuse' ? existing.meltingIntegralSeconds : 10),
  );
  const [residual, setResidual] = useState(
    String(
      existing && (existing.kind === 'rcd' || existing.kind === 'rcbo')
        ? existing.ratedResidualMilliamps
        : (def?.ratedLeakage_mA ?? 30),
    ),
  );
  const [residualType, setResidualType] = useState(
    String(
      existing && (existing.kind === 'rcd' || existing.kind === 'rcbo')
        ? existing.residualType
        : 'A',
    ),
  );
  const [error, setError] = useState('');
  if (!hasProtectionSettings(component.type)) return null;
  const model: unknown =
    kind === 'fuse'
      ? {
          version: 1,
          kind: 'fuse',
          ratedCurrentAmps: Number(ratedCurrentAmps),
          meltingIntegralSeconds: Number(melting),
        }
      : kind === 'rcd'
        ? {
            version: 1,
            kind: 'rcd',
            ratedResidualMilliamps: Number(residual),
            residualType,
          }
        : kind === 'rcbo'
          ? {
              version: 1,
              kind: 'rcbo',
              ratedCurrentAmps: Number(ratedCurrentAmps),
              curve,
              ratedResidualMilliamps: Number(residual),
              residualType,
            }
          : { version: 1, kind: 'mcb', ratedCurrentAmps: Number(ratedCurrentAmps), curve };
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (
          !ratedCurrentAmps ||
          !melting ||
          !residual ||
          !isProtectionModel(model) ||
          !protectionModelFitsType(component.type, model)
        ) {
          setError(
            'Enter a valid rated current, positive melting integral and 1-1000000 mA residual sensitivity with a declared type.',
          );
          return;
        }
        setError('');
        useCircuitStore
          .getState()
          .updateComponentState(component.id, { protectionModel: model as ProtectionModel });
      }}
    >
      <p>
        Declared ratings use simulated time. Resettable trips clear when switched off or the run
        resets. An operated fuse stays open until replaced in Fault Lab.
      </p>
      <fieldset disabled={!!locked} className="space-y-2">
        {kind !== 'rcd' && (
          <label className="block">
            Rated current In (A)
            <input
              aria-label="Protection rated current (A)"
              type="number"
              required
              min="0.001"
              max="100000"
              step="any"
              className={input}
              value={ratedCurrentAmps}
              onChange={(e) => setRatedCurrentAmps(e.target.value)}
            />
          </label>
        )}
        {(kind === 'mcb' || kind === 'rcbo') && (
          <label className="block">
            Trip curve
            <select
              aria-label="Protection trip curve"
              className={input}
              value={curve}
              onChange={(e) => setCurve(e.target.value)}
            >
              <option value="B">B — 3-5× In instantaneous</option>
              <option value="C">C — 5-10× In instantaneous</option>
              <option value="D">D — 10-20× In instantaneous</option>
            </select>
          </label>
        )}
        {kind === 'fuse' && (
          <label className="block">
            Melting I²t anchor (s)
            <input
              aria-label="Fuse melting integral (s)"
              type="number"
              required
              min="0.001"
              max="1000000"
              step="any"
              className={input}
              value={melting}
              onChange={(e) => setMelting(e.target.value)}
            />
          </label>
        )}
        {(kind === 'rcd' || kind === 'rcbo') && (
          <>
            <label className="block">
              Residual sensitivity IΔn (mA)
              <input
                aria-label="Residual sensitivity (mA)"
                type="number"
                required
                min="1"
                max="1000000"
                step="any"
                className={input}
                value={residual}
                onChange={(e) => setResidual(e.target.value)}
              />
            </label>
            <label className="block">
              Residual type
              <select
                aria-label="Residual type"
                className={input}
                value={residualType}
                onChange={(e) => setResidualType(e.target.value)}
              >
                <option value="AC">AC</option>
                <option value="A">A</option>
                <option value="F">F</option>
                <option value="B">B — smooth DC capable</option>
              </select>
            </label>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={button}>
            Apply protection model
          </button>
          {existing && (
            <button
              type="button"
              className={button}
              onClick={() =>
                useCircuitStore
                  .getState()
                  .updateComponentState(component.id, { protectionModel: undefined })
              }
            >
              Remove protection model
            </button>
          )}
        </div>
      </fieldset>
      {locked && <p>{locked}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
