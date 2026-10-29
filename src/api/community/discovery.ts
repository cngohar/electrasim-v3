import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { type ApiEnv, freshContext, requireSession } from '../context';
import { discoveryPage, recheckDiscovery } from './discovery-store';

export const discoveryApi = new Hono<ApiEnv>();
for (const path of ['/community/explore', '/community/search', '/community/feed'])
  discoveryApi.use(path, freshContext);
discoveryApi.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  console.error(
    JSON.stringify({ event: 'discovery_request_failed', requestId: c.get('requestId') }),
  );
  return c.json({ error: 'Circuit discovery unavailable; try again' }, 503);
});

for (const path of ['/community/explore', '/community/search'])
  discoveryApi.get(path, async (c) => {
    const page = await discoveryPage(c, 'explore', c.req.query());
    await recheckDiscovery(c, page.rows, 'explore');
    return c.json({ items: page.items, nextCursor: page.nextCursor });
  });
discoveryApi.get('/community/feed', requireSession, async (c) => {
  const query = c.req.query();
  const scope = query.view === 'mine' ? 'mine' : 'following';
  if (query.view !== undefined && !['mine', 'following'].includes(query.view))
    throw new HTTPException(400, { message: 'Invalid feed view' });
  const { view: _view, ...filters } = query;
  const page = await discoveryPage(c, scope, filters);
  await recheckDiscovery(c, page.rows, scope);
  return c.json({ items: page.items, nextCursor: page.nextCursor, view: scope });
});
