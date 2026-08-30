/**
 * engine.dom.test.ts — drives the browser engine against a DOM (§34, §35).
 *
 * Playwright covers the same journeys in a real browser; this test covers them
 * where the unit tests cannot reach — inside the DOM, with the actual events the
 * visitor fires. It boots the engine over a fixture that mirrors the component
 * markup, then asserts the promises the design makes:
 *
 *   • the scene changes load for load, and cable thickness for size;
 *   • the recommendation and the inspected cable stay separate concepts;
 *   • results, the comparison strip and the live region all follow the state.
 *
 * The companion `it('every id the engine touches exists in the markup')` test
 * reads the real `.astro` components, so renaming an id in a component without
 * updating the engine (or this fixture) fails here rather than in production.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(here, '../../components/tools');
const DEFAULT_SIZES = [1.5, 2.5, 4, 6, 10, 16, 25, 35];

/* ── fixture: the DOM contract between the components and the engine ─────── */

function candidateButtons(): string {
  return DEFAULT_SIZES.map(
    (size) => `
      <button type="button" class="cs2-candidate" data-size="${size}" aria-pressed="false">
        <span class="cs2-candidate-size">${size}</span>
        <span class="cs2-candidate-status" data-role="status"></span>
        <span class="cs2-candidate-volts" data-role="volts"></span>
        <span class="cs2-candidate-pct" data-role="pct"></span>
        <span class="cs2-candidate-flag" data-role="flag"></span>
      </button>`,
  ).join('');
}

/** Segmented controls: the label is what carries the selected look. */
function segRadios(name: string, values: string[], checked: string): string {
  return values
    .map(
      (value) =>
        `<label class="ts-seg-btn"><input type="radio" name="${name}" value="${value}" ${
          value === checked ? 'checked' : ''
        } /><span>${value}</span></label>`,
    )
    .join('');
}

function loadRadios(): string {
  return ['lighting', 'fan', 'motor', 'heater', 'appliance', 'custom']
    .map(
      (id) =>
        `<label class="ts-chip cs2-load-chip"><input type="radio" name="cs2-load" value="${id}" ${
          id === 'lighting' ? 'checked' : ''
        } /><span class="ts-chip-name">${id}</span></label>`,
    )
    .join('');
}

function fixture(): string {
  return `
  <div id="interactive-stage" class="ts-stage" data-stage="stackable">
    <div id="scene-frame">
      <div id="cs2-scene-root" class="cs2-scene" data-load="lighting" data-status="pass" data-material="copper" data-system="ac">
        <svg id="cs2-scene-svg">
          <title id="cs2-scene-title"></title>
          <g class="cs2-flow">
            <circle class="cs2-flow-dot"><animateMotion data-delay="0" repeatCount="indefinite" /></circle>
            <circle class="cs2-flow-dot"><animateMotion data-delay="0.7" repeatCount="indefinite" /></circle>
            <circle class="cs2-flow-dot"><animateMotion data-delay="1.4" repeatCount="indefinite" /></circle>
          </g>
        </svg>
        <span id="cs2-source-volts"></span><span id="cs2-source-system"></span>
        <span id="cs2-cable-label"></span><span id="cs2-cable-sub"></span>
        <span id="cs2-load-power"></span><span id="cs2-load-current"></span>
        <span id="cs2-load-volts"></span><span id="cs2-drop-volts"></span><span id="cs2-drop-pct"></span>
        <span id="cs2-status-label"></span><span id="cs2-status-note"></span>
      </div>
    </div>
    <div id="panel-wrap">
      <div class="ts-hud-tools">
        <button type="button" id="cs2-animate-toggle" class="ts-tool-btn active" aria-pressed="true"></button>
      </div>

      <div class="ts-panel ts-panel--inputs" id="cs2-inputs-container">
        <button type="button" class="ts-sheet-grabber"></button>
        <button type="button" class="ts-sheet-close"></button>
        <button type="button" class="ts-panel-collapse" id="cs2-collapse-inputs" aria-expanded="true"></button>
        <div id="cs2-validation" hidden><p id="cs2-validation-message"></p></div>
        <form id="cs2-inputs-body">
          ${segRadios('cs2-system', ['ac', 'dc'], 'ac')}
          ${loadRadios()}
          ${segRadios('cs2-material', ['copper', 'aluminium'], 'copper')}
          ${segRadios('cs2-limit', ['3', '5', 'custom'], '3')}
          <input id="cs2-voltage" type="number" value="230" />
          <p class="cs2-field-error" id="cs2-error-voltage" hidden></p>
          <input id="cs2-length" type="number" value="25" />
          <p class="cs2-field-error" id="cs2-error-length" hidden></p>
          <input id="cs2-length-range" type="range" value="25" />
          <p class="cs2-range-hint" id="cs2-length-hint" hidden></p>
          <input id="cs2-temp" type="number" value="70" />
          <p class="cs2-field-error" id="cs2-error-temp" hidden></p>
          <div id="cs2-temp-presets">
            <button type="button" class="cs2-mini-chip cs2-temp-chip" data-celsius="20" aria-pressed="false">20 °C</button>
            <button type="button" class="cs2-mini-chip cs2-temp-chip" data-celsius="70" aria-pressed="true">70 °C</button>
            <button type="button" class="cs2-mini-chip cs2-temp-chip" data-celsius="90" aria-pressed="false">90 °C</button>
          </div>
          <div class="ts-field"><input id="cs2-power" type="number" value="500" /></div>
          <p class="cs2-field-error" id="cs2-error-power" hidden></p>
          <div class="ts-field"><input id="cs2-pf" type="number" value="1" /></div>
          <p class="cs2-field-error" id="cs2-error-pf" hidden></p>
          <input id="cs2-limit-custom" type="number" value="3" />
          <p class="cs2-field-error" id="cs2-error-limit" hidden></p>
          <select id="cs2-size"></select>
          <div id="cs2-custom-fields" hidden></div>
          <div id="cs2-limit-custom-field" hidden></div>
          <p id="cs2-load-note"></p>
          <p id="cs2-system-note"></p>
          <p id="cs2-load-summary"></p>
          <p class="cs2-scope" id="cs2-scope"><strong id="cs2-scope-current"></strong></p>
          <div id="cs2-volt-presets"></div>
        </form>
        <button type="button" id="cs2-reset"></button>
        <button type="button" id="cs2-share"><span data-share-label>Copy link</span></button>
      </div>

      <div id="cs2-scrim" class="ts-scrim" hidden></div>

      <div class="ts-panel ts-panel--results" id="cs2-results-container">
        <button type="button" class="ts-sheet-grabber"></button>
        <button type="button" class="ts-sheet-close"></button>
        <button type="button" class="ts-panel-collapse" id="cs2-collapse-results" aria-expanded="true"></button>
        <div id="cs2-results-body">
          <p class="cs2-stale-note" id="cs2-stale-note" hidden></p>
          <span id="cs2-recommended-size"></span>
          <span id="cs2-recommended-material"></span>
          <p id="cs2-recommended-badge-wrap" data-status="pass"><span id="cs2-recommended-badge"></span></p>
          <span id="cs2-selected-size"></span>
          <span id="cs2-out-drop-v"></span><span id="cs2-out-drop-pct"></span>
          <span id="cs2-out-load-v"></span><span id="cs2-out-current"></span>
          <span id="cs2-out-resistance"></span><span id="cs2-out-loss"></span>
          <strong id="cs2-check-drop"></strong><strong id="cs2-check-selection"></strong>
          <h3 id="cs2-why-heading"></h3><p id="cs2-why-body"></p>
          <p id="cs2-live"></p>
        </div>
      </div>

      <section id="cs2-strip">
        <p id="cs2-strip-note"><span id="cs2-strip-note-text"></span><strong id="cs2-strip-rec"></strong></p>
        <div id="cs2-strip-row">${candidateButtons()}</div>
      </section>

      <div class="ts-mobile-bar" id="cs2-mobile-bar">
        <button type="button" id="cs2-mob-inputs"></button>
        <button type="button" id="cs2-mob-results">
          <span id="cs2-mobile-size"></span><span id="cs2-mobile-drop"></span>
        </button>
      </div>
    </div>
  </div>`;
}

/* ── helpers ────────────────────────────────────────────────────────────── */

function text(id: string): string {
  return document.getElementById(id)?.textContent?.trim() ?? '';
}
function scene() {
  return document.getElementById('cs2-scene-root') as HTMLElement;
}
function cableWidth(): number {
  return Number.parseFloat(scene().style.getPropertyValue('--cable-w'));
}
function candidate(size: number): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`.cs2-candidate[data-size="${size}"]`)!;
}
function candidateText(size: number, role: string): string {
  return candidate(size).querySelector(`[data-role="${role}"]`)?.textContent?.trim() ?? '';
}

function number(id: string): number {
  return Number.parseFloat((document.getElementById(id) as HTMLInputElement).value);
}
function pfField(): HTMLInputElement {
  return document.getElementById('cs2-pf') as HTMLInputElement;
}

function setNumber(id: string, value: number | string): void {
  const input = document.getElementById(id) as HTMLInputElement;
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function pickRadio(name: string, value: string): void {
  const input = document.querySelector<HTMLInputElement>(
    `input[name="${name}"][value="${value}"]`,
  )!;
  input.checked = true;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function click(id: string): void {
  document.getElementById(id)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/**
 * Stand in for `public/js/tool-share.js`: the same contract (pushParams writes
 * the query string, readParams parses it), so URL round-trips are exercised.
 */
function stubToolShare(): void {
  Object.defineProperty(window, 'ToolShare', {
    writable: true,
    configurable: true,
    value: {
      pushParams(entries: Record<string, string | number | null | undefined>) {
        const next = new URLSearchParams();
        for (const [key, value] of Object.entries(entries)) {
          if (value === undefined || value === null || value === '') continue;
          next.set(key, String(value));
        }
        const search = next.toString();
        window.history.replaceState(
          {},
          '',
          `${window.location.pathname}${search ? `?${search}` : ''}`,
        );
      },
      readParams() {
        return new URLSearchParams(window.location.search);
      },
    },
  });
}

function boot(): Promise<unknown> {
  stubToolShare();
  return import('./engine');
}

/** jsdom has no matchMedia by default; give the engine a controllable one. */
function stubMatchMedia(matches: (query: string) => boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: matches(query),
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => true,
    }),
  });
}

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = fixture();
  stubMatchMedia(() => false);
  window.history.replaceState({}, '', '/tools/cable-size-calculator/');
});

/* ── the contract: every id the engine writes to exists in the components ── */

describe('markup contract', () => {
  const ENGINE_SOURCE = readFileSync(join(here, 'engine.ts'), 'utf8');
  const markup = ['CableSizeScene.astro', 'CableSizePanels.astro']
    .map((file) => readFileSync(join(componentsDir, file), 'utf8'))
    .join('\n');

  it('every element id the engine paints is present in the components', () => {
    const ids = new Set(
      Array.from(ENGINE_SOURCE.matchAll(/\bel(?:<[^>]*>)?\('(cs2-[a-z0-9-]+)'\)/g)).map(
        (m) => m[1],
      ),
    );
    // ids reached through variables (the panel bodies, the sheets) are checked below
    for (const id of ids) {
      expect(markup.includes(`id="${id}"`), `${id} is missing from the components`).toBe(true);
    }
    expect(ids.size).toBeGreaterThan(20);
  });

  it('every data-role the strip expects is rendered by the strip markup', () => {
    for (const role of ['status', 'volts', 'pct', 'flag']) {
      expect(markup.includes(`data-role="${role}"`)).toBe(true);
    }
  });
});

/* ── the journeys from §35 ──────────────────────────────────────────────── */

describe('first paint', () => {
  it('starts on the lighting scene with a recommendation already on screen', async () => {
    await boot();
    expect(scene().getAttribute('data-load')).toBe('lighting');
    expect(text('cs2-recommended-size')).toBe('1.5 mm²');
    expect(text('cs2-selected-size')).toBe('1.5 mm²');
    expect(text('cs2-cable-label')).toBe('1.5 mm² Copper');
    expect(text('cs2-source-volts')).toBe('230 V');
    expect(text('cs2-status-label')).toBe('PASS');
    expect(candidate(1.5).getAttribute('aria-pressed')).toBe('true');
    expect(candidateText(1.5, 'flag')).toBe('IN USE');
  });

  it('announces the result for screen readers', async () => {
    await boot();
    expect(text('cs2-live')).toContain('1.5 mm² selected');
  });
});

describe('the killer interaction: change the load, change the answer', () => {
  it('swaps the scene and grows the cable when lighting becomes a heater', async () => {
    await boot();
    const thinCable = cableWidth();

    pickRadio('cs2-load', 'heater');

    expect(scene().getAttribute('data-load')).toBe('heater');
    expect(text('cs2-recommended-size')).toBe('2.5 mm²');
    expect(text('cs2-out-drop-pct')).toBe('2.33%');
    expect(text('cs2-out-current')).toBe('13.0 A');
    expect(cableWidth()).toBeGreaterThan(thinCable);
    expect(text('cs2-why-heading')).toBe('Why 2.5 mm²?');
  });

  it('draws each load type with its own scene', async () => {
    await boot();
    const seen = new Set<string>();
    for (const load of ['lighting', 'fan', 'motor', 'heater', 'appliance', 'custom']) {
      pickRadio('cs2-load', load);
      seen.add(scene().getAttribute('data-load') ?? '');
    }
    expect(Array.from(seen)).toEqual(['lighting', 'fan', 'motor', 'heater', 'appliance', 'custom']);
  });

  it('needs more copper for the same run in aluminium', async () => {
    await boot();
    pickRadio('cs2-load', 'heater');
    pickRadio('cs2-material', 'aluminium');
    expect(text('cs2-recommended-size')).toBe('4 mm²');
    expect(text('cs2-cable-label')).toBe(
      '2.5 mm² Copper'.replace('2.5 mm² Copper', '4 mm² Aluminium'),
    );
  });

  it('uses the custom load when custom is selected', async () => {
    await boot();
    pickRadio('cs2-load', 'custom');
    expect((document.getElementById('cs2-custom-fields') as HTMLElement).hidden).toBe(false);
    setNumber('cs2-power', 7200);
    expect(text('cs2-out-current')).toBe('31.3 A');
    expect(text('cs2-recommended-size')).toBe('6 mm²');
  });
});

describe('inspecting a candidate (§12, §13, §20)', () => {
  it('thins the cable and fails the limit at 1.5 mm² on a heater', async () => {
    await boot();
    pickRadio('cs2-load', 'heater');
    const recommendedWidth = cableWidth();
    expect(text('cs2-check-selection')).toBe('Recommended size');

    candidate(1.5).dispatchEvent(new MouseEvent('click', { bubbles: true }));

    // the recommendation does not move, the inspection does
    expect(text('cs2-recommended-size')).toBe('2.5 mm²');
    expect(text('cs2-selected-size')).toBe('1.5 mm²');
    expect(text('cs2-check-selection')).toBe('Too small for this run');
    expect(text('cs2-check-drop')).toBe('FAIL');
    expect(text('cs2-out-drop-v')).toBe('8.9 V');
    expect(text('cs2-out-drop-pct')).toBe('3.89%');
    expect(cableWidth()).toBeLessThan(recommendedWidth);
    expect(scene().getAttribute('data-status')).toBe('fail');
    expect(candidate(1.5).getAttribute('aria-pressed')).toBe('true');
    expect(candidate(2.5).getAttribute('aria-pressed')).toBe('false');
    expect(candidateText(1.5, 'status')).toBe('FAIL');
    expect(candidateText(2.5, 'flag')).toBe('RECOMMENDED');
  });

  it('thickens the cable and passes again at 6 mm²', async () => {
    await boot();
    pickRadio('cs2-load', 'heater');
    candidate(6).dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(text('cs2-selected-size')).toBe('6 mm²');
    expect(text('cs2-check-drop')).toBe('PASS');
    expect(text('cs2-check-selection')).toBe('Larger than needed');
    expect(text('cs2-out-drop-pct')).toBe('0.97%');
    expect(cableWidth()).toBeGreaterThan(5);
  });

  it('scores every candidate in the strip', async () => {
    await boot();
    pickRadio('cs2-load', 'heater');
    expect(candidateText(1.5, 'status')).toBe('FAIL');
    expect(candidateText(2.5, 'status')).toBe('PASS');
    expect(candidateText(4, 'volts')).toBe('3.4 V');
    expect(candidateText(4, 'pct')).toBe('1.46%');
  });
});

describe('inputs that move the verdict', () => {
  it('grows the cable as the run gets longer', async () => {
    await boot();
    pickRadio('cs2-load', 'heater');
    expect(text('cs2-recommended-size')).toBe('2.5 mm²');

    setNumber('cs2-length', 60);
    expect(text('cs2-recommended-size')).toBe('6 mm²');

    setNumber('cs2-length', 120);
    expect(text('cs2-recommended-size')).toBe('10 mm²');
  });

  it('drags the length slider and the number field together', async () => {
    await boot();
    setNumber('cs2-length-range', 80);
    expect((document.getElementById('cs2-length') as HTMLInputElement).value).toBe('80');
    expect(text('cs2-cable-sub')).toBe('80 m one-way');
  });

  it('relaxes the answer when the limit is raised to 5%', async () => {
    await boot();
    pickRadio('cs2-load', 'heater');
    pickRadio('cs2-limit', '5');
    expect(text('cs2-recommended-size')).toBe('1.5 mm²');
    expect(text('cs2-check-drop')).toBe('PASS');
  });

  it('accepts a custom limit', async () => {
    await boot();
    pickRadio('cs2-load', 'heater');
    pickRadio('cs2-limit', 'custom');
    expect((document.getElementById('cs2-limit-custom-field') as HTMLElement).hidden).toBe(false);
    setNumber('cs2-limit-custom', 1.5);
    // 1.5% of 230 V is 3.45 V: 2.5 mm² loses 5.37 V, 4 mm² loses 3.35 V (at 70 °C)
    expect(text('cs2-recommended-size')).toBe('4 mm²');
  });

  it('follows DC rules for current', async () => {
    await boot();
    pickRadio('cs2-load', 'custom');
    setNumber('cs2-power', 2300);
    setNumber('cs2-pf', 0.5);
    const acCurrent = text('cs2-out-current');
    pickRadio('cs2-system', 'dc');
    expect(text('cs2-out-current')).not.toBe(acCurrent);
    expect(scene().getAttribute('data-system')).toBe('dc');
    expect(text('cs2-source-system')).toBe('DC supply');
  });

  it('writes the chosen preset into the custom fields, so the form shows the run', async () => {
    await boot();
    pickRadio('cs2-load', 'heater');
    expect(number('cs2-power')).toBe(3000);
    expect(number('cs2-pf')).toBe(1);
    expect(text('cs2-load-summary')).toContain('Heater');
    expect(text('cs2-load-summary')).toContain('13.0 A');
    // switching to Custom continues from the load you were looking at
    pickRadio('cs2-load', 'custom');
    expect(text('cs2-load-power')).toBe('3 kW');
  });

  it('explains DC in the form and takes the power factor out of play', async () => {
    await boot();
    expect(pfField().disabled).toBe(false);
    expect(text('cs2-system-note')).toContain('cos');
    pickRadio('cs2-system', 'dc');
    expect(pfField().disabled).toBe(true);
    expect(text('cs2-system-note')).toContain('P ÷ V');
    expect(text('cs2-load-summary')).toContain('PF —');
    pickRadio('cs2-system', 'ac');
    expect(pfField().disabled).toBe(false);
  });

  it('the size picker and the comparison strip are one control', async () => {
    await boot();
    pickRadio('cs2-load', 'heater');
    const select = document.getElementById('cs2-size') as HTMLSelectElement;
    expect(select.options.length).toBe(DEFAULT_SIZES.length);
    expect(select.value).toBe('2.5');

    // the strip moves the picker
    candidate(10).click();
    expect(select.value).toBe('10');
    expect(text('cs2-selected-size')).toBe('10 mm²');

    // and the picker moves the strip: inspecting a size is not endorsing it
    select.value = '1.5';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(text('cs2-selected-size')).toBe('1.5 mm²');
    expect(candidate(1.5).getAttribute('aria-pressed')).toBe('true');
    expect(candidateText(1.5, 'flag')).toBe('INSPECTING');
    expect(candidateText(2.5, 'flag')).toBe('RECOMMENDED');

    // back to the recommendation, and the two agree again
    select.value = '2.5';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(candidateText(2.5, 'flag')).toBe('IN USE');
  });

  it('reports a bad value on the field that caused it, and says when it is empty', async () => {
    await boot();
    const length = document.getElementById('cs2-length') as HTMLInputElement;
    const before = text('cs2-recommended-size');

    length.value = '';
    length.dispatchEvent(new Event('input', { bubbles: true }));
    expect(text('cs2-error-length')).toBe('Cable length is required.');
    expect(length.getAttribute('aria-invalid')).toBe('true');
    expect(length.getAttribute('aria-describedby')).toBe('cs2-error-length');
    expect(text('cs2-live')).toContain('Cable length is required.');
    // the last good answer stays on screen rather than blanking the tool
    expect(text('cs2-recommended-size')).toBe(before);

    setNumber('cs2-length', 9999);
    expect(text('cs2-error-length')).toContain('between 0.5 m and 1000 m');

    setNumber('cs2-length', 40);
    expect(document.getElementById('cs2-error-length')?.hidden).toBe(true);
    expect(length.getAttribute('aria-invalid')).toBeNull();
    expect(text('cs2-live')).not.toContain('required');
  });

  it('marks the last good run as stale while an input is rejected', async () => {
    await boot();
    const results = document.getElementById('cs2-results-container') as HTMLElement;
    const stale = document.getElementById('cs2-stale-note') as HTMLElement;
    expect(results.getAttribute('data-stale')).not.toBe('true');
    expect(stale.hidden).toBe(true);

    const length = document.getElementById('cs2-length') as HTMLInputElement;
    length.value = '';
    length.dispatchEvent(new Event('input', { bubbles: true }));
    expect(results.getAttribute('data-stale')).toBe('true');
    expect(stale.hidden).toBe(false);

    setNumber('cs2-length', 25);
    expect(results.getAttribute('data-stale')).not.toBe('true');
    expect(stale.hidden).toBe(true);
  });

  it('treats the conductor temperature as an input, not a constant', async () => {
    await boot();
    // 70 °C is the default because that is what BS 7671's drop figures assume
    expect((document.getElementById('cs2-temp') as HTMLInputElement).value).toBe('70');
    const hot = text('cs2-out-drop-pct');

    setNumber('cs2-temp', 20);
    const cold = text('cs2-out-drop-pct');
    const ratio = Number.parseFloat(hot) / Number.parseFloat(cold);
    // ρ ∝ 1 + 0.00393 × (T − 20): 70 °C is 1.1965× a cold cable
    expect(ratio).toBeGreaterThan(1.15);
    expect(ratio).toBeLessThan(1.25);

    // a temperature below freezing is legal, unlike every other field
    setNumber('cs2-temp', -10);
    expect(document.getElementById('cs2-error-temp')?.hidden).toBe(true);

    setNumber('cs2-temp', 999);
    expect(text('cs2-error-temp')).toContain('between -25 °C and 200 °C');
  });

  it('names the design current in the scope line that admits what it does not check', async () => {
    await boot();
    // the wording lives in the component; what the engine owns is the figure
    expect(text('cs2-scope-current')).toBe('0.4 A');

    pickRadio('cs2-load', 'heater');
    expect(text('cs2-scope-current')).toBe('13.0 A');
  });

  it('moves the selected look onto the control you just clicked', async () => {
    await boot();
    const label = (value: string) =>
      document.querySelector<HTMLLabelElement>(`.ts-seg-btn:has(input[value="${value}"])`)!;
    const chip = (value: string) =>
      document.querySelector<HTMLLabelElement>(`.cs2-load-chip:has(input[value="${value}"])`)!;

    // first paint marks the defaults…
    expect(label('ac').classList.contains('active')).toBe(true);
    expect(label('dc').classList.contains('active')).toBe(false);

    // …and every change moves it, including when nothing else is applied
    pickRadio('cs2-system', 'dc');
    expect(label('dc').classList.contains('active')).toBe(true);
    expect(label('ac').classList.contains('active')).toBe(false);

    pickRadio('cs2-material', 'aluminium');
    expect(label('aluminium').classList.contains('active')).toBe(true);
    expect(label('copper').classList.contains('active')).toBe(false);

    pickRadio('cs2-limit', 'custom');
    expect(label('custom').classList.contains('active')).toBe(true);
    expect(label('3').classList.contains('active')).toBe(false);

    pickRadio('cs2-load', 'heater');
    expect(chip('heater').classList.contains('active')).toBe(true);
    expect(chip('lighting').classList.contains('active')).toBe(false);

    // a rejected value still leaves the clicked control looking clicked
    pickRadio('cs2-load', 'custom');
    setNumber('cs2-power', 99999);
    expect(chip('custom').classList.contains('active')).toBe(true);
  });

  it('refuses to calculate on an impossible input and says why', async () => {
    await boot();
    pickRadio('cs2-load', 'heater');
    const before = text('cs2-recommended-size');

    setNumber('cs2-voltage', 0);

    const notice = document.getElementById('cs2-validation') as HTMLElement;
    expect(notice.hidden).toBe(false);
    expect(text('cs2-validation-message')).toContain('Voltage must be between');
    expect(text('cs2-recommended-size')).toBe(before);

    setNumber('cs2-voltage', 230);
    expect(notice.hidden).toBe(true);
    expect(text('cs2-recommended-size')).toBe(before);
  });
});

describe('reset, motion and shared links', () => {
  it('resets everything to the defaults', async () => {
    await boot();
    pickRadio('cs2-load', 'heater');
    setNumber('cs2-length', 90);
    candidate(16).dispatchEvent(new MouseEvent('click', { bubbles: true }));

    click('cs2-reset');

    expect(text('cs2-recommended-size')).toBe('1.5 mm²');
    expect(text('cs2-selected-size')).toBe('1.5 mm²');
    expect(scene().getAttribute('data-load')).toBe('lighting');
    expect((document.getElementById('cs2-length') as HTMLInputElement).value).toBe('25');
    expect((document.getElementById('cs2-voltage') as HTMLInputElement).value).toBe('230');
  });

  it('pauses the scene when motion is switched off', async () => {
    await boot();
    expect(scene().getAttribute('data-motion')).toBe('on');
    click('cs2-animate-toggle');
    expect(scene().getAttribute('data-motion')).toBe('off');
    expect(document.getElementById('interactive-stage')?.classList.contains('scene-paused')).toBe(
      true,
    );
    click('cs2-animate-toggle');
    expect(scene().getAttribute('data-motion')).toBe('on');
  });

  it('writes the flow period as a literal SMIL attribute and re-times it', async () => {
    // A fresh engine on this fixture: the first paint is the one that matters,
    // because SMIL cannot read `var(--flow)` — a var() or missing duration means
    // the markers never leave the origin of the SVG.
    vi.resetModules();
    await boot();

    const durations = () =>
      [...document.querySelectorAll('#cs2-scene-root .cs2-flow animateMotion')].map((a) =>
        String(a.getAttribute('dur') ?? ''),
      );

    // SMIL cannot read var(--flow): a missing or var() duration means the
    // markers never leave the origin of the SVG.
    const first = durations();
    expect(first.length).toBe(3);
    for (const dur of first) expect(dur).toMatch(/^\d+(\.\d+)?s$/);

    // a heavier load walks faster, and every marker keeps its own stagger
    pickRadio('cs2-load', 'heater');
    const heater = durations();
    expect(heater.length).toBe(3);
    for (const dur of heater) expect(dur).toMatch(/^\d+(\.\d+)?s$/);
    expect(heater[0]).not.toBe(first[0]);
    const delays = [...document.querySelectorAll('#cs2-scene-root .cs2-flow animateMotion')].map(
      (a) => (a as HTMLElement).dataset.delay,
    );
    expect(delays).toEqual(['0', '0.7', '1.4']);
  });

  it('drives the scenery from the result: budget fill and motor speed (§14)', async () => {
    await boot();
    const cssVar = (name: string) => scene().style.getPropertyValue(name).trim();

    // a lighting load on 1.5 mm² spends almost none of a 3% budget
    const easyBudget = Number(cssVar('--budget'));
    expect(easyBudget).toBeGreaterThanOrEqual(0);
    expect(easyBudget).toBeLessThan(0.2);
    const easySpin = Number.parseFloat(cssVar('--spin'));
    expect(easySpin).toBeGreaterThan(0);

    // a 3 kW heater on 1.5 mm² over 25 m blows it: the meter tops out and the
    // motor on the end of that run turns slower than a healthy one
    pickRadio('cs2-load', 'heater');
    candidate(1.5).click();
    expect(Number(cssVar('--budget'))).toBe(1);
    expect(Number.parseFloat(cssVar('--spin'))).toBeGreaterThan(easySpin);
  });

  it('keeps the scene still for reduced-motion readers (§28)', async () => {
    stubMatchMedia((query) => query.includes('prefers-reduced-motion'));
    await boot();
    expect(scene().getAttribute('data-motion')).toBe('off');
    expect(document.getElementById('interactive-stage')?.classList.contains('scene-paused')).toBe(
      true,
    );
  });

  it('restores a shared link', async () => {
    window.history.replaceState(
      {},
      '',
      '/tools/cable-size-calculator/?load=heater&length=40&limit=5',
    );
    await boot();
    expect(scene().getAttribute('data-load')).toBe('heater');
    expect((document.getElementById('cs2-length') as HTMLInputElement).value).toBe('40');
    expect(text('cs2-cable-sub')).toBe('40 m one-way');
    // 40 m at 13 A: 1.5 mm² drops 5.20%, so even at a 5% limit 2.5 mm² is the answer
    expect(text('cs2-recommended-size')).toBe('2.5 mm²');
  });

  it('writes the live state back into the URL', async () => {
    await boot();
    pickRadio('cs2-load', 'heater');
    setNumber('cs2-length', 40);
    const url = new URL(window.location.href);
    expect(url.searchParams.get('load')).toBe('heater');
    expect(url.searchParams.get('length')).toBe('40');
  });

  it('opens a drawer on the touch layout and closes it with the scrim', async () => {
    await boot();
    document.getElementById('interactive-stage')?.setAttribute('data-layout', 'drawer');
    click('cs2-mob-inputs');
    expect(document.getElementById('cs2-inputs-container')?.classList.contains('sheet-open')).toBe(
      true,
    );
    expect((document.getElementById('cs2-scrim') as HTMLElement).hidden).toBe(false);

    click('cs2-scrim');
    expect(document.getElementById('cs2-inputs-container')?.classList.contains('sheet-open')).toBe(
      false,
    );
    expect((document.getElementById('cs2-scrim') as HTMLElement).hidden).toBe(true);
  });
});
