/** Capability-driven settings. Source output, device nameplate and measurements
 * have separate controls; no role is inferred from a component's name. */
import {
  COMPONENT_DEFS,
  type ComponentInstance,
  type SimulationResult,
  isResidualDevice,
} from '@electrasim/domain';
import { resolveDeviceCapabilities } from '@electrasim/domain/core/capabilities';
import { resolveComponentState } from '@electrasim/domain/core/normalize';
import {
  supplyAtTarget,
  supplyDescription,
  supplyTargetForComponent,
} from '@electrasim/domain/core/supplyEditing';
import { previewVariantChange } from '@electrasim/domain/core/variantEditing';
import { HelpCircle, Lock, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { setMomentarySwitchState, useCircuitStore } from '../../../store/circuitStore';
import { requestSupplyEdit, useConfigurationLockReason } from '../../../store/electricalEditing';
import { useCircuitDocument, useCircuitReadiness } from '../../../store/electricalReadiness';
import { useUiStore } from '../../../store/uiStore';
import { requestDeleteComponent } from '../../canvas-actions';
import { getComponentImage } from '../componentImages';
import { ElectricalReadings } from './ElectricalReadings';
import { VALID_VARIANT_FAMILIES } from './variantFamilies';

const box =
  'rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60 space-y-2';
const button =
  'rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800';
const input =
  'w-full rounded border border-slate-200 bg-white px-2 py-1 font-mono text-xs disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900';
const CoilModelEditor = lazy(() => import('./CoilModelEditor'));

export function ComponentPropertiesView({
  selectedComp,
  simResult,
}: { selectedComp: ComponentInstance; simResult: SimulationResult | null }) {
  const circuit = useCircuitDocument();
  const readiness = useCircuitReadiness();
  const running = useUiStore((s) => s.simRunning);
  const setPreviewVariant = useUiStore((s) => s.setPreviewVariant);
  const def = COMPONENT_DEFS[selectedComp.type];
  const locked = useConfigurationLockReason();
  if (!def) return null;
  const capability =
    readiness.capabilities.find((c) => c.componentId === selectedComp.id) ??
    resolveDeviceCapabilities(selectedComp, circuit);
  const findings = readiness.groups.filter((g) => g.componentId === selectedComp.id);
  const load = capability.groups.find((g) => g.role === 'load');
  const coil = capability.groups.find((g) => g.role === 'coil');
  const poles = capability.groups.filter((g) => g.role === 'contact' || g.role === 'outlet');
  const supplyTarget = supplyTargetForComponent(circuit, selectedComp.id);
  const profile = supplyTarget && supplyAtTarget(circuit, supplyTarget);
  const status = findings.some((g) => g.result.status === 'incompatible')
    ? 'incompatible'
    : !findings.length || findings.some((g) => g.result.status === 'unassessed')
      ? 'unassessed'
      : 'compatible';
  const coilState = simResult?.coilStates?.[selectedComp.id];
  const isOn = coilState ?? selectedComp.state.on === true;
  const family = VALID_VARIANT_FAMILIES[selectedComp.type] ?? [];
  const variants = family.filter((type) => !!COMPONENT_DEFS[type]);
  const update = useCircuitStore.getState().updateComponentState;
  const nominalVolts =
    load?.nominalVoltage.status === 'known' ? load.nominalVoltage.value : undefined;
  const nominalWatts =
    load?.nominalPowerWatts.status === 'known' ? load.nominalPowerWatts.value : undefined;

  return (
    <div className="space-y-3.5 p-3.5 text-xs text-slate-700 dark:text-slate-200">
      <div className="relative rounded-xl border border-slate-200 bg-slate-900 p-3 dark:border-slate-800">
        <img
          src={getComponentImage(selectedComp.type, def.category)}
          alt={def.label}
          referrerPolicy="no-referrer"
          className="h-28 w-full object-contain"
        />
        <button
          type="button"
          title={`View ${def.label} Real-World Technical Specifications`}
          onClick={() => useUiStore.getState().setActiveComponentInfoType(selectedComp.type)}
          className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-sky-300"
        >
          <HelpCircle className="size-3.5" />
          Specs
        </button>
        <p className="mt-2 text-[10px] text-slate-200">{def.description ?? def.label}</p>
      </div>

      <section className={box} data-component-compatibility={status}>
        <h3 className="font-semibold">Electrical compatibility: {status}</h3>
        {findings.map((g) => (
          <div key={g.groupId}>
            <p className="font-medium">
              {g.groupId} · {g.result.status}
            </p>
            {g.result.reasons.map((r, i) => (
              <p key={`${r.code}-${i}`}>{r.message}</p>
            ))}
          </div>
        ))}
        {!findings.length && <p>Repair invalid topology before assessing this device.</p>}
        <p className="text-[10px]">
          Nominal guidance is separate from measured terminal voltage and standards assessment.
        </p>
      </section>

      {supplyTarget && profile && (
        <section className={box}>
          <h3 className="font-semibold">
            {supplyTarget.kind === 'document'
              ? 'Document supply (L/N aliases)'
              : 'Independent source output'}
          </h3>
          <p>{supplyDescription(profile)}</p>
          <button
            type="button"
            className={button}
            disabled={!!locked}
            title={locked ?? 'Preview a supply change'}
            onClick={() => requestSupplyEdit(supplyTarget)}
          >
            Edit supply…
          </button>
        </section>
      )}
      {capability.family === 'pe-reference' && (
        <p className={box}>
          Protective earth reference. PE is not a power source or an adjustable supply.
        </p>
      )}
      {locked && (
        <p className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
          <Lock className="size-3" />
          {locked}
        </p>
      )}

      {variants.length > 1 && (
        <section className={box}>
          <h3 className="font-semibold">Available Family Variants ({variants.length})</h3>
          <p>Preview each replacement’s terminal mapping and new ratings.</p>
          <div className="grid max-h-44 grid-cols-2 gap-1.5 overflow-y-auto">
            {variants.map((type) => {
              const candidate = COMPONENT_DEFS[type]!;
              const preview = previewVariantChange(circuit, selectedComp.id, type);
              return (
                <button
                  key={type}
                  type="button"
                  className={button}
                  disabled={!!locked}
                  aria-pressed={type === selectedComp.type}
                  title={preview.reason ?? `Switch to ${candidate.label}`}
                  onMouseEnter={() => {
                    if (!locked) setPreviewVariant(type, selectedComp.id);
                  }}
                  onMouseLeave={() => setPreviewVariant(null)}
                  onClick={() => {
                    useCircuitStore.getState().updateComponentType(selectedComp.id, type);
                    setPreviewVariant(null);
                  }}
                >
                  {candidate.label}
                  {candidate.tier === 'pro' && (
                    <span className="block text-[9px]">Membership required</span>
                  )}
                  {preview.status === 'blocked' && (
                    <span className="block text-[9px]">Mapping unavailable</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {load && (
        <section className={box}>
          <h3 className="font-semibold">Load design / nameplate</h3>
          <p>
            {load.loadLaw.kind === 'fixed-resistance'
              ? `Fixed resistance: ${Number(load.loadLaw.resistanceOhms.toFixed(4))} Ω. Power changes with terminal voltage.`
              : 'Operating load law is unassessed.'}
          </p>
          <fieldset disabled={!!locked} className="grid grid-cols-2 gap-2">
            <label>
              Power (W)
              <input
                className={input}
                type="number"
                min="0.001"
                step="any"
                aria-label="Power rating in watts"
                placeholder="Not declared"
                value={selectedComp.state.customPowerWatts ?? nominalWatts ?? ''}
                onChange={(e) =>
                  update(selectedComp.id, {
                    customPowerWatts: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Design voltage (V)
              <input
                className={input}
                type="number"
                min="0.001"
                step="any"
                aria-label="Operating voltage in volts"
                placeholder="Not declared"
                value={selectedComp.state.customVoltage ?? nominalVolts ?? ''}
                onChange={(e) =>
                  update(selectedComp.id, {
                    customVoltage: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />
            </label>
          </fieldset>
          <p className="text-[10px]">
            These are equipment ratings, independent of the supply setting.
          </p>
        </section>
      )}
      {coil && (
        <section className={box}>
          <h3 className="font-semibold">Coil ratings</h3>
          <p>
            Nominal voltage:{' '}
            {coil.nominalVoltage.status === 'known'
              ? `${coil.nominalVoltage.value} V`
              : 'Not declared'}
            .
          </p>
          <Suspense fallback={<p>Loading coil settings…</p>}>
            <CoilModelEditor
              key={`${selectedComp.id}:${JSON.stringify(selectedComp.state.coilModel)}`}
              component={selectedComp}
              locked={locked}
            />
          </Suspense>
        </section>
      )}
      {capability.groups
        .filter((g) => g.role === 'primary' || g.role === 'secondary')
        .map((g) => (
          <section key={g.id} className={box}>
            <h3 className="font-semibold">{g.role} winding</h3>
            <p>
              {g.nominalVoltage.status === 'known'
                ? `${g.nominalVoltage.value} V AC`
                : 'Voltage not declared'}{' '}
              across {g.ports.map((i) => def.ports[i]?.label).join(' / ')}.
            </p>
            <p>Separate isolated winding; no DC rectification is implied.</p>
          </section>
        ))}
      {(poles.length > 0 ||
        (load &&
          (def.maxAmps !== undefined || selectedComp.state.customMaxAmps !== undefined))) && (
        <section className={box}>
          <h3 className="font-semibold">
            {def.isProtection ? 'Protective device rating In' : 'Contact / device capacity'}
          </h3>
          <label>
            Current rating (A)
            <input
              className={input}
              type="number"
              aria-label="Current rating in amps"
              min="0.001"
              step="any"
              disabled={!!locked}
              placeholder="Not declared"
              value={selectedComp.state.customMaxAmps ?? def.maxAmps ?? ''}
              onChange={(e) =>
                update(selectedComp.id, {
                  customMaxAmps: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </label>
          <p className="text-[10px]">
            Capacity is separate from current flowing in a pole, cable capacity Iz and residual
            current in mA.
          </p>
        </section>
      )}
      {isResidualDevice(selectedComp.type) && (
        <section className={box}>
          <h3 className="font-semibold">Residual Current Type</h3>
          <p>
            Rated residual current:{' '}
            {def.ratedLeakage_mA === undefined ? 'Not declared' : `${def.ratedLeakage_mA} mA`}.
          </p>
          <div className="flex gap-1">
            {(['AC', 'A', 'F', 'B'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={button}
                disabled={!!locked}
                aria-pressed={(selectedComp.state.rcdType ?? 'A') === type}
                onClick={() => update(selectedComp.id, { rcdType: type })}
              >
                Type {type}
              </button>
            ))}
          </div>
          <p className="text-[10px]">
            Residual waveform suitability and overcurrent trip curves are separate properties.
          </p>
        </section>
      )}
      {(def.recommendedCableMm2 !== undefined ||
        selectedComp.state.customCableMm2 !== undefined) && (
        <section className={box}>
          <label>
            Suggested tail size (mm²)
            <input
              className={input}
              type="number"
              min="0.001"
              step="any"
              aria-label="Cable size in mm2"
              disabled={!!locked}
              value={selectedComp.state.customCableMm2 ?? def.recommendedCableMm2 ?? ''}
              onChange={(e) =>
                update(selectedComp.id, {
                  customCableMm2: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </label>
          <p>
            Explicit wire settings take precedence. Edit each wire to set its modeled cable size.
          </p>
        </section>
      )}

      {capability.battery && (
        <section className={box}>
          <h3 className="font-semibold">Battery chemistry</h3>
          <select
            aria-label="Battery chemistry"
            className={input}
            disabled={!!locked}
            value={selectedComp.state.batteryChemistry ?? ''}
            onChange={(e) =>
              update(selectedComp.id, {
                batteryChemistry: e.target.value
                  ? (e.target.value as 'alkaline' | 'li-ion' | 'lead-acid')
                  : undefined,
              })
            }
          >
            <option value="">Not specified</option>
            <option value="alkaline">Alkaline</option>
            <option value="li-ion">Li-ion</option>
            <option value="lead-acid">Lead-acid</option>
          </select>
          <p>
            Chemistry is a stored label. Discharge, internal resistance and chemistry behavior are
            not modeled.
          </p>
        </section>
      )}

      <ElectricalReadings componentId={selectedComp.id} result={simResult} />

      {def.isSwitch && (
        <section className={box}>
          <h3 className="font-semibold">Switch Contact State</h3>
          {def.isMomentary ? (
            <button
              type="button"
              className={button}
              aria-label="Press and hold"
              aria-pressed={isOn}
              onPointerDown={(e) => {
                if (e.button > 0) return;
                e.currentTarget.setPointerCapture?.(e.pointerId);
                setMomentarySwitchState(selectedComp.id, true);
              }}
              onPointerUp={() => setMomentarySwitchState(selectedComp.id, false)}
              onPointerCancel={() => setMomentarySwitchState(selectedComp.id, false)}
              onLostPointerCapture={() => setMomentarySwitchState(selectedComp.id, false)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
                  e.preventDefault();
                  setMomentarySwitchState(selectedComp.id, true);
                }
              }}
              onKeyUp={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setMomentarySwitchState(selectedComp.id, false);
                }
              }}
              onBlur={() => setMomentarySwitchState(selectedComp.id, false)}
            >
              {isOn ? 'PRESSED' : 'RELEASED'}
            </button>
          ) : (
            <button
              type="button"
              className={button}
              disabled={coilState !== undefined}
              onClick={() => useCircuitStore.getState().toggleSwitch(selectedComp.id)}
            >
              {def.switchContacts?.some((p) => p.nc !== undefined)
                ? isOn
                  ? 'NO selected'
                  : 'NC selected'
                : isOn
                  ? 'CLOSED (ON)'
                  : 'OPEN (OFF)'}
            </button>
          )}
          {coilState !== undefined && (
            <p>
              {simResult?.simulationState
                ? 'Automatic coil control · declared timed model'
                : 'Automatic coil control · ideal rail estimate'}
            </p>
          )}
        </section>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className={button}
          disabled={running}
          onClick={() => useCircuitStore.getState().rotateComponent(selectedComp.id, -90)}
        >
          <RotateCcw className="inline size-3.5" /> Rotate -90°
        </button>
        <button
          type="button"
          className={button}
          disabled={running}
          onClick={() => useCircuitStore.getState().rotateComponent(selectedComp.id, 90)}
        >
          <RotateCw className="inline size-3.5" /> Rotate +90°
        </button>
      </div>
      {capability.sourceControl === 'none' && (
        <button
          type="button"
          className={button}
          disabled={!!locked}
          onClick={() =>
            update(selectedComp.id, {
              ...resolveComponentState({}, def),
              coilModel: undefined,
              customPowerWatts: undefined,
              customMaxAmps: undefined,
              customMaxVolts: undefined,
              customVoltage: undefined,
              customCableMm2: undefined,
              speed: undefined,
              rcdType: undefined,
            })
          }
        >
          Reset Factory Defaults
        </button>
      )}
      <button
        type="button"
        className={button}
        disabled={running}
        onClick={() => requestDeleteComponent(selectedComp.id)}
      >
        <Trash2 className="inline size-3.5" /> Delete Component
      </button>
    </div>
  );
}
