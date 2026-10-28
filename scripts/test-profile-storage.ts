/** Gate B only: isolated local D1 migrations/constraints, not HTTP or action acceptance. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { D1Database } from '@cloudflare/workers-types';
import { RESERVED_HANDLES } from '../src/community/profile-policy';
import { getPlatformProxy } from 'wrangler';

mkdirSync('.wrangler', { recursive: true });
const directory = mkdtempSync(resolve('.wrangler/profile-storage-'));
const migrationsDir = `${directory}/migrations`;
mkdirSync(migrationsDir);
const migrationName = '0010_profiles.sql';
const migrations = readdirSync('migrations')
  .filter((file) => file.endsWith('.sql') && file <= '0010_profiles.sql')
  .sort();
assert.equal(
  migrations.at(-1),
  migrationName,
  'Review migration allocation when the sequence changes',
);
for (const file of migrations.filter((file) => file !== migrationName)) {
  copyFileSync(`migrations/${file}`, `${migrationsDir}/${file}`);
}
const configPath = `${directory}/wrangler.json`;
// Explicit generated local binding: no inherited account, secrets or remote resources.
writeFileSync(
  configPath,
  JSON.stringify({
    name: 'electrasim-profile-storage-local',
    compatibility_date: '2024-09-23',
    send_metrics: false,
    workers_dev: false,
    preview_urls: false,
    d1_databases: [
      {
        binding: 'DB',
        database_name: 'profile-storage-test',
        database_id: 'local-profile-storage-test',
        remote: false,
        migrations_dir: migrationsDir,
      },
    ],
  }),
);
const persist = `${directory}/state`;
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !key.startsWith('CLOUDFLARE_') && !key.startsWith('CF_'),
  ),
);
env.WRANGLER_SEND_METRICS = 'false';
process.env.WRANGLER_SEND_METRICS = 'false';
function migrate(stage: string) {
  const result = spawnSync(
    'bun',
    [
      'x',
      'wrangler',
      'd1',
      'migrations',
      'apply',
      'DB',
      '--config',
      configPath,
      '--local',
      '--persist-to',
      persist,
    ],
    { env, encoding: 'utf8', timeout: 60_000 },
  );
  writeFileSync(`${directory}/${stage}.log`, `${result.stdout}\n${result.stderr}`);
  assert.equal(result.status, 0, `Local migration failed: ${directory}/${stage}.log`);
}
const open = () =>
  getPlatformProxy<{ DB: D1Database }>({
    configPath,
    // Proxy expects the versioned directory; CLI --persist-to appends /v3 itself.
    persist: { path: `${persist}/v3` },
    remoteBindings: false,
    envFiles: [],
  });
async function rows(db: D1Database, table: string) {
  assert.match(table, /^[a-z_][a-z0-9_]*$/);
  return (await db.withSession('first-primary').prepare(`SELECT * FROM "${table}"`).all()).results
    .map((row) => JSON.stringify(row))
    .sort();
}
const passed: string[] = [];
async function check(name: string, run: () => Promise<void>) {
  await run();
  passed.push(name);
  console.log(`PASS ${name}`);
}
let proxy: Awaited<ReturnType<typeof open>> | undefined;
try {
  migrate('before');
  proxy = await open();
  let db = proxy.env.DB;
  await db.batch([
    db.prepare(
      "INSERT INTO user(id,name,email,updated_at) VALUES('existing','Existing owner','local@profiles.test',1)",
    ),
    db.prepare(
      `INSERT INTO circuits(id,user_id,name,content,created_at,updated_at) VALUES('private','existing','Private circuit','{"components":[],"wires":[]}',1,1)`,
    ),
    db.prepare(
      "INSERT INTO plans(id,slug,name,description,no_expiry,status,mutation_id,created_at,updated_at,created_by,updated_by) VALUES('plan','local-plan','{}','{}',1,'active','fixture',1,1,'existing','existing')",
    ),
    db.prepare(
      "INSERT INTO entitlements(id,user_id,plan_id,status,starts_at,no_expiry,reason,mutation_id,created_at,updated_at,created_by,updated_by) VALUES('grant','existing','plan','active',0,1,'Local fixture','fixture',1,1,'existing','existing')",
    ),
    db.prepare(
      "INSERT INTO admin_audit(id,namespace,actor_id,action,target_type,target_id,reason,request_id,created_at,version) VALUES('old','platform','existing','fixture','user','existing','Local fixture','test',1,1)",
    ),
  ]);
  const tables = (
    await db
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name!='d1_migrations' ORDER BY name",
      )
      .all<{ name: string }>()
  ).results.map((r) => r.name);
  const before = new Map<string, string[]>();
  for (const table of tables) before.set(table, await rows(db, table));
  await proxy.dispose();
  proxy = undefined;
  copyFileSync(`migrations/${migrationName}`, `${migrationsDir}/${migrationName}`);
  migrate('upgrade');
  proxy = await open();
  db = proxy.env.DB;
  await check(
    'populated 0009→0010 upgrade preserves every prior table, private circuit, grant, component policy and audit',
    async () => {
      for (const table of tables) assert.deepEqual(await rows(db, table), before.get(table), table);
    },
  );
  await check(
    'existing and newly inserted accounts have unclaimed private profiles with optional fields hidden',
    async () => {
      await db
        .prepare(
          "INSERT INTO user(id,name,email,updated_at) VALUES('new','New owner','new@profiles.test',1)",
        )
        .run();
      for (const id of ['existing', 'new']) {
        const row = await db.prepare('SELECT * FROM profiles WHERE user_id=?').bind(id).first();
        assert(row);
        assert.equal(row.handle, null);
        assert.equal(row.profile_visibility, 'private');
        assert.equal(row.moderation, 'visible');
        assert.equal(row.show_institution, 0);
        assert.equal(row.show_level, 0);
        assert.equal(row.avatar_key, null);
      }
    },
  );
  await check(
    'exact code-owned reserved handles cannot be inserted, deleted, replaced or changed',
    async () => {
      const rows = (
        await db
          .prepare('SELECT handle FROM profile_reserved_handles ORDER BY handle')
          .all<{ handle: string }>()
      ).results.map((r) => r.handle);
      assert.deepEqual(rows, [...RESERVED_HANDLES].sort());
      for (const sql of [
        "INSERT INTO profile_reserved_handles VALUES('hijack')",
        "UPDATE profile_reserved_handles SET handle='different' WHERE handle='admin'",
        "DELETE FROM profile_reserved_handles WHERE handle='admin'",
        "INSERT OR REPLACE INTO profile_reserved_handles VALUES('admin')",
      ]) {
        await assert.rejects(db.prepare(sql).run());
      }
      await assert.rejects(
        db.prepare("UPDATE profiles SET handle='admin' WHERE user_id='existing'").run(),
      );
    },
  );
  await check(
    'database rejects invalid handles and concurrent claims have exactly one winner',
    async () => {
      for (const handle of ['ABc', 'ab', '9wrong', 'hello-world', 'café', 'foo.bar'])
        await assert.rejects(
          db.prepare('UPDATE profiles SET handle=? WHERE user_id=?').bind(handle, 'existing').run(),
        );
      const outcomes = await Promise.allSettled(
        ['existing', 'new'].map((id) =>
          db
            .prepare(
              "UPDATE profiles SET handle='unique_builder' WHERE user_id=? AND handle IS NULL",
            )
            .bind(id)
            .run(),
        ),
      );
      assert.equal(outcomes.filter((r) => r.status === 'fulfilled').length, 1);
      assert.equal(outcomes.filter((r) => r.status === 'rejected').length, 1);
    },
  );
  await check(
    'claimed handles and removed tombstones survive update, NULL, delete and replacement attempts',
    async () => {
      const p = await db
        .prepare("SELECT user_id FROM profiles WHERE handle='unique_builder'")
        .first<{ user_id: string }>();
      assert(p);
      for (const sql of [
        "UPDATE profiles SET handle='renamed' WHERE user_id=?",
        'UPDATE profiles SET handle=NULL WHERE user_id=?',
        'DELETE FROM profiles WHERE user_id=?',
        'INSERT OR REPLACE INTO profiles(user_id,created_at,updated_at) VALUES(?,0,0)',
      ])
        await assert.rejects(db.prepare(sql).bind(p.user_id).run());
      await db
        .prepare("UPDATE profiles SET moderation='removed' WHERE user_id=?")
        .bind(p.user_id)
        .run();
      await assert.rejects(
        db
          .prepare("UPDATE profiles SET moderation='visible' WHERE user_id=?")
          .bind(p.user_id)
          .run(),
      );
    },
  );
  await check(
    'flags, limits, integer revisions, references and timestamps reject invalid values',
    async () => {
      for (const assignment of [
        'show_level=2',
        "profile_visibility='org'",
        "moderation='approved'",
        'revision=0',
        'revision=1.5',
        "display_name=''",
        "bio=printf('%0281d',1)",
        'created_at=-1',
        'updated_at=0',
      ]) {
        await assert.rejects(
          db.prepare(`UPDATE profiles SET ${assignment} WHERE user_id='existing'`).run(),
        );
      }
      await assert.rejects(
        db.prepare("INSERT INTO profile_avatar_garbage VALUES('unowned','missing',0)").run(),
      );
    },
  );
  await check(
    'profile report constraints deduplicate reporters, reject self-reports and require complete outcomes',
    async () => {
      await db
        .prepare(
          "INSERT INTO profile_reports(id,reporter_id,target_user_id,reason,details,created_at,updated_at) VALUES('report','existing','new','Spam','Review sample',1,1)",
        )
        .run();
      await assert.rejects(
        db
          .prepare(
            "INSERT INTO profile_reports(id,reporter_id,target_user_id,reason,details,created_at,updated_at) VALUES('duplicate','existing','new','Spam','Again',1,1)",
          )
          .run(),
      );
      await assert.rejects(
        db
          .prepare(
            "INSERT INTO profile_reports(id,reporter_id,target_user_id,reason,details,created_at,updated_at) VALUES('self','new','new','Spam','Review',1,1)",
          )
          .run(),
      );
      await assert.rejects(
        db.prepare("UPDATE profile_reports SET status='resolved' WHERE id='report'").run(),
      );
      await db
        .prepare(
          "UPDATE profile_reports SET status='dismissed',resolution='Reviewed sample report',resolved_by='existing' WHERE id='report'",
        )
        .run();
    },
  );
  await check(
    'failed batch rolls back profile changes, cleanup markers and audit together',
    async () => {
      const before = await rows(db, 'profiles');
      const audit = await rows(db, 'admin_audit');
      await assert.rejects(
        db.batch([
          db.prepare("UPDATE profiles SET bio='Uncommitted edit' WHERE user_id='new'"),
          db.prepare("INSERT INTO profile_avatar_garbage VALUES('pending','new',0)"),
          db.prepare(
            "INSERT INTO admin_audit(id,namespace,actor_id,action,target_type,target_id,reason,request_id,created_at,version) VALUES('test','community','new','fixture','profile','new','Local fixture','test',1,1)",
          ),
          db.prepare("UPDATE profiles SET show_level=9 WHERE user_id='new'"),
        ]),
      );
      assert.deepEqual(await rows(db, 'profiles'), before);
      assert.deepEqual(await rows(db, 'admin_audit'), audit);
      assert.equal((await rows(db, 'profile_avatar_garbage')).length, 0);
    },
  );
  writeFileSync(
    `${directory}/result.json`,
    JSON.stringify({ status: 'passed', groups: passed }, null, 2),
  );
  console.log(`Profile storage: ${passed.length} groups passed. Evidence ${directory}`);
} finally {
  await proxy?.dispose();
}
