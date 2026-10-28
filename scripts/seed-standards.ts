// Seeds D1 electrical_standards from packages/domain/src/standards.ts — IMMUTABLE projection.
// Local SQLite only. No remote account is configured for this rewrite.
import { STANDARD_LIST } from '@electrasim/domain/standards';
import { standardsSeedSql } from './standards-seed-data';

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
  const dir = mkdtempSync(join(tmpdir(), 'electrasim-standards-'));
  try {
    const file = join(dir, 'seed.sql');
    writeFileSync(file, standardsSeedSql());
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
      'Source is code (@electrasim/domain/standards) — D1 is read-only projection. No POST /api/standards exists.',
    );
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
