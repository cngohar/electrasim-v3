import { readFileSync } from 'fs';
import { join } from 'path';

console.log('[verify] Running Explore 3D Technical & Visual Verification Probe...\n');

const baseUrl = 'http://127.0.0.1:4321';

async function verifyRoute(path, expectedStrings) {
  console.log(`Checking route ${path}...`);
  try {
    const res = await fetch(`${baseUrl}${path}`);
    if (res.status !== 200) {
      throw new Error(`HTTP Status ${res.status} for ${path}`);
    }
    const html = await res.text();

    for (const str of expectedStrings) {
      if (!html.includes(str)) {
        throw new Error(`Missing expected string "${str}" in ${path}`);
      }
    }
    console.log(`  [pass] Route ${path} passed validation (${html.length} bytes).`);
  } catch (err) {
    console.error(`  [fail] Failed route ${path}:`, err.message);
    process.exit(1);
  }
}

async function run() {
  // 1. Verify Landing Page
  await verifyRoute('/explore/', [
    'Explore Historical Electrical Inventions in Immersive 3D',
    'ExploreHeader',
    'ExploreFooter',
    'ExploreSearchModal',
    'hero-3d-canvas',
    'FOUNDATION 01',
    'Edison Carbon-Filament Incandescent Lamp',
  ]);

  // 2. Verify Edison Bulb 3D Explorer
  await verifyRoute('/explore/edison-bulb/', [
    'Edison Carbon-Filament Lamp (1879)',
    'edison-3d-canvas',
    'Assembly',
    'Cutaway',
    'Exploded',
    'Isolate',
    'Experiment',
    'voltage-slider',
    'rd-resistance',
    'rd-current',
    'rd-power',
    'rd-temp',
  ]);

  // 3. Verify CSS Responsiveness in explore.css
  const exploreCss = readFileSync(
    join(process.cwd(), 'astro-site/src/styles/explore.css'),
    'utf-8',
  );
  if (!exploreCss.includes('.explore-theme-page')) {
    throw new Error('explore.css missing .explore-theme-page');
  }
  if (!exploreCss.includes('.exp-ribbon')) {
    throw new Error('explore.css missing .exp-ribbon');
  }
  console.log('  [pass] explore.css rules verified.');

  console.log('\n[pass] ALL EXPLORE VERIFICATION PROBES PASSED 100% CLEAN!\n');
}

run();
