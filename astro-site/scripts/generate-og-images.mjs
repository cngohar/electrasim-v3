/**
 * generate-og-images.mjs — Per-post Open Graph card generator
 *
 * Creates a unique, on-brand 1200×630 PNG social card for every blog article:
 *
 *   astro-site/public/og/blog/<slug>.png
 *
 * Uniqueness: each card is seeded by the article slug (deterministic mulberry32
 * PRNG) which drives a one-off circuit-trace motif, radial glow position and
 * accent gradient — and every card carries its own title, category, date and
 * reading time. No two articles share a card, and the generic og-image.png
 * fallback is no longer referenced by any article.
 *
 * Usage:  node scripts/generate-og-images.mjs [--force]
 * (Re-generates all cards; files are committed so CI does not need sharp.)
 *
 * Font note: sharp/librsvg rasterizes text with the system fallback family
 * (DejaVu Sans Bold here). The layout is tuned for that metric.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_ROOT = path.join(__dirname, '..', 'src', 'content');
const PUBLIC_OG_ROOT = path.join(__dirname, '..', 'public', 'og');
const MANIFEST_PATH = path.join(__dirname, '..', 'src', 'og-manifest.ts');

// Cards are generated per corpus: technical articles vs. product changelog.
const CORPORA = [
  { kind: 'blog', contentDir: path.join(CONTENT_ROOT, 'blog'), outDir: path.join(PUBLIC_OG_ROOT, 'blog'), manifestKey: 'OG_BLOG_MANIFEST' },
  { kind: 'updates', contentDir: path.join(CONTENT_ROOT, 'updates'), outDir: path.join(PUBLIC_OG_ROOT, 'updates'), manifestKey: 'OG_UPDATES_MANIFEST' },
];

const W = 1200;
const H = 630;

// ── Deterministic PRNG ────────────────────────────────────────────────
function hashSlug(slug) {
  let h = 5381;
  for (let i = 0; i < slug.length; i++) h = (h * 33) ^ slug.charCodeAt(i);
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Category design language ──────────────────────────────────────────
const CATEGORY_DESIGN = {
  'Beginner Guide': { a: '#3b82f6', b: '#22d3ee', deep: '#0a1230', icon: 'bulb' },
  'Wiring Guide': { a: '#06b6d4', b: '#34d399', deep: '#062427', icon: 'plug' },
  'Electrical Safety': { a: '#f59e0b', b: '#f87171', deep: '#2a1508', icon: 'shield' },
  'Intermediate Guide': { a: '#8b5cf6', b: '#38bdf8', deep: '#151033', icon: 'sliders' },
  'Regulations & Safety': { a: '#10b981', b: '#84cc16', deep: '#06231c', icon: 'clipboard' },
  'App Update': { a: '#6366f1', b: '#ec4899', deep: '#170f38', icon: 'bolt' },
  Reference: { a: '#64748b', b: '#22d3ee', deep: '#111827', icon: 'book' },
  'Tips & Tricks': { a: '#a3e635', b: '#22d3ee', deep: '#15250a', icon: 'bolt' },
  'How-to Guide': { a: '#38bdf8', b: '#818cf8', deep: '#0a1a33', icon: 'wrench' },
};
const FALLBACK_DESIGN = { a: '#3b82f6', b: '#22d3ee', deep: '#0a1230', icon: 'bolt' };

// ── Vector icons (stroke-drawn, engineering-schematic feel) ───────────
function iconMarkup(kind, cx, cy, size, color, opacity) {
  const s = size;
  const sw = Math.max(6, size / 16);
  const p = (inner) =>
    `<g transform="translate(${cx - s / 2} ${cy - s / 2})" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}">${inner}</g>`;
  switch (kind) {
    case 'bulb':
      return p(
        `<path d="M ${s * 0.3} ${s * 0.62} A ${s * 0.32} ${s * 0.32} 0 1 1 ${s * 0.7} ${s * 0.62} C ${s * 0.7} ${s * 0.68} ${s * 0.62} ${s * 0.72} ${s * 0.62} ${s * 0.8} L ${s * 0.38} ${s * 0.8} C ${s * 0.38} ${s * 0.72} ${s * 0.3} ${s * 0.68} ${s * 0.3} ${s * 0.62} Z"/><line x1="${s * 0.4}" y1="${s * 0.9}" x2="${s * 0.6}" y2="${s * 0.9}"/><line x1="${s * 0.43}" y1="${s * 0.98}" x2="${s * 0.57}" y2="${s * 0.98}"/>`,
      );
    case 'plug':
      return p(
        `<path d="M ${s * 0.2} ${s * 0.45} H ${s * 0.62} V ${s * 0.75} H ${s * 0.2} Z"/><line x1="${s * 0.62}" y1="${s * 0.52}" x2="${s * 0.85}" y2="${s * 0.52}"/><line x1="${s * 0.62}" y1="${s * 0.68}" x2="${s * 0.85}" y2="${s * 0.68}"/><path d="M ${s * 0.2} ${s * 0.6} C ${s * 0.02} ${s * 0.6} ${s * 0.02} ${s * 0.85} ${s * 0.2} ${s * 0.95}"/>`,
      );
    case 'shield':
      return p(
        `<path d="M ${s * 0.5} ${s * 0.06} L ${s * 0.88} ${s * 0.2} V ${s * 0.55} C ${s * 0.88} ${s * 0.75} ${s * 0.68} ${s * 0.9} ${s * 0.5} ${s * 0.97} C ${s * 0.32} ${s * 0.9} ${s * 0.12} ${s * 0.75} ${s * 0.12} ${s * 0.55} V ${s * 0.2} Z"/><path d="M ${s * 0.36} ${s * 0.52} L ${s * 0.47} ${s * 0.64} L ${s * 0.66} ${s * 0.36}"/>`,
      );
    case 'sliders':
      return p(
        `<line x1="${s * 0.15}" y1="${s * 0.3}" x2="${s * 0.85}" y2="${s * 0.3}"/><circle cx="${s * 0.38}" cy="${s * 0.3}" r="${s * 0.09}"/><line x1="${s * 0.15}" y1="${s * 0.55}" x2="${s * 0.85}" y2="${s * 0.55}"/><circle cx="${s * 0.62}" cy="${s * 0.55}" r="${s * 0.09}"/><line x1="${s * 0.15}" y1="${s * 0.8}" x2="${s * 0.85}" y2="${s * 0.8}"/><circle cx="${s * 0.3}" cy="${s * 0.8}" r="${s * 0.09}"/>`,
      );
    case 'clipboard':
      return p(
        `<rect x="${s * 0.16}" y="${s * 0.12}" width="${s * 0.68}" height="${s * 0.82}" rx="${s * 0.07}"/><path d="M ${s * 0.35} ${s * 0.12} V ${s * 0.04} H ${s * 0.65} V ${s * 0.12}"/><path d="M ${s * 0.32} ${s * 0.42} H ${s * 0.68} M ${s * 0.32} ${s * 0.58} H ${s * 0.68} M ${s * 0.32} ${s * 0.74} H ${s * 0.55}"/>`,
      );
    case 'bolt':
      return p(
        `<path d="M ${s * 0.56} ${s * 0.04} L ${s * 0.22} ${s * 0.58} H ${s * 0.48} L ${s * 0.42} ${s * 0.96} L ${s * 0.78} ${s * 0.42} H ${s * 0.5} Z"/>`,
      );
    case 'book':
      return p(
        `<path d="M ${s * 0.5} ${s * 0.2} C ${s * 0.38} ${s * 0.1} ${s * 0.2} ${s * 0.08} ${s * 0.08} ${s * 0.1} V ${s * 0.82} C ${s * 0.2} ${s * 0.8} ${s * 0.38} ${s * 0.82} ${s * 0.5} ${s * 0.92} C ${s * 0.62} ${s * 0.82} ${s * 0.8} ${s * 0.8} ${s * 0.92} ${s * 0.82} V ${s * 0.1} C ${s * 0.8} ${s * 0.08} ${s * 0.62} ${s * 0.1} ${s * 0.5} ${s * 0.2} Z"/><line x1="${s * 0.5}" y1="${s * 0.2}" x2="${s * 0.5}" y2="${s * 0.92}"/>`,
      );
    case 'wrench':
      return p(
        `<path d="M ${s * 0.68} ${s * 0.08} A ${s * 0.22} ${s * 0.22} 0 0 0 ${s * 0.6} ${s * 0.42} L ${s * 0.2} ${s * 0.74} A ${s * 0.1} ${s * 0.1} 0 1 0 ${s * 0.34} ${s * 0.86} L ${s * 0.68} ${s * 0.55} A ${s * 0.22} ${s * 0.22} 0 0 0 ${s * 0.95} ${s * 0.36} L ${s * 0.8} ${s * 0.5} L ${s * 0.68} ${s * 0.42} L ${s * 0.76} ${s * 0.26} Z"/>`,
      );
    default:
      return p(
        `<path d="M ${s * 0.56} ${s * 0.04} L ${s * 0.22} ${s * 0.58} H ${s * 0.48} L ${s * 0.42} ${s * 0.96} L ${s * 0.78} ${s * 0.42} H ${s * 0.5} Z"/>`,
      );
  }
}

// ── Seeded circuit-trace background ───────────────────────────────────
function circuitTraces(rng, color) {
  let out = '';
  const vias = [];
  for (let i = 0; i < 16; i++) {
    const y = 40 + rng() * 560;
    const fromLeft = rng() > 0.5;
    const x1 = fromLeft ? -20 - rng() * 80 : W + 20 + rng() * 80;
    const dir = fromLeft ? 1 : -1;
    let d = `M ${x1.toFixed(0)} ${y.toFixed(0)}`;
    let x = x1;
    const segs = 1 + Math.floor(rng() * 3);
    for (let sgm = 0; sgm < segs; sgm++) {
      const hLen = (60 + rng() * 240) * dir;
      x += hLen;
      d += ` h ${hLen.toFixed(0)}`;
      if (rng() > 0.55) {
        const vLen = (24 + rng() * 60) * (rng() > 0.5 ? 1 : -1);
        d += ` v ${vLen.toFixed(0)}`;
      }
    }
    const mildOpacity = 0.1 + rng() * 0.16;
    out += `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" opacity="${mildOpacity.toFixed(2)}"/>`;
    // via dots at some intermediate nodes
    vias.push({ x: x.toFixed(0), y: y.toFixed(0) });
  }
  for (const v of vias.filter(() => rng() > 0.45)) {
    out += `<circle cx="${v.x}" cy="${v.y}" r="3.5" fill="${color}" opacity="0.22"/>`;
  }
  // one or two brighter "live" traces for depth
  for (let i = 0; i < 2; i++) {
    const y = 60 + rng() * 540;
    const y2 = y + (rng() > 0.5 ? 80 : -80) * rng();
    out += `<path d="M ${-30} ${y.toFixed(0)} h ${(280 + rng() * 220).toFixed(0)} l 40 ${(y2 - y > 0 ? 40 : -40).toFixed(0)} h ${(360 + rng() * 260).toFixed(0)}" fill="none" stroke="${color}" stroke-width="3" opacity="0.4"/>`;
  }
  return out;
}

// ── Text helpers ──────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Estimated advance width (px) for DejaVu Sans Bold. */
function estWidth(text, fontSize) {
  let units = 0;
  for (const ch of text) {
    if (ch === ' ') units += 0.31;
    else if ('il.,:;\'"!|'.includes(ch)) units += 0.3;
    else if ('mwMW—–'.includes(ch)) units += 0.9;
    else if (ch >= 'A' && ch <= 'Z') units += 0.68;
    else if (ch >= '0' && ch <= '9') units += 0.6;
    else if ('-\u2010/'.includes(ch)) units += 0.42;
    else units += 0.55; // lowercase + misc
  }
  return units * fontSize;
}

function wrapTitle(title, fontSize, maxWidth, maxLines) {
  const words = title.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (estWidth(candidate, fontSize) <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    // trim last line until it fits with an ellipsis
    let last = kept[maxLines - 1];
    while (last.length > 0 && estWidth(`${last}…`, fontSize) > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    kept[maxLines - 1] = `${last.replace(/[.,:;—-]\s*$/, '')}…`;
    return kept;
  }
  return lines;
}

function pickTitleLayout(title) {
  for (const size of [54, 48, 43, 38, 33]) {
    const lines = wrapTitle(title, size, 1000, 3);
    if (lines.length <= 3) return { size, lines };
  }
  return { size: 30, lines: wrapTitle(title, 30, 1000, 4) };
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

function readingMins(body) {
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.round(words / 200));
}

// ── Card builder ──────────────────────────────────────────────────────
function buildCardSvg({ slug, title, category, pubDate, body, pathLabel }) {
  const rng = mulberry32(hashSlug(slug));
  const design = CATEGORY_DESIGN[category] ?? FALLBACK_DESIGN;
  const glowX = 150 + rng() * 900;
  const glowY = 80 + rng() * 470;
  const iconX = 880 + rng() * 140;
  const iconY = 240 + rng() * 160;
  const iconSize = 380 + rng() * 120;

  const { size: titleSize, lines: titleLines } = pickTitleLayout(title);
  const lh = titleSize * 1.16;
  const titleStartY = 268 - (titleLines.length - 2) * 14 + titleSize;
  const cat = category || 'Guide';
  const mins = readingMins(body);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#050811"/>
      <stop offset="1" stop-color="${design.deep}"/>
    </linearGradient>
    <linearGradient id="accentBar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${design.a}"/>
      <stop offset="1" stop-color="${design.b}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${design.a}" stop-opacity="0.28"/>
      <stop offset="1" stop-color="${design.a}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="7" fill="url(#accentBar)"/>
  <rect x="${(glowX - 420).toFixed(0)}" y="${(glowY - 420).toFixed(0)}" width="840" height="840" fill="url(#glow)"/>
  ${circuitTraces(rng, design.b)}
  ${iconMarkup(design.icon, iconX, iconY, iconSize, design.a, 0.13)}

  <!-- brand header -->
  <g transform="translate(72 54)">
    <polygon points="26,0 8,22 20,22 16,40 36,16 24,16" fill="${design.a}"/>
    <text x="52" y="30" font-family="DejaVu Sans, sans-serif" font-weight="bold" font-size="30" fill="#f1f5f9">ElectraSim</text>
    <text x="${(52 + estWidthPlain('ElectraSim', 30) + 26).toFixed(0)}" y="30" font-family="DejaVu Sans Mono, monospace" font-size="21" fill="#7dd3fc">electrasim.com/${pathLabel}</text>
  </g>

  <!-- category chip -->
  <g transform="translate(72 118)">
    <rect x="0" y="0" width="${(estWidthPlain(cat.toUpperCase(), 17) + cat.length * 2 + 52).toFixed(0)}" height="38" rx="19" fill="none" stroke="${design.a}" stroke-opacity="0.7" stroke-width="1.6"/>
    <circle cx="22" cy="19" r="5" fill="${design.b}"/>
    <text x="38" y="25" font-family="DejaVu Sans, sans-serif" font-weight="bold" font-size="17" letter-spacing="2" fill="${design.b}">${esc(cat.toUpperCase())}</text>
  </g>

  <!-- title -->
  <g font-family="DejaVu Sans, sans-serif" font-weight="bold" font-size="${titleSize}" fill="#f8fafc">
    ${titleLines
      .map(
        (ln, i) =>
          `<text x="72" y="${(titleStartY + i * lh).toFixed(0)}">${esc(ln)}</text>`,
      )
      .join('\n    ')}
  </g>

  <!-- legibility scrim behind the meta/footer zone -->
  <rect x="0" y="522" width="760" height="108" fill="#050811" opacity="0.38"/>
  <rect x="0" y="522" width="760" height="1.5" fill="#ffffff" opacity="0.07"/>

  <!-- meta row -->
  <g font-family="DejaVu Sans, sans-serif" font-size="23" fill="#b6c2d3">
    <text x="72" y="564">${esc(formatDate(pubDate))}</text>
    <text x="${(72 + estWidthPlain(formatDate(pubDate), 23) + 26).toFixed(0)}" y="564" fill="#64748b">·</text>
    <text x="${(72 + estWidthPlain(formatDate(pubDate), 23) + 44).toFixed(0)}" y="564">${mins} min read</text>
  </g>

  <!-- footer -->
  <text x="72" y="601" font-family="DejaVu Sans, sans-serif" font-size="18" fill="#64748b">Build &amp; simulate this circuit free — no sign-up, no download</text>
</svg>`;
}

/** Width helper using the same estimator with a normal-weight tweak. */
function estWidthPlain(text, fontSize) {
  return estWidth(text, fontSize);
}

// ── Main ──────────────────────────────────────────────────────────────
async function main() {
  const force = process.argv.includes('--force');
  let totalBuilt = 0;
  let totalSkipped = 0;
  let totalPruned = 0;
  const manifestBlocks = [];

  for (const corpus of CORPORA) {
    if (!existsSync(corpus.contentDir)) continue;
    mkdirSync(corpus.outDir, { recursive: true });

    const files = readdirSync(corpus.contentDir).filter((f) => f.endsWith('.md'));
    const liveSlugs = new Set();

    for (const file of files) {
      const slug = file.replace(/\.md$/, '');
      const raw = readFileSync(path.join(corpus.contentDir, file), 'utf8');
      const { data, content } = matter(raw);
      if (data.draft) continue;
      liveSlugs.add(slug);

      const outPath = path.join(corpus.outDir, `${slug}.png`);
      if (!force && existsSync(outPath)) {
        totalSkipped++;
        continue;
      }
      const svg = buildCardSvg({
        slug,
        title: data.title ?? slug,
        category: data.category ?? 'Guide',
        pubDate: data.pubDate instanceof Date ? data.pubDate.toISOString().split('T')[0] : data.pubDate,
        body: content,
        pathLabel: corpus.kind,
      });
      await sharp(Buffer.from(svg), { density: 72 })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(outPath);
      totalBuilt++;
    }

    // Prune cards whose source left the corpus (e.g. collections moved) so
    // stale artwork cannot be served at an old URL.
    for (const png of readdirSync(corpus.outDir).filter((f) => f.endsWith('.png'))) {
      if (!liveSlugs.has(png.replace(/\.png$/, ''))) {
        rmSync(path.join(corpus.outDir, png));
        totalPruned++;
      }
    }

    const manifest = [...liveSlugs]
      .sort()
      .map((slug) => {
        const hash = createHash('sha256')
          .update(readFileSync(path.join(corpus.outDir, `${slug}.png`)))
          .digest('hex')
          .slice(0, 10);
        return [slug, hash];
      });
    manifestBlocks.push(
      `export const ${corpus.manifestKey}: Record<string, string> = ${JSON.stringify(Object.fromEntries(manifest), null, 2)};`,
    );
  }

  writeFileSync(
    MANIFEST_PATH,
    '// Generated by scripts/generate-og-images.mjs — do not edit by hand.\n' +
      '// content-hash (sha256, first 10 hex chars) per OG card for cache busting.\n' +
      manifestBlocks.join('\n') +
      `
export type OgKind = 'blog' | 'updates';
` +
      `export function ogCardUrl(slug: string, kind: OgKind = 'blog'): string {
` +
      `  const map = kind === 'updates' ? OG_UPDATES_MANIFEST : OG_BLOG_MANIFEST;
` +
      `  const v = map[slug];
` +
      `  return \`/og/\${kind}/\${slug}.png\${v ? \`?v=\${v}\` : ''}\`;
` +
      `}
`,
  );

  console.log(
    `OG cards: ${totalBuilt} generated, ${totalSkipped} kept, ${totalPruned} pruned → ${path.relative(process.cwd(), PUBLIC_OG_ROOT)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
