import type { ElectricalSimulationState } from '@electrasim/domain/core/contracts';
import { simulate } from '@electrasim/domain/simulation/simulate';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { previewSwitches } from '../../community/preview/policy';
import { renderCircuitSvg } from '../../community/preview/render';
import { policyGuard } from '../component-access-store';
import { type ApiEnv, freshContext, sameOriginMutation } from '../context';
import { keys, object, string } from '../membership-validation';
import { capabilityGuard, circuitAccess, recheckCircuitAccess } from '../simulator-access';
import { previewSnapshot } from './preview-store';
import { actorGuard } from './store';

export const previewApi = new Hono<ApiEnv>();
const path = '/community/publications/:slug/preview/simulate';
previewApi.use(path, freshContext, sameOriginMutation, bodyLimit({ maxSize: 1024 * 1024 }));
previewApi.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  console.error(JSON.stringify({ event: 'preview_request_failed', requestId: c.get('requestId') }));
  return c.json({ error: 'Preview unavailable; try again' }, 503);
});
previewApi.post(path, async (c) => {
  let json: unknown;
  try {
    json = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: 'Invalid JSON' });
  }
  const input = object(json);
  keys(input, ['versionId', 'switches', 'simulationState', 'deltaSeconds']);
  const versionId = string(input.versionId, 'versionId', 200);
  const { publication, version, circuit } = await previewSnapshot(
    c,
    c.req.param('slug'),
    versionId,
  );
  if (circuit.components.length > 500 || circuit.wires.length > 1000)
    throw new HTTPException(413, {
      message: 'Preview simulation supports at most 500 components and 1000 wires.',
    });
  const switches = object(input.switches ?? {});
  const allowed = new Set(previewSwitches(circuit).map((s) => s.id));
  for (const [id, on] of Object.entries(switches)) {
    if (!allowed.has(id) || typeof on !== 'boolean')
      throw new HTTPException(400, {
        message: 'Only manual switches in this snapshot may be controlled',
      });
  }
  const temporary = {
    ...circuit,
    components: circuit.components.map((s) =>
      Object.hasOwn(switches, s.id)
        ? { ...s, state: { ...s.state, on: switches[s.id] as boolean } }
        : s,
    ),
  };
  const access = await circuitAccess(c, [temporary]);
  const result = simulate(temporary, {
    standard: 'int',
    appMode: 'pro',
    simulationState: input.simulationState as ElectricalSimulationState | undefined,
    deltaSeconds: (input.deltaSeconds ?? 0) as number,
  });
  const diagnostics = result.electrical?.diagnostics ?? result.phasor?.diagnostics ?? [];
  if (
    diagnostics.some(
      (d) => d.code === 'invalid-simulation-state' || d.code === 'invalid-simulation-step',
    )
  )
    throw new HTTPException(400, {
      message: 'Invalid preview simulation state or step; reset the preview',
    });
  const svg = renderCircuitSvg(temporary, version.title, result);
  const final = await recheckCircuitAccess(c, [temporary], access.policy);
  // One final primary statement binds the result to publication visibility,
  // current policy, session/account state and still-active required benefits.
  const cap = capabilityGuard(final.userId ?? '', final.required, Date.now());
  const policy = policyGuard(final.policy.revision);
  const actor = final.userId ? actorGuard(c, Date.now(), false) : { sql: '1=1', args: [] };
  c.set('db', c.env.DB.withSession('first-primary'));
  const visible = await c
    .get('db')
    .prepare(
      `SELECT id FROM publications WHERE id=? AND revision=? AND status='published' AND moderation='visible' AND (${actor.sql}) ${cap.sql}${policy.sql}`,
    )
    .bind(publication.id, publication.revision, ...actor.args, ...cap.args, ...policy.args)
    .first();
  if (!visible)
    throw new HTTPException(409, { message: 'Publication or access changed; reload the preview' });
  return c.json({
    versionId: version.id,
    calculationStatus: result.electrical?.status ?? result.phasor?.status ?? 'not-solved',
    svg,
    simulationState: result.simulationState ?? null,
    elapsedSeconds: result.simulationState?.elapsedSeconds ?? 0,
    energizedComponents: result.energizedComponents.size,
    diagnostics: diagnostics.map((d) => ({ code: d.code, message: d.message })),
    policyRevision: final.policy.revision,
    // No result remains authoritative beyond the next step/fresh access read.
    nextChangeAt: final.nextChangeAt,
  });
});
