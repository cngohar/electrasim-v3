/** Gate B only: isolated local D1 migrations/constraints, not HTTP or action acceptance. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { D1Database } from '@cloudflare/workers-types';
import { getPlatformProxy } from 'wrangler';

mkdirSync('.wrangler', { recursive: true });
const directory = mkdtempSync(resolve('.wrangler/publication-storage-'));
const migrationsDir = `${directory}/migrations`;
mkdirSync(migrationsDir);
const migrationName = '0011_publications.sql';
const migrations = readdirSync('migrations')
  .filter((file) => file.endsWith('.sql') && file <= '0011_publications.sql')
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
    name: 'electrasim-publication-storage-local',
    compatibility_date: '2024-09-23',
    send_metrics: false,
    workers_dev: false,
    preview_urls: false,
    d1_databases: [
      {
        binding: 'DB',
        database_name: 'publication-storage-test',
        database_id: 'local-publication-storage-test',
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
      "INSERT INTO user(id,name,email,updated_at) VALUES('owner','Existing owner','owner@publication.test',1)",
    ),
    db.prepare(
      "INSERT INTO user(id,name,email,updated_at) VALUES('reporter','Existing reporter','reporter@publication.test',1)",
    ),
    db.prepare(
      "INSERT INTO circuits(id,user_id,name,content,created_at,updated_at) VALUES('private','owner','Private circuit','{\"components\":[],\"wires\":[]}',1,1)",
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
    'populated 0010→0011 upgrade preserves every previous table and private circuit',
    async () => {
      for (const table of tables) assert.deepEqual(await rows(db, table), before.get(table), table);
    },
  );
  const insertPublication = (id: string, source = id) =>
    db
      .prepare(
        "INSERT INTO publications(id,owner_id,source_circuit_id,slug,mutation_id,published_at,updated_at) VALUES(?,'owner',?,?,'fixture',1,1)",
      )
      .bind(id, source, `learning-circuit-${id}`);
  const insertVersion = (id: string, pub: string, n: number) =>
    db
      .prepare(
        "INSERT INTO publication_versions(id,publication_id,version_number,title,description,tags_json,allow_forks,circuit_json,circuit_schema_version,requirements_json,component_policy_revision,model_version,engine_version,control_engine_version,fingerprint,validated_at,source_version,created_by,created_at) VALUES(?,?,?,'Learning circuit','','[]',1,'{\"components\":[],\"wires\":[]}',3,'[]',1,'model','engine','control',?,1,1,'owner',1)",
      )
      .bind(id, pub, n, 'a'.repeat(64));
  await db.batch([
    insertPublication('first'),
    insertVersion('version1', 'first', 1),
    db.prepare("UPDATE publications SET current_version_id='version1' WHERE id='first'"),
  ]);
  await check(
    'snapshots reject update, delete, same-ID replacement and number replacement',
    async () => {
      for (const sql of [
        "UPDATE publication_versions SET title='Changed' WHERE id='version1'",
        "DELETE FROM publication_versions WHERE id='version1'",
      ])
        await assert.rejects(db.prepare(sql).run());
      await assert.rejects(insertVersion('version1', 'first', 2).run());
      await assert.rejects(insertVersion('different', 'first', 1).run());
    },
  );
  await check(
    'publication identity and retained tombstones cannot be deleted or replaced',
    async () => {
      for (const sql of [
        "UPDATE publications SET slug='different-public-slug' WHERE id='first'",
        "UPDATE publications SET source_circuit_id='another' WHERE id='first'",
        "UPDATE publications SET owner_id='reporter' WHERE id='first'",
        "DELETE FROM publications WHERE id='first'",
      ])
        await assert.rejects(db.prepare(sql).run());
      await assert.rejects(insertPublication('first').run());
      await assert.rejects(insertPublication('duplicate', 'first').run());
    },
  );
  await check(
    'current pointers reject versions from another publication and invalid references',
    async () => {
      await db.batch([
        insertPublication('second'),
        insertVersion('version2', 'second', 1),
        db.prepare("UPDATE publications SET current_version_id='version2' WHERE id='second'"),
      ]);
      await assert.rejects(
        db.prepare("UPDATE publications SET current_version_id='version2' WHERE id='first'").run(),
      );
      await assert.rejects(
        db.prepare("UPDATE publications SET current_version_id=NULL WHERE id='first'").run(),
      );
    },
  );
  await check('deleting a private working copy preserves publication versions', async () => {
    await db.prepare("DELETE FROM circuits WHERE id='private'").run();
    assert.equal((await rows(db, 'publication_versions')).length, 2);
  });
  await check(
    'integer revisions, provenance, tags and removed states enforce storage boundaries',
    async () => {
      for (const assignment of [
        'revision=0',
        'revision=1.5',
        "status='org'",
        "moderation='approved'",
        'updated_at=0',
      ])
        await assert.rejects(
          db.prepare(`UPDATE publications SET ${assignment} WHERE id='first'`).run(),
        );
      await db
        .prepare("UPDATE publications SET status='deleted',moderation='removed' WHERE id='first'")
        .run();
      await assert.rejects(
        db.prepare("UPDATE publications SET status='published' WHERE id='first'").run(),
      );
      await assert.rejects(
        db.prepare("UPDATE publications SET moderation='visible' WHERE id='first'").run(),
      );
      await assert.rejects(insertVersion('version3', 'first', 2).run());
      await assert.rejects(
        db.prepare("INSERT INTO publication_tags VALUES('second','UPPER')").run(),
      );
    },
  );
  await check(
    'report constraints prevent duplicate, self, mismatched version and incomplete outcomes',
    async () => {
      const report = (id: string, reporter = 'reporter', version = 'version2') =>
        db
          .prepare(
            "INSERT INTO publication_reports(id,reporter_id,publication_id,version_id,reason,details,created_at,updated_at) VALUES(?,?,'second',?,'Spam','Review fixture',1,1)",
          )
          .bind(id, reporter, version);
      await report('report').run();
      await assert.rejects(report('duplicate').run());
      await assert.rejects(report('self', 'owner').run());
      await assert.rejects(report('mismatch', 'reporter', 'version1').run());
      await assert.rejects(
        db.prepare("UPDATE publication_reports SET status='resolved' WHERE id='report'").run(),
      );
    },
  );
  await check(
    'failed snapshot batch rolls back publication, versions, tags and quota atomically',
    async () => {
      const before = await rows(db, 'publications');
      const versions = await rows(db, 'publication_versions');
      await assert.rejects(
        db.batch([
          insertPublication('rollback'),
          insertVersion('rollback-version', 'rollback', 1),
          db.prepare("INSERT INTO publication_tags VALUES('rollback','lighting')"),
          db.prepare("INSERT INTO publication_write_windows VALUES('owner',0,1)"),
          db.prepare("UPDATE publications SET revision=0 WHERE id='rollback'"),
        ]),
      );
      assert.deepEqual(await rows(db, 'publications'), before);
      assert.deepEqual(await rows(db, 'publication_versions'), versions);
      assert.deepEqual(await rows(db, 'publication_tags'), []);
      assert.deepEqual(await rows(db, 'publication_write_windows'), []);
    },
  );
  writeFileSync(
    `${directory}/result.json`,
    JSON.stringify({ status: 'passed', groups: passed }, null, 2),
  );
  console.log(`Publication storage: ${passed.length} groups passed. Evidence ${directory}`);
} finally {
  await proxy?.dispose();
}
