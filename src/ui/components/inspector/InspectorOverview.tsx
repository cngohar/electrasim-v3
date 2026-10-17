import { COMPONENT_DEFS, type SimulationResult } from '@electrasim/domain';
import {
  supplyAtTarget,
  supplyDescription,
  supplyTargetForComponent,
} from '@electrasim/domain/core/supplyEditing';
import { useState } from 'react';
import { useCircuitStore, useUiStore } from '../../../store';
import { ComponentPreview } from '../ComponentPreview';
import { ComponentSpecs } from '../ComponentSpecs';
import { Modal } from '../Modal';
import { getComponentImage } from '../componentImages';
import { SwitchOperation } from './SwitchOperation';
import { WirePropertiesSummary } from './WirePropertiesSummary';
import type { InspectorSelectionState } from './useInspectorSelectionState';

export function InspectorOverview({
  selection,
  result,
  onAdvanced,
}: {
  selection: InspectorSelectionState;
  result: SimulationResult | null;
  onAdvanced: () => void;
}) {
  const circuit = useCircuitStore((s) => s);
  const [photoOpen, setPhotoOpen] = useState(false);
  if (selection.kind === 'empty')
    return (
      <div className="table-empty">
        <h3>A little space to think.</h3>
        <p>Select a component or wire to see its properties, readings and basic settings.</p>
        <button type="button" onClick={() => useUiStore.getState().runCircuitValidation()}>
          Check this circuit
        </button>
      </div>
    );
  if (selection.kind === 'multi-component')
    return (
      <div className="table-overview">
        <h3>{selection.count} components</h3>
        <p>
          Drag a selected component to move the group. Right-click for inline alignment,
          distribution and rotation.
        </p>
        <button type="button" onClick={onAdvanced}>
          Group and selection actions
        </button>
      </div>
    );
  if (selection.kind === 'wire') {
    const wire = selection.wire;
    const endpoint = (id: string, port: number) => {
      const c = circuit.components.find((component) => component.id === id);
      return `${c?.state.autoLabel || COMPONENT_DEFS[c?.type ?? '']?.label || id} · ${COMPONENT_DEFS[c?.type ?? '']?.ports[port]?.label ?? port}`;
    };
    return (
      <div className="table-overview">
        <p className="table-kicker">Conductor</p>
        <h3>{wire.label || `Wire ${wire.id.slice(0, 8)}`}</h3>
        <WirePropertiesSummary wire={wire} />
        <section>
          <h4>Connections</h4>
          <p>{endpoint(wire.fromComponentId, wire.fromPortIndex)}</p>
          <p>→ {endpoint(wire.toComponentId, wire.toPortIndex)}</p>
        </section>
        {(wire.fault || wire.isBusted) && (
          <p className="table-warning">
            {wire.isBusted
              ? 'Damaged conductor. Replace after stopping.'
              : `Injected fault: ${wire.fault}`}
          </p>
        )}
        <button type="button" onClick={onAdvanced}>
          Detailed wire settings and repair
        </button>
      </div>
    );
  }
  const component = selection.component;
  const def = COMPONENT_DEFS[component.type];
  if (!def) return null;
  const sourceTarget = supplyTargetForComponent(circuit, component.id);
  const source = sourceTarget && supplyAtTarget(circuit, sourceTarget);
  const photo = getComponentImage(component.type, def.category);
  const operated = result?.energizedComponents.has(component.id);
  return (
    <div className="table-overview">
      <div className="table-device-summary">
        <ComponentPreview type={component.type} label={def.label} />
        <div>
          <p className="table-kicker">{def.category}</p>
          <h3>{component.state.autoLabel || def.label}</h3>
          <span>
            {component.state.isBlown
              ? 'Damaged'
              : component.state.isTripped
                ? 'Tripped'
                : result
                  ? operated
                    ? 'Energized'
                    : 'Idle'
                  : 'No current reading'}
          </span>
        </div>
      </div>
      <p>{def.description || def.label}</p>
      <SwitchOperation component={component} result={result} />
      <dl>
        {source && (
          <div>
            <dt>Source output</dt>
            <dd>{supplyDescription(source)}</dd>
          </div>
        )}
      </dl>
      <ComponentSpecs type={component.type} component={component} circuit={circuit} />
      <section>
        <h4>Terminals</h4>
        <div className="table-terminal-list">
          {def.ports.map((port, i) => (
            <span key={`${port.label}-${i}`}>
              <b>{port.label}</b>
              <small>{port.type}</small>
            </span>
          ))}
        </div>
      </section>
      <button type="button" className="table-reference-photo" onClick={() => setPhotoOpen(true)}>
        <img src={photo} alt={`${def.label} reference`} referrerPolicy="no-referrer" />
        <span>
          <b>Real component reference</b>
          <small>Representative photo · click to enlarge</small>
        </span>
      </button>
      <button type="button" onClick={onAdvanced}>
        Detailed model settings
      </button>
      <button
        type="button"
        className="table-text-action"
        onClick={() => useUiStore.getState().setActiveComponentInfoType(component.type)}
      >
        Technical specifications
      </button>
      <Modal
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        title={`${def.label} · reference photo`}
        description="Representative appearance. Terminal layout and ratings follow the simulator model."
        widthClass="max-w-xl"
      >
        <img
          className="table-enlarged-photo"
          src={photo}
          alt={def.label}
          referrerPolicy="no-referrer"
        />
      </Modal>
    </div>
  );
}
