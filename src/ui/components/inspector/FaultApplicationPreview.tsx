import {
  COMPONENT_DEFS,
  type Circuit,
  FAULT_REGISTRY,
  type FaultTarget,
  type FaultType,
  assessFaultTarget,
} from '@electrasim/domain';
import { FaultTargetApplicationDiagram } from './FaultTargetApplicationDiagram';
import { targetLabel } from './faultLabEvidence';

function summary(type: FaultType, coverage: 'supported' | 'not-assessed', target: FaultTarget) {
  if (coverage === 'not-assessed') {
    if (type === 'smooth-dc-residual')
      return 'DC residual waveform and device saturation are not modeled. No trip is predicted.';
    if (type === 'arc-fault')
      return 'Arc waveform detection and AFDD operation are not modeled. No arc is drawn.';
    if (type === 'switched-neutral')
      return 'This fault has no declared neutral mapping. Its electrical effect is not assessed.';
    if (type === 'live-to-earth')
      return 'Leakage impedance is unspecified. Current and protection response are not assessed.';
    return 'The target is applicable, but its electrical consequence is not assessed.';
  }
  if (type === 'open-circuit')
    return target.type === 'wire'
      ? 'This conductor is opened.'
      : 'The selected component conduction path is opened.';
  if (type === 'terminal-disconnect') return 'The selected named terminal connection is opened.';
  if (type === 'open-live' || type === 'open-neutral' || type === 'open-earth')
    return `The selected ${type.slice(5)} conductor path is opened.`;
  if (type === 'short-circuit')
    return 'The declared live–neutral pair is bridged; current depends on the circuit and source impedance.';
  if (type === 'earth-fault')
    return 'The declared live–PE path is bridged; protection response depends on the circuit.';
  if (type === 'reverse-polarity') return 'The selected live and neutral connections are swapped.';
  if (type === 'protection-forced-open')
    return 'This edit holds the protective contacts open; it is not a measured trip.';
  if (type === 'protection-bypass')
    return 'This edit routes current outside the declared sensed poles.';
  return 'Review the selected fault and its declared model.';
}

function unassessedHeading(type: FaultType) {
  if (type === 'switched-neutral') return 'Neutral mapping unavailable';
  if (type === 'live-to-earth') return 'Leakage impedance unspecified';
  if (type === 'smooth-dc-residual') return 'DC residual waveform not modeled';
  if (type === 'arc-fault') return 'Arc waveform and detection not modeled';
  return 'Electrical effect not assessed';
}

export function FaultApplicationPreview({
  circuit,
  target,
  type,
  applied = false,
  captured = false,
  unassessed = false,
}: {
  circuit: Circuit;
  target: FaultTarget;
  type: FaultType;
  applied?: boolean;
  captured?: boolean;
  unassessed?: boolean;
}) {
  const assessment = assessFaultTarget(circuit, type, target);
  const label = FAULT_REGISTRY[type].label;
  const subject = targetLabel(circuit, target);
  const componentId =
    target.type === 'port' ? target.componentId : target.type === 'component' ? target.id : null;
  const component = componentId ? circuit.components.find((item) => item.id === componentId) : null;
  const terminal =
    target.type === 'port' && component
      ? COMPONENT_DEFS[component.type]?.ports[target.portIndex]?.label
      : null;
  const status = assessment.coverage === 'supported' ? 'Modeled edit' : 'Effect not assessed';

  return (
    <section
      className="fault-application-preview"
      data-fault-application={type}
      data-fault-application-state={applied ? 'applied' : 'review'}
      aria-label={`${label} ${applied ? 'applied' : 'review'}`}
    >
      <header>
        <div>
          <small>{applied ? 'FAULT APPLIED' : 'APPLICATION REVIEW'}</small>
          <strong>{label}</strong>
          <span>
            {subject}
            {terminal ? ` · ${terminal} terminal` : ''}
          </span>
        </div>
        <span data-coverage={unassessed ? 'not-assessed' : assessment.coverage}>
          {unassessed ? 'Result not assessed' : status}
        </span>
      </header>
      {assessment.coverage === 'not-assessed' && (
        <div className="fault-application-unassessed" role="note">
          <b>{unassessedHeading(type)}</b>
        </div>
      )}
      <FaultTargetApplicationDiagram
        circuit={circuit}
        target={target}
        type={type}
        coverage={assessment.coverage}
      />
      <p>{summary(type, unassessed ? 'not-assessed' : assessment.coverage, target)}</p>
      <small>
        {applied
          ? captured
            ? unassessed
              ? 'A fresh run exists, but this electrical consequence remains unassessed.'
              : 'The cause is applied. See Readings for accepted circuit results.'
            : 'The cause is applied. Run the simulator to assess the resulting circuit.'
          : 'Review only. No circuit values or topology change until you apply this edit.'}
      </small>
    </section>
  );
}
