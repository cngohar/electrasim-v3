import type { APIRoute } from 'astro';
import guideData from '../../content/pages/guide.json';
import { circuitSlugMap } from '../../lib/guide';

export const GET: APIRoute = () => {
  const slugs = circuitSlugMap(guideData.circuits);
  const source = `(function () {
  var match = /^#circuit-(\\d+)$/.exec(window.location.hash);
  if (!match) return;
  var slug = window.__GUIDE_CIRCUIT_SLUGS && window.__GUIDE_CIRCUIT_SLUGS['circuit-' + match[1]];
  if (slug) window.location.replace('/guide/circuits/' + slug + '/');
})();`;

  return new Response(`window.__GUIDE_CIRCUIT_SLUGS=${JSON.stringify(slugs)};\n${source}`, {
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, must-revalidate',
    },
  });
};
