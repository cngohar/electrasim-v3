// V3 Worker — Hono on Workers. Serves API + assets. Local-first: `bun x wrangler dev --local`.
import { Hono } from 'hono';
import { type ApiEnv, requestAuth } from './api/context';
import { membershipApi } from './api/membership';

// ── Durable Object stub ──
export class PresenceRoom {
  async fetch(_request: Request): Promise<Response> {
    return new Response(JSON.stringify({ ok: true, room: 'presence' }), {
      headers: { 'content-type': 'application/json' },
    });
  }
}

const app = new Hono<ApiEnv>();

// ── i18n helpers (§31) ──
const SUPPORTED_LOCALES = ['en', 'fr', 'de', 'es', 'ar'] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = 'en';
const RTL_LOCALES = new Set<string>(['ar']);

function parseAcceptLanguage(header: string | undefined): Locale | null {
  if (!header) return null;
  const parts = header.split(',').map((s) => s.trim().toLowerCase());
  for (const part of parts) {
    const lang = part.split(';')[0]?.split('-')[0]?.trim();
    if (lang && (SUPPORTED_LOCALES as readonly string[]).includes(lang)) return lang as Locale;
  }
  return null;
}

function localeFromPath(pathname: string): Locale | null {
  const seg = pathname.split('/').filter(Boolean)[0];
  return seg && (SUPPORTED_LOCALES as readonly string[]).includes(seg) ? (seg as Locale) : null;
}

app.get('/api/health', (c) => c.json({ ok: true, version: '3.0.0', phase: '1.3' }));

app.get('/api/config', (c) =>
  c.json({
    appVersion: '3.0.0',
    features: { cardPayments: false },
    pricing: { currency: 'USD' },
  }),
);

app.get('/api/i18n', async (c) => {
  const url = new URL(c.req.url);
  const locale = (url.searchParams.get('locale') as Locale | null) ?? DEFAULT_LOCALE;
  if (!(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return c.json({ error: 'unsupported locale', supported: SUPPORTED_LOCALES }, 400);
  }
  const db = c.env.DB as unknown as {
    prepare: (sql: string) => {
      bind: (...a: unknown[]) => { all: () => Promise<{ results: unknown[] }> };
    };
  };
  // KV cache would sit here from Phase 5 — for now direct D1 (local only, small table).
  const res = await db
    .prepare('SELECT key, value, namespace FROM i18n_strings WHERE locale = ?')
    .bind(locale)
    .all();
  const strings: Record<string, string> = {};
  for (const r of res.results as Array<{ key: string; value: string }>) strings[r.key] = r.value;
  return c.json({ locale, isRtl: RTL_LOCALES.has(locale), strings });
});

app.get('/api/standards', async (c) => {
  const db = c.env.DB as unknown as {
    prepare: (sql: string) => { all: () => Promise<{ results: unknown[] }> };
  };
  const res = await db
    .prepare(
      'SELECT code,label,shortLabel,citation,flag,nominalVoltage,frequencyHz,metadataJson,version FROM electrical_standards ORDER BY code',
    )
    .all();
  return c.json({
    standards: (res.results as Array<Record<string, unknown>>).map(({ metadataJson, ...row }) => ({
      ...row,
      metadata: JSON.parse(String(metadataJson ?? '{}')),
    })),
  });
});

// ── Better Auth — mount at /api/auth/* ──
app.on(['GET', 'POST'], '/api/auth/*', (c) => requestAuth(c).handler(c.req.raw));
app.route('/api', membershipApi);

// ── Locale redirect + hreflang (applied to every non-API/asset request) ──
app.use('*', async (c, next) => {
  const url = new URL(c.req.url);
  const path = url.pathname;
  // Skip API, static assets, and already-localized paths
  if (path.startsWith('/api/') || path.includes('.') || localeFromPath(path)) {
    await next();
    return;
  }
  // For pages (/, /guide, /blog/* etc.): if Accept-Language resolves to non-default, redirect once
  // with 302 so / always lands on /:locale/. Crawlers follow hreflang, not the redirect.
  if (path === '/' || path === '') {
    const preferred = parseAcceptLanguage(c.req.header('Accept-Language'));
    if (preferred && preferred !== DEFAULT_LOCALE) {
      const qs = url.search ? url.search : '';
      return c.redirect(`/${preferred}/${qs}`, 302);
    }
  }
  await next();
});

export default app;
