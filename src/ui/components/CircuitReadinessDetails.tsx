import { COMPONENT_DEFS } from '@electrasim/domain';
import {
  needsDiagnosticRun,
  ordinaryRunBlocked,
  readinessLabel,
} from '@electrasim/domain/core/readinessPresentation';
import { calculationLabel, operationLabel } from '@electrasim/domain/simulation/presentation';
import { getSimulationLimitations } from '@electrasim/domain/simulationCoverage';
import { useCircuitStore } from '../../store/circuitStore';
import { useElectricalEditing } from '../../store/electricalEditing';
import { useCircuitDocument, useCircuitReadiness } from '../../store/electricalReadiness';
import { useUiStore } from '../../store/uiStore';

export function CircuitReadinessDetails() {
  const circuit = useCircuitDocument();
  const readiness = useCircuitReadiness();
  const diagnosisActive = useUiStore((s) => s.diagnosisActive);
  const result = useUiStore((s) => s.simResult);
  const running = useUiStore((s) => s.simRunning);
  const limitations = getSimulationLimitations(circuit);
  const focus = (componentId: string) => {
    useCircuitStore.getState().selectComponent(componentId);
    useUiStore.getState().setInspectorCollapsed(false);
    useUiStore.getState().setActiveInspectorTab('properties');
    useElectricalEditing.setState({ reviewOpen: false });
    if (window.innerWidth < 640) useElectricalEditing.setState({ inspectComponentId: componentId });
  };
  return (
    <section
      data-circuit-readiness={readiness.topology}
      className="space-y-3 text-xs text-slate-700 dark:text-slate-200"
    >
      <output className="block font-semibold">{readinessLabel(readiness, diagnosisActive)}</output>
      <p>
        Readiness describes the connections and declared ratings. Operation and standards compliance
        remain unassessed until the applicable checks run.
      </p>
      <p>
        A live conductor can carry zero current. Voltage across a load, conductor potential, current
        and capacity describe different things.
      </p>
      {readiness.diagnostics.map((d, index) => (
        <p key={`${d.code}-${index}`}>
          {d.message}
          {d.componentId && (
            <button className="ml-2 underline" type="button" onClick={() => focus(d.componentId!)}>
              Inspect {d.componentId}
            </button>
          )}
        </p>
      ))}
      {readiness.loadPaths.map((p) => (
        <p key={p.branchId}>
          {p.componentId}:{' '}
          {p.state === 'open'
            ? 'Open load path; current and voltage require an available diagnostic calculation.'
            : 'Complete source path; operating measurements still require calculation.'}
        </p>
      ))}
      <ul className="max-h-64 space-y-2 overflow-y-auto">
        {readiness.groups
          .filter((g) => g.result.status !== 'compatible' || g.result.reasons.length)
          .map((g) => {
            const c = circuit.components.find((c) => c.id === g.componentId);
            return (
              <li key={`${g.componentId}-${g.groupId}`}>
                <button
                  type="button"
                  className="font-semibold underline"
                  onClick={() => focus(g.componentId)}
                >
                  {COMPONENT_DEFS[c?.type ?? '']?.label ?? g.componentId} · {g.componentId} ·{' '}
                  {g.groupId}
                </button>
                <p>{g.result.status}</p>
                {g.result.reasons.map((r, i) => (
                  <p key={`${r.code}-${i}`}>{r.message}</p>
                ))}
              </li>
            );
          })}
      </ul>
      {limitations.map((l, i) => (
        <p key={`${l.code}-${l.componentId}-${i}`}>{l.message}</p>
      ))}
      {result && (
        <div
          data-calculation-status={result.electricalContract?.status ?? 'unavailable'}
          className="space-y-2"
        >
          <p>
            {calculationLabel(result)}. {operationLabel(result)}. Standards assessment: unassessed.
          </p>
          {result.legacyObservation && <p>{result.legacyObservation.reason}</p>}
          {result.electricalContract?.diagnostics.map((diagnostic, index) => (
            <p key={`${diagnostic.code}-${index}`}>{diagnostic.message}</p>
          ))}
          {result.electricalContract?.coverage
            .filter((item) => item.aspect !== 'topology')
            .map((item, index) => (
              <p key={`${item.subjectId}-${item.aspect}-${index}`}>
                {item.aspect}: {item.status}. {item.reason}
              </p>
            ))}
        </div>
      )}
      {!running && !ordinaryRunBlocked(readiness) && (
        <button
          type="button"
          className="rounded-lg bg-blue-600 px-3 py-2 text-white"
          onClick={() => {
            needsDiagnosticRun(readiness)
              ? useUiStore.getState().startDiagnosticRun()
              : useUiStore.getState().setSimRunning(true);
            if (useUiStore.getState().simRunning)
              useElectricalEditing.setState({ reviewOpen: false });
          }}
        >
          {needsDiagnosticRun(readiness) ? 'Run diagnostic' : 'Run with findings'}
        </button>
      )}
    </section>
  );
}
