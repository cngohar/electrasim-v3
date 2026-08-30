/**
 * build-tool-engines.mjs — bundle the toolbox browser engines.
 *
 * Why this exists: the tool engines used to keep a hand-mirrored copy of the
 * conductor tables and the physics inside `public/js/*.js`, and a consistency
 * test was the only thing standing between the two copies and drift.
 *
 * Now the engines are written in TypeScript next to the domain they drive and
 * bundled by esbuild into the same `public/js/*.js` filenames the pages already
 * load. Server render and browser run *one* implementation:
 *
 *   src/lib/tools/cable-size/*   ← domain (shared, unit-tested)
 *   src/tools/cable-size/*.ts    ← DOM engine (this bundle)
 *                ↓ esbuild
 *   public/js/cable-size-tool.js ← generated, git-ignored
 *
 * It runs as `prebuild` / `predev`, so a fresh checkout always has the bundle
 * before Astro copies `public/` into the build.
 */

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Add an engine here when a tool moves off its hand-written script. */
const ENTRIES = [
  {
    entry: join(root, 'src/tools/cable-size/engine.ts'),
    outfile: join(root, 'public/js/cable-size-tool.js'),
  },
];

/** Keep a readable banner on the generated bundle: it is shipped, not hidden. */
const BANNER = [
  '/**',
  ' * GENERATED FILE — do not edit by hand.',
  ' * Source: astro-site/src/tools/cable-size/engine.ts (+ src/lib/tools/cable-size/*)',
  ' * Rebuild: npm run build --workspace astro-site (or node scripts/build-tool-engines.mjs)',
  ' */',
].join('\n');

for (const { entry, outfile } of ENTRIES) {
  mkdirSync(dirname(outfile), { recursive: true });
  const result = await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'iife',
    target: ['es2019'],
    platform: 'browser',
    minify: process.env.ENGINE_MINIFY !== '0',
    legalComments: 'none',
    banner: { js: BANNER },
    logLevel: 'info',
    metafile: false,
  });
  if (result.errors.length > 0) {
    process.exitCode = 1;
  }
}
