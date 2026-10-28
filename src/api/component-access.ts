import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { readComponentPolicy } from './component-access-store';
import { type ApiEnv, freshContext } from './context';

export const componentAccessApi = new Hono<ApiEnv>();
componentAccessApi.use('*', freshContext);
componentAccessApi.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  console.error('Component policy request failed', c.get('requestId'));
  return c.json({ error: 'Component access policy unavailable' }, 503);
});
componentAccessApi.get('/component-access', async (c) => c.json(await readComponentPolicy(c)));
