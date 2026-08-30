/**
 * postbuild.mjs
 *
 * Build pipeline:
 *   1. `vite build`  → dist/          (React SPA, assets at /app/assets/*)
 *   2. Astro build   → dist-astro/    (landing page, blog, admin panel)
 *   3. This script:
 *      a. Moves dist/index.html        → dist/app/index.html  (SPA shell at /app/)
 *      b. Copies dist-astro/**         → dist/**              (landing + blog overlay)
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
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

// Vite rewrites app-shell icon URLs to /app/*. Duplicate only those icons;
// marketing images remain at the site root and are not part of the PWA install.
for (const f of ['app-theme.js', 'favicon.ico', 'favicon.svg', 'pwa-192.svg', 'pwa-512.svg']) {
  const src = join(dist, f);
  if (existsSync(src)) {
    copyFileSync(src, join(dist, 'app', f));
    console.log(`  copied: dist/${f} → dist/app/${f}`);
  }
}

// 2. Overlay Astro output onto dist/ (landing page, blog, admin, sitemap)
copyDir(distAstro, dist);

// 3. Clean up dist-astro/
rmSync(distAstro, { recursive: true, force: true });
console.log('  cleaned: dist-astro/');

console.log('\n[postbuild] complete.\n');
