import { readinessLabel } from '@electrasim/domain/core/readinessPresentation';
import { resolveDocumentSupply } from '@electrasim/domain/core/supplies';
import { supplyDescription } from '@electrasim/domain/core/supplyEditing';
import { useCircuitStore } from '../../store/circuitStore';
import {
  requestSupplyEdit,
  useConfigurationLockReason,
  useElectricalEditing,
} from '../../store/electricalEditing';
import { useCircuitReadiness } from '../../store/electricalReadiness';
import { SimulationFeedback } from './SimulationFeedback';

/** One compact Circuit entry owns supply and preflight; selection lives in Inspector. */
export function CircuitControls() {
  const supply = useCircuitStore((s) => s.supply);
  const globalVoltage = useCircuitStore((s) => s.globalVoltage);
  const locked = useConfigurationLockReason();
  const readiness = useCircuitReadiness();
  const request = useElectricalEditing((s) => s.request);
  const profile = resolveDocumentSupply({ supply, globalVoltage });
  const label = readinessLabel(readiness);
  const source = supplyDescription(profile);
  const model = profile.model;
  const sourceLabel = `${model.voltage} V ${model.kind === 'dc' ? 'DC' : `AC ${model.frequencyHz} Hz${model.kind === 'ac-three-phase' ? ' · 3φ L-N' : ''}`}`;
  return (
    <>
      <fieldset
        className="table-circuit-controls table-surface"
        aria-label="Circuit supply and readiness"
        data-circuit-controls
        data-workspace-context
        data-canvas-occluder
      >
        <button
          type="button"
          aria-label="Supply"
          aria-describedby="circuit-supply-description"
          aria-expanded={request?.kind === 'supply'}
          aria-haspopup="dialog"
          title={locked ?? 'Click to change Global Supply Voltage'}
          disabled={!!locked}
          onClick={() => requestSupplyEdit()}
        >
          <span>{sourceLabel}</span>
        </button>
        <button
          type="button"
          data-readiness-status={readiness.topology}
          title="Review circuit readiness and compatibility"
          onClick={() => useElectricalEditing.setState({ reviewOpen: true })}
        >
          <span className="circuit-readiness-full">{label}</span>
          <span className="circuit-readiness-compact">{label.split(' · ')[0]}</span>
          <small>Review circuit</small>
        </button>
        <span id="circuit-supply-description" className="sr-only">
          {source}
        </span>
      </fieldset>
      <div className="table-calculation-feedback" data-canvas-occluder>
        <SimulationFeedback />
      </div>
    </>
  );
}
