// Seeds D1 electrical_standards from src/domain/standards.ts — IMMUTABLE projection.
// Uses direct SQLite for --local (no wrangler --file, avoids escaping hell), wrangler for --remote.
import { STANDARD_LIST } from '../src/domain/standards';

const local = process.argv.includes('--local');

async function seedLocal() {
  const Database = (await import('better-sqlite3')).default;
  const { readdirSync } = await import('node:fs');
  const dir = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
  const files = readdirSync(dir).filter(
    (f: string) => f.endsWith('.sqlite') && !f.startsWith('metadata'),
  );
  const file = files.find((f) => !f.includes('metadata')) ?? files[0];
  if (!file)
    throw new Error(
      'No D1 sqlite file found — run `bun x wrangler d1 migrations apply electrasim --local` first',
    );
  const path = `${dir}/${file}`;
  const db = new Database(path) as unknown as {
    prepare: (sql: string) => { run: (...a: unknown[]) => unknown; all: () => unknown[] };
    close: () => void;
  };
  const now = new Date().toISOString();
  const stmt = db.prepare(`INSERT OR REPLACE INTO electrical_standards
(code,label,shortLabel,citation,flag,nominalVoltage,frequencyHz,wireColorsJson,wireColorsDarkJson,voltageDropJson,defaultMcbCurve,motorMcbCurve,rcdThresholdMa,rcdRequiredOnSockets,socketCircuitAmps,lightingCircuitAmps,conductorLegendJson,version,seededAt)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  let n = 0;
  for (const s of STANDARD_LIST) {
    stmt.run(
      s.id,
      s.label,
      s.shortLabel,
      s.citation,
      s.flag,
      s.nominalVoltage,
      s.frequencyHz,
      JSON.stringify(s.wireColors),
      JSON.stringify(s.wireColorsDark),
      JSON.stringify(s.voltageDrop),
      s.defaultMcbCurve,
      s.motorMcbCurve,
      s.rcdThresholdMa,
      s.rcdRequiredOnSockets ? 1 : 0,
      s.socketCircuitAmps,
      s.lightingCircuitAmps,
      JSON.stringify(s.conductorLegend),
      '1',
      now,
    );
    n++;
  }
  db.prepare('INSERT OR REPLACE INTO app_meta (key,value,updatedAt) VALUES (?,?,?)').run(
    'seededAt',
    now,
    now,
  );
  db.prepare('INSERT OR REPLACE INTO app_meta (key,value,updatedAt) VALUES (?,?,?)').run(
    'electricalStandardsCount',
    String(n),
    now,
  );
  console.log(
    `Seeded ${n} standards (local) — ${STANDARD_LIST.map((s) => s.id).join(', ')} → ${path}`,
  );
  db.close();
}

async function seedRemote() {
  const { writeFileSync, mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { execSync } = await import('node:child_process');
  function esc(s: string) {
    return `'${s.replace(/'/g, "''")}'`;
  }
  const now = new Date().toISOString();
  let sql = '';
  for (const s of STANDARD_LIST) {
    sql += `INSERT OR REPLACE INTO electrical_standards (code,label,shortLabel,citation,flag,nominalVoltage,frequencyHz,wireColorsJson,wireColorsDarkJson,voltageDropJson,defaultMcbCurve,motorMcbCurve,rcdThresholdMa,rcdRequiredOnSockets,socketCircuitAmps,lightingCircuitAmps,conductorLegendJson,version,seededAt) VALUES (${esc(s.id)},${esc(s.label)},${esc(s.shortLabel)},${esc(s.citation)},${esc(s.flag)},${s.nominalVoltage},${s.frequencyHz},${esc(JSON.stringify(s.wireColors))},${esc(JSON.stringify(s.wireColorsDark))},${esc(JSON.stringify(s.voltageDrop))},${esc(s.defaultMcbCurve)},${esc(s.motorMcbCurve)},${s.rcdThresholdMa},${s.rcdRequiredOnSockets ? 1 : 0},${s.socketCircuitAmps},${s.lightingCircuitAmps},${esc(JSON.stringify(s.conductorLegend))},'1',${esc(now)});\n`;
  }
  sql += `INSERT OR REPLACE INTO app_meta (key,value,updatedAt) VALUES ('seededAt',${esc(now)},${esc(now)});\n`;
  sql += `INSERT OR REPLACE INTO app_meta (key,value,updatedAt) VALUES ('electricalStandardsCount',${esc(String(STANDARD_LIST.length))},${esc(now)});\n`;
  const dir = mkdtempSync(join(tmpdir(), 'electrasim-seed-'));
  const file = join(dir, 'seed.sql');
  writeFileSync(file, sql, 'utf8');
  execSync(`bun x wrangler d1 execute electrasim --remote --file "${file}"`, { stdio: 'inherit' });
  console.log(`Seeded ${STANDARD_LIST.length} standards (remote)`);
}

(local ? seedLocal() : seedRemote())
  .then(() => {
    console.log(
      'Source is code (domain/standards.ts) — D1 is read-only projection. No POST /api/standards exists.',
    );
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
