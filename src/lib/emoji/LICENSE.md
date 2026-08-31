# Emoji artwork attribution

The inline SVG pictographs in `glyphs.ts` are the official Twemoji artwork
(https://github.com/jdecked/twemoji, version 15.x, `assets/svg`, viewBox
`0 0 36 36`), used as pixel-identical vector replacements for the literal
emoji characters previously rendered by the visitor's OS emoji font.

## Twemoji graphics license (CC-BY 4.0)

Copyright 2020 Twitter, Inc and other contributors.

The Twemoji graphics are licensed under the Creative Commons Attribution 4.0
International License (CC-BY 4.0): https://creativecommons.org/licenses/by/4.0/

Attribution: https://github.com/jdecked/twemoji — "Twemoji" by Twitter, Inc
and other contributors.

The Twemoji code (not vendored here) is licensed under the MIT License.

Regenerate the registry from upstream assets with:

```sh
python3 scripts/generate-emoji-glyphs.py <path-to-twemoji>/assets/svg
```
