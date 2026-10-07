/** Current solved telemetry; missing values stay unavailable. */
import { COMPONENT_DEFS, type ComponentInstance, type SimulationResult } from '@electrasim/domain';
import { isCurrentSimulation } from '@electrasim/domain/simulationEvidence';
import { useCircuitStore } from '../../../store';
import { ElectricalReadings } from './ElectricalReadings';

export function InspectorAnalyticsView({
  simResult,
  selectedComp,
}: { simResult: SimulationResult | null; selectedComp?: ComponentInstance | null }) {
  const circuit = useCircuitStore((s) => s);
  const current = isCurrentSimulation(circuit, simResult) ? simResult : null;
  const loads = circuit.components.filter((c) => COMPONENT_DEFS[c.type]?.isLoad);
  const targets = selectedComp ? [selectedComp] : loads;
  return (
    <div className="p-3 space-y-3 text-xs" aria-label="Calculated analytics">
      <h3 className="font-semibold">Current calculated readings</h3>
      <p>
        Readings use named terminal pairs and actual branch currents. Independent sources keep
        separate references.
      </p>
      {!current && <p>Run the current circuit to calculate readings.</p>}
      {targets.map((component) => (
        <div key={component.id}>
          <h4 className="font-semibold">
            {component.state.autoLabel ?? COMPONENT_DEFS[component.type]?.label ?? component.type}
          </h4>
          <ElectricalReadings componentId={component.id} result={current} />
        </div>
      ))}
      <p>
        Waveform, power factor, temperature and accumulated energy measurements remain unavailable.
      </p>
    </div>
  );
}
