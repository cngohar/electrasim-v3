/** Public website origin — the Astro marketing/docs site. */
export const SITE_URL = 'https://electrasim.com';

/** Build an absolute URL for a site path (e.g. '/guide/#circuit-1'). */
export function siteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
