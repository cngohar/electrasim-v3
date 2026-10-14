import { COMPONENT_DEFS, type ComponentInstance, type WireInstance } from '@electrasim/domain';
import { resolveDeviceCapabilities } from '@electrasim/domain/core/capabilities';
import { dimmerMaximumLevel } from '@electrasim/domain/core/dimmerModel';
import { supplyTargetForComponent } from '@electrasim/domain/core/supplyEditing';
import { resolveWireProperties } from '@electrasim/domain/core/wireProperties';
import { Cable, CircleDot } from 'lucide-react';
import { useState } from 'react';
import { useCircuitStore, useUiStore } from '../../../store';
import {
  requestSupplyEdit,
  requestVariantEdit,
  useConfigurationLockReason,
} from '../../../store/electricalEditing';
import { isCircuitReadOnly, useSimulatorAccess } from '../../../store/simulatorAccess';
import type { InspectorSelectionState } from './useInspectorSelectionState';
import { VALID_VARIANT_FAMILIES } from './variantFamilies';

const changed = () => useUiStore.getState().showUndoToast('Basic settings updated');
function ComponentSettings({
  component,
  onAdvanced,
}: { component: ComponentInstance; onAdvanced: () => void }) {
  const circuit = useCircuitStore((s) => s);
  const configurationLocked = useConfigurationLockReason();
  useSimulatorAccess();
  const locked =
    configurationLocked ??
    (isCircuitReadOnly(useCircuitStore.getState())
      ? 'This circuit is read-only. Refresh membership to edit its premium content.'
      : null);
  const [pending, setPending] = useState(false);
  const capabilities = resolveDeviceCapabilities(component, circuit);
  const load = capabilities.groups.find((group) => group.role === 'load');
  const nominalPower =
    load?.nominalPowerWatts.status === 'known' ? load.nominalPowerWatts.value : undefined;
  const nominalVoltage =
    load?.nominalVoltage.status === 'known' ? load.nominalVoltage.value : undefined;
  const [label, setLabel] = useState(component.state.autoLabel ?? '');
  const [watts, setWatts] = useState(
    String(component.state.customPowerWatts ?? nominalPower ?? ''),
  );
  const [voltage, setVoltage] = useState(
    String(component.state.customVoltage ?? nominalVoltage ?? ''),
  );
  const [speed, setSpeed] = useState(component.state.speed ?? dimmerMaximumLevel(component.type));
  const variants = (VALID_VARIANT_FAMILIES[component.type] ?? []).filter(
    (type) => COMPONENT_DEFS[type],
  );
  const source = supplyTargetForComponent(circuit, component.id);
  const reset = () => {
    setLabel(component.state.autoLabel ?? '');
    setWatts(String(component.state.customPowerWatts ?? nominalPower ?? ''));
    setVoltage(String(component.state.customVoltage ?? nominalVoltage ?? ''));
    setSpeed(component.state.speed ?? dimmerMaximumLevel(component.type));
  };
  return (
    <form
      className="table-quick-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (locked || pending) return;
        setPending(true);
        const applied = await useCircuitStore.getState().updateComponentState(component.id, {
          autoLabel: label.trim().slice(0, 80) || undefined,
          ...(load && component.type !== 'motor-3phase'
            ? {
                customPowerWatts: watts === '' ? undefined : Number(watts),
                customVoltage: voltage === '' ? undefined : Number(voltage),
              }
            : {}),
          ...(COMPONENT_DEFS[component.type]?.isDimmer ? { speed } : {}),
        });
        setPending(false);
        if (applied) changed();
      }}
    >
      <div className="table-quick-fields">
        <p>Everyday settings, close to your circuit.</p>
        {locked && <p className="table-warning">{locked}</p>}
        <fieldset disabled={!!locked || pending}>
          <label>
            Component label
            <input
              aria-label="Component label"
              maxLength={80}
              value={label}
              placeholder="Automatic label"
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          {load && component.type !== 'motor-3phase' && (
            <div className="table-field-row">
              <label>
                Power (W)
                <input
                  aria-label="Power rating in watts"
                  type="number"
                  min="0.001"
                  step="any"
                  value={watts}
                  onChange={(event) => setWatts(event.target.value)}
                />
              </label>
              <label>
                Design voltage (V)
                <input
                  aria-label="Operating voltage in volts"
                  type="number"
                  min="0.001"
                  step="any"
                  value={voltage}
                  onChange={(event) => setVoltage(event.target.value)}
                />
              </label>
            </div>
          )}
          {COMPONENT_DEFS[component.type]?.isDimmer && (
            <label>
              Output level
              <input
                aria-label="Dimmer power setting"
                type="range"
                min={0}
                max={dimmerMaximumLevel(component.type)}
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              />
              <output>
                {speed} / {dimmerMaximumLevel(component.type)}
              </output>
            </label>
          )}
          {variants.length > 1 && (
            <label>
              Component variant
              <select
                aria-label="Component variant"
                value={component.type}
                onChange={(event) => requestVariantEdit(component.id, event.target.value)}
              >
                {variants.map((type) => (
                  <option key={type} value={type}>
                    {COMPONENT_DEFS[type]?.label}
                  </option>
                ))}
              </select>
              <small>
                A replacement opens a terminal and ratings review before applying. Unsaved basic
                settings stay in this panel.
              </small>
            </label>
          )}
          {source && (
            <button type="button" onClick={() => requestSupplyEdit(source)}>
              Edit source output · reviewed change
            </button>
          )}
        </fieldset>
        <button type="button" className="table-text-action" onClick={onAdvanced}>
          Advanced and detailed settings →
        </button>
      </div>
      <div className="table-quick-footer">
        <button type="button" onClick={reset}>
          Reset draft
        </button>
        <button type="submit" disabled={!!locked || pending}>
          {pending ? 'Checking access…' : 'Apply settings'}
        </button>
      </div>
    </form>
  );
}
function WireSettings({ wire, onAdvanced }: { wire: WireInstance; onAdvanced: () => void }) {
  const components = useCircuitStore((s) => s.components);
  const configurationLocked = useConfigurationLockReason();
  useSimulatorAccess();
  const locked =
    configurationLocked ??
    (isCircuitReadOnly(useCircuitStore.getState())
      ? 'This circuit is read-only. Refresh membership to edit its premium content.'
      : null);
  const [pending, setPending] = useState(false);
  const properties = resolveWireProperties(wire, new Map(components.map((c) => [c.id, c])));
  const [label, setLabel] = useState(wire.label ?? '');
  const [length, setLength] = useState(String(properties.lengthMeters));
  const [size, setSize] = useState(String(properties.cableMm2));
  const [material, setMaterial] = useState(properties.material);
  const reset = () => {
    setLabel(wire.label ?? '');
    setLength(String(properties.lengthMeters));
    setSize(String(properties.cableMm2));
    setMaterial(properties.material);
  };
  return (
    <form
      className="table-quick-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (locked || pending) return;
        setPending(true);
        const applied = await useCircuitStore.getState().updateWireProperties(wire.id, {
          label,
          lengthMeters: Number(length),
          customCableMm2: Number(size),
          material,
        });
        setPending(false);
        if (applied) changed();
      }}
    >
      <div className="table-quick-fields">
        <p>Conductor details. Installation and derating are in detailed settings.</p>
        {locked && <p className="table-warning">{locked}</p>}
        <fieldset disabled={!!locked || pending}>
          <label>
            Wire label
            <input
              aria-label="Wire label"
              maxLength={80}
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <div className="table-field-row">
            <label>
              Length (m)
              <input
                aria-label="Wire length in meters"
                type="number"
                min="0.001"
                step="any"
                required
                value={length}
                onChange={(event) => setLength(event.target.value)}
              />
            </label>
            <label>
              Size (mm²)
              <input
                aria-label="Wire size in mm2"
                type="number"
                min="0.001"
                step="any"
                required
                value={size}
                onChange={(event) => setSize(event.target.value)}
              />
            </label>
          </div>
          <fieldset className="table-material-choice">
            <legend>Conductor material</legend>
            {(['copper', 'aluminum'] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={material === value}
                onClick={() => setMaterial(value)}
              >
                <CircleDot size={23} color={value === 'copper' ? '#ad744c' : '#748595'} />
                <span>{value === 'copper' ? 'Copper' : 'Aluminum'}</span>
                <small>{value === 'copper' ? 'Cu' : 'Al'}</small>
              </button>
            ))}
          </fieldset>
        </fieldset>
        <button type="button" className="table-text-action" onClick={onAdvanced}>
          <Cable size={14} /> Detailed wire settings →
        </button>
      </div>
      <div className="table-quick-footer">
        <button type="button" onClick={reset}>
          Reset draft
        </button>
        <button type="submit" disabled={!!locked || pending}>
          {pending ? 'Checking access…' : 'Apply settings'}
        </button>
      </div>
    </form>
  );
}
export function InspectorQuickSettings({
  selection,
  onAdvanced,
}: { selection: InspectorSelectionState; onAdvanced: () => void }) {
  if (selection.kind === 'component')
    return (
      <ComponentSettings
        key={`${selection.component.id}:${selection.component.type}:${JSON.stringify(selection.component.state)}`}
        component={selection.component}
        onAdvanced={onAdvanced}
      />
    );
  if (selection.kind === 'wire')
    return (
      <WireSettings
        key={`${selection.wire.id}:${JSON.stringify(selection.wire)}`}
        wire={selection.wire}
        onAdvanced={onAdvanced}
      />
    );
  return (
    <div className="table-empty">
      <h3>Select one item to configure.</h3>
      <p>Choose a component or wire to edit its basic settings here.</p>
    </div>
  );
}
