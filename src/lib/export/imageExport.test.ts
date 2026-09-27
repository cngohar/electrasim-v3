import { describe, expect, it, vi } from 'vitest';
import { exportPDF, exportPNG, exportSVG } from './imageExport';

function createSvg(): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'interactive-canvas');
  svg.setAttribute('style', 'background: red');
  svg.setAttribute('viewBox', '0 0 100 50');
  svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'circle'));
  return svg;
}

describe('image export', () => {
  it('creates a self-contained SVG without mutating the live canvas', () => {
    const svg = createSvg();

    const result = exportSVG(svg);
    const exported = new DOMParser().parseFromString(result, 'image/svg+xml').documentElement;

    expect(svg.getAttribute('class')).toBe('interactive-canvas');
    expect(svg.getAttribute('style')).toBe('background: red');
    expect(exported.getAttribute('class')).toBeNull();
    expect(exported.getAttribute('style')).toBeNull();
    expect(exported.getAttribute('width')).toBe('100');
    expect(exported.getAttribute('height')).toBe('50');
    expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(exported.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(exported.querySelector('style')?.textContent).toContain(
      '@keyframes electrasim-wire-flow',
    );
    expect(exported.querySelector('circle')).not.toBeNull();
  });

  it('retains the canvas theme and reduced effects in standalone exports', () => {
    const svg = createSvg();
    svg.style.setProperty('--canvas-text', '#f8fafc');
    svg.style.setProperty('--canvas-surface', '#0f172a');
    svg.setAttribute('data-canvas-gesture', 'pan');
    svg.setAttribute('data-reduced-effects', 'true');
    const exported = new DOMParser().parseFromString(
      exportSVG(svg),
      'image/svg+xml',
    ).documentElement;
    expect(exported.getAttribute('style')).toContain('--canvas-text: #f8fafc');
    expect(exported.getAttribute('style')).not.toContain('background');
    expect(exported.hasAttribute('data-canvas-gesture')).toBe(false);
    expect(exported.getAttribute('data-reduced-effects')).toBe('true');
    expect(svg.getAttribute('data-canvas-gesture')).toBe('pan');
  });

  it('sizes PNG output from the SVG viewBox instead of the browser image default', async () => {
    const canvas = document.createElement('canvas');
    const context = { scale: vi.fn(), drawImage: vi.fn() };
    Object.defineProperty(canvas, 'getContext', { value: () => context });
    Object.defineProperty(canvas, 'toBlob', {
      value: (callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' })),
    });

    const createElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName, options) =>
      tagName === 'canvas' ? canvas : createElement(tagName, options),
    );
    vi.stubGlobal(
      'Image',
      class {
        naturalWidth = 300;
        naturalHeight = 150;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        set src(_value: string) {
          queueMicrotask(() => this.onload?.());
        }
      },
    );
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });

    try {
      await exportPNG(createSvg(), 2);
      expect(canvas.width).toBe(200);
      expect(canvas.height).toBe(100);
      expect(context.scale).toHaveBeenCalledWith(2, 2);
      expect(context.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 100, 50);
    } finally {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    }
  });

  it('escapes print metadata before writing the print document', () => {
    vi.useFakeTimers();
    try {
      exportPDF(createSvg(), {
        title: '<img src=x onerror=alert(1)>',
        author: '<script>alert(1)</script>',
        date: 'A&B',
      });

      const frame = document.querySelector('iframe');
      expect(frame).not.toBeNull();
      expect(frame?.contentDocument?.title).toBe('<img src=x onerror=alert(1)>');
      expect(frame?.contentDocument?.querySelector('script')).toBeNull();
      expect(frame?.contentDocument?.querySelector('img')).toBeNull();
      expect(frame?.contentDocument?.body.textContent).toContain('<script>alert(1)</script>');
      expect(frame?.contentDocument?.body.textContent).toContain('A&B');
      frame?.remove();
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
