// Seeds D1 electrical_standards from src/domain/standards.ts — IMMUTABLE projection.
// Local SQLite only. No remote account is configured for this rewrite.
import { STANDARD_LIST } from '../src/domain/standards';

const args = process.argv.slice(2);
if (args.length !== 1 || args[0] !== '--local') {
  console.error(
    'Local-only seeding: run `bun run seed:standards --local`. Remote seeding is disabled.',
  );
  process.exit(1);
}

async function seedLocal() {
  const { execFileSync } = await import('node:child_process');
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const sqlValue = (value: unknown): string =>
    value === null
      ? 'NULL'
      : typeof value === 'number'
        ? String(value)
        : `'${String(value).replaceAll("'", "''")}'`;
  const now = Math.floor(Date.now() / 1000);
  const columns =
    'code,label,shortLabel,citation,flag,nominalVoltage,frequencyHz,wireColorsJson,wireColorsDarkJson,voltageDropJson,defaultMcbCurve,motorMcbCurve,rcdThresholdMa,rcdRequiredOnSockets,socketCircuitAmps,lightingCircuitAmps,conductorLegendJson,metadataJson,version,seededAt';
  const statements = STANDARD_LIST.map((s) => {
    const values = [
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
      JSON.stringify(s.metadata),
      '2',
      now,
    ];
    return `INSERT OR REPLACE INTO electrical_standards (${columns}) VALUES (${values.map(sqlValue).join(',')});`;
  });
  for (const [key, value] of [
    ['seededAt', String(now)],
    ['electricalStandardsCount', String(STANDARD_LIST.length)],
  ]) {
    statements.push(
      `INSERT OR REPLACE INTO app_meta (key,value,updatedAt) VALUES (${sqlValue(key)},${sqlValue(value)},${now});`,
    );
  }
  const dir = mkdtempSync(join(tmpdir(), 'electrasim-standards-'));
  try {
    const file = join(dir, 'seed.sql');
    writeFileSync(file, statements.join('\n'));
    // Resolve the configured DB binding; never guess the first SQLite file.
    execFileSync(
      'bun',
      [
        'x',
        'wrangler',
        'd1',
        'execute',
        'DB',
        '--local',
        '--persist-to',
        '.wrangler/state',
        '--file',
        file,
      ],
      { stdio: 'inherit' },
    );
    console.log(`Seeded ${STANDARD_LIST.length} local standards with reviewed reference metadata.`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

seedLocal()
  .then(() => {
    console.log(
      'Source is code (domain/standards.ts) — D1 is read-only projection. No POST /api/standards exists.',
    );
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
