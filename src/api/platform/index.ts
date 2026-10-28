import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { type AdminRegistry, adminRegistry } from '../../platform/registry';
import { type ApiEnv, freshContext, requireSession, sameOriginMutation } from '../context';
import { adminAccess } from './access';
import { registerComponents } from './components';
import { registerControls } from './controls';
import { registerProfiles } from './profiles';
import { registerPublications } from './publications';
import { registerReads } from './reads';
import { registerRoles } from './roles';

export function createAdminApi(registry: AdminRegistry = adminRegistry) {
  const api = new Hono<ApiEnv>();
  for (const path of [
    '/access',
    '/overview',
    '/users',
    '/users/*',
    '/roles',
    '/roles/*',
    '/permissions',
    '/settings/*',
    '/audit',
    '/standards',
    '/components',
    '/components/*',
    '/community/*',
  ]) {
    api.use(
      path,
      freshContext,
      requireSession,
      sameOriginMutation,
      bodyLimit({ maxSize: 32 * 1024, onError: (c) => c.json({ error: 'Body too large' }, 413) }),
    );
  }
  api.onError((error, c) => {
    if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
    console.error('Platform administration request failed', c.get('requestId'));
    return c.json({ error: 'Administration unavailable; try again' }, 503);
  });
  api.get('/access', async (c) => c.json(await adminAccess(c, undefined, registry)));
  registerReads(api, registry);
  registerRoles(api, registry);
  registerControls(api, registry);
  registerComponents(api, registry);
  registerProfiles(api, registry);
  registerPublications(api, registry);
  return api;
}
