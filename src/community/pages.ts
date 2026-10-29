import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { profilePublications } from '../api/community/publication-store';
import { profileRow } from '../api/community/store';
import { type ApiEnv, freshContext } from '../api/context';
import { type PublicProfile, handleProblem, initials, publicProfile } from './profile-policy';
import type { publicationSummary } from './publication-policy';
type PublicationCard = ReturnType<typeof publicationSummary>;
export const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
export function profileHtml(
  profile: PublicProfile | null,
  origin: string,
  publications: PublicationCard[] = [],
) {
  const e = escapeHtml;
  const title = profile
    ? `${profile.displayName} (@${profile.handle}) · ElectraSim`
    : 'Profile unavailable · ElectraSim';
  const description =
    profile?.bio ||
    (profile
      ? 'A member of the ElectraSim circuit community.'
      : 'This profile isn’t available to view.');
  const canonical = profile ? `${origin}/u/${profile.handle}` : null;
  const schema = profile
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: profile.displayName,
        url: canonical,
        description: profile.bio,
        ...(profile.institution
          ? { affiliation: { '@type': 'EducationalOrganization', name: profile.institution } }
          : {}),
      })
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
    : null;
  const result = {
    schema,
    html: `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${e(title)}</title><meta name="description" content="${e(description)}"/><meta name="robots" content="${profile ? 'index,follow' : 'noindex,nofollow'}"/>${canonical ? `<link rel="canonical" href="${e(canonical)}"/>` : ''}<meta property="og:type" content="${profile ? 'profile' : 'website'}"/><meta property="og:title" content="${e(title)}"/><meta property="og:description" content="${e(description)}"/><meta property="og:image" content="${e(origin)}/og-image.png"/>${canonical ? `<meta property="og:url" content="${e(canonical)}"/>` : ''}<meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="${e(title)}"/><meta name="twitter:description" content="${e(description)}"/><meta name="twitter:image" content="${e(origin)}/og-image.png"/><link rel="icon" href="/favicon.svg"/><link rel="stylesheet" href="/community/profile.css"/>${schema ? `<script type="application/ld+json">${schema}</script>` : ''}<script src="/community/profile.js" defer></script></head><body><a class="skip" href="#main">Skip to content</a><header class="site-header"><a class="brand" href="/"><span class="brand-mark">ϟ</span>ElectraSim<span class="community-word">community</span></a><nav aria-label="Community"><a href="/c/explore">Explore circuits</a><a href="/c/feed">Your feed</a><a href="/settings/profile/">Your profile</a></nav></header><main id="main" tabindex="-1">${profile ? publicBody(profile) : '<section class="panel unavailable"><span class="empty-icon" aria-hidden="true">◌</span><span class="eyebrow">Community profile</span><h1>Profile unavailable</h1><p>This profile isn’t available to view. It may be private or no longer shared.</p></section>'}</main><footer><span>ElectraSim / A place to build and share.</span><a href="/app/">Open simulator ↗</a></footer><dialog id="report-dialog" aria-labelledby="report-title"><div id="report-body"></div></dialog><div id="toast" role="status" hidden></div></body></html>`,
  };
  if (profile && publications.length) {
    result.html = result.html
      .replace(
        'Circuits <span class="count">0</span>',
        `Circuits <span class="count">${publications.length}</span>`,
      )
      .replace(
        /<div class="empty-state" id="circuits">.*?<\/div>/,
        `<div class="publication-cards panel-body" id="circuits">${publications.map((p) => `<article><span class="eyebrow">CIRCUIT · VERSION ${p.versionNumber}</span><h3><a href="/c/${e(p.slug)}">${e(p.title)}</a></h3><p>${e(p.description)}</p><div class="meta">${p.tags.map((t) => `<span>${e(t)}</span>`).join('')}</div><button class="btn snapshot-button" type="button" data-slug="${e(p.slug)}">View snapshot</button></article>`).join('')}<noscript><p>Enable JavaScript to inspect snapshot versions and submit a report. Open a circuit title to view its published schematic without JavaScript.</p></noscript></div>`,
      )
      .replace('</head>', '<script src="/community/publications.js" defer></script></head>');
  }
  return result;
}
function publicBody(p: PublicProfile) {
  const e = escapeHtml;
  const joined = new Date(p.createdAt).toLocaleDateString('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `<div class="profile-toolbar"><span class="url-label">community / u / ${e(p.handle)}</span></div><section class="panel"><div class="profile-cover" aria-hidden="true"><span class="cover-caption">IDEAS. CONNECTIONS. POSSIBILITIES.</span><svg viewBox="0 0 1100 155" fill="none" preserveAspectRatio="xMidYMid slice"><g stroke="currentColor" stroke-width="1.4"><path d="M-10 95h190v-40h100v65h140v-35h190V45h130v65h170v-40h200M40 155v-35h90V30h160m170 125v-40h70V20h170m120 135v-20h90v-90h150"/><circle cx="180" cy="95" r="6"/><circle cx="420" cy="120" r="6"/><circle cx="740" cy="45" r="6"/></g></svg></div><div class="profile-identity"><div class="avatar large">${p.avatarUrl ? `<img src="${e(p.avatarUrl)}" alt="${e(p.displayName)}’s avatar" width="112" height="112"/>` : e(initials(p.displayName))}</div><div class="profile-title-row"><div><div class="profile-name"><h1>${e(p.displayName)}</h1><span class="pill green">Community member</span></div><p class="handle">@${e(p.handle)}</p></div><div class="actions" id="profile-actions"><button class="btn report-profile" data-handle="${e(p.handle)}" type="button">Report profile</button></div></div><p class="profile-bio">${e(p.bio) || 'A member of the ElectraSim community.'}</p><div class="meta">${p.institution ? `<span>${e(p.institution)}</span>` : ''}${p.level ? `<span>${e(p.level)}</span>` : ''}<span>Joined ${e(joined)}</span></div></div></section><div class="profile-bottom"><section class="panel"><div class="tab-strip"><a class="profile-section-label" id="circuits-tab" href="#circuits">Circuits <span class="count">0</span></a><a class="profile-section-label" id="about-tab" href="#about">About</a></div><div class="empty-state" id="circuits"><span class="empty-icon" aria-hidden="true">⌁</span><h3>No circuits shared yet</h3><p>When ${e(p.displayName.split(' ')[0])} shares a circuit, it will appear here.</p></div><div id="about" class="panel-body"><h3>A little about ${e(p.displayName.split(' ')[0])}</h3><p class="profile-bio">${e(p.bio) || 'No introduction added yet.'}</p></div></section><aside class="panel panel-body"><div class="aside-section"><p class="eyebrow">Built on curiosity</p><h3>Build. Understand. Share.</h3><p>Every connection is a chance to learn.</p></div><div class="aside-section"><h3>A respectful community</h3><p>Profile reports help keep this space welcoming.</p><noscript><p>Sign in through Your profile and enable JavaScript to submit a report.</p></noscript></div></aside></div>`;
}
export const profilePages = new Hono<ApiEnv>();
profilePages.use('/u/*', freshContext, async (c, next) => {
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  );
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  await next();
});
profilePages.onError((error, c) => {
  c.header('X-Robots-Tag', 'noindex, nofollow');
  return c.html(
    profileHtml(null, new URL(c.req.url).origin).html,
    error instanceof HTTPException && error.status === 404 ? 404 : 503,
  );
});
for (const path of ['/u/:handle', '/u/:handle/'])
  profilePages.get(path, async (c) => {
    const handle = (c.req.param('handle') ?? '').toLowerCase();
    const row = handleProblem(handle) ? null : await profileRow(c, handle, true);
    const p = publicProfile(row);
    if (p && c.req.path !== `/u/${handle}`) return c.redirect(`/u/${handle}`, 308);
    const publications = p && row ? await profilePublications(c, row.userId) : { items: [] };
    const result = profileHtml(p, new URL(c.req.url).origin, publications.items);
    let hash = '';
    if (result.schema) {
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(result.schema));
      hash = ` 'sha256-${btoa(String.fromCharCode(...new Uint8Array(digest)))}'`;
    }
    if (row && p) {
      c.set('db', c.env.DB.withSession('first-primary'));
      const current = await profileRow(c, handle, true);
      const latest =
        current && publicProfile(current) ? await profilePublications(c, current.userId) : null;
      if (
        !current ||
        current.revision !== row.revision ||
        !latest ||
        latest.profileRevision !== row.revision ||
        JSON.stringify(latest.items) !== JSON.stringify(publications.items)
      ) {
        c.header('X-Robots-Tag', 'noindex, nofollow');
        return c.html(profileHtml(null, new URL(c.req.url).origin).html, 404);
      }
    }
    // No shared/browser cache: a moderation/privacy change is checked for every page and image read.
    c.header(
      'Content-Security-Policy',
      `default-src 'self'; script-src 'self'${hash}; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`,
    );
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (!p) c.header('X-Robots-Tag', 'noindex, nofollow');
    return c.html(result.html, p ? 200 : 404);
  });
