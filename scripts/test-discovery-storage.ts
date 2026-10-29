/** Populated 0011→0012 local D1 upgrade and FTS synchronization. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { D1Database } from '@cloudflare/workers-types';
import { getPlatformProxy } from 'wrangler';

mkdirSync('.wrangler', { recursive: true });
const directory = mkdtempSync(resolve('.wrangler/discovery-storage-'));
const migrationsDir = `${directory}/migrations`;
mkdirSync(migrationsDir);
const files = readdirSync('migrations')
  .filter((file) => file.endsWith('.sql') && file <= '0012_discovery.sql')
  .sort();
assert.equal(files.at(-1), '0012_discovery.sql');
for (const file of files.filter((file) => file !== '0012_discovery.sql'))
  copyFileSync(`migrations/${file}`, `${migrationsDir}/${file}`);
const configPath = `${directory}/wrangler.json`;
writeFileSync(
  configPath,
  JSON.stringify({
    name: 'electrasim-discovery-storage-local',
    compatibility_date: '2024-09-23',
    send_metrics: false,
    workers_dev: false,
    preview_urls: false,
    d1_databases: [
      {
        binding: 'DB',
        database_name: 'discovery-storage',
        database_id: 'local-discovery-storage',
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
    { env, encoding: 'utf8', timeout: 90000 },
  );
  writeFileSync(`${directory}/${stage}.log`, `${result.stdout}\n${result.stderr}`);
  assert.equal(result.status, 0, `Local ${stage} migration failed: ${directory}/${stage}.log`);
}
const open = () =>
  getPlatformProxy<{ DB: D1Database }>({
    configPath,
    persist: { path: `${persist}/v3` },
    remoteBindings: false,
    envFiles: [],
  });
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
      "INSERT INTO user(id,name,email,created_at,updated_at) VALUES('owner','Owner','owner@discovery.test',1,1)",
    ),
    db.prepare(
      "INSERT INTO user(id,name,email,created_at,updated_at) VALUES('follower','Follower','follower@discovery.test',1,1)",
    ),
    db.prepare(
      "UPDATE profiles SET handle='owner',profile_visibility='public',display_name='Owner Person' WHERE user_id='owner'",
    ),
    db.prepare(
      "INSERT INTO circuits(id,user_id,name,content,created_at,updated_at) VALUES('private','owner','Private circuit','{\"components\":[],\"wires\":[]}',1,1)",
    ),
    db.prepare(
      "INSERT INTO publications(id,owner_id,source_circuit_id,slug,mutation_id,published_at,updated_at) VALUES('first','owner','private','sample-circuit-first','initial',1,1)",
    ),
    db
      .prepare(
        "INSERT INTO publication_versions(id,publication_id,version_number,title,description,tags_json,allow_forks,circuit_json,circuit_schema_version,requirements_json,component_policy_revision,model_version,engine_version,control_engine_version,fingerprint,validated_at,source_version,created_by,created_at) VALUES('v1','first',1,'Relay learning','A fixed relay description','[\"switching\"]',1,'{\"components\":[],\"wires\":[]}',3,'[]',1,'model','engine','control',?,1,1,'owner',1)",
      )
      .bind('a'.repeat(64)),
    db.prepare("UPDATE publications SET current_version_id='v1' WHERE id='first'"),
    db.prepare("INSERT INTO publication_tags(publication_id,tag) VALUES('first','switching')"),
  ]);
  await proxy.dispose();
  proxy = undefined;
  copyFileSync('migrations/0012_discovery.sql', `${migrationsDir}/0012_discovery.sql`);
  migrate('upgrade');
  proxy = await open();
  db = proxy.env.DB;
  const fts = async (q: string) =>
    (
      await db
        .prepare('SELECT rowid,title FROM publication_fts WHERE publication_fts MATCH ?')
        .bind(q)
        .all<{ rowid: number; title: string }>()
    ).results;
  const rows = async () =>
    (
      await db
        .prepare(
          'SELECT publication_id,version_id,author_handle,zone,standard FROM publication_discovery',
        )
        .all<{
          publication_id: string;
          version_id: string;
          author_handle: string;
          zone: string;
          standard: string;
        }>()
    ).results;
  await check(
    'populated upgrade preserves private source and indexes current visible version',
    async () => {
      assert.equal(
        (await db.prepare("SELECT name FROM circuits WHERE id='private'").first<{ name: string }>())
          ?.name,
        'Private circuit',
      );
      assert.deepEqual(await rows(), [
        {
          publication_id: 'first',
          version_id: 'v1',
          author_handle: 'owner',
          zone: 'general',
          standard: 'int',
        },
      ]);
      assert.equal((await fts('relay'))[0]?.title, 'Relay learning');
      assert.equal((await fts('private')).length, 0);
    },
  );
  await check(
    'profile privacy and moderation remove author text while keeping visible circuit',
    async () => {
      await db
        .prepare(
          "UPDATE profiles SET profile_visibility='private',revision=revision+1 WHERE user_id='owner'",
        )
        .run();
      assert.equal((await rows())[0].author_handle, '');
      assert.equal((await fts('owner')).length, 0);
      assert.equal((await fts('relay')).length, 1);
      await db
        .prepare(
          "UPDATE profiles SET profile_visibility='public',revision=revision+1 WHERE user_id='owner'",
        )
        .run();
      assert.equal((await fts('owner')).length, 1);
    },
  );
  await check('hide, restore, new version and withdrawal synchronize FTS atomically', async () => {
    await db
      .prepare("UPDATE publications SET moderation='hidden',revision=revision+1 WHERE id='first'")
      .run();
    assert.equal((await rows()).length, 0);
    assert.equal((await fts('relay')).length, 0);
    await db
      .prepare("UPDATE publications SET moderation='visible',revision=revision+1 WHERE id='first'")
      .run();
    assert.equal((await rows()).length, 1);
    await db
      .prepare(
        "INSERT INTO publication_versions(id,publication_id,version_number,title,description,tags_json,allow_forks,circuit_json,circuit_schema_version,requirements_json,component_policy_revision,model_version,engine_version,control_engine_version,fingerprint,validated_at,source_version,created_by,created_at) VALUES('v2','first',2,'Motor learning','A fixed motor description','[\"control\"]',1,'{\"components\":[],\"wires\":[]}',3,'[]',1,'model','engine','control',?,2,1,'owner',2)",
      )
      .bind('b'.repeat(64))
      .run();
    await db
      .prepare(
        "UPDATE publications SET current_version_id='v2',zone='control',standard='uk',revision=revision+1 WHERE id='first'",
      )
      .run();
    assert.equal((await fts('relay')).length, 0);
    assert.equal((await fts('motor')).length, 1);
    assert.equal((await rows())[0].version_id, 'v2');
    assert.equal((await rows())[0].zone, 'control');
    await db
      .prepare("UPDATE publications SET status='unpublished',revision=revision+1 WHERE id='first'")
      .run();
    assert.equal((await rows()).length, 0);
    assert.equal((await fts('motor')).length, 0);
  });
  await check(
    'invalid discovery labels and self-follow fail without changing the current row',
    async () => {
      await assert.rejects(
        db.prepare("UPDATE publications SET zone='unsafe' WHERE id='first'").run(),
      );
      await assert.rejects(
        db
          .prepare(
            "INSERT INTO follows(follower_id,followed_id,created_at) VALUES('owner','owner',1)",
          )
          .run(),
      );
      assert.equal(
        (
          await db
            .prepare("SELECT zone FROM publications WHERE id='first'")
            .first<{ zone: string }>()
        )?.zone,
        'control',
      );
    },
  );
  await check('FTS and recent-page plans use their indexes', async () => {
    const search = (
      await db
        .prepare(
          "EXPLAIN QUERY PLAN SELECT rowid FROM publication_fts WHERE publication_fts MATCH 'motor'",
        )
        .all<{ detail: string }>()
    ).results;
    const recent = (
      await db
        .prepare(
          'EXPLAIN QUERY PLAN SELECT publication_id FROM publication_discovery ORDER BY published_at DESC,publication_id DESC LIMIT 12',
        )
        .all<{ detail: string }>()
    ).results;
    assert(search.some((r) => r.detail.includes('VIRTUAL TABLE INDEX')));
    assert(recent.some((r) => r.detail.includes('publication_discovery_recent')));
  });
  console.log(`Discovery storage groups: ${passed.length}; evidence: ${directory}`);
} finally {
  await proxy?.dispose();
}
