/** Gate B only: isolated local D1 migrations/constraints, not HTTP or action acceptance. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { D1Database } from '@cloudflare/workers-types';
import {
  COMPONENT_ACCESS_BASELINE,
  PROTECTED_BASIC_COMPONENT_IDS,
  componentAccess,
  validateComponentPolicy,
} from '@electrasim/access';
import { getPlatformProxy } from 'wrangler';

mkdirSync('.wrangler', { recursive: true });
const directory = mkdtempSync(resolve('.wrangler/component-storage-'));
const migrationsDir = `${directory}/migrations`;
mkdirSync(migrationsDir);
const migrationName = '0009_component_access.sql';
const migrations = readdirSync('migrations')
  .filter((file) => file.endsWith('.sql') && file <= '0009_component_access.sql')
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
    name: 'electrasim-component-storage-local',
    compatibility_date: '2024-09-23',
    send_metrics: false,
    workers_dev: false,
    preview_urls: false,
    d1_databases: [
      {
        binding: 'DB',
        database_name: 'component-storage-test',
        database_id: 'local-component-storage-test',
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
async function check(name: string, work: () => Promise<void>) {
  await work();
  passed.push(name);
  console.log(`PASS ${name}`);
}
let proxy: Awaited<ReturnType<typeof open>> | undefined;
let complete = false;
try {
  migrate('before');
  proxy = await open();
  const beforeDb = proxy.env.DB;
  const fixture = [
    `INSERT INTO user (id,name,email,updated_at,global_role) VALUES ('owner','Local owner','owner@component.test',1,'super_admin')`,
    `INSERT INTO circuits (id,user_id,name,content,created_at,updated_at) VALUES ('private','owner','Original circuit','{"components":[{"type":"afdd"}],"wires":[]}',1,1)`,
    `INSERT INTO diagnosis_attempts (id,user_id,scenario,circuit,progress,created_at,updated_at) VALUES ('historical','owner','{}','{}','{}',1,1)`,
    `INSERT INTO plans (id,slug,name,description,no_expiry,status,mutation_id,created_at,updated_at,created_by,updated_by) VALUES ('plan','local-plan','{}','{}',1,'active','fixture',1,1,'owner','owner')`,
    `INSERT INTO plan_features (plan_id,feature_key,enabled,config) VALUES ('plan','pro_components',1,'{}')`,
    `INSERT INTO entitlements (id,user_id,plan_id,status,starts_at,no_expiry,reason,mutation_id,created_at,updated_at,created_by,updated_by) VALUES ('grant','owner','plan','active',0,1,'Local fixture','fixture',1,1,'owner','owner')`,
    `INSERT INTO audit_logs (id,actor_id,action,target_type,target_id,reason,request_id,created_at) VALUES ('membership-event','owner','fixture','membership','grant','Local fixture','local',1)`,
    `INSERT INTO admin_roles (id,name,version,updated_at) VALUES ('custom','Local staff role',1,1)`,
    `INSERT INTO admin_user_roles (user_id,role_id) VALUES ('owner','custom')`,
    `INSERT INTO admin_audit (id,namespace,actor_id,action,target_type,target_id,reason,request_id,created_at,version) VALUES ('staff-event','platform','owner','fixture','user','owner','Local fixture','local',1,1)`,
  ];
  await beforeDb.batch(fixture.map((sql) => beforeDb.prepare(sql)));
  const tables = (
    await beforeDb
      .prepare(
        "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations' ORDER BY name",
      )
      .all<{ name: string }>()
  ).results.map(({ name }) => name);
  const before = new Map<string, string[]>();
  for (const table of tables) before.set(table, await rows(beforeDb, table));
  await proxy.dispose();
  proxy = undefined;
  copyFileSync(`migrations/${migrationName}`, `${migrationsDir}/${migrationName}`);
  migrate('upgrade');
  proxy = await open();
  const db = proxy.env.DB;
  const primary = db.withSession('first-primary');
  await check(
    'populated upgrade preserves all existing rows, private content, grants and audits',
    async () => {
      for (const table of tables) assert.deepEqual(await rows(db, table), before.get(table), table);
    },
  );
  await check(
    'primary reads expose exact immutable 75/41 baseline, empty overrides and revision 1',
    async () => {
      const actual = await primary
        .prepare(
          'SELECT component_id AS id, original_tier AS originalTier FROM component_access_baseline ORDER BY component_id',
        )
        .all();
      assert.deepEqual(actual.results, COMPONENT_ACCESS_BASELINE);
      assert.deepEqual(await rows(db, 'component_access_overrides'), []);
      assert.equal(
        await primary
          .prepare('SELECT revision FROM component_access_revision WHERE id = 1')
          .first('revision'),
        1,
      );
      const policy = validateComponentPolicy({
        schemaVersion: 1,
        classificationVersion: 1,
        revision: 1,
        components: COMPONENT_ACCESS_BASELINE.map(({ id, originalTier }) => ({
          id,
          access: originalTier === 'basic' ? 'free' : 'pro',
        })),
      });
      for (const item of COMPONENT_ACCESS_BASELINE)
        assert.equal(componentAccess(item.id, policy), componentAccess(item.id));
    },
  );
  await check(
    'baseline rejects UPDATE, DELETE and INSERT OR REPLACE for every existing ID',
    async () => {
      for (const { id } of COMPONENT_ACCESS_BASELINE) {
        for (const sql of [
          "UPDATE component_access_baseline SET original_tier = 'pro' WHERE component_id = ?",
          'DELETE FROM component_access_baseline WHERE component_id = ?',
          "INSERT OR REPLACE INTO component_access_baseline (component_id,original_tier) VALUES (?,'pro')",
        ])
          await assert.rejects(primary.prepare(sql).bind(id).run(), /immutable/);
      }
    },
  );
  const insert = (
    id: string,
    access = 'free',
    version = 1,
    actor = 'owner',
    created = 1,
    updated = 1,
  ) =>
    primary
      .prepare(
        'INSERT INTO component_access_overrides (component_id,access,version,actor_id,created_at,updated_at) VALUES (?,?,?,?,?,?)',
      )
      .bind(id, access, version, actor, created, updated);
  await check(
    'all protected Basic IDs reject Free and Pro override inserts; unknown IDs reject',
    async () => {
      for (const id of PROTECTED_BASIC_COMPONENT_IDS) {
        for (const access of ['free', 'pro'])
          await assert.rejects(insert(id, access).run(), /originally Pro/);
      }
      await assert.rejects(insert('unknown').run(), /originally Pro/);
    },
  );
  await check(
    'Pro overrides support Free then Pro while target changes to Basic/unknown reject',
    async () => {
      await insert('afdd').run();
      for (const id of [...PROTECTED_BASIC_COMPONENT_IDS, 'unknown']) {
        await assert.rejects(
          primary
            .prepare(
              'UPDATE component_access_overrides SET component_id = ? WHERE component_id = ?',
            )
            .bind(id, 'afdd')
            .run(),
          /originally Pro/,
        );
      }
      await primary
        .prepare(
          "UPDATE component_access_overrides SET access = 'pro', version = 2, updated_at = 2 WHERE component_id = 'afdd'",
        )
        .run();
      assert.equal(
        await primary
          .prepare("SELECT access FROM component_access_overrides WHERE component_id = 'afdd'")
          .first('access'),
        'pro',
      );
    },
  );
  await check(
    'override enum, safe integers, timestamps and actor foreign key reject invalid rows',
    async () => {
      for (const statement of [
        insert('mccb', 'basic'),
        insert('mccb', 'free', 0),
        insert('mccb', 'free', 1.5),
        insert('mccb', 'free', Number.MAX_SAFE_INTEGER + 1),
        insert('mccb', 'free', 1, 'missing'),
        insert('mccb', 'free', 1, 'owner', -1),
        insert('mccb', 'free', 1, 'owner', 1.5, 2),
        insert('mccb', 'free', 1, 'owner', 2, 1),
        insert('mccb', 'free', 1, 'owner', 1, Number.MAX_SAFE_INTEGER + 1),
      ])
        await assert.rejects(statement.run(), /constraint failed/i);
    },
  );
  await check(
    'policy revision is a positive safe integer singleton independent of admin version',
    async () => {
      for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
        await assert.rejects(
          primary
            .prepare('UPDATE component_access_revision SET revision = ? WHERE id = 1')
            .bind(value)
            .run(),
          /constraint failed/i,
        );
      }
      await assert.rejects(
        primary.prepare('INSERT INTO component_access_revision (id,revision) VALUES (2,1)').run(),
        /constraint failed/i,
      );
      await primary
        .prepare('UPDATE component_access_revision SET revision = revision + 1 WHERE id = 1')
        .run();
      assert.equal(
        await primary.prepare('SELECT version FROM admin_revision WHERE id = 1').first('version'),
        1,
      );
    },
  );
  await check(
    'D1 batch rolls back policy revision, override and appended audit on constraint failure',
    async () => {
      const watched = [
        'component_access_revision',
        'component_access_overrides',
        'admin_revision',
        'admin_audit',
      ];
      const previous = await Promise.all(watched.map((table) => rows(db, table)));
      await assert.rejects(
        primary.batch([
          primary.prepare(
            'UPDATE component_access_revision SET revision = revision + 1 WHERE id = 1',
          ),
          primary.prepare('UPDATE admin_revision SET version = version + 1 WHERE id = 1'),
          insert('mccb'),
          primary.prepare(
            "INSERT INTO admin_audit (id,namespace,actor_id,action,target_type,target_id,reason,request_id,created_at,version) VALUES ('rollback','catalog','owner','catalog.components.access.update','component','mccb','Local rollback fixture','local',2,2)",
          ),
          insert('bulb', 'pro'),
        ]),
        /originally Pro/,
      );
      assert.deepEqual(await Promise.all(watched.map((table) => rows(db, table))), previous);
    },
  );
  complete = true;
  console.log(`Gate B local D1: ${passed.length} groups passed. Evidence: ${directory}`);
} finally {
  await proxy?.dispose();
  writeFileSync(
    `${directory}/result.json`,
    JSON.stringify(
      { scope: '2.0A gate B storage only; no HTTP/UI/action acceptance', complete, passed },
      null,
      2,
    ),
  );
}
