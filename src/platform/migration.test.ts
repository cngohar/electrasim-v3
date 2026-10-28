// @vitest-environment node
import { readFileSync, readdirSync } from 'node:fs';
import Database from 'better-sqlite3';
import { expect, it } from 'vitest';

it('0007 and 0008 preserve existing identities, private documents, grants and membership audit', () => {
  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys = ON');
    for (const file of readdirSync('migrations')
      .filter((name) => /^000[0-6]_.*\.sql$/.test(name))
      .sort())
      db.exec(readFileSync(`migrations/${file}`, 'utf8'));
    db.exec(`
      INSERT INTO user(id,name,email,email_verified,created_at,updated_at,global_role) VALUES ('legacy-user','Legacy user','legacy@migration.test',0,1,1,'individual');
      INSERT INTO circuits(id,user_id,name,content,version,created_at,updated_at) VALUES ('legacy-circuit','legacy-user','Private working copy','{"private":"preserved"}',7,1,2);
      INSERT INTO diagnosis_attempts(id,user_id,scenario,circuit,progress,version,created_at,updated_at) VALUES ('legacy-attempt','legacy-user','{}','{}','{}',3,1,2);
      INSERT INTO plans(id,slug,name,description,no_expiry,status,mutation_id,created_at,updated_at,created_by,updated_by) VALUES ('legacy-plan','legacy-plan','Legacy plan','',1,'active','legacy',1,1,'legacy-user','legacy-user');
      INSERT INTO plan_features(plan_id,feature_key,enabled,config) VALUES ('legacy-plan','pro_components',1,'{}');
      INSERT INTO entitlements(id,user_id,plan_id,status,starts_at,no_expiry,reason,mutation_id,created_at,updated_at,created_by,updated_by) VALUES ('legacy-grant','legacy-user','legacy-plan','active',1,1,'Preserve grant','legacy',1,1,'legacy-user','legacy-user');
      INSERT INTO audit_logs(id,actor_id,action,target_type,target_id,reason,request_id,created_at) VALUES ('legacy-audit','legacy-user','membership.create','membership','legacy-grant','Preserve membership history','legacy',1);
    `);
    const tables = [
      'user',
      'circuits',
      'diagnosis_attempts',
      'plans',
      'plan_features',
      'entitlements',
      'audit_logs',
    ];
    const before = tables.map((table) => db.prepare(`SELECT * FROM ${table}`).all());
    db.exec(readFileSync('migrations/0007_admin_foundation.sql', 'utf8'));
    db.exec(readFileSync('migrations/0008_admin_directory_indexes.sql', 'utf8'));
    expect(tables.map((table) => db.prepare(`SELECT * FROM ${table}`).all())).toEqual(before);
    expect(
      JSON.stringify(
        db
          .prepare(
            "EXPLAIN QUERY PLAN SELECT id FROM user WHERE global_role = 'admin' ORDER BY lower(name), id LIMIT 20",
          )
          .all(),
      ),
    ).toContain('user_admin_role');
    expect(
      JSON.stringify(
        db
          .prepare(
            'EXPLAIN QUERY PLAN SELECT id FROM user ORDER BY created_at DESC, id DESC LIMIT 5',
          )
          .all(),
      ),
    ).toContain('user_admin_created');
    expect(db.prepare('SELECT version FROM admin_revision').get()).toEqual({ version: 1 });
    expect(db.prepare('SELECT COUNT(*) AS count FROM account_controls').get()).toEqual({
      count: 0,
    });
  } finally {
    db.close();
  }
});
