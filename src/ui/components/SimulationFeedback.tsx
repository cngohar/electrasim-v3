import { COMPONENT_DEFS } from '@electrasim/domain';
import { isCurrentSimulation } from '@electrasim/domain/simulationEvidence';
import { useElectricalEditing } from '../../store/electricalEditing';
import { useCircuitDocument } from '../../store/electricalReadiness';
import { useUiStore } from '../../store/uiStore';

/** Unavailable calculations need visible feedback even with the Console closed. */
export function SimulationFeedback() {
  const circuit = useCircuitDocument();
  const result = useUiStore((state) => state.simResult);
  const status = result?.electrical?.status ?? result?.phasor?.status;
  if (!status || status === 'converged') return null;
  if (!isCurrentSimulation(circuit, result)) return null;
  const diagnostics = result.electricalContract?.diagnostics ?? [];
  const missing = diagnostics.find(
    (diagnostic) =>
      diagnostic.code === 'mna-model-unsupported' || diagnostic.code === 'phasor-model-unsupported',
  );
  const component = circuit.components.find((item) => item.id === missing?.componentId);
  const label = component?.state.autoLabel ?? (component && COMPONENT_DEFS[component.type]?.label);
  const mismatch = result.readiness?.diagnostics.find(
    (diagnostic) => diagnostic.code === 'nominal-voltage-mismatch',
  );
  const heading =
    status === 'unsupported'
      ? 'Simulation unavailable'
      : status === 'invalid'
        ? 'Invalid circuit'
        : status === 'nonconverged'
          ? 'Calculation failed'
          : 'No driven calculation';
  const detail = missing
    ? `${label ?? 'A component'} has no implemented or configured electrical behaviour model. Current, power and operation cannot be calculated.`
    : (diagnostics.find((diagnostic) => diagnostic.severity !== 'info')?.message ??
      'This drawing has no available electrical calculation.');
  return (
    <output
      className="table-simulation-feedback"
      aria-live="polite"
      data-simulation-feedback={status}
    >
      <span>
        <strong>{heading}</strong>
        <span className="table-feedback-line">{detail}</span>
        {mismatch && <span className="table-feedback-line">{mismatch.message}</span>}
      </span>
      <button type="button" onClick={() => useElectricalEditing.setState({ reviewOpen: true })}>
        View findings
      </button>
    </output>
  );
}
