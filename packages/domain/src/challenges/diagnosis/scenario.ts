/**
 * Diagnosis Scenario schema (plan §1.3, §13–§15, §17; Phase D steps 1–5).
 *
 * The Diagnosis Lab inverts Challenge Mode. There the learner builds a circuit
 * from nothing; here they are handed a *working installation that has stopped
 * working* and must find out why:
 *
 *     Circuit Generator → valid circuit → fault scenario → intentional fault
 *       → user diagnoses → user repairs → simulation confirms recovery
 *
 * Like Challenge Mode this module owns no generator (§51) and no fault model
 * (§13). It calls the locked `generateChallenge()`, then places one fault via
 * the existing fault registry, then proves the fault is visible (§12). If it
 * is not visible the candidate is thrown away and another seed is tried —
 * a scenario whose fault cannot be observed is not a puzzle, it is a bug.
 *
 * Everything is derived from `(seed, generatorVersion, difficulty)`, so those
 * three values are all that persistence needs (§21).
 */

import { COMPONENT_DEFS } from '../../components';
import { ELECTRICAL_MODEL_VERSION } from '../../core/contracts';
import { assessFaultTarget } from '../../faultApplicability';
import { getFaultDefinition } from '../../faults';
import { simulate } from '../../simulation/simulate';
import { circuitRevision, hasOperationEvidence } from '../../simulationEvidence';
import type { Circuit, FaultTarget, FaultType, InjectedFault } from '../../types';
import { getDifficultyProfile } from '../difficulty/profiles';
import {
  type FaultCandidate,
  collectFaultCandidates,
  eligibleFaultTypes,
} from '../faults/eligibility';
import {
  createScenarioFault,
  describeFaultTarget,
  selectFaultCandidate,
  withScenarioFaults,
} from '../faults/injection';
import { labelById } from '../faults/labels';
import { type FaultSymptom, describeSymptom, diffSymptom } from '../faults/verification';
import { generateChallenge } from '../generator/generator';
import { GENERATOR_VERSION, createSeededRng, normalizeSeed } from '../generator/seed';
import type { ChallengeDifficulty, ChallengeIdentity } from '../types';
import {
  DIAGNOSIS_PROFILE_VERSION,
  type DiagnosisAssessment,
  hasDiagnosisEvidence,
} from './assessment';

/** Progressive hint (plan §17: observation → direction → location). */
export interface DiagnosisHint {
  level: 1 | 2 | 3;
  kind: 'observation' | 'direction' | 'location';
  text: string;
}

/** One option in the "what is wrong?" question (plan §15A). */
export interface FaultTypeChoice {
  type: FaultType;
  label: string;
  description: string;
}

export interface ScenarioFault {
  fault: InjectedFault;
  /** Correct answer to §15B for this fault, as a `locationChoices` key. */
  locationKey: string;
  /**
   * Symptom measured with **only this fault** injected (§12 applies per fault).
   *
   * For a single-fault scenario this is the scenario symptom. For a multi-fault
   * scenario it is the evidence that this particular fault is not invisible
   * behind its sibling — a fault nobody can observe is not diagnosable.
   */
  symptom: FaultSymptom;
}

/** One option in the "where is it wrong?" question (plan §15B). */
export interface FaultLocationChoice {
  /** Stable key — `wire:<id>`, `component:<id>` or `port:<id>:<index>`. */
  key: string;
  kind: 'wire' | 'component' | 'port';
  label: string;
  /** Ids the canvas should highlight when this option is focused. */
  wireId?: string;
  componentId?: string;
  portIndex?: number;
}

export interface DiagnosisScenario {
  /** Absent on historical snapshots, which remain readable but ungradeable. */
  assessment?: DiagnosisAssessment;
  /** Stable id — `ES-DIAG-######` (plan §29). */
  challengeId: string;
  identity: ChallengeIdentity;
  seed: number;
  generatorVersion: number;
  difficulty: ChallengeDifficulty;
  recipeId: string;

  title: string;
  /** Deliberately vague opening line — §14 forbids naming the fault. */
  complaint: string;
  brief: string;
  teaches: string;
  /** What the installation does when it is healthy. */
  expectedBehaviour: string;

  /**
   * The circuit the learner works on — the healthy circuit **with the fault
   * already injected**. This is what gets loaded into the editor.
   */
  faultedCircuit: Circuit;
  /** The healthy circuit, kept as the recovery reference. Never shown. */
  healthyCircuit: Circuit;

  faults: ScenarioFault[];
  /**
   * How the installation misbehaves with **all** the injected faults present —
   * the state the learner actually observes (§12).
   *
   * With one fault this equals `faults[0].symptom`. Authored scenarios may
   * carry several faults with a combined symptom.
   */
  symptom: FaultSymptom;

  /** Multiple-choice options for "what is wrong?" (§15A). */
  faultTypeChoices: FaultTypeChoice[];
  /** Options for "where is it wrong?" (§15B). */
  locationChoices: FaultLocationChoice[];

  hints: DiagnosisHint[];
  hintBudget: number;
  parTimeSeconds: number;

  /** Load component ids whose behaviour the learner is watching. */
  loadComponentIds: string[];
  /** Labels of the loads that went dead — used in the complaint text. */
  deadLoadLabels: string[];
}

export interface BuildDiagnosisScenarioRequest {
  seed: number;
  difficulty: ChallengeDifficulty;
  generatorVersion?: number;
  recipeId?: string;
  /** Explicit generation policy; omitted by legacy version 1 callers. */
  allowedFaultTypes?: readonly FaultType[];
  /**
   * Bounded retries (plan §37). Each attempt re-seeds the generator, so a
   * circuit whose fault turned out to be invisible is replaced rather than
   * patched.
   */
  maxAttempts?: number;
}

export const MAX_SCENARIO_ATTEMPTS = 10;

/** Raised when no seed in the retry budget produced an observable fault. */
export class DiagnosisScenarioError extends Error {
  readonly rejections: string[];
  constructor(message: string, rejections: string[]) {
    super(message);
    this.name = 'DiagnosisScenarioError';
    this.rejections = rejections;
  }
}

/**
 * Build a diagnosis scenario, retrying until the injected fault is provably
 * observable (plan §12 — this gate is mandatory).
 */
export function buildDiagnosisScenario(request: BuildDiagnosisScenarioRequest): DiagnosisScenario {
  const generatorVersion = request.generatorVersion ?? GENERATOR_VERSION;
  const maxAttempts = request.maxAttempts ?? MAX_SCENARIO_ATTEMPTS;
  const baseSeed = normalizeSeed(request.seed);
  const rejections: string[] = [];

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // Derive a fresh seed per attempt so a rejected circuit is *replaced*,
    // not re-faulted — the generator core stays untouched (§57).
    const seed = attempt === 0 ? baseSeed : normalizeSeed(baseSeed + attempt * 7919);
    const built = tryBuildScenario({
      ...request,
      seed,
      generatorVersion,
    });
    if (built.ok) return built.scenario;
    rejections.push(`seed ${seed}: ${built.reason}`);
  }

  throw new DiagnosisScenarioError(
    `Could not build an observable diagnosis scenario in ${maxAttempts} attempts`,
    rejections,
  );
}

type BuildOutcome = { ok: true; scenario: DiagnosisScenario } | { ok: false; reason: string };

function tryBuildScenario(request: {
  seed: number;
  difficulty: ChallengeDifficulty;
  generatorVersion: number;
  recipeId?: string;
  allowedFaultTypes?: readonly FaultType[];
}): BuildOutcome {
  const { seed, difficulty, generatorVersion, recipeId } = request;
  const generated = generateChallenge({
    seed,
    difficulty,
    generatorVersion,
    recipeId,
    mode: 'diagnosis',
  });
  const healthyCircuit = generated.circuit;
  const scenarioInfo = generated.scenario;
  const baseline = simulate(healthyCircuit, { appMode: 'pro' });
  if (
    baseline.errors.length > 0 ||
    (generatorVersion >= 3 && !hasDiagnosisEvidence(healthyCircuit, baseline))
  )
    return { ok: false, reason: 'baseline circuit is not clean' };
  const rng = createSeededRng({ seed, difficulty, generatorVersion, mode: 'diagnosis' }).fork(
    'diagnosis-fault',
  );
  const candidates = collectFaultCandidates(healthyCircuit, scenarioInfo).filter(
    (candidate) =>
      (!request.allowedFaultTypes || request.allowedFaultTypes.includes(candidate.type)) &&
      (generatorVersion < 3 ||
        assessFaultTarget(healthyCircuit, candidate.type, candidate.target).coverage ===
          'supported'),
  );
  const candidate = selectFaultCandidate(candidates, rng);
  if (!candidate) return { ok: false, reason: 'no eligible fault candidates' };
  const fault = createScenarioFault(generated.metadata.identity.displayId, candidate);
  const faultedCircuit = withScenarioFaults(healthyCircuit, [fault]);
  const result = simulate(faultedCircuit, { appMode: 'pro' });
  const symptom = diffSymptom(baseline, result, scenarioInfo.loadComponentIds);
  if (
    !symptom.observable ||
    (generatorVersion >= 3 &&
      (!hasOperationEvidence(faultedCircuit, result) || symptom.deEnergisedLoadIds.length === 0))
  )
    return {
      ok: false,
      reason: `${candidate.type}: fault has no supported observable load consequence`,
    };
  const profile = getDifficultyProfile(difficulty);
  const deadLoadLabels = symptom.deEnergisedLoadIds.map((id) =>
    labelById(healthyCircuit, id, 'load'),
  );
  return {
    ok: true,
    scenario: {
      challengeId: generated.metadata.identity.displayId,
      ...(generatorVersion >= 3
        ? {
            assessment: {
              version: 1 as const,
              modelVersion: ELECTRICAL_MODEL_VERSION,
              profileVersion: DIAGNOSIS_PROFILE_VERSION,
              engineVersion: baseline.electricalContract!.engineVersion,
              healthyRevision: circuitRevision(healthyCircuit),
              faultedRevision: circuitRevision(faultedCircuit),
            },
          }
        : {}),
      identity: generated.metadata.identity,
      seed,
      generatorVersion,
      difficulty,
      recipeId: generated.scenario.recipeId,
      title: scenarioInfo.recipeTitle,
      complaint: describeSymptom(symptom, deadLoadLabels),
      brief:
        'This installation was working. It is not working now. Investigate the circuit, work out what has gone wrong and where, then put it right.',
      teaches: scenarioInfo.teaches,
      expectedBehaviour: scenarioInfo.expectedBehaviour,
      healthyCircuit: deepCopy(healthyCircuit),
      faultedCircuit: deepCopy(faultedCircuit),
      faults: [{ fault, locationKey: locationKeyFor(candidate), symptom }],
      symptom,
      faultTypeChoices: buildFaultTypeChoices(
        healthyCircuit,
        scenarioInfo,
        [candidate.type],
        profile.diagnosticChoiceCount,
        rng.fork('choices'),
      ),
      locationChoices: buildLocationChoices(healthyCircuit, scenarioInfo),
      hints: buildHints(healthyCircuit, candidate, symptom, deadLoadLabels),
      hintBudget: profile.hintBudget,
      parTimeSeconds: profile.parTimeSeconds,
      loadComponentIds: [...scenarioInfo.loadComponentIds],
      deadLoadLabels,
    },
  };
}

/**
 * Stable location key for a fault target — mirrors {@link FaultLocationChoice.key}.
 *
 * Exported separately from {@link locationKeyFor} because the UI needs to key
 * *live* faults in the learner's circuit (which are `InjectedFault`s, not
 * candidates) against the same option list.
 */
export function locationKeyForTarget(target: FaultTarget): string {
  if (target.type === 'port') return `port:${target.componentId}:${target.portIndex}`;
  return `${target.type}:${target.id}`;
}

/** Stable location key for a candidate — mirrors {@link FaultLocationChoice.key}. */
export function locationKeyFor(candidate: FaultCandidate): string {
  return locationKeyForTarget(candidate.target);
}

/**
 * Every place the learner is allowed to point at.
 *
 * The list covers the whole investigable circuit, not just the fault's own
 * placement class — otherwise the shape of the options would leak the answer
 * (e.g. "only wires are listed, so it must be a wire fault").
 */
function buildLocationChoices(
  circuit: Circuit,
  scenario: {
    faultCandidateWireIds: string[];
    loadComponentIds: string[];
    protectionComponentIds: string[];
  },
): FaultLocationChoice[] {
  const choices: FaultLocationChoice[] = [];
  const wireIds = new Set(scenario.faultCandidateWireIds);

  for (const wire of circuit.wires) {
    if (!wireIds.has(wire.id)) continue;
    const from = labelById(circuit, wire.fromComponentId, '?');
    const to = labelById(circuit, wire.toComponentId, '?');
    choices.push({
      key: `wire:${wire.id}`,
      kind: 'wire',
      label: `Wire: ${from} → ${to}`,
      wireId: wire.id,
    });
  }

  for (const id of [...scenario.protectionComponentIds, ...scenario.loadComponentIds]) {
    if (!circuit.components.some((c) => c.id === id)) continue;
    choices.push({
      key: `component:${id}`,
      kind: 'component',
      label: `Device: ${labelById(circuit, id)}`,
      componentId: id,
    });
  }

  // Terminals of loads that are actually wired — matches the eligibility rule.
  const seenPorts = new Set<string>();
  for (const wire of circuit.wires) {
    if (!wireIds.has(wire.id)) continue;
    for (const end of [
      { componentId: wire.toComponentId, portIndex: wire.toPortIndex },
      { componentId: wire.fromComponentId, portIndex: wire.fromPortIndex },
    ]) {
      if (!scenario.loadComponentIds.includes(end.componentId)) continue;
      const key = `port:${end.componentId}:${end.portIndex}`;
      if (seenPorts.has(key)) continue;
      seenPorts.add(key);
      choices.push({
        key,
        kind: 'port',
        label: `Terminal ${end.portIndex + 1} of ${labelById(circuit, end.componentId, '?')}`,
        componentId: end.componentId,
        portIndex: end.portIndex,
      });
    }
  }

  choices.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  return disambiguate(circuit, choices);
}

/**
 * Make every location label unique.
 *
 * Identical option rows are not an answerable question: the learner can be
 * graded wrong for a distinction the UI never showed them. Two cases occur on
 * real generated circuits, and neither is rare:
 *
 *   - **Two wires between the same pair of devices** — the live and neutral
 *     legs of a socket drop. Caught on screen at 390×844, where "Wire: RCBO
 *     (20 A) → Single 3-Pin Socket (13A)" appeared twice in a row.
 *   - **Two identical devices** — a recipe with two branches, each ending in
 *     the same 60 W bulb. This also duplicates their terminal options.
 *
 * Two qualifiers are tried, weakest first, and only on the rows that actually
 * collide — a unique label is never touched:
 *
 *   1. For a wire, the terminal names it lands on ("L-out → L"), which the
 *      component registry already carries.
 *   2. Failing that, the component's canvas id. The canvas prints that id
 *      under every component, so this is the one qualifier guaranteed to be
 *      both unique and visible; the learner can match the option to the thing
 *      on screen rather than guessing.
 *
 * Neither qualifier discloses anything about *which* location is faulty — both
 * are already on screen for every component, faulty or not.
 */
function disambiguate(circuit: Circuit, choices: FaultLocationChoice[]): FaultLocationChoice[] {
  const collisions = (list: readonly FaultLocationChoice[]): Set<string> => {
    const counts = new Map<string, number>();
    for (const choice of list) counts.set(choice.label, (counts.get(choice.label) ?? 0) + 1);
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([label]) => label));
  };

  let duplicated = collisions(choices);
  if (duplicated.size === 0) return choices;

  const portLabel = (componentId: string, portIndex: number): string | null => {
    const component = circuit.components.find((c) => c.id === componentId);
    if (!component) return null;
    return COMPONENT_DEFS[component.type]?.ports[portIndex]?.label ?? null;
  };

  // Pass 1 — terminal names, wires only.
  let result = choices.map((choice) => {
    if (!duplicated.has(choice.label) || choice.kind !== 'wire') return choice;
    const wire = circuit.wires.find((w) => w.id === choice.wireId);
    if (!wire) return choice;
    const from = portLabel(wire.fromComponentId, wire.fromPortIndex);
    const to = portLabel(wire.toComponentId, wire.toPortIndex);
    if (!from && !to) return choice;
    return { ...choice, label: `${choice.label} (${from ?? '?'} → ${to ?? '?'})` };
  });

  // Pass 2 — the canvas id, for anything still ambiguous.
  duplicated = collisions(result);
  if (duplicated.size === 0) return result;

  result = result.map((choice) => {
    if (!duplicated.has(choice.label)) return choice;
    const id =
      choice.kind === 'wire'
        ? choice.wireId
        : choice.kind === 'component'
          ? choice.componentId
          : choice.componentId;
    if (!id) return choice;
    return { ...choice, label: `${choice.label} [${shortId(id)}]` };
  });

  return result;
}

/**
 * The distinctive tail of a generated id.
 *
 * Ids look like `gen-679711-1-branch-load-1`; the `gen-<hash>-<n>-` prefix is
 * identical for every component in the circuit and only makes the option
 * harder to read. The tail is what tells two devices apart, and it is a
 * substring of what the canvas prints, so it is still matchable on screen.
 */
function shortId(id: string): string {
  return id.replace(/^gen-\d+-\d+-/, '');
}

/**
 * The §15A choice set: every true fault type plus plausible distractors.
 *
 * Distractors are drawn from faults that were *genuinely eligible on this
 * circuit*, so every wrong answer is a fault that could really have happened
 * here. A distractor that is impossible on the topology teaches nothing and
 * is trivially eliminated.
 *
 * Size follows `difficulty.diagnosticChoiceCount` (3 / 5 / 7), but the correct
 * answers are never dropped to hit that number: on a multi-fault scenario the
 * list grows rather than hiding an answer the learner is required to give.
 * Two faults of the same kind contribute one option, not two — the question is
 * "what is wrong?", and repeating an option would itself be a tell.
 */
function buildFaultTypeChoices(
  circuit: Circuit,
  scenario: Parameters<typeof collectFaultCandidates>[1],
  correctTypes: readonly FaultType[],
  desiredCount: number,
  rng: ReturnType<typeof createSeededRng>,
): FaultTypeChoice[] {
  const correct = [...new Set(correctTypes)];
  const eligible = eligibleFaultTypes(collectFaultCandidates(circuit, scenario));
  const distractors = eligible.filter((t) => !correct.includes(t));
  const wanted = Math.max(Math.max(2, desiredCount) - correct.length, 1);
  const chosen = rng.shuffle(distractors).slice(0, wanted);

  const types = rng.shuffle([...correct, ...chosen]);
  return types.map((type) => {
    const def = getFaultDefinition(type);
    return { type, label: def.label, description: def.description };
  });
}

/**
 * Progressive hints (plan §17), written from the *symptom* outward.
 *
 * The plan's own worked example is the template:
 *   1. observation — "The load does not have a complete electrical path."
 *   2. direction   — "Check the Neutral path."
 *   3. location    — "Inspect the wire between the load and the Neutral return."
 *
 * Each level reveals strictly more than the last and no level reveals the
 * fault *type* and *location* together — that pair is the answer, and §17
 * says hints "must not directly reveal more than the configured hint level".
 */
function buildHints(
  circuit: Circuit,
  candidate: FaultCandidate,
  symptom: FaultSymptom,
  deadLoadLabels: readonly string[],
): DiagnosisHint[] {
  const def = getFaultDefinition(candidate.type);

  const baseObservation =
    symptom.primary === 'load-dead'
      ? `${deadLoadLabels[0] ?? 'A load'} has no complete electrical path — something in its circuit is interrupted or diverted.`
      : symptom.primary === 'tripped'
        ? 'A protective device is doing its job: it is seeing a current it does not like.'
        : symptom.primary === 'blown'
          ? 'A component has been destroyed, so the energy went somewhere it should not have.'
          : 'The installation is reporting a condition the regulations do not permit.';

  return [
    { level: 1, kind: 'observation', text: baseObservation },
    { level: 2, kind: 'direction', text: directionHint(candidate.type, def.category) },
    {
      level: 3,
      kind: 'location',
      text: `Inspect ${describeFaultTarget(circuit, candidate.target)}.`,
    },
  ];
}

/**
 * The fault a single-answer consumer should use — statistics buckets, log
 * lines, the "you found it" headline.
 *
 * Always the first entry, which is the first fault the seed selected and the
 * one the hints are written around. Callers that must handle *every* fault
 * (grading, repair verification) iterate `scenario.faults` instead; this
 * helper exists so the ones that genuinely want one representative say so
 * explicitly rather than reaching for `faults[0]` and hoping.
 */
export function primaryScenarioFault(scenario: DiagnosisScenario): ScenarioFault {
  // A scenario always carries at least one fault — the builder rejects any
  // attempt that produced none.
  return scenario.faults[0]!;
}

/** Narrow the search without naming the fault (plan §17 hint 2). */
function directionHint(type: FaultType, category: string): string {
  switch (type) {
    case 'open-live':
      return 'Follow the Line conductor from the supply towards the load.';
    case 'open-neutral':
      return 'Check the Neutral return path.';
    case 'open-circuit':
      return 'A conductor is broken somewhere along the run — trace it end to end.';
    case 'short-circuit':
      return 'Line and Neutral are meeting somewhere they should not.';
    case 'earth-fault':
    case 'live-to-earth':
      return 'Current is escaping to earth — check insulation and the CPC.';
    case 'reverse-polarity':
      return 'The conductors are connected, but check which one is which.';
    case 'terminal-disconnect':
      return 'The cable runs look sound — check the connections at the terminals.';
    case 'protection-forced-open':
    case 'protection-bypass':
      return 'Look at the protective device itself rather than the cabling.';
    default:
      return `Investigate the ${category} side of the installation.`;
  }
}

function deepCopy(circuit: Circuit): Circuit {
  return JSON.parse(JSON.stringify(circuit)) as Circuit;
}
