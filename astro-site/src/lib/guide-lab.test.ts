/**
 * guide-lab.js is a plain browser script (not a module), so it is exercised
 * here by evaluating it against jsdom fixtures that mirror what the Astro
 * components emit.
 *
 * The bug this guards against: when a detail page moves the anatomy detail
 * panel into the side rail, the card points at it with
 * `data-anatomy-detail-target`. Resolving that with `querySelector` alone
 * returns null — the panel *is* the target element, not a descendant of it —
 * which silently skipped the whole card and left every hotspot hidden.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/* vitest rewrites import.meta.url, so resolve from the workspace root instead. */
const SOURCE = readFileSync(resolve(process.cwd(), 'astro-site/public/js/guide-lab.js'), 'utf8');

/** Minimal stand-in for the markup CatalogCard + a detail page emit. */
function fixture({ targetId }: { targetId?: string } = {}) {
  document.body.innerHTML = `
    <article class="anatomy-card" data-anatomy data-anatomy-label="Miniature Circuit Breaker"
      ${targetId ? `data-anatomy-detail-target="${targetId}"` : ''}>
      <div class="anatomy-figure">
        <div class="anatomy-stage">
          <img class="anatomy-photo" src="/images/guide/mcb.png" width="286" height="768" alt="MCB" />
          <div class="anatomy-hotspots">
            <button type="button" class="dl-hotspot" data-point data-point-id="L1"
              data-point-px="50" data-point-py="28" data-point-label="Rating window"
              data-point-desc="Shows the continuous current rating.">1</button>
            <button type="button" class="dl-hotspot" data-point data-point-id="L2"
              data-point-px="50" data-point-py="50" data-point-label="Toggle lever"
              data-point-desc="Manual disconnect.">2</button>
          </div>
        </div>
      </div>
      ${
        targetId
          ? ''
          : `<div class="dl-anatomy-detail" data-anatomy-detail>
               <h4 data-anatomy-title>Miniature Circuit Breaker</h4>
               <p data-anatomy-text>Select a marked part to read about it.</p>
             </div>`
      }
    </article>
    ${
      targetId
        ? `<aside>
             <div class="dl-anatomy-detail" id="${targetId}" data-anatomy-detail>
               <h4 data-anatomy-title>Miniature Circuit Breaker</h4>
               <p data-anatomy-text>Select a numbered marker on the figure to read about that part.</p>
             </div>
           </aside>`
        : ''
    }
  `;
}

function runGuideLab() {
  const onCleanup = vi.fn();
  const registered: Array<(ctx: { onCleanup: (fn: () => void) => void }) => void> = [];
  (window as unknown as { ElectraSim: unknown }).ElectraSim = {
    onReady: (cb: (ctx: { onCleanup: (fn: () => void) => void }) => void) => registered.push(cb),
  };
  // jsdom has no ResizeObserver; the script guards with typeof, so a stub is
  // only needed to take the observer branch.
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  new Function(SOURCE)();
  expect(registered.length).toBe(1);
  registered[0]!({ onCleanup });
}

const card = () => document.querySelector('[data-anatomy]') as HTMLElement;
const overlay = () => document.querySelector('.anatomy-hotspots') as HTMLElement;
const hotspots = () => Array.from(document.querySelectorAll<HTMLElement>('[data-point]'));

describe('guide-lab.js anatomy cards', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('positions photo hotspots from percent coordinates and reveals them', () => {
    fixture();
    runGuideLab();

    expect(overlay().style.display).toBe('block');
    // jsdom reports a zero-sized box, so only assert the coords were applied.
    for (const btn of hotspots()) {
      expect(btn.style.left).not.toBe('');
      expect(btn.style.top).not.toBe('');
    }
  });

  it('writes the selected part into an external panel named by data-anatomy-detail-target', () => {
    fixture({ targetId: 'anatomy-detail' });
    runGuideLab();

    // The regression: a null detail lookup used to skip the card entirely,
    // leaving the overlay hidden and the markers unusable.
    expect(overlay().style.display).toBe('block');

    const panel = document.getElementById('anatomy-detail')!;
    hotspots()[1]!.click();

    expect(panel.querySelector('[data-anatomy-title]')!.textContent).toBe('Toggle lever');
    expect(panel.querySelector('[data-anatomy-text]')!.textContent).toBe('Manual disconnect.');
    expect(hotspots()[1]!.getAttribute('aria-pressed')).toBe('true');
  });

  it('still works when the panel lives inside the card', () => {
    fixture();
    runGuideLab();

    hotspots()[0]!.click();
    const panel = card().querySelector('[data-anatomy-detail]')!;
    expect(panel.querySelector('[data-anatomy-title]')!.textContent).toBe('Rating window');
    expect(panel.querySelector('[data-anatomy-text]')!.textContent).toBe(
      'Shows the continuous current rating.',
    );
  });

  it('falls back to viewBox coordinates for the diagrammatic drawing', () => {
    document.body.innerHTML = `
      <article class="anatomy-card" data-anatomy data-anatomy-label="RCD">
        <div class="anatomy-figure">
          <div class="anatomy-stage">
            <svg viewBox="0 0 220 260"><g></g></svg>
            <div class="anatomy-hotspots">
              <button type="button" class="dl-hotspot" data-point data-point-id="L0"
                data-point-vx="96" data-point-vy="54" data-point-label="Test button"
                data-point-desc="Press to prove the trip works.">1</button>
            </div>
          </div>
        </div>
        <div class="dl-anatomy-detail" data-anatomy-detail>
          <h4 data-anatomy-title>Residual Current Device</h4>
          <p data-anatomy-text>Select a marked part to read about it.</p>
        </div>
      </article>`;
    runGuideLab();

    expect(overlay().style.display).toBe('block');
    expect(hotspots()[0]!.style.left).not.toBe('');
  });
});
