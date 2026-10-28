import { COMPONENT_DEFS, instanceLabel } from '@electrasim/domain';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { previewSnapshot } from '../api/community/preview-store';
import { publicAttribution, recheckPublication } from '../api/community/publication-store';
import { type ApiEnv, freshContext } from '../api/context';
import { escapeHtml as e } from './pages';
import { earlierModel, previewSwitches } from './preview/policy';
import { renderCircuitSvg } from './preview/render';

type Snapshot = Awaited<ReturnType<typeof previewSnapshot>>;
type Author = { handle: string | null; displayName: string };
const date = (n: number) => new Date(n).toISOString().slice(0, 10);
function documentHtml(title: string, body: string, head = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${e(title)} · ElectraSim</title><link rel="icon" href="/favicon.svg"/><link rel="stylesheet" href="/community/profile.css"/><link rel="stylesheet" href="/community/detail.css"/>${head}</head><body><a class="skip" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="/"><span class="brand-mark">ϟ</span>ElectraSim<span class="community-word">community</span></a><nav aria-label="Account"><a href="/settings/profile/">Your profile</a></nav></header><main id="main" tabindex="-1">${body}</main><footer><span>ElectraSim / A place to build and share.</span><a href="/app/">Open simulator ↗</a></footer></body></html>`;
}
function detailHtml(
  s: Snapshot,
  author: Author,
  versions: { id: string; versionNumber: number; title: string }[],
  origin: string,
) {
  const { publication: p, version: v, circuit } = s;
  const canonical = `${origin}/c/${p.slug}`;
  const selected = v.id !== p.currentVersionId;
  const selectedUrl = selected ? `${canonical}?version=${v.id}` : canonical;
  const description = v.description || 'A published circuit schematic shared on ElectraSim.';
  const schema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    additionalType: 'https://schema.org/TechArticle',
    name: v.title,
    description,
    url: selectedUrl,
    version: v.versionNumber,
    datePublished: new Date(v.createdAt).toISOString(),
    author: {
      '@type': 'Person',
      name: author.displayName,
      ...(author.handle ? { url: `${origin}/u/${author.handle}` } : {}),
    },
    image: `${canonical}/thumbnail.svg?version=${v.id}`,
    keywords: (JSON.parse(v.tagsJson) as string[]).join(', '),
  })
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
  const controls = previewSwitches(circuit);
  return {
    schema,
    html: documentHtml(
      v.title,
      `
    <nav class="breadcrumbs" aria-label="Breadcrumb">${author.handle ? `<a href="/u/${e(author.handle)}">${e(author.displayName)}’s circuits</a>` : '<span>Community circuit</span>'}<span aria-hidden="true">/</span><span>Published snapshot</span></nav>
    <section class="detail-heading"><div><span class="eyebrow">CIRCUIT · VERSION ${v.versionNumber}</span><h1>${e(v.title)}</h1><p class="detail-description">${e(v.description)}</p><p>By ${author.handle ? `<a href="/u/${e(author.handle)}">${e(author.displayName)}</a>` : e(author.displayName)} · Published <time datetime="${date(v.createdAt)}">${date(v.createdAt)}</time></p><div class="tags">${(JSON.parse(v.tagsJson) as string[]).map((t) => `<span>${e(t)}</span>`).join('')}</div></div><button type="button" class="btn snapshot-button" data-slug="${e(p.slug)}">History &amp; report</button></section>
    ${selected ? `<p class="notice">Viewing an earlier published version. <a href="/c/${e(p.slug)}">View latest version ${p.versionNumber}</a>.</p>` : ''}
    <section class="panel preview-panel" aria-labelledby="schematic-title" data-publication-preview data-slug="${e(p.slug)}" data-version="${e(v.id)}">
      <div class="preview-heading"><div><h2 id="schematic-title">Circuit preview</h2><p>Read-only · temporary controls never change the published circuit.</p></div><button type="button" class="btn primary" id="load-preview">Enable interactive preview</button></div>
      <div class="preview-toolbar" hidden><div class="actions" role="group" aria-label="Schematic view"><button type="button" class="btn" data-view="in" aria-label="Zoom in">+</button><button type="button" class="btn" data-view="out" aria-label="Zoom out">−</button><button type="button" class="btn" data-view="fit">Fit circuit</button></div><div class="actions"><button type="button" class="btn primary" id="run-preview">Start simulation</button><button type="button" class="btn" id="reset-preview">Reset preview</button></div></div>
      <div class="preview-viewport">${renderCircuitSvg(circuit, v.title)}</div>
      <p id="preview-status" role="status">Schematic only. No simulation has been run.</p>
      <div class="preview-controls" hidden><p>Drag to pan. Use +/− to zoom or arrow keys to pan. Switch changes apply only to this preview. Results use the current electrical model.</p>${controls.length ? `<fieldset><legend>Temporary switch controls</legend>${controls.map((c) => `<label><input type="checkbox" data-switch="${e(c.id)}" ${c.state.on === true ? 'checked' : ''}/> ${e(instanceLabel(c))} (${e(c.id)})${COMPONENT_DEFS[c.type].isMomentary ? ' · hold state' : ''}</label>`).join('')}</fieldset>` : ''}<div id="preview-inspection" role="status"></div></div>
      <noscript><p>The full published schematic and component list are available without JavaScript. Interactive controls require JavaScript.</p></noscript>
    </section>
    <div class="detail-columns"><section class="panel panel-body" aria-labelledby="components-title"><h2 id="components-title">Components <span class="count">${circuit.components.length}</span></h2><ul class="component-list">${circuit.components.map((c) => `<li><button type="button" data-inspect="${e(c.id)}">${e(instanceLabel(c))}</button><span>${e(c.id)}</span></li>`).join('')}</ul><p>${circuit.wires.length} wires · <a href="/c/${e(p.slug)}/thumbnail.svg?version=${e(v.id)}">Open schematic SVG</a></p></section>
    <aside class="panel panel-body" aria-labelledby="provenance-title"><h2 id="provenance-title">Snapshot provenance</h2><p class="notice">${earlierModel(v) ? 'Published against an earlier electrical model. Any preview simulation uses the current model.' : 'Published snapshot. No fresh electrical assessment was performed when publishing.'} This circuit is not certified.</p><dl><dt>Model</dt><dd>${e(v.modelVersion)}</dd><dt>Electrical engine</dt><dd>${e(v.engineVersion)}</dd><dt>Control engine</dt><dd>${e(v.controlEngineVersion)}</dd><dt>Validated</dt><dd>${date(v.validatedAt)}</dd><dt>SHA-256</dt><dd class="fingerprint">${e(v.fingerprint)}</dd></dl><p>Pro components may be viewed by anyone. Simulating them requires an active membership with the required benefits.</p><h3>Published versions</h3><ol class="version-list">${versions.map((row) => `<li><a ${row.id === v.id ? 'aria-current="page"' : ''} href="/c/${e(p.slug)}${row.id === p.currentVersionId ? '' : `?version=${e(row.id)}`}">Version ${row.versionNumber} · ${e(row.title)}</a></li>`).join('')}</ol><p>Showing the newest 100 versions. Full history is available through History &amp; report.</p></aside></div>`,
      `<meta name="description" content="${e(description)}"/><meta name="robots" content="index,follow"/><link rel="canonical" href="${e(canonical)}"/><meta property="og:type" content="article"/><meta property="og:title" content="${e(v.title)}"/><meta property="og:description" content="${e(description)}"/><meta property="og:url" content="${e(selectedUrl)}"/><meta property="og:image" content="${e(origin)}/og-image.png"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="${e(v.title)}"/><meta name="twitter:description" content="${e(description)}"/><meta name="twitter:image" content="${e(origin)}/og-image.png"/><script type="application/ld+json">${schema}</script><script src="/community/detail.js" defer></script><script src="/community/publications.js" defer></script>`,
    ),
  };
}

export const publicationPages = new Hono<ApiEnv>();
publicationPages.use('/c/*', freshContext, async (c, next) => {
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  await next();
});
publicationPages.onError((error, c) => {
  c.header('X-Robots-Tag', 'noindex, nofollow');
  const unavailable = error instanceof HTTPException && error.status === 404;
  if (c.req.path.endsWith('.svg'))
    return c.text(
      unavailable ? 'Publication unavailable' : 'Preview unavailable',
      unavailable ? 404 : 503,
    );
  return c.html(
    documentHtml(
      'Circuit unavailable',
      '<section class="panel unavailable"><span class="eyebrow">Community circuit</span><h1>Circuit unavailable</h1><p>This published circuit isn’t available to view.</p></section>',
      '<meta name="robots" content="noindex,nofollow"/>',
    ),
    unavailable ? 404 : 503,
  );
});
publicationPages.get('/c/:slug/thumbnail.svg', async (c) => {
  const s = await previewSnapshot(c, c.req.param('slug'), c.req.query('version'));
  const svg = renderCircuitSvg(s.circuit, s.version.title);
  await recheckPublication(c, s.publication);
  c.header('Content-Type', 'image/svg+xml; charset=utf-8');
  c.header(
    'Content-Security-Policy',
    "default-src 'none'; img-src data:; style-src 'none'; sandbox",
  );
  return c.body(svg);
});
for (const path of ['/c/:slug', '/c/:slug/'])
  publicationPages.get(path, async (c) => {
    const s = await previewSnapshot(c, c.req.param('slug')!, c.req.query('version'));
    if (c.req.path.endsWith('/'))
      return c.redirect(
        `/c/${s.publication.slug}${c.req.query('version') ? `?version=${encodeURIComponent(c.req.query('version')!)}` : ''}`,
        308,
      );
    const author = await publicAttribution(c, s.publication);
    const versions = await c
      .get('db')
      .prepare(
        'SELECT id,version_number AS versionNumber,title FROM publication_versions WHERE publication_id=? ORDER BY version_number DESC LIMIT 100',
      )
      .bind(s.publication.id)
      .all<{ id: string; versionNumber: number; title: string }>();
    const result = detailHtml(s, author, versions.results, new URL(c.req.url).origin);
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(result.schema));
    const hash = btoa(String.fromCharCode(...new Uint8Array(digest)));
    const finalAuthor = await publicAttribution(c, s.publication);
    if (JSON.stringify(author) !== JSON.stringify(finalAuthor))
      throw new HTTPException(404, { message: 'Publication changed; reload' });
    c.header(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'self' 'sha256-${hash}'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
    );
    return c.html(result.html);
  });
