import type { Page } from '@playwright/test';

/** Opt-in paint comparison, never shipped. Reuses the actual SVG paths and artwork.
 * It does not implement accessibility, editing rules or export parity; a faster
 * result is evidence for further work, not authorization to replace the renderer.
 */
export async function compareCanvas2D(page: Page) {
  return page.evaluate(async () => {
    const svg = document.querySelector<SVGSVGElement>('[data-circuit-canvas]')!;
    const world = svg.querySelector<SVGGElement>('[data-canvas-world]')!;
    const box = svg.getBoundingClientRect();
    const meetScale = Math.min(box.width / 1200, box.height / 720);
    const offset = { x: (box.width - 1200 * meetScale) / 2, y: (box.height - 720 * meetScale) / 2 };
    const view = world.transform.baseVal.consolidate()!.matrix;
    let zoom = view.a;
    let pan = { x: view.e, y: view.f };
    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio;
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    canvas.style.cssText = `position:absolute;inset:0;width:${box.width}px;height:${box.height}px;pointer-events:none`;
    const ctx = canvas.getContext('2d')!;
    const paths = Array.from(
      world.querySelectorAll<SVGPathElement>(
        '[data-dense-wire-layer] > path, [data-wire-hitbox] path',
      ),
    )
      .map((path) => {
        const css = getComputedStyle(path);
        return {
          path: new Path2D(path.getAttribute('d') ?? ''),
          stroke: css.stroke,
          width: Number.parseFloat(css.strokeWidth),
          opacity: Number(css.strokeOpacity),
          dash:
            css.strokeDasharray === 'none'
              ? []
              : css.strokeDasharray.split(/[, ]+/).map(Number.parseFloat),
        };
      })
      .filter((p) => p.stroke !== 'none' && p.width > 0);
    const nodes = await Promise.all(
      Array.from(world.querySelectorAll<SVGGElement>('[data-component-id]')).map(async (node) => {
        const transform = node.transform.baseVal.consolidate()!.matrix;
        const clone = node.cloneNode(true) as SVGGElement;
        clone.removeAttribute('transform');
        clone.removeAttribute('style');
        const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="100" viewBox="-14 -15 128 100" style="${svg.getAttribute('style') ?? ''}">${new XMLSerializer().serializeToString(clone)}</svg>`;
        const image = new Image();
        image.src = `data:image/svg+xml,${encodeURIComponent(markup)}`;
        await image.decode();
        return { image, transform };
      }),
    );
    const dot = svg.querySelector('pattern circle')?.getAttribute('fill') ?? '#e2e8f0';
    function paint() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, box.width, box.height);
      ctx.translate(offset.x + pan.x * meetScale, offset.y + pan.y * meetScale);
      ctx.scale(meetScale * zoom, meetScale * zoom);
      const x0 = (-offset.x / meetScale - pan.x) / zoom;
      const y0 = (-offset.y / meetScale - pan.y) / zoom;
      ctx.fillStyle = dot;
      for (let x = Math.floor(x0 / 24) * 24; x < x0 + box.width / meetScale / zoom; x += 24) {
        for (let y = Math.floor(y0 / 24) * 24; y < y0 + box.height / meetScale / zoom; y += 24)
          ctx.fillRect(x, y, 1, 1);
      }
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (const wire of paths) {
        ctx.strokeStyle = wire.stroke;
        ctx.lineWidth = wire.width;
        ctx.globalAlpha = wire.opacity;
        ctx.setLineDash(wire.dash);
        ctx.stroke(wire.path);
      }
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
      for (const node of nodes) {
        const m = node.transform;
        ctx.save();
        ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
        ctx.drawImage(node.image, -14, -15, 128, 100);
        ctx.restore();
      }
    }
    const visibility = svg.style.visibility;
    svg.style.visibility = 'hidden';
    svg.parentElement!.appendChild(canvas);
    const results: Record<string, { average: number; p95: number; paintAverage: number }> = {};
    try {
      paint();
      for (const mode of ['pan', 'drag', 'zoom']) {
        svg.setAttribute('data-canvas-gesture', mode);
        const samples: number[] = [];
        const costs: number[] = [];
        let previous = 0;
        for (let i = 0; i < 60; i++) {
          const time = await new Promise<number>(requestAnimationFrame);
          if (previous) samples.push(time - previous);
          previous = time;
          const start = performance.now();
          if (mode === 'pan')
            pan = { x: pan.x + 100 / 60 / meetScale, y: pan.y + 60 / 60 / meetScale };
          if (mode === 'drag') {
            nodes[0].transform.e += 80 / 60 / meetScale / zoom;
            nodes[0].transform.f += 40 / 60 / meetScale / zoom;
          }
          if (mode === 'zoom') {
            const next = zoom * Math.exp((i < 30 ? 4 : -4) * 0.0015);
            const cx = (box.width / 2 - offset.x) / meetScale;
            const cy = (box.height / 2 - offset.y) / meetScale;
            pan = { x: cx - ((cx - pan.x) * next) / zoom, y: cy - ((cy - pan.y) * next) / zoom };
            zoom = next;
          }
          paint();
          costs.push(performance.now() - start);
        }
        results[mode] = {
          average: samples.reduce((a, b) => a + b, 0) / samples.length,
          p95: [...samples].sort((a, b) => a - b)[Math.floor(samples.length * 0.95)],
          paintAverage: costs.reduce((a, b) => a + b, 0) / costs.length,
        };
      }
    } finally {
      canvas.remove();
      svg.style.visibility = visibility;
      svg.removeAttribute('data-canvas-gesture');
    }
    return { components: nodes.length, wirePaintBatches: paths.length, results };
  });
}
