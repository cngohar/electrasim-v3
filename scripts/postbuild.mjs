/**
 * postbuild.mjs
 *
 * Build pipeline:
 *   1. `vite build`  → dist/          (React SPA, assets at /app/assets/*)
 *   2. Astro build   → dist-astro/    (landing page, blog, admin panel)
 *   3. This script:
 *      a. Moves dist/index.html        → dist/app/index.html  (SPA shell at /app/)
 *      b. Copies dist-astro/**         → dist/**              (landing + blog overlay)
 *      c. Duplicates the app-shell icons into dist/app/ and verifies that every
 *         manifest icon resolves. Ordering matters: the icons come from
 *         astro-site/public, so this must run after the overlay in (b).
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = join(__dirname, '..');
const dist = join(root, 'dist');
const distAstro = join(root, 'dist-astro');

function copyDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
      console.log(`  copied: ${relative(root, destPath)}`);
    }
  }
}

console.log('\n[postbuild] merging Vite + Astro output...\n');

// 1. Move Vite's SPA shell + assets to /app/
mkdirSync(join(dist, 'app'), { recursive: true });
copyFileSync(join(dist, 'index.html'), join(dist, 'app', 'index.html'));
console.log('  moved:  dist/index.html → dist/app/index.html');

// Move assets/ into app/assets/ so /app/assets/* URLs resolve correctly
const assetsDir = join(dist, 'assets');
const appAssetsDir = join(dist, 'app', 'assets');
if (existsSync(assetsDir)) {
  copyDir(assetsDir, appAssetsDir);
  rmSync(assetsDir, { recursive: true, force: true });
  console.log('  moved:  dist/assets/ → dist/app/assets/');
}

// Move sw.js + workbox-*.js + manifest.webmanifest to /app/
const pwaFiles = readdirSync(dist).filter(
  (f) => f === 'sw.js' || f.startsWith('workbox-') || f === 'manifest.webmanifest',
);
for (const f of pwaFiles) {
  const src = join(dist, f);
  copyFileSync(src, join(dist, 'app', f));
  rmSync(src);
  console.log(`  moved:  dist/${f} → dist/app/${f}`);
}

// Older releases registered /sw.js with site-wide scope. Publish a no-cache
// retirement worker at that legacy URL while keeping the active PWA worker at /app/sw.js.
const legacyRootServiceWorker = join(dist, 'legacy-root-sw.js');
if (existsSync(legacyRootServiceWorker)) {
  copyFileSync(legacyRootServiceWorker, join(dist, 'sw.js'));
  rmSync(legacyRootServiceWorker);
  console.log('  moved:  dist/legacy-root-sw.js → dist/sw.js');
}

// 2. Overlay Astro output onto dist/ (landing page, blog, admin, sitemap)
copyDir(distAstro, dist);

// 3. Duplicate the app-shell icons into /app/.
//    Vite rewrites the shell's icon URLs to /app/*, and manifest.webmanifest
//    lists them relative to /app/. This runs *after* the Astro overlay on
//    purpose: favicon.svg and favicon.ico ship from astro-site/public, so
//    before the overlay they do not exist at the dist root yet and
//    /app/favicon.svg — the manifest's first icon entry — 404'd.
//    Marketing images stay at the site root and are not part of the install.
const appIcons = ['app-theme.js', 'favicon.ico', 'favicon.svg', 'pwa-192.svg', 'pwa-512.svg'];
const missingIcons = [];
for (const f of appIcons) {
  const src = join(dist, f);
  if (existsSync(src)) {
    copyFileSync(src, join(dist, 'app', f));
    console.log(`  copied: dist/${f} → dist/app/${f}`);
  } else {
    missingIcons.push(f);
  }
}

// A silently-missing PWA icon is only visible at install time, which is far
// too late. Fail the build instead of shipping a broken manifest.
if (missingIcons.length > 0) {
  console.error(
    `\n[postbuild] FAILED: app-shell icons missing from dist/: ${missingIcons.join(', ')}`,
  );
  process.exit(1);
}

// 4. Verify every icon the app manifest references actually resolves under /app/.
const manifestPath = join(dist, 'app', 'manifest.webmanifest');
if (existsSync(manifestPath)) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const broken = (manifest.icons ?? [])
    .map((icon) => icon.src)
    .filter((src) => src && !src.startsWith('http') && !existsSync(join(dist, 'app', src)));
  if (broken.length > 0) {
    console.error(
      `\n[postbuild] FAILED: manifest icons unresolvable under dist/app/: ${broken.join(', ')}`,
    );
    process.exit(1);
  }
  console.log(`  verified: ${manifest.icons?.length ?? 0} manifest icon(s) resolve under /app/`);
}

// 5. Clean up dist-astro/
rmSync(distAstro, { recursive: true, force: true });
console.log('  cleaned: dist-astro/');

console.log('\n[postbuild] complete.\n');
