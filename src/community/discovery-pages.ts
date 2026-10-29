import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
  type DiscoveryItem,
  type DiscoveryQuery,
  discoveryPage,
  recheckDiscovery,
} from '../api/community/discovery-store';
import { type ApiEnv, freshContext, requireSession } from '../api/context';
import { escapeHtml as e } from './pages';

export const discoveryPages = new Hono<ApiEnv>();
const discoveryHeaders = async (c: import('hono').Context<ApiEnv>, next: () => Promise<void>) => {
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  await next();
};
for (const path of ['/c/explore', '/c/explore/', '/c/feed', '/c/feed/'])
  discoveryPages.use(path, discoveryHeaders);
const titleCase = (value: string) =>
  value === 'int' ? 'International' : value.charAt(0).toUpperCase() + value.slice(1);
function paramsFor(p: DiscoveryQuery, changes: Record<string, string | null> = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({
    q: p.q,
    zone: p.zone,
    standard: p.standard,
    tag: p.tag,
    sort: p.sort,
    cursor: p.cursor,
    ...changes,
  })) {
    if (value && value !== 'all' && !(key === 'sort' && value === 'newest')) query.set(key, value);
  }
  const result = query.toString();
  return result ? `?${result}` : '';
}
function layout(
  title: string,
  body: string,
  origin: string,
  route: 'explore' | 'feed',
  robots = 'index,follow',
) {
  const canonical = `${origin}/c/${route}`;
  const description =
    route === 'explore'
      ? 'Find published electrical circuit schematics from the ElectraSim community.'
      : 'See circuits published by people you follow and review your own circuits.';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${e(title)} · ElectraSim</title><meta name="description" content="${e(description)}"/><meta name="robots" content="${robots}"/><link rel="canonical" href="${e(canonical)}"/><meta property="og:type" content="website"/><meta property="og:title" content="${e(title)} · ElectraSim"/><meta property="og:description" content="${e(description)}"/><meta property="og:url" content="${e(canonical)}"/><meta property="og:image" content="${e(origin)}/og-image.png"/><meta name="twitter:card" content="summary_large_image"/><link rel="icon" href="/favicon.svg"/><link rel="stylesheet" href="/community/discovery.css"/></head><body><a class="skip" href="#main">Skip to content</a><header class="site-header"><div class="header-inner"><a class="brand" href="/"><span class="brand-mark">ϟ</span>ElectraSim<span class="community-word">community</span></a><nav class="site-nav" aria-label="Community"><a ${route === 'explore' ? 'aria-current="page"' : ''} href="/c/explore">Explore circuits</a><a ${route === 'feed' ? 'aria-current="page"' : ''} href="/c/feed">Your feed</a></nav><a class="profile-link" href="/settings/profile/">Your profile</a></div></header><main class="shell" id="main" tabindex="-1">${body}</main><footer class="site-footer"><span><b>ElectraSim community</b> / A place to build and share.</span><a href="/app/">Open simulator ↗</a></footer></body></html>`;
}
function hero(route: 'explore' | 'feed') {
  const feed = route === 'feed';
  return `<div class="crumb"><span>Community</span><span aria-hidden="true">/</span><b>${feed ? 'Your feed' : 'Explore circuits'}</b></div><section class="hero"><div><span class="eyebrow">${feed ? 'Your circuit stream' : 'The circuit library'}</span><h1>${feed ? 'Fresh from your circle.' : 'Ideas you can trace.'}</h1><p>${feed ? 'See the latest published circuits from people you follow. Your own circuits are one tap away.' : 'Explore published circuits from the community. Open a full schematic, inspect the components and learn how each design works.'}</p></div><svg class="hero-art" viewBox="0 0 300 160" aria-hidden="true"><g fill="none" stroke="#5179b9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M24 38h56m57 0h38m48 0h52v86H24V38"/><rect x="80" y="19" width="57" height="38" rx="5"/><path d="M88 38h14m13 0h14m-27 0l13-11"/><rect x="175" y="18" width="48" height="40" rx="5"/><path d="M182 38h9m15 0h10m-25 0l15-12"/><circle cx="254" cy="80" r="14"/><path d="M254 66v28m-14-14h28M51 107h25m-19-10v20m13-15v10"/></g><g fill="#5179b9" font-family="system-ui" font-size="9" font-weight="700"><text x="89" y="12">RCD</text><text x="182" y="12">MCB</text><text x="236" y="54">LOAD</text></g></svg></section>`;
}
function tags(item: DiscoveryItem) {
  return `<div class="card-tags">${item.tags.map((tag) => `<span>${e(tag)}</span>`).join('')}</div>`;
}
function author(item: DiscoveryItem) {
  const initials = item.author.displayName
    .split(/\s+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const name = e(item.author.displayName);
  return `<span class="byline"><span class="mini-avatar" aria-hidden="true">${e(initials || 'CM')}</span>${item.author.handle ? `<a href="/u/${e(item.author.handle)}">${name}</a>` : `<span>${name}</span>`}</span>`;
}
function thumbnail(item: DiscoveryItem) {
  return `<a class="card-art" href="/c/${e(item.slug)}" aria-label="Open ${e(item.title)}"><span class="art-label">${e(titleCase(item.standard))} · ${e(titleCase(item.zone))}</span><img src="/c/${e(item.slug)}/thumbnail.svg?version=${e(item.versionId)}" alt="Schematic for ${e(item.title)}" loading="lazy" width="300" height="160"/></a>`;
}
function card(item: DiscoveryItem) {
  return `<article class="card">${thumbnail(item)}<div class="card-body"><span class="card-kicker">${e(titleCase(item.zone))} · ${item.componentCount} components</span><h3><a href="/c/${e(item.slug)}">${e(item.title)}</a></h3><p class="card-desc">${e(item.description || 'A published circuit schematic shared by the community.')}</p>${tags(item)}<div class="card-footer">${author(item)}<time datetime="${new Date(item.publishedAt).toISOString().slice(0, 10)}">${new Date(item.publishedAt).toLocaleDateString('en', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</time></div></div></article>`;
}
function feedCard(item: DiscoveryItem) {
  return `<article class="feed-item">${thumbnail(item)}<div class="feed-copy"><div class="identity">${author(item)}<span>published a circuit · ${new Date(item.publishedAt).toLocaleDateString('en', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</span></div><h3><a href="/c/${e(item.slug)}">${e(item.title)}</a></h3><p>${e(item.description || 'A published circuit schematic shared by the community.')}</p>${tags(item)}<div class="feed-action"><span>${e(titleCase(item.standard))} · ${e(titleCase(item.zone))} · ${item.componentCount} components</span><a href="/c/${e(item.slug)}">View circuit ↗</a></div></div></article>`;
}
function filterForm(p: DiscoveryQuery) {
  const zoneOptions = [
    ['all', 'All zones'],
    ['general', 'General'],
    ['lighting', 'Lighting'],
    ['protection', 'Protection'],
    ['control', 'Control'],
    ['power', 'Power'],
  ];
  const standardOptions = [
    ['all', 'All standards'],
    ['int', 'International'],
    ['uk', 'UK'],
    ['us', 'US'],
    ['eu', 'EU'],
  ];
  const sortOptions = [
    ['newest', 'Newest first'],
    ['oldest', 'Oldest first'],
    ['title', 'Title A–Z'],
  ];
  const options = (list: string[][], current: string) =>
    list
      .map(
        ([value, label]) =>
          `<option value="${value}" ${value === current ? 'selected' : ''}>${label}</option>`,
      )
      .join('');
  const chips = [
    ['', 'All topics'],
    ['beginner', 'Beginner'],
    ['fault-finding', 'Fault finding'],
    ['switching', 'Switching'],
    ['renewables', 'Renewables'],
  ];
  return `<form class="controls" action="/c/explore" method="get" role="search"><div class="filter-row"><div class="field search-field"><label for="search">Search circuits</label><input id="search" name="q" type="search" value="${e(p.q)}" placeholder="Search by title, author or tag" maxlength="80"/></div><div class="field"><label for="zone">Zone</label><select id="zone" name="zone">${options(zoneOptions, p.zone)}</select></div><div class="field"><label for="standard">Study standard</label><select id="standard" name="standard">${options(standardOptions, p.standard)}</select></div><div class="field"><label for="sort">Sort by</label><select id="sort" name="sort">${options(sortOptions, p.sort)}</select></div></div><div class="filter-bottom"><div class="chips"><span>Popular tags</span>${chips.map(([value, label]) => `<a class="chip" ${p.tag === value ? 'aria-current="true"' : ''} href="/c/explore${e(paramsFor(p, { tag: value, cursor: null }))}">${label}</a>`).join('')}</div><div class="filter-actions"><input type="hidden" name="tag" value="${e(p.tag)}"/><button type="submit">Apply filters</button><a href="/c/explore">Clear filters ↺</a></div></div></form>`;
}
function exploreBody(items: DiscoveryItem[], nextCursor: string | null, p: DiscoveryQuery) {
  const next = nextCursor ? `/c/explore${paramsFor(p, { cursor: nextCursor })}` : '';
  return `${hero('explore')}<section aria-labelledby="explore-title"><div class="section-head"><div><h2 id="explore-title">Explore circuits</h2><p>Start with a circuit that sparks your next experiment.</p></div><span class="count">${items.length} on this page</span></div>${filterForm(p)}${items.length ? `<div class="cards">${items.map(card).join('')}</div>` : '<div class="empty"><strong>No circuits match those filters.</strong><p>Try another term, zone or tag.</p><a href="/c/explore">Clear filters</a></div>'}${next ? `<a class="load-more" rel="next" href="${e(next)}">Show more circuits ↓</a>` : ''}</section>`;
}
function feedBody(
  items: DiscoveryItem[],
  nextCursor: string | null,
  p: DiscoveryQuery,
  view: 'following' | 'mine',
) {
  const next = nextCursor ? `/c/feed${paramsFor(p, { view, cursor: nextCursor })}` : '';
  const authors = [
    ...new Map(
      items.filter((item) => item.author.handle).map((item) => [item.author.handle, item.author]),
    ).values(),
  ].slice(0, 5);
  return `${hero('feed')}<section aria-labelledby="feed-title"><div class="section-head"><div><h2 id="feed-title">Your feed</h2><p>Recent circuits from people you follow, plus your own published work.</p></div></div><div class="feed-layout"><div><nav class="feed-switch" aria-label="Feed view"><a ${view === 'following' ? 'aria-current="page"' : ''} href="/c/feed">Following</a><a ${view === 'mine' ? 'aria-current="page"' : ''} href="/c/feed?view=mine">Your circuits</a></nav>${items.length ? `<div class="feed-list">${items.map(feedCard).join('')}</div>` : `<div class="empty"><strong>${view === 'mine' ? 'No public circuits yet.' : 'No circuits from followed authors yet.'}</strong><p>${view === 'mine' ? 'Publish a saved circuit to see it here.' : 'Explore published circuits while your feed grows.'}</p><a href="${view === 'mine' ? '/settings/publications/' : '/c/explore'}">${view === 'mine' ? 'Manage publications' : 'Explore circuits'}</a></div>`}${next ? `<a class="load-more" rel="next" href="${e(next)}">Show more circuits ↓</a>` : ''}</div><aside class="feed-aside"><div class="side-card"><h3>People in your feed</h3><p>Authors whose recent circuits are on this page.</p>${authors
    .map(
      (a) =>
        `<div class="side-row"><span class="mini-avatar" aria-hidden="true">${e(
          a.displayName
            .split(/\s+/)
            .map((part) => part[0] ?? '')
            .join('')
            .slice(0, 2)
            .toUpperCase(),
        )}</span><a href="/u/${e(a.handle)}">${e(a.displayName)}</a></div>`,
    )
    .join(
      '',
    )}<a class="side-link" href="/c/explore">Discover more circuits →</a></div><div class="side-card side-callout"><h3>From schematic to understanding</h3><p>Each card opens a fixed published version. The detail page gives you the full read-only schematic and provenance.</p></div></aside></div></section>`;
}
discoveryPages.use('/c/explore', freshContext);
discoveryPages.use('/c/explore/', freshContext);
discoveryPages.use('/c/feed', freshContext);
discoveryPages.use('/c/feed/', freshContext);
discoveryPages.onError((error, c) => {
  c.header('X-Robots-Tag', 'noindex, nofollow');
  const status = error instanceof HTTPException ? error.status : 503;
  const feed = c.req.path.includes('/feed');
  const title = status === 401 ? 'Sign in for your feed' : 'Circuit discovery unavailable';
  const body = `<div class="unavailable"><h1>${title}</h1><p>${status === 401 ? 'Sign in to see circuits from people you follow and your own publications.' : 'This page is unavailable right now. Check the filters or try again.'}</p><a href="${status === 401 ? '/settings/profile/' : '/c/explore'}">${status === 401 ? 'Sign in' : 'Explore circuits'}</a></div>`;
  return c.html(
    layout(title, body, new URL(c.req.url).origin, feed ? 'feed' : 'explore', 'noindex,nofollow'),
    status,
  );
});
for (const path of ['/c/explore', '/c/explore/'])
  discoveryPages.get(path, async (c) => {
    if (c.req.path.endsWith('/')) return c.redirect(`/c/explore${new URL(c.req.url).search}`, 308);
    const page = await discoveryPage(c, 'explore', c.req.query());
    const body = exploreBody(page.items, page.nextCursor, page.params);
    await recheckDiscovery(c, page.rows, 'explore');
    const filtered = !!(
      page.params.q ||
      page.params.tag ||
      page.params.zone !== 'all' ||
      page.params.standard !== 'all' ||
      page.params.cursor
    );
    return c.html(
      layout(
        'Explore circuits',
        body,
        new URL(c.req.url).origin,
        'explore',
        filtered ? 'noindex,follow' : 'index,follow',
      ),
    );
  });
for (const path of ['/c/feed', '/c/feed/'])
  discoveryPages.get(path, requireSession, async (c) => {
    if (c.req.path.endsWith('/')) return c.redirect(`/c/feed${new URL(c.req.url).search}`, 308);
    const query = c.req.query();
    const view = query.view === 'mine' ? 'mine' : 'following';
    if (query.view !== undefined && !['following', 'mine'].includes(query.view))
      throw new HTTPException(400, { message: 'Invalid feed view' });
    const { view: _view, ...filters } = query;
    const page = await discoveryPage(c, view, filters);
    const body = feedBody(page.items, page.nextCursor, page.params, view);
    await recheckDiscovery(c, page.rows, view);
    return c.html(layout('Your feed', body, new URL(c.req.url).origin, 'feed', 'noindex,nofollow'));
  });
