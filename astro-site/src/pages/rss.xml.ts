import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';

/**
 * RSS 2.0 feed for the blog + release notes.
 *
 * A 67-article corpus with no feed is unsubscribable: readers, aggregators and
 * newsletter tools have no way to follow it, and there was no
 * `<link rel="alternate">` anywhere on the site. Hand-rolled rather than pulling
 * in @astrojs/rss — the payload is a dozen fields and this keeps the dependency
 * surface at zero.
 *
 * Both collections are included because /updates/ is where product news lives;
 * `<category>` distinguishes them for anyone filtering.
 */

const SITE = 'https://electrasim.com';
const MAX_ITEMS = 40;

/** XML text escaping. `>` is escaped too so a stray `]]>` cannot break a feed. */
function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async () => {
  const [blogPosts, updatePosts] = await Promise.all([
    getCollection('blog', ({ data }) => !data.draft),
    getCollection('updates', ({ data }) => !data.draft),
  ]);

  const items = [
    ...blogPosts.map((post) => ({ post, path: `blog/${post.id}` })),
    ...updatePosts.map((post) => ({ post, path: `updates/${post.id}` })),
  ]
    // Chronological only: `featured` is a homepage-ordering concern and would
    // put a months-old post at the top of a subscriber's reader.
    .sort((a, b) => b.post.data.pubDate.valueOf() - a.post.data.pubDate.valueOf())
    .slice(0, MAX_ITEMS);

  const lastBuildDate = (
    items[0]?.post.data.updatedDate ??
    items[0]?.post.data.pubDate ??
    new Date()
  ).toUTCString();

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ElectraSim — Wiring Guides &amp; Product Updates</title>
    <link>${SITE}/blog/</link>
    <description>Practical house-wiring guides, regulation explainers and ElectraSim release notes.</description>
    <language>en-GB</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
${items
  .map(({ post, path }) => {
    const url = `${SITE}/${path}/`;
    return `    <item>
      <title>${xmlEscape(post.data.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${post.data.pubDate.toUTCString()}</pubDate>
      <description>${xmlEscape(post.data.description)}</description>
      <category>${xmlEscape(post.data.category)}</category>
    </item>`;
  })
  .join('\n')}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
