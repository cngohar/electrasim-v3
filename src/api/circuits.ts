import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { policyGuard } from './component-access-store';
import { type ApiEnv, freshContext, requireSession, sameOriginMutation } from './context';
import { integer, keys, object, pagination, string } from './membership-validation';
import {
  capabilityGuard,
  circuitAccess,
  readCircuit,
  recheckCircuitAccess,
} from './simulator-access';

export const circuitsApi = new Hono<ApiEnv>();
// Mounted middleware is flattened by Hono; keep circuit policy on owned paths.
for (const path of ['/circuits', '/circuits/*', '/simulator/*']) {
  circuitsApi.use(path, freshContext, sameOriginMutation, bodyLimit({ maxSize: 10 * 1024 * 1024 }));
}
circuitsApi.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  console.error('Circuit request failed', c.get('requestId'), error);
  return c.json({ error: 'Circuit service unavailable' }, 503);
});

circuitsApi.post('/simulator/authorize', async (c) => {
  const input = object(await c.req.json());
  keys(input, ['circuit']);
  const circuit = readCircuit(input.circuit);
  const access = await circuitAccess(c, [circuit]);
  return c.json(await recheckCircuitAccess(c, [circuit], access.policy));
});
circuitsApi.post('/simulator/simulate', async (c) => {
  const input = object(await c.req.json());
  keys(input, ['circuit', 'standard', 'simulationState', 'deltaSeconds']);
  const circuit = readCircuit(input.circuit, true);
  if (circuit.components.length > 500 || circuit.wires.length > 1000)
    throw new HTTPException(413, {
      message: 'Server simulation supports at most 500 components and 1000 wires.',
    });
  const standard = input.standard ?? 'int';
  if (typeof standard !== 'string' || !['uk', 'us', 'eu', 'int'].includes(standard))
    throw new HTTPException(400, { message: 'Unknown standard' });
  const access = await circuitAccess(c, [circuit]);
  const { simulate } = await import('@electrasim/domain/simulation/simulate');
  // Domain validates the complete state, model/configuration identity and step bounds.
  // This calculation endpoint does not accept or grade exercise results.
  const result = simulate(circuit, {
    standard: standard as 'int',
    appMode: 'pro',
    simulationState: input.simulationState as
      | import('@electrasim/domain/core/contracts').ElectricalSimulationState
      | undefined,
    deltaSeconds: input.deltaSeconds as number | undefined,
  });
  const diagnostics = result.electrical?.diagnostics ?? result.phasor?.diagnostics;
  if (
    diagnostics?.some(
      (d) => d.code === 'invalid-simulation-state' || d.code === 'invalid-simulation-step',
    )
  )
    return c.json({ error: diagnostics[0]?.message }, 400);
  const finalAccess = await recheckCircuitAccess(c, [circuit], access.policy);
  return c.json({
    ...JSON.parse(
      JSON.stringify(result, (_key, value) => (value instanceof Set ? [...value] : value)),
    ),
    access: finalAccess,
  });
});

circuitsApi.use('/circuits', requireSession);
circuitsApi.use('/circuits/*', requireSession);
circuitsApi.get('/circuits', async (c) => {
  const { limit, offset } = pagination(c.req.query());
  const rows = await c
    .get('db')
    .prepare(
      'SELECT id, name, version, created_at AS createdAt, updated_at AS updatedAt FROM circuits WHERE user_id = ? ORDER BY updated_at DESC, id LIMIT ? OFFSET ?',
    )
    .bind(c.get('actor').id, limit, offset)
    .all();
  return c.json({ items: rows.results, limit, offset });
});
circuitsApi.get('/circuits/:id', async (c) => {
  const row = await c
    .get('db')
    .prepare('SELECT * FROM circuits WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), c.get('actor').id)
    .first<{ id: string; name: string; content: string; version: number }>();
  if (!row) throw new HTTPException(404, { message: 'Circuit not found' });
  const circuit = readCircuit(JSON.parse(row.content));
  const access = await circuitAccess(c, [circuit], undefined, false);
  const required = access.required;
  return c.json({
    id: row.id,
    name: row.name,
    circuit,
    version: row.version,
    required,
    policy: access.policy,
    readOnly: required.some((cap) => !access.capabilities.includes(cap)),
  });
});
circuitsApi.post('/circuits', async (c) => {
  const input = object(await c.req.json());
  keys(input, ['name', 'circuit']);
  const name = string(input.name, 'name', 160);
  const circuit = readCircuit(input.circuit);
  const access = await circuitAccess(c, [circuit]);
  const required = access.required;
  const id = crypto.randomUUID();
  const now = Date.now();
  const userId = c.get('actor').id;
  const guard = capabilityGuard(userId, required, now);
  const policy = policyGuard(access.policy.revision);
  const result = await c
    .get('db')
    .prepare(
      `INSERT INTO circuits (id,user_id,name,content,version,created_at,updated_at) SELECT ?,?,?,?,1,?,? WHERE 1=1${guard.sql}${policy.sql}`,
    )
    .bind(id, userId, name, JSON.stringify(circuit), now, now, ...guard.args, ...policy.args)
    .run();
  if (!result.meta.changes) {
    // Distinguish a policy conflict from the existing membership denial.
    await recheckCircuitAccess(c, [circuit], access.policy);
    throw new HTTPException(403, { message: 'Membership changed; reload before retrying' });
  }
  return c.json(
    {
      id,
      name,
      version: 1,
      createdAt: now,
      updatedAt: now,
      policyRevision: access.policy.revision,
    },
    201,
  );
});
circuitsApi.patch('/circuits/:id', async (c) => {
  const input = object(await c.req.json());
  keys(input, ['name', 'circuit', 'version']);
  const name = string(input.name, 'name', 160);
  const version = integer(input.version, 'version', 1);
  const circuit = readCircuit(input.circuit);
  const userId = c.get('actor').id;
  const prior = await c
    .get('db')
    .prepare('SELECT content, version FROM circuits WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), userId)
    .first<{ content: string; version: number }>();
  if (!prior) throw new HTTPException(404, { message: 'Circuit not found' });
  if (prior.version !== version)
    throw new HTTPException(409, { message: 'Circuit changed; reload before retrying' });
  const access = await circuitAccess(c, [circuit, readCircuit(JSON.parse(prior.content))]);
  const required = access.required;
  const now = Date.now();
  const guard = capabilityGuard(userId, required, now);
  const policy = policyGuard(access.policy.revision);
  const result = await c
    .get('db')
    .prepare(
      `UPDATE circuits SET name=?,content=?,version=version+1,updated_at=? WHERE id=? AND user_id=? AND version=?${guard.sql}${policy.sql}`,
    )
    .bind(
      name,
      JSON.stringify(circuit),
      now,
      c.req.param('id'),
      userId,
      version,
      ...guard.args,
      ...policy.args,
    )
    .run();
  if (!result.meta.changes)
    throw new HTTPException(409, {
      message: 'Circuit, policy or membership changed; reload before retrying',
    });
  return c.json({
    id: c.req.param('id'),
    name,
    version: version + 1,
    updatedAt: now,
    policyRevision: access.policy.revision,
  });
});
circuitsApi.delete('/circuits/:id', async (c) => {
  const input = object(await c.req.json());
  keys(input, ['version']);
  const version = integer(input.version, 'version', 1);
  const result = await c
    .get('db')
    .prepare('DELETE FROM circuits WHERE id=? AND user_id=? AND version=?')
    .bind(c.req.param('id'), c.get('actor').id, version)
    .run();
  if (!result.meta.changes)
    throw new HTTPException(409, {
      message: 'Circuit unavailable or changed; reload before retrying',
    });
  return c.json({ deleted: true });
});
