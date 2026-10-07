import { circuitRequirements } from '@electrasim/access/circuit';
import {
  DIAGNOSIS_VERSION,
  buildAccessibleDiagnosis,
  scenarioRequirements,
} from '@electrasim/access/diagnosis';
import {
  type DiagnosisAnswer,
  type DiagnosisScenario,
  type RageTierId,
  diagnosisAssessmentIssue,
  evaluateDiagnosis,
  scoreDiagnosis,
} from '@electrasim/domain/challenges';
import { FAULT_REGISTRY } from '@electrasim/domain/faults';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { type ApiEnv, freshContext, requireSession, sameOriginMutation } from './context';
import { ownMembership } from './membership-store';
import { integer, keys, object, string } from './membership-validation';
import { authorize, capabilityGuard, readCircuit } from './simulator-access';

export interface AttemptProgress {
  status: 'active' | 'completed' | 'abandoned' | 'timed-out';
  misdiagnoses: number;
  incompleteRepairs: number;
  hintsUsed: number;
  identifiedFaultIds: string[];
  elapsedMs: number;
}
interface AttemptRow {
  id: string;
  scenario: string;
  circuit: string;
  progress: string;
  version: number;
  updated_at: number;
}
function attemptScore(scenario: DiagnosisScenario, progress: AttemptProgress) {
  return progress.status === 'completed' || progress.status === 'timed-out'
    ? scoreDiagnosis({
        difficulty: scenario.difficulty,
        elapsedMs: progress.elapsedMs,
        misdiagnoses: progress.misdiagnoses,
        incompleteRepairs: progress.incompleteRepairs,
        hintsUsed: progress.hintsUsed,
        faultCount: scenario.faults.length,
        faultsIdentified: progress.identifiedFaultIds.length,
      })
    : null;
}
export const diagnosisApi = new Hono<ApiEnv>();
diagnosisApi.use('*', freshContext, sameOriginMutation, bodyLimit({ maxSize: 10 * 1024 * 1024 }));
diagnosisApi.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  console.error('Diagnosis request failed', c.get('requestId'), error);
  return c.json({ error: 'Diagnosis service unavailable' }, 503);
});
diagnosisApi.use('/diagnosis/*', requireSession);
diagnosisApi.post('/diagnosis/attempts', async (c) => {
  const input = object(await c.req.json());
  keys(input, ['difficulty', 'seed', 'rageTier', 'generatorVersion']);
  const difficulty = string(input.difficulty, 'difficulty', 20);
  if (!['beginner', 'intermediate', 'advanced'].includes(difficulty))
    throw new HTTPException(400, { message: 'Unknown difficulty' });
  const seed = integer(input.seed, 'seed', 0);
  const version =
    input.generatorVersion === undefined
      ? DIAGNOSIS_VERSION
      : integer(input.generatorVersion, 'generatorVersion', DIAGNOSIS_VERSION, DIAGNOSIS_VERSION);
  const rageTier = input.rageTier;
  if (
    rageTier !== undefined &&
    !['rage-1', 'rage-2', 'rage-3', 'rage-4'].includes(String(rageTier))
  )
    throw new HTTPException(400, { message: 'Unknown Ohmageddon tier' });
  // Check explicit modes before spending CPU on protected content generation.
  await authorize(
    c,
    rageTier
      ? ['advanced_diagnostics', 'advanced_faults']
      : difficulty === 'advanced'
        ? ['advanced_diagnostics']
        : [],
  );
  const scenario = buildAccessibleDiagnosis({
    seed,
    difficulty: difficulty as 'beginner',
    generatorVersion: version,
    ...(rageTier ? { rageTier: rageTier as RageTierId } : {}),
  });
  const required = scenarioRequirements(scenario);
  await authorize(c, required);
  const progress: AttemptProgress = {
    status: 'active',
    misdiagnoses: 0,
    incompleteRepairs: 0,
    hintsUsed: 0,
    identifiedFaultIds: [],
    elapsedMs: 0,
  };
  const id = crypto.randomUUID();
  const now = Date.now();
  const userId = c.get('actor').id;
  const guard = capabilityGuard(userId, required, now);
  const result = await c
    .get('db')
    .prepare(
      `INSERT INTO diagnosis_attempts (id,user_id,scenario,circuit,progress,version,created_at,updated_at) SELECT ?,?,?,?,?,1,?,? WHERE 1=1${guard.sql}`,
    )
    .bind(
      id,
      userId,
      JSON.stringify(scenario),
      JSON.stringify(scenario.faultedCircuit),
      JSON.stringify(progress),
      now,
      now,
      ...guard.args,
    )
    .run();
  if (!result.meta.changes)
    throw new HTTPException(403, { message: 'Membership changed; no attempt started' });
  return c.json({ id, scenario, circuit: scenario.faultedCircuit, progress, version: 1 }, 201);
});
diagnosisApi.get('/diagnosis/attempts/:id', async (c) => {
  const row = await c
    .get('db')
    .prepare('SELECT * FROM diagnosis_attempts WHERE id=? AND user_id=?')
    .bind(c.req.param('id'), c.get('actor').id)
    .first<AttemptRow>();
  if (!row) throw new HTTPException(404, { message: 'Exercise not found' });
  const scenario = JSON.parse(row.scenario) as DiagnosisScenario;
  const circuit = readCircuit(JSON.parse(row.circuit));
  const required = [
    ...new Set([...scenarioRequirements(scenario), ...circuitRequirements(circuit)]),
  ];
  const membership = await ownMembership(c.get('db'), c.get('actor').id, 1, 0);
  const progress = JSON.parse(row.progress) as AttemptProgress;
  return c.json({
    id: row.id,
    scenario,
    circuit,
    progress,
    score: attemptScore(scenario, progress),
    scoreEvidence: scenario.assessment ?? null,
    version: row.version,
    assessmentIssue: diagnosisAssessmentIssue(scenario),
    readOnly:
      !!diagnosisAssessmentIssue(scenario) ||
      required.some((key) => !membership.capabilities.includes(key)),
  });
});
diagnosisApi.post('/diagnosis/attempts/:id', async (c) => {
  const input = object(await c.req.json());
  keys(input, ['action', 'version', 'circuit', 'answer']);
  const action = string(input.action, 'action', 20);
  if (!['submit', 'hint', 'checkpoint', 'abandon', 'expire'].includes(action))
    throw new HTTPException(400, { message: 'Unknown exercise action' });
  const version = integer(input.version, 'version', 1);
  const userId = c.get('actor').id;
  const row = await c
    .get('db')
    .prepare('SELECT * FROM diagnosis_attempts WHERE id=? AND user_id=?')
    .bind(c.req.param('id'), userId)
    .first<AttemptRow>();
  if (!row) throw new HTTPException(404, { message: 'Exercise not found' });
  if (row.version !== version)
    throw new HTTPException(409, { message: 'Exercise changed. Resume before retrying.' });
  const scenario = JSON.parse(row.scenario) as DiagnosisScenario;
  const progress = JSON.parse(row.progress) as AttemptProgress;
  if (progress.status !== 'active')
    throw new HTTPException(409, { message: 'Exercise already ended' });
  const assessmentIssue = diagnosisAssessmentIssue(scenario);
  if (assessmentIssue && action !== 'abandon' && action !== 'checkpoint')
    throw new HTTPException(409, { message: assessmentIssue });
  const circuit = readCircuit(input.circuit, true);
  if (circuit.components.length > 500 || circuit.wires.length > 1000)
    throw new HTTPException(413, {
      message: 'Diagnosis supports at most 500 components and 1000 wires.',
    });
  const required = [
    ...new Set([
      ...scenarioRequirements(scenario),
      ...circuitRequirements(circuit),
      ...circuitRequirements(readCircuit(JSON.parse(row.circuit))),
    ]),
  ];
  await authorize(c, required);
  // Count only the active heartbeat window. Offline/denied actions never consume stored time.
  const now = Date.now();
  if (!assessmentIssue) progress.elapsedMs += Math.max(0, Math.min(30_000, now - row.updated_at));
  let evaluation = null;
  if (action === 'submit') {
    const answer = object(input.answer);
    keys(answer, ['faultType', 'locationKey']);
    if (typeof answer.faultType !== 'string' || !Object.hasOwn(FAULT_REGISTRY, answer.faultType))
      throw new HTTPException(400, { message: 'Unknown fault type' });
    const locationKey = string(answer.locationKey, 'locationKey', 300);
    evaluation = evaluateDiagnosis(
      scenario,
      circuit,
      { faultType: answer.faultType, locationKey } as DiagnosisAnswer,
      { identifiedFaultIds: progress.identifiedFaultIds },
    );
    progress.identifiedFaultIds = [...evaluation.identifiedFaultIds];
    if (evaluation.verdict === 'failure') progress.misdiagnoses++;
    if (
      evaluation.verdict === 'incomplete' &&
      !(evaluation.progressed && evaluation.outstandingCount > 0)
    )
      progress.incompleteRepairs++;
    if (evaluation.verdict === 'success') progress.status = 'completed';
  }
  if (action === 'hint')
    progress.hintsUsed = Math.min(scenario.hints.length, progress.hintsUsed + 1);
  if (action === 'abandon') progress.status = 'abandoned';
  const limit = scenario.rage?.timeLimitSeconds;
  if (!assessmentIssue && limit != null && progress.elapsedMs >= limit * 1000) {
    progress.elapsedMs = limit * 1000;
    progress.status = 'timed-out';
  }
  const score = attemptScore(scenario, progress);
  const guard = capabilityGuard(userId, required, now);
  const result = await c
    .get('db')
    .prepare(
      `UPDATE diagnosis_attempts SET circuit=?,progress=?,version=version+1,updated_at=? WHERE id=? AND user_id=? AND version=?${guard.sql}`,
    )
    .bind(
      JSON.stringify(circuit),
      JSON.stringify(progress),
      now,
      row.id,
      userId,
      version,
      ...guard.args,
    )
    .run();
  if (!result.meta.changes)
    throw new HTTPException(409, { message: 'Exercise or membership changed; no result accepted' });
  return c.json({
    id: row.id,
    version: version + 1,
    progress,
    evaluation,
    score,
    scoreEvidence: scenario.assessment ?? null,
  });
});
