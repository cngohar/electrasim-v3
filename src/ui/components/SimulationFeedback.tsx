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
  const profileStates = result?.electrical?.profileStates ?? result?.phasor?.profileStates;
  const outside = Object.entries(profileStates ?? {}).find(([, state]) =>
    ['undervoltage-off', 'overvoltage-off', 'outside-running-band'].includes(state),
  );
  if (!status || (status === 'converged' && !outside)) return null;
  if (!isCurrentSimulation(circuit, result)) return null;
  const diagnostics = result.electricalContract?.diagnostics ?? [];
  const missing = diagnostics.find(
    (diagnostic) =>
      diagnostic.code === 'mna-model-unsupported' ||
      diagnostic.code === 'phasor-model-unsupported' ||
      diagnostic.code === 'profile-model-unavailable',
  );
  const component = circuit.components.find(
    (item) => item.id === (outside?.[0] ?? missing?.componentId),
  );
  const label = component?.state.autoLabel ?? (component && COMPONENT_DEFS[component.type]?.label);
  const mismatch = result.readiness?.diagnostics.find(
    (diagnostic) => diagnostic.code === 'nominal-voltage-mismatch',
  );
  const operatingFinding =
    outside &&
    diagnostics.find(
      (d) =>
        d.componentId === outside[0] && ['load-undervoltage', 'load-overvoltage'].includes(d.code),
    );
  const heading = outside
    ? 'Outside operating voltage'
    : status === 'unsupported'
      ? 'Simulation unavailable'
      : status === 'invalid'
        ? 'Invalid circuit'
        : status === 'nonconverged'
          ? 'Calculation failed'
          : 'No driven calculation';
  const detail = outside
    ? `${label ?? 'A device'} is ${outside[1].replaceAll('-', ' ')} under its declared teaching profile. Readings describe the calculated terminal circuit; this does not predict damage.`
    : missing
      ? `${label ?? 'A component'} has no implemented or configured electrical behaviour model. Current, power and operation cannot be calculated.`
      : (diagnostics.find((diagnostic) => diagnostic.severity !== 'info')?.message ??
        'This drawing has no available electrical calculation.');
  return (
    <output
      className="table-simulation-feedback"
      aria-live="polite"
      data-simulation-feedback={outside ? 'operating-voltage' : status}
    >
      <span>
        <strong>{heading}</strong>
        <span className="table-feedback-line">{detail}</span>
        {mismatch && <span className="table-feedback-line">{mismatch.message}</span>}
        {operatingFinding && (
          <span className="table-feedback-line">{operatingFinding.message}</span>
        )}
      </span>
      <button type="button" onClick={() => useElectricalEditing.setState({ reviewOpen: true })}>
        View findings
      </button>
    </output>
  );
}
