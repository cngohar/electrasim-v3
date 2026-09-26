/**
 * Diagnosis evaluation (plan §16, §41; Phase D steps 6–7, Phase F step 1).
 *
 * Two things must both be true before a diagnosis exercise is finished:
 *
 *   1. the learner correctly named **what** is wrong and **where** (§15), and
 *   2. the circuit has actually been **repaired** and proven so by simulation.
 *
 * §16 is explicit that a correct guess alone is not completion — otherwise a
 * learner could pick the right radio button on a still-broken installation and
 * be told they had fixed it. That is why §41's truth table has *three* states,
 * not two:
 *
 *   | diagnosis        | repair            | verdict      |
 *   |------------------|-------------------|--------------|
 *   | correct type+loc | circuit recovered | success      |
 *   | correct type+loc | fault still live  | incomplete   |
 *   | anything else    | —                 | failure      |
 *
 * `incomplete` is the pedagogically interesting one: the learner has *found*
 * the fault but not *cleared* it, so the UI should keep them on the same
 * scenario and ask for the repair rather than resetting the exercise.
 *
 * ── Several faults (plan §26 "multiple faults", §27 Rage 3/4) ───────────────
 * A scenario carries a *list* of faults, so a submission is graded against the
 * whole list rather than against one answer. Only one rule had to be settled:
 * what to say to a learner who has correctly named one fault out of two. It is
 * not `failure` — they were right, and telling them "that is not the fault on
 * this circuit" would be untrue, which §26 forbids as squarely as a fake
 * ammeter reading. It is `incomplete`: the same state as a correct diagnosis on
 * an unrepaired circuit, meaning "you are right, the job is not finished".
 * `failure` is reserved for an answer that names nothing that is actually
 * wrong. On a single-fault scenario this collapses to exactly the old
 * behaviour, table above unchanged.
 *
 * Pure: no store access, no persistence, no timers.
 */

import { isFaultResolved } from '../../faults';
import { simulate } from '../../simulation';
import type { Circuit, FaultType, SimulationResult } from '../../types';
import { describeFaultTarget } from '../faults/injection';
import { labelById } from '../faults/labels';
import {
  describeRecoveryGap,
  describeStructuralGap,
  describeSymptom,
  diffSymptom,
} from '../faults/verification';
import type { DiagnosisScenario } from './scenario';

/** §41 verdict — note the third state. */
export type DiagnosisVerdict = 'success' | 'incomplete' | 'failure';

/** Which half of the answer was wrong (drives targeted feedback). */
export interface DiagnosisAnswer {
  /** What the learner says is wrong (§15A). */
  faultType: FaultType;
  /** Where the learner says it is (§15B), as a `locationChoices` key. */
  locationKey: string;
}

/** Per-fault grading detail — one entry per injected fault, same order. */
export interface DiagnosisFaultResult {
  faultId: string;
  type: FaultType;
  locationKey: string;
  /** Named correctly at some point in this run (including this submission). */
  identified: boolean;
  /** Named by *this* submission, having not been named before. */
  newlyIdentified: boolean;
  /** Gone from the learner's circuit, per the existing fault model. */
  cleared: boolean;
}

export interface DiagnosisEvaluation {
  verdict: DiagnosisVerdict;
  /** Convenience: `verdict === 'success'`. */
  success: boolean;

  /** Did the submitted type match *some* injected fault? */
  typeCorrect: boolean;
  /** Did the submitted location match *some* injected fault? */
  locationCorrect: boolean;
  /** Every fault has now been named — the §41 "correct diagnosis" column. */
  diagnosisCorrect: boolean;

  /** Have all the injected faults gone from the circuit? */
  faultCleared: boolean;
  /** Does the repaired circuit behave like the healthy one again? */
  recovered: boolean;
  /** Why recovery was rejected, when it was. */
  recoveryGap: string | null;

  /** Per-fault detail, in `scenario.faults` order. */
  faults: DiagnosisFaultResult[];
  /** The fault this submission named, if any (already-found ones included). */
  matchedFaultId: string | null;
  /** True when this submission named a fault that had not been named before. */
  progressed: boolean;
  /** Ids named so far, for the caller to carry into the next submission. */
  identifiedFaultIds: string[];
  /** How many faults are still unnamed. */
  outstandingCount: number;
  /** Total injected faults — 1 for an ordinary exercise. */
  faultCount: number;

  /** Simulation of the circuit as submitted. */
  simulation: SimulationResult;
  /** Short status line for the panel. */
  summary: string;
  /** Actionable next step — never names the fault unless already solved. */
  guidance: string;
}

export interface EvaluateDiagnosisOptions {
  appMode?: 'basic' | 'pro';
  /**
   * Faults the learner has already named correctly earlier in this run.
   *
   * A multi-fault scenario is answered one fault at a time, so the grader has
   * to be told what has been established already; without it the learner could
   * never finish, because a submission only ever carries one (type, location)
   * pair. Ignored ids (a stale record, a regenerated scenario) are dropped
   * rather than trusted.
   */
  identifiedFaultIds?: readonly string[];
}

/**
 * Grade one submission.
 *
 * `userCircuit` is the learner's working copy — they may have cleared the
 * fault, deleted and re-run a cable, or swapped a device. Any of those count
 * as a repair provided the simulator agrees the installation is healthy again;
 * we deliberately do *not* require them to have used the "clear fault" button.
 */
export function evaluateDiagnosis(
  scenario: DiagnosisScenario,
  userCircuit: Circuit,
  answer: DiagnosisAnswer,
  options: EvaluateDiagnosisOptions = {},
): DiagnosisEvaluation {
  const appMode = options.appMode ?? 'pro';
  const simulation = simulate(userCircuit, { appMode });

  const known = new Set(scenario.faults.map((entry) => entry.fault.id));
  // Drop anything that is not a fault of *this* scenario, so a stale resume
  // record can never mark a fault as found that was never asked about.
  const already = new Set((options.identifiedFaultIds ?? []).filter((id) => known.has(id)));

  /**
   * Which fault does this answer name?
   *
   * A fault is named only when *both* halves match — §15 asks two questions
   * and both must be right. Unnamed faults are matched first so that, on the
   * pathological scenario with two identical faults at one location, a repeat
   * submission still makes progress rather than re-scoring the same one.
   */
  const matches = (entry: DiagnosisScenario['faults'][number]) =>
    entry.fault.type === answer.faultType && entry.locationKey === answer.locationKey;
  const matched =
    scenario.faults.find((entry) => matches(entry) && !already.has(entry.fault.id)) ??
    scenario.faults.find(matches) ??
    null;
  // Captured before `already` is updated: re-submitting a fault the learner
  // has already named is not progress, and must not be scored as such.
  const newlyIdentifiedId = matched && !already.has(matched.fault.id) ? matched.fault.id : null;
  if (matched) already.add(matched.fault.id);

  const faults: DiagnosisFaultResult[] = scenario.faults.map((entry) => ({
    faultId: entry.fault.id,
    type: entry.fault.type,
    locationKey: entry.locationKey,
    identified: already.has(entry.fault.id),
    newlyIdentified: entry.fault.id === newlyIdentifiedId,
    cleared: isFaultResolved(entry.fault, userCircuit, simulation),
  }));

  // Half-marks reporting, so the panel can say "right kind, wrong place"
  // without implying which fault it is talking about.
  const typeCorrect = scenario.faults.some((entry) => entry.fault.type === answer.faultType);
  const locationCorrect = scenario.faults.some((entry) => entry.locationKey === answer.locationKey);
  const diagnosisCorrect = faults.every((result) => result.identified);
  const outstandingCount = faults.filter((result) => !result.identified).length;

  // Repair is judged from three independent angles, because each alone is
  // foolable: `isFaultResolved` would accept a circuit "fixed" by deleting the
  // load; a behavioural diff would accept a severed earth; a structural diff
  // would accept a reconnected-but-still-faulted cable.
  const faultCleared = faults.every((result) => result.cleared);
  const baseline = simulate(scenario.healthyCircuit, { appMode });
  // Behaviour *and* structure: some conductors (a CPC, a redundant strapper)
  // carry no current in normal service, so cutting them out is invisible to a
  // behavioural diff yet is emphatically not a repair.
  const recoveryGap =
    describeRecoveryGap(baseline, simulation) ??
    describeStructuralGap(scenario.healthyCircuit, userCircuit);
  const recovered = faultCleared && recoveryGap === null;

  // `failure` means "you named something that is not wrong". Naming a real
  // fault while others remain is `incomplete` — see the header note.
  const verdict: DiagnosisVerdict =
    matched === null ? 'failure' : diagnosisCorrect && recovered ? 'success' : 'incomplete';

  const progressed = matched !== null && faults.some((result) => result.newlyIdentified);

  return {
    verdict,
    success: verdict === 'success',
    typeCorrect,
    locationCorrect,
    diagnosisCorrect,
    faultCleared,
    recovered,
    recoveryGap: faultCleared ? recoveryGap : 'the original fault is still present',
    faults,
    matchedFaultId: matched?.fault.id ?? null,
    progressed,
    identifiedFaultIds: faults.filter((r) => r.identified).map((r) => r.faultId),
    outstandingCount,
    faultCount: faults.length,
    simulation,
    summary: summarise(verdict, typeCorrect, locationCorrect, diagnosisCorrect, outstandingCount),
    guidance: guide(scenario, {
      verdict,
      typeCorrect,
      locationCorrect,
      diagnosisCorrect,
      faultCleared,
      recoveryGap,
      faults,
      outstandingCount,
    }),
  };
}

function summarise(
  verdict: DiagnosisVerdict,
  typeCorrect: boolean,
  locationCorrect: boolean,
  diagnosisCorrect: boolean,
  outstandingCount: number,
): string {
  if (verdict === 'success') return 'Faults correctly identified and repaired.';
  if (verdict === 'incomplete') {
    if (!diagnosisCorrect) {
      return outstandingCount === 1
        ? 'That fault is real — and there is one more.'
        : `That fault is real — and there are ${outstandingCount} more.`;
    }
    return 'Correct diagnosis — the circuit is not repaired yet.';
  }
  if (typeCorrect) return 'Right kind of fault, wrong place.';
  if (locationCorrect) return 'Right place, wrong kind of fault.';
  return 'That is not the fault on this circuit.';
}

/**
 * What to do next.
 *
 * On a wrong answer this must not leak the correct one (§14/§17 — hints are
 * the only sanctioned disclosure channel, and they are rationed). Once a fault
 * has been correctly named it is no longer a secret, so the repair guidance
 * can name *that* target explicitly — but never an outstanding one.
 */
function guide(
  scenario: DiagnosisScenario,
  state: {
    verdict: DiagnosisVerdict;
    typeCorrect: boolean;
    locationCorrect: boolean;
    diagnosisCorrect: boolean;
    faultCleared: boolean;
    recoveryGap: string | null;
    faults: DiagnosisFaultResult[];
    outstandingCount: number;
  },
): string {
  if (state.verdict === 'success') return 'The installation is working again. Well done.';

  if (state.verdict === 'incomplete') {
    // Name only what has been earned: the faults the learner has identified.
    const found = scenario.faults.filter((entry) =>
      state.faults.some((result) => result.faultId === entry.fault.id && result.identified),
    );
    const where = found
      .map((entry) => describeFaultTarget(scenario.healthyCircuit, entry.fault.target))
      .join(' and ');

    if (!state.diagnosisCorrect) {
      const remaining =
        state.outstandingCount === 1
          ? 'Something else on this installation is also wrong — keep testing.'
          : `${state.outstandingCount} more faults are still on this installation — keep testing.`;
      return `You have found ${where}. ${remaining}`;
    }
    if (!state.faultCleared) {
      return `You have found it: ${where}. Now clear the fault and restore that connection.`;
    }
    return `The fault is cleared but the circuit still is not right — ${state.recoveryGap}.`;
  }

  if (state.typeCorrect) {
    return 'The fault type is right. Re-check which part of the circuit is affected.';
  }
  if (state.locationCorrect) {
    return 'You are looking in the right place. Re-check what has actually failed there.';
  }
  return 'Re-read the symptom and trace the circuit again — use a hint if you are stuck.';
}

// ---------------------------------------------------------------------------
// Live symptom (plan §14, §26 compound scenarios)
// ---------------------------------------------------------------------------

/**
 * What the installation is doing **right now**, in the learner's own circuit.
 *
 * The scenario's `complaint` is written once at build time from the circuit as
 * it was first handed over. That is the right thing to show at the start, and
 * the wrong thing to show for ever: the moment the learner clears a fault the
 * complaint becomes a description of the past.
 *
 * On a compound scenario (§26) that is not merely stale, it defeats the whole
 * exercise. The entire point of a compound fault is that repairing the first
 * one *changes* the symptom and reveals the second — and a learner staring at
 * a frozen "the kitchen light is dead" has no way to notice that the complaint
 * is now a different one. They would be told, in effect, that their correct
 * repair had achieved nothing.
 *
 * So the panel re-derives this after every change to the circuit. It is the
 * same measurement the scenario builder made (`diffSymptom` against the
 * healthy baseline), applied to the live circuit instead of the faulted one,
 * and phrased with the same deliberately-vague `describeSymptom` — so it can
 * report *that* something is wrong and *what is seen*, and still never name
 * the fault or its location. §14 holds throughout.
 *
 * Returns `null` when the installation is behaving correctly, which the panel
 * renders as "everything is working" rather than as an empty complaint.
 */
export function observeSymptom(
  scenario: DiagnosisScenario,
  userCircuit: Circuit,
  options: { appMode?: 'basic' | 'pro' } = {},
): { complaint: string; healthy: boolean } {
  const appMode = options.appMode ?? 'pro';
  const baseline = simulate(scenario.healthyCircuit, { appMode });
  const current = simulate(userCircuit, { appMode });
  const symptom = diffSymptom(baseline, current, scenario.loadComponentIds);

  if (!symptom.observable) {
    return {
      complaint: 'The installation is now behaving as it should.',
      healthy: true,
    };
  }

  const labels = symptom.deEnergisedLoadIds.map((id) =>
    labelById(scenario.healthyCircuit, id, 'load'),
  );
  return { complaint: describeSymptom(symptom, labels), healthy: false };
}
