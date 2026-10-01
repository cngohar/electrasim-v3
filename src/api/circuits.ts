import { circuitRequirements } from '@electrasim/access/circuit';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { type ApiEnv, freshContext, requireSession, sameOriginMutation } from './context';
import { ownMembership } from './membership-store';
import { integer, keys, object, pagination, string } from './membership-validation';
import { authorize, capabilityGuard, readCircuit } from './simulator-access';

export const circuitsApi = new Hono<ApiEnv>();
circuitsApi.use('*', freshContext, sameOriginMutation, bodyLimit({ maxSize: 10 * 1024 * 1024 }));
circuitsApi.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  console.error('Circuit request failed', c.get('requestId'), error);
  return c.json({ error: 'Circuit service unavailable' }, 503);
});

circuitsApi.post('/simulator/authorize', async (c) => {
  const input = object(await c.req.json());
  keys(input, ['circuit', 'diagnosis']);
  if (
    input.diagnosis !== undefined &&
    !['basic', 'advanced', 'ohmageddon'].includes(String(input.diagnosis))
  )
    throw new HTTPException(400, { message: 'Unknown diagnosis mode' });
  const required = circuitRequirements(
    readCircuit(input.circuit),
    input.diagnosis as 'basic' | 'advanced' | 'ohmageddon' | undefined,
  );
  const access = await authorize(c, required);
  return c.json({
    userId: c.get('actor')?.id,
    required,
    capabilities: access.capabilities,
    nextChangeAt: access.nextChangeAt,
    asOf: access.asOf,
  });
});
circuitsApi.post('/simulator/simulate', async (c) => {
  const input = object(await c.req.json());
  keys(input, ['circuit', 'standard']);
  const circuit = readCircuit(input.circuit, true);
  if (circuit.components.length > 500 || circuit.wires.length > 1000)
    throw new HTTPException(413, {
      message: 'Server simulation supports at most 500 components and 1000 wires.',
    });
  const standard = input.standard ?? 'int';
  if (typeof standard !== 'string' || !['uk', 'us', 'eu', 'int'].includes(standard))
    throw new HTTPException(400, { message: 'Unknown standard' });
  await authorize(c, circuitRequirements(circuit));
  const { simulate } = await import('@electrasim/domain/simulation/simulate');
  const result = simulate(circuit, { standard: standard as 'int', appMode: 'pro' });
  return c.json(
    JSON.parse(
      JSON.stringify(result, (_key, value) => (value instanceof Set ? [...value] : value)),
    ),
  );
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
  const required = circuitRequirements(circuit);
  const access = await ownMembership(c.get('db'), c.get('actor').id, 1, 0);
  return c.json({
    id: row.id,
    name: row.name,
    circuit,
    version: row.version,
    required,
    readOnly: required.some((cap) => !access.capabilities.includes(cap)),
  });
});
circuitsApi.post('/circuits', async (c) => {
  const input = object(await c.req.json());
  keys(input, ['name', 'circuit']);
  const name = string(input.name, 'name', 160);
  const circuit = readCircuit(input.circuit);
  const required = circuitRequirements(circuit);
  await authorize(c, required);
  const id = crypto.randomUUID();
  const now = Date.now();
  const userId = c.get('actor').id;
  const guard = capabilityGuard(userId, required, now);
  const result = await c
    .get('db')
    .prepare(
      `INSERT INTO circuits (id,user_id,name,content,version,created_at,updated_at) SELECT ?,?,?,?,1,?,? WHERE 1=1${guard.sql}`,
    )
    .bind(id, userId, name, JSON.stringify(circuit), now, now, ...guard.args)
    .run();
  if (!result.meta.changes)
    throw new HTTPException(403, { message: 'Membership changed; reload before retrying' });
  return c.json({ id, name, version: 1, createdAt: now, updatedAt: now }, 201);
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
    .prepare('SELECT content FROM circuits WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), userId)
    .first<{ content: string }>();
  if (!prior) throw new HTTPException(404, { message: 'Circuit not found' });
  const required = [
    ...new Set([
      ...circuitRequirements(circuit),
      ...circuitRequirements(readCircuit(JSON.parse(prior.content))),
    ]),
  ];
  await authorize(c, required);
  const now = Date.now();
  const guard = capabilityGuard(userId, required, now);
  const result = await c
    .get('db')
    .prepare(
      `UPDATE circuits SET name=?,content=?,version=version+1,updated_at=? WHERE id=? AND user_id=? AND version=?${guard.sql}`,
    )
    .bind(name, JSON.stringify(circuit), now, c.req.param('id'), userId, version, ...guard.args)
    .run();
  if (!result.meta.changes)
    throw new HTTPException(409, {
      message: 'Circuit or membership changed; reload before retrying',
    });
  return c.json({ id: c.req.param('id'), name, version: version + 1, updatedAt: now });
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
