/** Explicit local operator bootstrap. This never creates a user or touches a remote binding. */
import { resolve } from 'node:path';
import type { D1Database } from '@cloudflare/workers-types';
import { getPlatformProxy } from 'wrangler';

const args = process.argv.slice(2);
let email: string | undefined;
let persistTo = '.wrangler/state';
let configPath = 'wrangler.jsonc';
let local = false;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--local') local = true;
  else if (args[i] === '--email') email = args[++i];
  else if (args[i] === '--persist-to') persistTo = args[++i];
  else if (args[i] === '--config') configPath = args[++i];
  else throw new Error(`Unsupported argument: ${args[i]}`);
}
if (!local || !email?.includes('@') || !persistTo || !configPath) {
  throw new Error(
    'Usage: bun run bootstrap:super-admin --local --email known-user@example.test [--persist-to .wrangler/state]',
  );
}
const proxy = await getPlatformProxy<{ DB: D1Database }>({
  configPath,
  persist: { path: resolve(persistTo, 'v3') },
  remoteBindings: false,
  envFiles: [],
});
try {
  const db = proxy.env.DB;
  const user = await db
    .prepare('SELECT id, global_role FROM user WHERE email = ?')
    .bind(email.toLowerCase())
    .first<{ id: string; global_role: string }>();
  if (!user) throw new Error('Known local user not found. Register that account locally first.');
  if (user.global_role === 'super_admin') {
    console.log('This local user is already a super admin; nothing changed.');
  } else {
    const id = crypto.randomUUID();
    const now = Date.now();
    const eligible =
      "id = ? AND global_role = 'individual' AND NOT EXISTS (SELECT 1 FROM user WHERE global_role = 'super_admin')";
    const result = await db.batch([
      db
        .prepare(`INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before_json, after_json, reason, request_id, created_at)
        SELECT ?, 'local-operator', 'user.bootstrap', 'user', id, ?, ?, 'Explicit first-super-admin bootstrap', ?, ? FROM user WHERE ${eligible}`)
        .bind(
          id,
          JSON.stringify({ globalRole: 'individual' }),
          JSON.stringify({ globalRole: 'super_admin' }),
          id,
          now,
          user.id,
        ),
      db
        .prepare(`UPDATE user SET global_role = 'super_admin', updated_at = ? WHERE ${eligible}`)
        .bind(now, user.id),
    ]);
    if (result[1].meta.changes !== 1)
      throw new Error(
        'Bootstrap refused: a super admin exists, or the selected user is not an individual.',
      );
    console.log('First local super admin assigned; operator action audited.');
  }
} finally {
  await proxy.dispose();
}
