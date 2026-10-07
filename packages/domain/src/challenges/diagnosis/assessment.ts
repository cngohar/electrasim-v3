import { ELECTRICAL_MODEL_VERSION } from '../../core/contracts';
import { CONTROL_ENGINE_VERSION } from '../../core/controlStep';
import { DIMMING_ENGINE_VERSION } from '../../core/dimming';
import { exerciseSupplyIssue } from '../../core/exerciseSupply';
import { MNA_ENGINE_VERSION } from '../../core/mna';
import { normalizeCircuitDocument } from '../../core/normalize';
import { resolveWireProperties } from '../../core/wireProperties';
import { circuitRevision, hasOperationEvidence } from '../../simulationEvidence';
import type { Circuit, SimulationResult } from '../../types';
import { GENERATOR_VERSION } from '../generator/seed';
import type { DiagnosisScenario } from './scenario';

/** Bump when difficulty, rage presentation or scoring policy changes. */
export const DIAGNOSIS_PROFILE_VERSION = 'diagnosis-profile-score-1';

export interface DiagnosisAssessment {
  version: 1;
  modelVersion: string;
  engineVersion: string;
  profileVersion: string;
  healthyRevision: string;
  faultedRevision: string;
}

/** Assessment identity is pinned to the authored snapshots, not just the seed.
 * Earlier work is retained for inspection; it cannot silently earn new points. */
export function diagnosisAssessmentIssue(scenario: DiagnosisScenario): string | null {
  const a = scenario.assessment;
  return scenario.generatorVersion !== GENERATOR_VERSION ||
    !a ||
    a.version !== 1 ||
    a.modelVersion !== ELECTRICAL_MODEL_VERSION ||
    a.profileVersion !== DIAGNOSIS_PROFILE_VERSION ||
    ![CONTROL_ENGINE_VERSION, DIMMING_ENGINE_VERSION, MNA_ENGINE_VERSION].includes(
      a.engineVersion,
    ) ||
    a.healthyRevision !== circuitRevision(scenario.healthyCircuit) ||
    a.faultedRevision !== circuitRevision(scenario.faultedCircuit)
    ? 'This saved exercise uses an earlier or changed assessment. Your work is preserved; start a current exercise to earn a result.'
    : null;
}

/** Restored bounded teaching operation, never an installation safety verdict.
 * General approximation prose is allowed; actual electrical findings are not. */
export function hasDiagnosisEvidence(circuit: Circuit, result: SimulationResult): boolean {
  return (
    hasOperationEvidence(circuit, result) &&
    !!result.electrical &&
    result.errors.length === 0 &&
    !result.electrical.diagnostics.some(
      (d) => d.severity === 'error' || d.severity === 'warning',
    ) &&
    result.faultsCleared === true &&
    (result.activeInjectedFaults?.length ?? 0) === 0 &&
    (result.trippedComponents?.length ?? 0) === 0 &&
    (result.blownComponents?.length ?? 0) === 0 &&
    (result.bustedWires?.size ?? 0) === 0 &&
    !circuit.components.some((c) => c.state.isBlown || c.state.isTripped) &&
    !circuit.wires.some((w) => w.isBusted)
  );
}

function wireSignatures(circuit: Circuit): string[] {
  const byId = new Map(circuit.components.map((c) => [c.id, c]));
  return circuit.wires
    .map((w) => {
      const ends = [
        `${w.fromComponentId}:${w.fromPortIndex}`,
        `${w.toComponentId}:${w.toPortIndex}`,
      ].sort();
      const { provenance: _provenance, ...properties } = resolveWireProperties(w, byId);
      return JSON.stringify({ ends, properties, damageModel: w.damageModel });
    })
    .sort();
}

export function diagnosisEditIssue(authored: Circuit, submitted: Circuit): string | null {
  const supply = exerciseSupplyIssue(authored, submitted);
  if (supply) return supply;
  const expected = normalizeCircuitDocument(authored, false);
  const actual = normalizeCircuitDocument(submitted, false);
  const deviceRevision = (circuit: Circuit) =>
    circuitRevision({
      ...circuit,
      wires: [],
      faults: [],
      components: circuit.components.map((c) => {
        const {
          on: _on,
          speed: _speed,
          fault: _fault,
          isBlown: _blown,
          isTripped: _tripped,
          blownReason: _blownReason,
          tripReason: _tripReason,
          ...state
        } = c.state;
        return { ...c, state };
      }),
    });
  if (deviceRevision(expected) !== deviceRevision(actual))
    return 'Restore the authored devices, identities, ratings and declared models before submitting a repair.';
  const wanted = wireSignatures(expected);
  const have = wireSignatures(actual);
  if (JSON.stringify(wanted) !== JSON.stringify(have))
    return 'Restore every authored connection and conductor property; a replacement cable must join the same terminals.';
  return null;
}

const equalNumber = (a: number | null, b: number | null) =>
  a !== null &&
  b !== null &&
  Number.isFinite(a) &&
  Number.isFinite(b) &&
  Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));

/** Compare actual terminal-pair operating points, including the same load ids.
 * Counts alone allow a different branch to stand in for the authored load. */
export function diagnosisOperatingPointIssue(
  baseline: SimulationResult,
  current: SimulationResult,
  loadIds: readonly string[],
): string | null {
  if (baseline.electricalContract?.engineVersion !== current.electricalContract?.engineVersion)
    return 'The calculation engine changed; this repair cannot be compared with its baseline.';
  for (const id of loadIds) {
    const before = baseline.electrical?.loads.find((p) => p.componentId === id);
    const after = current.electrical?.loads.find((p) => p.componentId === id);
    if (
      !before ||
      !after ||
      before.model !== after.model ||
      after.compatibility.status === 'incompatible' ||
      before.compatibility.status !== after.compatibility.status ||
      JSON.stringify([...before.sourceIds].sort()) !==
        JSON.stringify([...after.sourceIds].sort()) ||
      !equalNumber(before.terminalVoltageVolts, after.terminalVoltageVolts) ||
      !equalNumber(before.currentAmps, after.currentAmps) ||
      !equalNumber(before.powerWatts, after.powerWatts)
    )
      return 'The authored load operating point has not recovered (terminal voltage, current or power differs).';
  }
  return null;
}

export function diagnosisRecoveryIssue(
  scenario: DiagnosisScenario,
  userCircuit: Circuit,
  baseline: SimulationResult,
  current: SimulationResult,
): string | null {
  return (
    diagnosisAssessmentIssue(scenario) ??
    diagnosisEditIssue(scenario.healthyCircuit, userCircuit) ??
    (!hasDiagnosisEvidence(scenario.healthyCircuit, baseline) ||
    scenario.assessment?.engineVersion !== baseline.electricalContract?.engineVersion
      ? 'The authored baseline has no current supported operation evidence.'
      : null) ??
    (!hasDiagnosisEvidence(userCircuit, current)
      ? 'The circuit still has a fault, trip, damage or an unassessed electrical result.'
      : null) ??
    diagnosisOperatingPointIssue(baseline, current, scenario.loadComponentIds)
  );
}
