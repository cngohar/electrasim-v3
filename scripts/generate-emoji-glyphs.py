#!/usr/bin/env python3
"""Generate src/lib/emoji/glyphs.ts from official Twemoji SVG assets.

Source: https://github.com/jdecked/twemoji (assets/svg, viewBox 0 0 36 36).
Twemoji graphics are licensed CC-BY 4.0 (see src/lib/emoji/LICENSE.md).
Usage: python3 scripts/generate-emoji-glyphs.py <path-to-twemoji-assets/svg>
"""
import os, re, sys

NAME_TO_ASSET = {
  'bolt': '26a1', 'gear': '2699', 'plug': '1f50c', 'bulb': '1f4a1', 'flame': '1f525',
  'fan': '1f300', 'wheel': '1f6de', 'bell': '1f514', 'shower': '1f6bf', 'snow': '2744',
  'cooker': '1f373', 'car': '1f697', 'hot-springs': '2668', 'wind': '1f4a8',
  'thermometer': '1f321', 'wind-face': '1f32c', 'plate': '1f37d', 'basket': '1f9fa',
  'ice': '1f9ca', 'eye': '1f441', 'siren': '1f6a8', 'box': '1f4e6', 'radio-button': '1f518',
  'shield': '1f6e1', 'wrench': '1f527', 'nut-bolt': '1f529', 'knobs': '1f39b',
  'bright': '1f506', 'radio': '1f4fb', 'sunrise': '1f305', 'shuffle': '1f500',
  'timer': '23f2', 'stopwatch': '23f1', 'hourglass': '23f3', 'red-circle': '1f534',
  'blue-circle': '1f535', 'green-circle': '1f7e2', 'battery': '1f50b', 'sun': '2600',
  'factory': '1f3ed', 'numbers': '1f522', 'grid-square': '1f532', 'dynamite': '1f9e8',
  'razor': '1fa92', 'moon': '1f319', 'laptop': '1f4bb', 'paint': '1f3a8', 'trash': '1f5d1',
  'pencil': '270f', 'unlock': '1f513', 'clock9': '1f558', 'folder': '1f4c2',
  'speech': '1f4ac', 'bell-off': '1f515', 'race-car': '1f3ce', 'sparkles': '2728',
  'grad-cap': '1f393', 'squiggle': '3030', 'desktop': '1f5a5', 'party': '1f389',
  'devil': '1f608', 'warning': '26a0', 'lock': '1f512', 'refresh': '1f504', 'wave': '1f30a',
  'no-entry': '26d4', 'prohibited': '1f6ab', 'crystal': '1f52e', 'map': '1f5fa',
  'book': '1f4d8', 'envelope': '2709', 'globe': '1f310', 'boom': '1f4a5',
  'scissors': '2702', 'tick': '2705', 'printer': '1f5a8', 'ruler': '1f4cf',
  'cabinet': '1f5c4', 'flag-gb': '1f1ec-1f1e7', 'flag-us': '1f1fa-1f1f8',
  'flag-eu': '1f1ea-1f1fa', 'flag-au': '1f1e6-1f1fa', 'flag-in': '1f1ee-1f1f3',
  'earth': '1f30d', 'black-square': '2b1b', 'down-arrow': '2b07',
}

SVG_RE = re.compile(r'<svg[^>]*>(.*)</svg>', re.S)
WS_RE = re.compile(r'>\s+<')

def main():
    asset_dir = sys.argv[1]
    entries = []
    for name, asset in NAME_TO_ASSET.items():
        path = os.path.join(asset_dir, f'{asset}.svg')
        with open(path, encoding='utf-8') as fh:
            raw = fh.read()
        m = SVG_RE.search(raw)
        if not m:
            raise SystemExit(f'could not parse {path}')
        inner = WS_RE.sub('><', m.group(1)).strip()
        entries.append(f"  '{name}': '{inner}',")
    body = '\n'.join(entries)
    out = f'''/**
 * glyphs.ts — official Twemoji SVG artwork, inlined for the ElectraSim UI.
 *
 * Every pictograph previously rendered as a literal emoji character is now
 * drawn from this registry instead, so the glyph is pixel-identical on every
 * OS/browser (no emoji-font dependency, no missing-glyph boxes, no blurry
 * scaling) and never triggers a font fallback.
 *
 * Artwork: Twemoji 15.x (https://github.com/jdecked/twemoji), assets/svg,
 * viewBox 0 0 36 36. Graphics are licensed CC-BY 4.0 — attribution in
 * src/lib/emoji/LICENSE.md. Regenerate with scripts/generate-emoji-glyphs.py.
 */

/** Inner SVG markup (paths/shapes only) keyed by semantic icon name. */
export const EMOJI_GLYPHS: Record<string, string> = {{
{body}
}};

/** viewBox shared by every glyph in this registry. */
export const EMOJI_GLYPH_VIEWBOX = '0 0 36 36';
'''
    dest = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'lib', 'emoji', 'glyphs.ts')
    with open(dest, 'w', encoding='utf-8') as fh:
        fh.write(out)
    print(f'wrote {dest} with {len(entries)} glyphs')

if __name__ == '__main__':
    main()
