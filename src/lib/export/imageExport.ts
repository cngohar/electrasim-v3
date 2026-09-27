export interface PrintMetadata {
  title?: string;
  author?: string;
  date?: string;
}

const SNAPSHOT_STYLES = `
  .device-rotor { animation: device-rotation 1.5s linear infinite; transform-origin: 0 0; }
  @keyframes device-rotation { to { transform: rotate(360deg); } }
  [data-reduced-effects="true"] * { animation: none !important; }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }

  .electrasim-wire-flow { animation: electrasim-wire-flow 1.1s linear infinite; }
  @keyframes electrasim-wire-flow { to { stroke-dashoffset: -28; } }
  .electrasim-fan-spin { animation: electrasim-fan-spin 1.4s linear infinite; transform-origin: center; transform-box: fill-box; }
  @keyframes electrasim-fan-spin { to { transform: rotate(360deg); } }
  .electrasim-motor-spin { animation: electrasim-motor-spin 2.5s linear infinite; transform-origin: center; transform-box: fill-box; }
  @keyframes electrasim-motor-spin { to { transform: rotate(360deg); } }
  .electrasim-bulb-pulse { animation: electrasim-bulb-pulse 1.8s ease-in-out infinite; }
  @keyframes electrasim-bulb-pulse { 0%,100% { opacity: 0.28; } 50% { opacity: 0.55; } }
  .electrasim-motor-pulse { animation: electrasim-motor-pulse 0.9s ease-in-out infinite; }
  @keyframes electrasim-motor-pulse { 0%,100% { stroke-width: 1.5; } 50% { stroke-width: 2.5; } }
`.trim();

interface SvgDimensions {
  width: number;
  height: number;
}

function getSvgDimensions(svg: SVGSVGElement): SvgDimensions | null {
  const width = Number(svg.getAttribute('width'));
  const height = Number(svg.getAttribute('height'));
  if (Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0) {
    return { width, height };
  }

  const viewBox = svg
    .getAttribute('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);
  if (
    viewBox?.length === 4 &&
    Number.isFinite(viewBox[2]) &&
    viewBox[2] > 0 &&
    Number.isFinite(viewBox[3]) &&
    viewBox[3] > 0
  ) {
    return { width: viewBox[2], height: viewBox[3] };
  }

  const bounds = svg.getBoundingClientRect();
  if (bounds.width > 0 && bounds.height > 0) {
    return { width: bounds.width, height: bounds.height };
  }
  return null;
}

export function exportSVG(svgElement: SVGSVGElement): string {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute('class');
  clone.removeAttribute('style');
  // Keep the self-contained theme without carrying editor sizing or cursor styles.
  for (const property of Array.from(svgElement.style)) {
    if (property.startsWith('--canvas-')) {
      clone.style.setProperty(property, svgElement.style.getPropertyValue(property));
    }
  }
  clone.removeAttribute('data-canvas-gesture');

  const dimensions = getSvgDimensions(clone);
  if (dimensions) {
    clone.setAttribute('width', String(dimensions.width));
    clone.setAttribute('height', String(dimensions.height));
  }

  const style = document.createElement('style');
  style.textContent = SNAPSHOT_STYLES;
  clone.insertBefore(style, clone.firstChild);
  return new XMLSerializer().serializeToString(clone);
}

export function exportPDF(svgElement: SVGSVGElement, metadata?: PrintMetadata): void {
  const svgString = exportSVG(svgElement);
  const title = escapeHtml(metadata?.title || 'ElectraSim Circuit');
  const author = escapeHtml(metadata?.author || '');
  const date = escapeHtml(metadata?.date || new Date().toLocaleDateString());
  const html = buildPrintDocument(svgString, title, author, date);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:1px;height:1px;';
  document.body.appendChild(iframe);

  const documentRoot = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!documentRoot) {
    iframe.remove();
    return;
  }

  documentRoot.open();
  documentRoot.write(html);
  documentRoot.close();

  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 2000);
  }, 300);
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!,
  );
}

function buildPrintDocument(svg: string, title: string, author: string, date: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>${title}</title>
<style>
  @page { size: landscape; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Inter, system-ui, sans-serif; color: #0f172a; }
  .title-block {
    display: flex; justify-content: space-between; align-items: flex-end;
    border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 12px;
  }
  .title-block h1 { font-size: 18px; font-weight: 700; color: #0f172a; }
  .title-block .meta { font-size: 10px; color: #64748b; text-align: right; }
  .circuit { width: 100%; }
  .circuit svg { width: 100%; height: auto; }
  .footer {
    margin-top: 12px; padding-top: 6px; border-top: 1px solid #e2e8f0;
    font-size: 9px; color: #94a3b8; display: flex; justify-content: space-between;
  }
</style>
</head>
<body>
  <div class="title-block">
    <h1>${title}</h1>
    <div class="meta">
      ${author ? `<div>${author}</div>` : ''}
      <div>${date}</div>
    </div>
  </div>
  <div class="circuit">${svg}</div>
  <div class="footer">
    <span>Generated by ElectraSim — Interactive Wiring Lab</span>
    <span>${date}</span>
  </div>
</body>
</html>`;
}

export function exportPNG(svgElement: SVGSVGElement, scale = 2): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const dimensions = getSvgDimensions(svgElement);
    if (!dimensions) {
      reject(new Error('SVG dimensions are unavailable.'));
      return;
    }
    if (!Number.isFinite(scale) || scale <= 0) {
      reject(new Error('PNG scale must be a positive number.'));
      return;
    }

    const source = new Blob([exportSVG(svgElement)], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(source);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(dimensions.width * scale);
      canvas.height = Math.round(dimensions.height * scale);
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas 2D context unavailable.'));
        return;
      }

      context.scale(scale, scale);
      context.drawImage(image, 0, 0, dimensions.width, dimensions.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('PNG encoding failed.'));
      }, 'image/png');
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('SVG → Image rendering failed.'));
    };
    image.src = url;
  });
}
