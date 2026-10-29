# Circuit discovery — design concept

Open `index.html` directly in a browser. The preview uses fictional publications and
in-page SVG schematics, and makes no network requests.

- `#explore` previews the proposed `/c/explore` page. Search, zone, standard, sort,
  topic chips, **Clear filters** and **Show more circuits** work on the sample cards.
- `#feed` previews the proposed `/c/feed` page. Switch between **Following** and
  **Your circuits** to review the two feed states.

Card links use a placeholder hash because this isolated concept has no publication
backend. The diagrams illustrate the card composition; production cards would use
visibility-gated thumbnails from immutable published snapshots. The concept is for
layout and flow review. It does not establish Phase 2.4 implementation or acceptance.

Astro's `/explore/` remains reserved for the historical 3D laboratory. Existing
`/c/:slug` circuit details and `/u/:handle` profiles retain their routes. The API
contract is not changed by this preview.
