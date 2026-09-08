import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import guide from '../content/pages/guide.json';
import type { GuideCircuit } from '../types/pages';
import { CIRCUIT_SCHEMATICS, anatomiesForCircuit, circuitsUsingAnatomy } from './guide';

/**
 * The circuit schematics are hand-authored SVG that nobody can eyeball on every
 * deploy, so these tests check the things that silently break a diagram:
 * conductors that end in mid-air, shapes drawn outside the frame, and circuits
 * that never got a schematic at all.
 */

type Pt = { x: number; y: number };

const num = (el: string, attr: string): number => {
  const match = el.match(new RegExp(`${attr}="(-?[\\d.]+)"`));
  return match ? Number(match[1]) : 0;
};

const all = (svg: string, tag: string): string[] =>
  svg.match(new RegExp(`<${tag}\\b[^>]*>`, 'g')) ?? [];

/** Absolute M/L/H/V polyline — every conductor in the schematics uses these. */
function polyline(d: string): Pt[] {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  const points: Pt[] = [];
  let cur: Pt = { x: 0, y: 0 };
  let i = 0;
  while (i < tokens.length) {
    const cmd = tokens[i++];
    if (cmd !== 'M' && cmd !== 'L' && cmd !== 'H' && cmd !== 'V') return points; // arc/relative: skip
    if (cmd === 'M' || cmd === 'L') {
      cur = { x: Number(tokens[i++]), y: Number(tokens[i++]) };
    } else if (cmd === 'H') {
      cur = { x: Number(tokens[i++]), y: cur.y };
    } else {
      cur = { x: cur.x, y: Number(tokens[i++]) };
    }
    points.push({ ...cur });
  }
  return points;
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Shortest distance from p to segment ab. */
function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return dist(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Every element of a schematic, split into the things a wire may land on. */
function parse(svg: string) {
  const shapes = {
    circles: all(svg, 'circle').map((el) => ({
      c: { x: num(el, 'cx'), y: num(el, 'cy') },
      r: num(el, 'r'),
    })),
    rects: all(svg, 'rect').map((el) => ({
      x: num(el, 'x'),
      y: num(el, 'y'),
      w: num(el, 'width'),
      h: num(el, 'height'),
    })),
    lines: all(svg, 'line').map((el) => ({
      a: { x: num(el, 'x1'), y: num(el, 'y1') },
      b: { x: num(el, 'x2'), y: num(el, 'y2') },
    })),
  };

  /** Terminals, device bodies and symbol strokes — everything except conductors. */
  const onComponent = (p: Pt) =>
    shapes.circles.some((c) => dist(p, c.c) <= c.r + 3) ||
    shapes.rects.some(
      (r) => p.x >= r.x - 3 && p.x <= r.x + r.w + 3 && p.y >= r.y - 3 && p.y <= r.y + r.h + 3,
    ) ||
    shapes.lines.some((l) => distToSegment(p, l.a, l.b) <= 5);

  const paths = all(svg, 'path').map((el) => ({
    el,
    d: el.match(/d="([^"]+)"/)?.[1] ?? '',
    points: polyline(el.match(/d="([^"]+)"/)?.[1] ?? ''),
  }));

  const allPoints = paths.flatMap((p) => p.points);

  return {
    shapes,
    paths,
    wires: paths.filter((p) => /class="w[ "]/.test(p.el)),
    onComponent,
    /**
     * Every other path, as vertices and segments: a conductor is connected if
     * it lands on another conductor's end or anywhere along its run.
     */
    others: (exclude: number) => {
      const rest = paths.filter((_, i) => i !== exclude).flatMap((p) => p.points);
      const segments: [Pt, Pt][] = [];
      for (const path of paths.filter((_, i) => i !== exclude)) {
        for (let i = 1; i < path.points.length; i++)
          segments.push([path.points[i - 1], path.points[i]]);
      }
      return {
        touches: (p: Pt) =>
          rest.some((q) => dist(p, q) <= 3) ||
          segments.some(([a, b]) => distToSegment(p, a, b) <= 3),
      };
    },
    allPoints,
  };
}

/** 12px monospace label boxes — the widest plausible glyph advance, so boxes are never under-measured. */
function labels(svg: string) {
  return [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((full) => {
    const el = full[0].replace(/<\/text>$/, '');
    const text = full[1].trim();
    const width = text.length * 7.3;
    const x = num(el, 'x');
    const y = num(el, 'y');
    const anchor = el.match(/text-anchor="([^"]+)"/)?.[1];
    const x1 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
    return { text, box: { x1, x2: x1 + width, y1: y - 9, y2: y + 3 } };
  });
}

const inBox = (p: Pt, b: { x1: number; x2: number; y1: number; y2: number }) =>
  p.x >= b.x1 && p.x <= b.x2 && p.y >= b.y1 && p.y <= b.y2;

const strokesThrough = (a: Pt, b: Pt, box: { x1: number; x2: number; y1: number; y2: number }) => {
  for (let step = 0; step <= 40; step++) {
    const p = { x: a.x + ((b.x - a.x) * step) / 40, y: a.y + ((b.y - a.y) * step) / 40 };
    if (inBox(p, box)) return true;
  }
  return false;
};

const boxesOverlap = (a: { x1: number; x2: number; y1: number; y2: number }, b: typeof a) =>
  !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);

const circuits = guide.circuits as GuideCircuit[];

describe('circuit schematics', () => {
  it('has a schematic for every circuit in the guide', () => {
    const missing = circuits.filter((c) => !CIRCUIT_SCHEMATICS[c.id]?.trim()).map((c) => c.id);
    expect(missing).toEqual([]);
    expect(circuits.length).toBeGreaterThan(0);
  });

  for (const circuit of circuits) {
    describe(circuit.id, () => {
      const svg = CIRCUIT_SCHEMATICS[circuit.id];
      if (!svg) return; // covered by the "every circuit" test above

      it('is a labelled, framed SVG', () => {
        expect(svg.trim().startsWith('<svg')).toBe(true);
        expect(svg.trim().endsWith('</svg>')).toBe(true);
        expect(svg).toMatch(/viewBox="0 0 \d+ \d+"/);
        expect(svg).toMatch(/role="img"/);
        const label = svg.match(/aria-label="([^"]+)"/)?.[1] ?? '';
        expect(label.length).toBeGreaterThan(40);
      });

      it('marks live, the return path and current flow', () => {
        // DC circuits carry a positive and a negative rail instead of live and
        // neutral, so the return conductor may be neutral, earth or DC-.
        const dc = /class="w wdp"/.test(svg);
        expect(svg).toMatch(dc ? /class="w wdp"/ : /class="w wl"/);
        expect(svg).toMatch(/class="w (wn|we|wdn)"/);
        expect(svg).toMatch(/class="flow"/);
      });

      it('keeps every shape inside the frame', () => {
        const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/) ?? [];
        const frameW = Number(w);
        const frameH = Number(h);
        const inFrame = (x: number, y: number) => x >= 0 && x <= frameW && y >= 0 && y <= frameH;
        for (const el of all(svg, 'circle')) {
          expect(inFrame(num(el, 'cx'), num(el, 'cy')), `circle ${el}`).toBe(true);
        }
        for (const el of all(svg, 'rect')) {
          expect(inFrame(num(el, 'x'), num(el, 'y')), `rect ${el}`).toBe(true);
          expect(
            inFrame(num(el, 'x') + num(el, 'width'), num(el, 'y') + num(el, 'height')),
            `rect corner ${el}`,
          ).toBe(true);
        }
        for (const el of all(svg, 'line')) {
          expect(inFrame(num(el, 'x1'), num(el, 'y1')), `line ${el}`).toBe(true);
          expect(inFrame(num(el, 'x2'), num(el, 'y2')), `line ${el}`).toBe(true);
        }
        for (const full of svg.match(/<text\b[^>]*>([^<]*)<\/text>/g) ?? []) {
          const el = full.replace(/<\/text>$/, '');
          const label = full
            .replace(/<\/text>/, '')
            .replace(/<text\b[^>]*>/, '')
            .trim();
          const width = label.length * 7.3; // 12px monospace: worst case, so the box is never under-measured
          const x = num(el, 'x');
          const y = num(el, 'y');
          const anchor = el.match(/text-anchor="([^"]+)"/)?.[1];
          const x1 = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
          expect(inFrame(x1, y - 9), `text "${label}" starts outside the frame`).toBe(true);
          expect(inFrame(x1 + width, y + 3), `text "${label}" ends outside the frame`).toBe(true);
        }
      });

      it('leaves no conductor end floating in mid-air', () => {
        const { wires, paths, onComponent, others } = parse(svg);
        expect(wires.length).toBeGreaterThan(0);
        for (const wire of wires) {
          const index = paths.indexOf(wire);
          const ends = [wire.points[0], wire.points[wire.points.length - 1]];
          for (const end of ends) {
            const landed = onComponent(end) || others(index).touches(end);
            expect(landed, `dangling end ${end?.x},${end?.y} of ${wire.d}`).toBe(true);
          }
        }
      });

      it('keeps the animated current on the conductors', () => {
        const { paths, wires, onComponent } = parse(svg);
        const flows = paths.filter((p) => p.el.includes('class="flow"'));
        expect(flows.length).toBeGreaterThan(0);
        const onWire = (p: Pt) =>
          wires.some(
            (w) =>
              w.points.some((q) => dist(p, q) <= 3) ||
              w.points.some((q, i) => i > 0 && distToSegment(p, w.points[i - 1], q) <= 3),
          );
        for (const f of flows) {
          for (const point of f.points) {
            expect(
              onWire(point) || onComponent(point),
              `flow point ${point.x},${point.y} of ${f.d} is off the conductor`,
            ).toBe(true);
          }
        }
      });

      it('prints no label on top of a conductor', () => {
        const { shapes, paths } = parse(svg);
        const strokes: [Pt, Pt][] = shapes.lines.map((l) => [l.a, l.b]);
        for (const path of paths) {
          for (let i = 1; i < path.points.length; i++)
            strokes.push([path.points[i - 1], path.points[i]]);
        }
        for (const label of labels(svg)) {
          for (const [a, b] of strokes) {
            expect(
              strokesThrough(a, b, label.box),
              `label "${label.text}" sits on a conductor`,
            ).toBe(false);
          }
        }
      });

      it('keeps labels clear of each other', () => {
        const all = labels(svg);
        for (let i = 0; i < all.length; i++) {
          for (let j = i + 1; j < all.length; j++) {
            expect(
              boxesOverlap(all[i].box, all[j].box),
              `labels "${all[i].text}" and "${all[j].text}" overlap`,
            ).toBe(false);
          }
        }
      });

      it('connects the supply terminals to the drawing', () => {
        const { shapes, allPoints } = parse(svg);
        const terminal = (cls: string) =>
          shapes.circles.find((c) => svg.includes(`<circle class="term ${cls}"`))?.c;
        const dc = /class="w wdp"/.test(svg);
        const neutral = svg.includes('<circle class="term term-n"');
        const rails = dc
          ? ([
              ['positive', terminal('term-p')],
              ['negative', terminal('term-m')],
            ] as const)
          : neutral
            ? ([
                ['live', terminal('term-l')],
                ['neutral', terminal('term-n')],
              ] as const)
            : // Three-phase drawings return through the other phases, so the
              // only other supply rail is the protective earth.
              ([
                ['live', terminal('term-l')],
                ['earth', terminal('term-e')],
              ] as const);
        for (const [name, term] of rails) {
          expect(term, `no ${name} terminal`).toBeDefined();
          const near = allPoints.some((p) => dist(p, term as Pt) <= 12);
          expect(near, `nothing touches the ${name} terminal`).toBe(true);
        }
      });
    });
  }
});

/* ── component library ───────────────────────────────────────────────────── */

type AnatomyDoc = {
  slug: string;
  name: string;
  svg: { viewBox: string; body: string };
  points: { id: string; x: number; y: number }[];
  photo?: {
    src: string;
    alt: string;
    width: number;
    height: number;
    points: { id: string; x: number; y: number }[];
  };
};

const ANATOMY_DIR = resolve(process.cwd(), 'astro-site/src/content/guide-components');
const PUB = resolve(process.cwd(), 'astro-site/public');

const components: AnatomyDoc[] = readdirSync(ANATOMY_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(resolve(ANATOMY_DIR, f), 'utf8')) as AnatomyDoc);

/** Width and height straight from the PNG header — no image library needed. */
function pngSize(file: string) {
  const buf = readFileSync(file);
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

const circuitsBy = (id: string) => circuits.find((c) => c.id === id) as GuideCircuit;

describe('component anatomy library', () => {
  it('ships a page for every component the circuits name', () => {
    const linked = new Set(circuits.flatMap((c) => anatomiesForCircuit(c).map((r) => r.slug)));
    const pages = new Set(components.map((c) => c.slug));
    expect([...pages].filter((slug) => !linked.has(slug))).toEqual([]);
    expect([...linked].filter((slug) => !pages.has(slug))).toEqual([]);
  });

  it('resolves each circuit component to the page that explains it', () => {
    const slugsFor = (id: string) => anatomiesForCircuit(circuitsBy(id)).map((r) => r.slug);
    expect(slugsFor('circuit-3')).toContain('two-way-switch');
    expect(slugsFor('circuit-3')).not.toContain('switch');
    expect(slugsFor('circuit-1')).toContain('switch');
    expect(slugsFor('circuit-5')).toContain('timer-switch');
    expect(slugsFor('circuit-5')).not.toContain('switch');
    expect(slugsFor('circuit-6')).toContain('dimmer-switch');
    expect(slugsFor('circuit-2')).toContain('junction-box');
    expect(slugsFor('circuit-7')).toEqual(expect.arrayContaining(['push-button', 'bell']));
    expect(slugsFor('circuit-8')).toEqual(
      expect.arrayContaining(['distribution-board', 'motor', 'switch', 'mcb']),
    );
    // The four walkthroughs added for the app-only guided templates.
    expect(slugsFor('circuit-9')).toEqual(expect.arrayContaining(['mcb', 'bulb']));
    expect(slugsFor('circuit-10')).toEqual(expect.arrayContaining(['timer-switch', 'bell']));
    expect(slugsFor('circuit-10')).not.toContain('switch');
    expect(slugsFor('circuit-11')).toEqual(expect.arrayContaining(['rcd', 'socket', 'bulb']));
    expect(slugsFor('circuit-12')).toEqual(expect.arrayContaining(['motor', 'mcb']));
  });

  it('gives every page a way back into the circuits', () => {
    for (const component of components) {
      expect(
        circuitsUsingAnatomy(circuits, component.slug).length,
        `${component.slug} is not used by any circuit`,
      ).toBeGreaterThan(0);
    }
  });

  for (const component of components) {
    describe(component.slug, () => {
      it('has unique point ids inside the drawing frame', () => {
        const ids = component.points.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
        const [, , w, h] = component.svg.viewBox.split(' ').map(Number);
        for (const point of component.points) {
          expect(point.x >= 0 && point.x <= w, `${point.id} x`).toBe(true);
          expect(point.y >= 0 && point.y <= h, `${point.id} y`).toBe(true);
        }
      });

      it('draws every point it describes', () => {
        for (const point of component.points) {
          expect(component.svg.body.includes(`data-part="${point.id}"`), `${point.id}`).toBe(true);
        }
      });

      it('pins photo hotspots to real points on a real image', () => {
        const photo = component.photo;
        expect(photo, 'no render').toBeDefined();
        if (!photo) return;
        for (const ext of ['webp', 'png']) {
          expect(
            existsSync(resolve(PUB, `${photo.src.slice(1)}.${ext}`)),
            `${photo.src}.${ext}`,
          ).toBe(true);
        }
        const size = pngSize(resolve(PUB, `${photo.src.slice(1)}.png`));
        expect(photo.width).toBe(size.width);
        expect(photo.height).toBe(size.height);
        expect(photo.alt.length).toBeGreaterThan(10);
        expect(photo.points.length).toBeGreaterThan(0);
        for (const point of photo.points) {
          expect(
            component.points.some((p) => p.id === point.id),
            `photo point ${point.id} has no anatomy point`,
          ).toBe(true);
          expect(point.x > 0 && point.x < 100, `${point.id} x`).toBe(true);
          expect(point.y > 0 && point.y < 100, `${point.id} y`).toBe(true);
        }
      });
    });
  }
});
