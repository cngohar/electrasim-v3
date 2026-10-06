import { COMPONENT_DEFS, type ComponentInstance, type WireInstance } from '@electrasim/domain';
import { hasDamageSettings } from '@electrasim/domain/core/damageModel';
import { useCircuitStore } from '../../../store/circuitStore';
import { useConfigurationLockReason } from '../../../store/electricalEditing';
import { useUiStore } from '../../../store/uiStore';
import DamageModelEditor from './DamageModelEditor';

const box =
  'rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/60 space-y-2';
const button = 'rounded border px-2 py-1 font-semibold disabled:opacity-50';
const label = (c: ComponentInstance) =>
  c.state.autoLabel ?? COMPONENT_DEFS[c.type]?.label ?? c.type;

export default function FaultRepairPanel({
  component,
  wire,
}: { component: ComponentInstance | null; wire: WireInstance | null }) {
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const result = useUiStore((s) => s.simResult);
  const running = useUiStore((s) => s.simRunning);
  const locked = useConfigurationLockReason();
  const damaged = components.filter((c) => c.state.isBlown);
  const damagedWires = wires.filter((w) => w.isBusted);
  const tripped = components.filter(
    (c) =>
      c.state.protectionModel?.kind !== 'fuse' &&
      (c.state.isTripped ||
        result?.electrical?.protection?.some(
          (p) => p.componentId === c.id && p.tripped && p.kind !== 'fuse',
        )),
  );
  const target = component
    ? { type: 'component' as const, id: component.id }
    : wire
      ? { type: 'wire' as const, id: wire.id }
      : null;
  const existing = component?.state.damageModel ?? wire?.damageModel;
  const point =
    target &&
    result?.electrical?.damage?.find(
      (p) => p.target.type === target.type && p.target.id === target.id,
    );
  return (
    <>
      <section className={box} aria-label="Fault repair and reset">
        <h3 className="font-semibold">Repair and reset</h3>
        <p>
          Clearing injected faults preserves damage and trip latches. Stop/Run resets simulated time
          and resettable trips. Replace damaged items separately.
        </p>
        {tripped.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>{label(c)} · tripped</span>
            <button
              type="button"
              className={button}
              onClick={() => useCircuitStore.getState().resetTrippedComponent(c.id)}
            >
              Reset {label(c)} to OFF
            </button>
          </div>
        ))}
        {damaged.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>
              {label(c)} · {c.state.protectionModel?.kind === 'fuse' ? 'fuse operated' : 'damaged'}
            </span>
            <button
              type="button"
              className={button}
              disabled={running}
              onClick={() => useCircuitStore.getState().repairBlownComponent(c.id)}
            >
              Replace {label(c)}
            </button>
          </div>
        ))}
        {damagedWires.map((w) => (
          <div key={w.id} className="flex flex-wrap items-center justify-between gap-2">
            <span>Wire #{w.id.slice(0, 8)} · damaged</span>
            <button
              type="button"
              className={button}
              disabled={running}
              onClick={() => useCircuitStore.getState().setWireBusted(w.id, false)}
            >
              Replace wire #{w.id.slice(0, 8)}
            </button>
          </div>
        ))}
        {(damaged.length > 0 || damagedWires.length > 0) && (
          <>
            <button
              type="button"
              className={button}
              disabled={running}
              onClick={() => useCircuitStore.getState().repairAllFaults()}
            >
              Replace all damaged items
            </button>
            <p>
              {running ? 'Stop the simulation before replacing items. ' : ''}Replacement preserves
              wiring, ratings and remaining faults. An unchanged cause can damage the replacement
              again.
            </p>
          </>
        )}
        {!damaged.length && !damagedWires.length && !tripped.length && (
          <p>No latched trip or damage is recorded. This is not a safety assessment.</p>
        )}
      </section>
      {target && (
        <section className={box} aria-label="Damage model and readings">
          <h3 className="font-semibold">Damage model</h3>
          {point && (
            <output className="block">
              {point.damaged ? 'Open — replacement required.' : 'Accumulated stress:'}{' '}
              {Number(point.exposure.toPrecision(5))} / {point.budget} {point.unit}.
              {point.pendingAtSeconds !== null &&
                ` At the present operating point, the budget is reached at ${Number(point.pendingAtSeconds.toFixed(6))} s.`}
            </output>
          )}
          {wire ||
          (component && hasDamageSettings(component.type, COMPONENT_DEFS[component.type])) ? (
            <DamageModelEditor
              key={`${target.type}:${target.id}:${JSON.stringify(existing)}`}
              target={target}
              existing={existing}
              locked={locked}
            />
          ) : (
            <p>
              Damage is unassessed for this device family. A fuse uses its declared protection
              model; a resettable trip does not destroy a breaker.
            </p>
          )}
        </section>
      )}
    </>
  );
}
