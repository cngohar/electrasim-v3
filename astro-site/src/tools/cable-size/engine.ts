/**
 * engine.ts — the Cable Size Calculator's browser engine.
 *
 * Written in TypeScript and bundled (see `scripts/build-tool-engines.mjs`) so
 * the page runs **exactly the same domain code the server rendered with**: no
 * second copy of the electrical mathematics, no drift between the picture and
 * the panels (§4, §29).
 *
 * Responsibilities, in order:
 *   1. own the input state, seeded from the server-rendered defaults and the URL;
 *   2. call `evaluateCableRun()` once per change;
 *   3. paint the scene, the panels and the comparison strip from the result;
 *   4. announce the result to assistive technology.
 *
 * It never computes a number the domain did not give it.
 */

import {
  CABLE_SIZE_BOUNDS,
  CABLE_SIZE_DEFAULTS,
  CABLE_SIZE_PARAM_KEYS,
  DROP_LIMIT_OPTIONS,
  SYSTEM_DEFAULT_VOLTS,
  SYSTEM_VOLTAGE_PRESETS,
  isLoadType,
  isMaterial,
  isSystemType,
  parseCandidateSizes,
} from '../../lib/tools/cable-size/config';
import { evaluateCableRun } from '../../lib/tools/cable-size/evaluate';
import { explainRecommendation, statusCopy } from '../../lib/tools/cable-size/explain';
import { formatLoadPower } from '../../lib/tools/cable-size/format';
import { LOAD_PRESETS, getLoadPreset, loadNote } from '../../lib/tools/cable-size/presets';
import type {
  CableSceneState,
  CableSizeEvaluation,
  CableSizeInputs,
} from '../../lib/tools/cable-size/types';
import {
  SCENE_GEOMETRY,
  buildSceneState,
  buildVisualState,
} from '../../lib/tools/cable-size/visual';
// the reactance the shared engine applies to AC runs; quoted in the form note so
// the assumption is visible rather than buried
import { DEFAULT_LINE_REACTANCE } from '../../lib/tools/voltage-drop/calculation';
import {
  formatCurrent,
  formatLength,
  formatPercent,
  formatResistance,
  formatVoltage,
} from '../../lib/tools/voltage-drop/formatting';

/* ── window helpers the shared stage chrome exposes ─────────────────────── */

interface StageHandle {
  fit: () => void;
  destroy: () => void;
}
interface StageRuntime {
  attach?: (options: Record<string, unknown>) => StageHandle;
  reducedMotion?: () => boolean;
  layout?: () => string;
}
interface ChromeRuntime {
  register?: (action: string, handler: () => void) => void;
}
interface ShareRuntime {
  pushParams?: (entries: Record<string, string | number | null | undefined>) => void;
  readParams?: () => URLSearchParams;
  numParam?: (params: URLSearchParams, key: string, opts: Record<string, number>) => number;
  copyCurrentUrl?: (button: HTMLElement | null) => void;
}

const win = window as unknown as {
  ElectraStage?: StageRuntime;
  ElectraChrome?: ChromeRuntime;
  ToolShare?: ShareRuntime;
};

/* ── tiny DOM helpers ───────────────────────────────────────────────────── */

function el<T extends HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}

/** Write text only when it changed — the scene repaints often (§36). */
function setText(node: Element | null | undefined, text: string): void {
  if (node && node.textContent !== text) node.textContent = text;
}

function setAttr(node: Element | null | undefined, name: string, value: string): void {
  if (node && node.getAttribute(name) !== value) node.setAttribute(name, value);
}

function setVar(node: HTMLElement | null | undefined, name: string, value: string): void {
  if (node && node.style.getPropertyValue(name) !== value) node.style.setProperty(name, value);
}

function num(value: string, fallback: number): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

function radioValue(name: string, fallback: string): string {
  const checked = document.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`);
  return checked ? checked.value : fallback;
}

function setRadio(name: string, value: string): void {
  for (const input of document.querySelectorAll<HTMLInputElement>(`input[name="${name}"]`)) {
    input.checked = input.value === value;
    if (input.checked) {
      // keep the label styling in step for browsers without :has()
      input.closest('.ts-seg-btn, .ts-chip')?.classList.add('active');
    } else {
      input.closest('.ts-seg-btn, .ts-chip')?.classList.remove('active');
    }
  }
}

/* ── state ──────────────────────────────────────────────────────────────── */

const DEFAULTS: CableSizeInputs = {
  ...CABLE_SIZE_DEFAULTS,
  candidateSizes: [...CABLE_SIZE_DEFAULTS.candidateSizes],
};

let state: CableSizeInputs = { ...DEFAULTS };
/** Which limit chip is showing: 3%, 5% or Custom. Kept beside the state because
 *  it is a UI choice, not an electrical input. */
let limitChoice: '3' | '5' | 'custom' = '3';
let motionEnabled = true;
let lastAnnouncement = '';
/**
 * True once the reader has typed into the voltage field themselves. A voltage
 * they chose outranks the nominal we would otherwise move them to when the
 * AC/DC toggle is flipped (§30).
 */
let voltageTouched = false;
/** The recommendation, so a share link can omit a selection that already equals it. */
let recommendedFallback: number | null = null;
let stageHandle: StageHandle | null = null;

const REDUCED_MOTION: MediaQueryList = window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)')
  : ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    } as unknown as MediaQueryList);

/* ── URL ↔ state (shared links) ─────────────────────────────────────────── */

function numParam(key: string, bounds: { min: number; max: number }, fallback: number): number {
  const params = win.ToolShare?.readParams?.() ?? new URLSearchParams(location.search);
  const raw = params.get(key);
  if (raw === null || raw === '') return fallback;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, bounds.min, bounds.max);
}

function restoreFromUrl(): void {
  const K = CABLE_SIZE_PARAM_KEYS;
  const params = win.ToolShare?.readParams?.() ?? new URLSearchParams(location.search);

  const system = params.get(K.system);
  if (isSystemType(system)) state.systemType = system;

  const load = params.get(K.load);
  if (isLoadType(load)) state.loadType = load;

  const material = params.get(K.material);
  if (isMaterial(material)) state.material = material;
  else if (params.get(K.material) === 'aluminum') state.material = 'aluminium';

  const sizes = parseCandidateSizes(params.get(K.sizes));
  if (sizes) state.candidateSizes = sizes;

  // A shared link that names a system but no voltage lands on that system's
  // nominal; a link that names a voltage is treated as a value someone chose,
  // and the AC/DC toggle keeps it afterwards rather than overriding it (§30).
  const shared = params.get(K.voltage);
  voltageTouched = shared !== null && shared !== '';
  state.voltage = voltageTouched
    ? numParam(K.voltage, CABLE_SIZE_BOUNDS.voltage, DEFAULTS.voltage)
    : SYSTEM_DEFAULT_VOLTS[state.systemType];
  state.lengthMeters = numParam(K.length, CABLE_SIZE_BOUNDS.length, DEFAULTS.lengthMeters);
  state.temperatureC = numParam(K.temp, CABLE_SIZE_BOUNDS.temperature, DEFAULTS.temperatureC);
  state.dropLimitPercent = numParam(
    K.limit,
    CABLE_SIZE_BOUNDS.dropLimit,
    DEFAULTS.dropLimitPercent,
  );
  const limitParam = params.get(K.limit);
  limitChoice = limitParam === '3' ? '3' : limitParam === '5' ? '5' : limitParam ? 'custom' : '3';
  state.customPowerWatts = numParam(K.power, CABLE_SIZE_BOUNDS.power, DEFAULTS.customPowerWatts);
  state.customPowerFactor = numParam(
    K.pf,
    CABLE_SIZE_BOUNDS.powerFactor,
    DEFAULTS.customPowerFactor,
  );

  const size = numParam(K.size, { min: 0.5, max: 1000 }, Number.NaN);
  if (Number.isFinite(size)) state.selectedSizeMm2 = size;
}

function syncUrl(): void {
  const K = CABLE_SIZE_PARAM_KEYS;
  win.ToolShare?.pushParams?.({
    [K.system]: state.systemType === DEFAULTS.systemType ? null : state.systemType,
    [K.voltage]: state.voltage === DEFAULTS.voltage ? null : state.voltage,
    [K.load]: state.loadType === DEFAULTS.loadType ? null : state.loadType,
    [K.power]:
      state.loadType === 'custom' && state.customPowerWatts !== DEFAULTS.customPowerWatts
        ? state.customPowerWatts
        : null,
    [K.pf]:
      state.loadType === 'custom' && state.customPowerFactor !== DEFAULTS.customPowerFactor
        ? state.customPowerFactor
        : null,
    [K.material]: state.material === DEFAULTS.material ? null : state.material,
    [K.length]: state.lengthMeters === DEFAULTS.lengthMeters ? null : state.lengthMeters,
    [K.temp]: state.temperatureC === DEFAULTS.temperatureC ? null : state.temperatureC,
    [K.limit]: state.dropLimitPercent === DEFAULTS.dropLimitPercent ? null : state.dropLimitPercent,
    [K.size]:
      state.selectedSizeMm2 !== null &&
      state.selectedSizeMm2 !== undefined &&
      state.selectedSizeMm2 !== recommendedFallback
        ? state.selectedSizeMm2
        : null,
    [K.sizes]: sameLadder(state.candidateSizes, DEFAULTS.candidateSizes)
      ? null
      : state.candidateSizes.join(','),
  });
}

function sameLadder(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/* ── form ↔ state ───────────────────────────────────────────────────────── */

/**
 * Mirror the four radio groups onto their labels. The browser moves `checked`
 * on its own when you click, but the *label* is what carries the selected look,
 * and it only follows if we keep it in step — so this runs after every change,
 * not only on a full sync.
 */
function syncRadioVisuals(): void {
  setRadio('cs2-system', state.systemType);
  setRadio('cs2-load', state.loadType);
  setRadio('cs2-material', state.material);
  setRadio('cs2-limit', limitChoice);
}

function syncForm(): void {
  syncRadioVisuals();

  const voltage = el<HTMLInputElement>('cs2-voltage');
  if (voltage) voltage.value = String(state.voltage);
  const length = el<HTMLInputElement>('cs2-length');
  if (length) length.value = String(state.lengthMeters);
  const range = el<HTMLInputElement>('cs2-length-range');
  if (range) syncLengthRange(range);
  const temp = el<HTMLInputElement>('cs2-temp');
  if (temp) temp.value = String(state.temperatureC);
  const power = el<HTMLInputElement>('cs2-power');
  if (power) power.value = String(state.customPowerWatts);
  const pf = el<HTMLInputElement>('cs2-pf');
  if (pf) pf.value = String(state.customPowerFactor);
  const limitCustom = el<HTMLInputElement>('cs2-limit-custom');
  if (limitCustom) limitCustom.value = String(state.dropLimitPercent);
  const size = el<HTMLSelectElement>('cs2-size');
  if (size && state.selectedSizeMm2 != null) size.value = String(state.selectedSizeMm2);

  toggleCustomFields();
}

function toggleCustomFields(): void {
  const customFields = el('cs2-custom-fields');
  if (customFields) customFields.hidden = state.loadType !== 'custom';
  const limitField = el('cs2-limit-custom-field');
  if (limitField) limitField.hidden = limitChoice !== 'custom';
}

/** Every control that can carry a validation message, and its error paragraph. */
const FIELD_INPUTS: Record<FormField, string> = {
  voltage: 'cs2-voltage',
  length: 'cs2-length',
  temp: 'cs2-temp',
  limit: 'cs2-limit-custom',
  power: 'cs2-power',
  pf: 'cs2-pf',
};

function clearFieldErrors(): void {
  for (const [field, id] of Object.entries(FIELD_INPUTS) as Array<[FormField, string]>) {
    const input = el<HTMLInputElement>(id);
    const message = el(`cs2-error-${field}`);
    input?.removeAttribute('aria-invalid');
    input?.removeAttribute('aria-describedby');
    if (message) {
      message.hidden = true;
      setText(message, '');
    }
  }
}

/**
 * Report a bad value where it was typed, not only in a banner at the top: the
 * field is marked invalid, the message is wired to it with aria-describedby, and
 * the live region says which control to look at.
 */
function showValidation(problem: FormProblem | null): void {
  clearFieldErrors();
  const notice = el('cs2-validation');
  const text = el('cs2-validation-message');
  const live = el('cs2-live');

  // A rejected input freezes the last good run rather than blanking the tool.
  // Useful, but it must not be mistaken for an answer to the value in the box.
  const results = el('cs2-results-container');
  const staleNote = el('cs2-stale-note');
  if (results) setAttr(results, 'data-stale', problem ? 'true' : 'false');
  if (staleNote) staleNote.hidden = !problem;

  if (!problem) {
    if (notice) notice.hidden = true;
    return;
  }

  const input = el<HTMLInputElement>(FIELD_INPUTS[problem.field]);
  const message = el(`cs2-error-${problem.field}`);
  if (input) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', `cs2-error-${problem.field}`);
  }
  if (message) {
    setText(message, problem.message);
    message.hidden = false;
  }
  if (notice && text) {
    setText(text, problem.message);
    notice.hidden = false;
  }
  if (live && input) {
    const label =
      document.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)?.textContent?.trim() ??
      problem.field;
    setText(live, `${label}: ${problem.message}`);
  }
}

/** Which control a problem belongs to, so the message can sit next to it. */
type FormField = 'voltage' | 'length' | 'temp' | 'limit' | 'power' | 'pf';

interface FormProblem {
  field: FormField;
  message: string;
}

/**
 * One message per field, phrased for the field: an empty box is "required",
 * a number outside the range is "between". Both freeze the last good result
 * instead of blanking the tool.
 */
const FIELD_LABELS: Record<FormField, string> = {
  voltage: 'Voltage',
  length: 'Cable length',
  temp: 'Conductor temperature',
  limit: 'Voltage-drop limit',
  power: 'Load power',
  pf: 'Power factor',
};

function rangeProblem(
  field: FormField,
  raw: string,
  value: number,
  min: number,
  max: number,
  unit: string,
): FormProblem | null {
  const empty = String(raw ?? '').trim() === '';
  if (empty) return { field, message: `${FIELD_LABELS[field]} is required.` };
  if (!Number.isFinite(value) || value < min || value > max) {
    const pretty = (n: number) => `${n}${unit}`;
    return {
      field,
      message: `${FIELD_LABELS[field]} must be between ${pretty(min)} and ${pretty(max)}.`,
    };
  }
  return null;
}

/**
 * The reach of the length slider. A 1–1000 m linear track would leave the 25 m
 * default three pixels from the end, so the slider covers 1–200 m for ordinary
 * runs and widens to the full range the moment the typed length goes past it —
 * rather than sitting at 200 and quietly claiming the run is shorter than it is.
 *
 * `step` is `any` on purpose. A stepped track can only represent multiples of
 * its step, so a slider at step 5 would report 501 m for a 500 m run: the
 * control would be lying about the very number it exists to show. Drags are
 * rounded to something a person would type instead (see `roundSliderLength`).
 */
const LENGTH_SLIDER_NEAR_MAX = 200;

function syncLengthRange(range: HTMLInputElement, value = state.lengthMeters): void {
  const far = value > LENGTH_SLIDER_NEAR_MAX;
  const max = far ? CABLE_SIZE_BOUNDS.length.max : LENGTH_SLIDER_NEAR_MAX;
  if (range.max !== String(max)) range.max = String(max);
  if (range.step !== 'any') range.step = 'any';
  range.value = String(clamp(value, 1, max));
  const hint = el('cs2-length-hint');
  if (hint) hint.hidden = !far;
}

/** Slider drags land on figures a person would type: 0.5 m short, 1 m long. */
function roundSliderLength(value: number): number {
  const step = value > 100 ? 1 : 0.5;
  return Math.round(value / step) * step;
}

/** Read the controls into `state`, reporting the first problem it finds. */
function readForm(): FormProblem | null {
  const systemBefore = state.systemType;
  const system = radioValue('cs2-system', state.systemType);
  state.systemType = isSystemType(system) ? system : 'ac';

  // A different system is a different supply: DC runs at 12/24/48/220 V, not at
  // 230 V. Move the voltage to the new system's nominal unless the reader typed
  // one of their own — their number outranks our suggestion (§30). The input is
  // written first so the read below picks the new value up, not the stale one.
  if (state.systemType !== systemBefore) {
    if (!voltageTouched) state.voltage = SYSTEM_DEFAULT_VOLTS[state.systemType];
    const voltageBox = el<HTMLInputElement>('cs2-voltage');
    if (voltageBox) voltageBox.value = String(state.voltage);
  }

  const load = radioValue('cs2-load', state.loadType);
  state.loadType = isLoadType(load) ? load : 'lighting';

  const material = radioValue('cs2-material', state.material);
  state.material = isMaterial(material) ? material : 'copper';

  const rawVoltage = el<HTMLInputElement>('cs2-voltage')?.value ?? '';
  const voltage = num(rawVoltage, Number.NaN);
  const voltageProblem = rangeProblem(
    'voltage',
    rawVoltage,
    voltage,
    CABLE_SIZE_BOUNDS.voltage.min,
    CABLE_SIZE_BOUNDS.voltage.max,
    ' V',
  );
  if (voltageProblem) return voltageProblem;
  state.voltage = voltage;

  const rawLength = el<HTMLInputElement>('cs2-length')?.value ?? '';
  const length = num(rawLength, Number.NaN);
  const lengthProblem = rangeProblem(
    'length',
    rawLength,
    length,
    CABLE_SIZE_BOUNDS.length.min,
    CABLE_SIZE_BOUNDS.length.max,
    ' m',
  );
  if (lengthProblem) return lengthProblem;
  state.lengthMeters = length;

  // Temperature is the one field where a negative value is legal, so the range
  // check runs on the bounds alone and never on "greater than zero".
  const rawTemp = el<HTMLInputElement>('cs2-temp')?.value ?? '';
  const temperature = num(rawTemp, Number.NaN);
  const tempProblem = rangeProblem(
    'temp',
    rawTemp,
    temperature,
    CABLE_SIZE_BOUNDS.temperature.min,
    CABLE_SIZE_BOUNDS.temperature.max,
    ' °C',
  );
  if (tempProblem) return tempProblem;
  state.temperatureC = temperature;

  const choice = radioValue('cs2-limit', limitChoice);
  limitChoice = choice === '3' || choice === '5' || choice === 'custom' ? choice : '3';
  let limit =
    DROP_LIMIT_OPTIONS.find((option) => option.id === limitChoice)?.percent ??
    state.dropLimitPercent;
  if (limitChoice === 'custom') {
    const raw = el<HTMLInputElement>('cs2-limit-custom')?.value ?? '';
    const value = num(raw, Number.NaN);
    const problem = rangeProblem(
      'limit',
      raw,
      value,
      CABLE_SIZE_BOUNDS.dropLimit.min,
      CABLE_SIZE_BOUNDS.dropLimit.max,
      '%',
    );
    if (problem) return problem;
    limit = value;
  }
  state.dropLimitPercent = limit;

  // A preset carries its own numbers: write them into the custom fields so the
  // form always shows what the run is actually using, and so switching to
  // "Custom" continues from the load you were looking at instead of 500 W.
  if (state.loadType !== 'custom') {
    const preset = LOAD_PRESETS.find((option) => option.id === state.loadType);
    if (preset) {
      state.customPowerWatts = preset.powerWatts;
      state.customPowerFactor = preset.powerFactor;
    }
  }

  if (state.loadType === 'custom') {
    const rawPower = el<HTMLInputElement>('cs2-power')?.value ?? '';
    const power = num(rawPower, Number.NaN);
    const powerProblem = rangeProblem(
      'power',
      rawPower,
      power,
      CABLE_SIZE_BOUNDS.power.min,
      CABLE_SIZE_BOUNDS.power.max,
      ' W',
    );
    if (powerProblem) return powerProblem;
    state.customPowerWatts = power;

    const rawPf = el<HTMLInputElement>('cs2-pf')?.value ?? '';
    const pf = num(rawPf, Number.NaN);
    const pfProblem = rangeProblem(
      'pf',
      rawPf,
      pf,
      CABLE_SIZE_BOUNDS.powerFactor.min,
      CABLE_SIZE_BOUNDS.powerFactor.max,
      '',
    );
    if (pfProblem) return pfProblem;
    state.customPowerFactor = pf;
  }

  return null;
}

/* ── painting ───────────────────────────────────────────────────────────── */

function statusWord(status: 'pass' | 'near-limit' | 'fail'): string {
  return status === 'pass' ? 'PASS' : status === 'near-limit' ? 'TIGHT' : 'FAIL';
}

function selectionWord(evaluation: CableSizeEvaluation): string {
  switch (evaluation.selection) {
    case 'recommended':
      return 'Recommended size';
    case 'oversized':
      return 'Larger than needed';
    case 'too-small':
      return 'Too small for this run';
    default:
      return '—';
  }
}

function paintScene(evaluation: CableSizeEvaluation): void {
  const root = el('cs2-scene-root');
  if (!root) return;

  const scene = buildSceneState(evaluation, {
    systemType: state.systemType,
    voltage: state.voltage,
    loadType: state.loadType,
  });
  const visual = buildVisualState(evaluation, scene);
  const preset = getLoadPreset(scene.loadType);
  const status = statusCopy(scene.status, {
    dropPercent: scene.voltageDropPercent,
    dropVolts: scene.voltageDrop,
    limitPercent: scene.dropLimitPercent,
  });
  const delivered =
    scene.sourceVoltage > 0
      ? Math.min(1, Math.max(0, scene.voltageAtLoad / scene.sourceVoltage))
      : 1;
  const materialLabel = scene.material === 'copper' ? 'Copper' : 'Aluminium';
  const systemLabel = scene.systemType === 'dc' ? 'DC' : 'AC';

  setAttr(root, 'data-load', scene.loadScene);
  setAttr(root, 'data-status', scene.status);
  setAttr(root, 'data-material', scene.material);
  setAttr(root, 'data-system', scene.systemType);
  setVar(root, '--cable-w', String(visual.cableWidthPx));
  setVar(root, '--thickness', visual.thickness.toFixed(3));
  setVar(root, '--stress', visual.stress.toFixed(3));
  setVar(root, '--flow', `${visual.flowSeconds}s`);
  // A motor on a starved supply turns slower: the period is data, not decoration.
  setVar(root, '--spin', `${visual.spinSeconds}s`);
  // Drop budget: the share of the chosen limit this cable has spent (0–1).
  setVar(root, '--budget', visual.budgetFill.toFixed(3));
  retimeFlow(visual.flowSeconds);
  setVar(root, '--delivered', delivered.toFixed(3));

  setText(el('cs2-source-volts'), formatVoltage(scene.sourceVoltage));
  setText(el('cs2-source-system'), `${systemLabel} supply`);
  // the plate on the cabinet door: it used to be stamped 230 V whatever the run
  setText(el('cs2-source-plate'), formatVoltage(scene.sourceVoltage));
  setText(el('cs2-cable-label'), `${scene.cableSize} mm² ${materialLabel}`);
  setText(el('cs2-cable-sub'), `${formatLength(scene.cableLength)} one-way`);
  setText(el('cs2-load-power'), formatLoadPower(scene.loadPowerWatts));
  setText(el('cs2-load-current'), `${formatCurrent(scene.designCurrent)} design current`);
  setText(el('cs2-load-volts'), formatVoltage(scene.voltageAtLoad));
  setText(el('cs2-drop-volts'), `${formatVoltage(scene.voltageDrop)} drop`);
  setText(
    el('cs2-drop-pct'),
    `${formatPercent(scene.voltageDropPercent)} of ${formatPercent(scene.dropLimitPercent, 1)} limit`,
  );
  setText(el('cs2-status-label'), status.label);
  setText(el('cs2-status-note'), status.message);
  setText(el('cs2-load-note'), loadNote(preset, scene.systemType));

  // the accessible name of the drawing follows the state it is showing
  const title = el('cs2-scene-title');
  if (title) {
    setText(
      title,
      `Electrical run: ${formatVoltage(scene.sourceVoltage)} ${systemLabel} source feeding a ${formatLoadPower(
        scene.loadPowerWatts,
      )} ${preset.name.toLowerCase()} load through ${scene.cableSize} mm² ${materialLabel.toLowerCase()} cable over ${formatLength(
        scene.cableLength,
      )}. Voltage drop ${formatVoltage(scene.voltageDrop)} (${formatPercent(
        scene.voltageDropPercent,
      )}) — ${status.label}.`,
    );
  }
}

function paintResults(evaluation: CableSizeEvaluation): void {
  const selected = evaluation.selected;
  const recommended = evaluation.recommendedCable;
  const why = explainRecommendation(evaluation);
  const status = statusCopy(evaluation.status, {
    dropPercent: selected?.voltageDropPercent ?? 0,
    dropVolts: selected?.voltageDropVolts ?? 0,
    limitPercent: evaluation.dropLimitPercent,
  });
  const materialLabel = state.material === 'copper' ? 'Copper' : 'Aluminium';

  setText(el('cs2-recommended-size'), recommended ? `${recommended.sizeMm2} mm²` : '—');
  setText(el('cs2-recommended-material'), materialLabel);
  setText(el('cs2-recommended-badge'), recommended ? 'RECOMMENDED' : 'NO SIZE PASSES');
  setAttr(el('cs2-recommended-badge-wrap'), 'data-status', evaluation.status);

  setText(el('cs2-selected-size'), selected ? `${selected.sizeMm2} mm²` : '—');
  setText(el('cs2-out-drop-v'), formatVoltage(selected?.voltageDropVolts ?? 0));
  setText(el('cs2-out-drop-pct'), formatPercent(selected?.voltageDropPercent ?? 0));
  setText(el('cs2-out-load-v'), formatVoltage(selected?.voltageAtLoad ?? 0));
  setText(el('cs2-out-current'), formatCurrent(evaluation.designCurrentAmps));
  setText(el('cs2-out-resistance'), formatResistance(selected?.totalResistanceOhms ?? 0));
  setText(el('cs2-out-loss'), formatLoadPower(selected?.powerLossWatts ?? 0));

  const check = el('cs2-check-drop');
  setText(check, status.label);
  setAttr(check, 'data-status', evaluation.status);
  setText(el('cs2-check-selection'), selectionWord(evaluation));

  setText(el('cs2-why-heading'), why.heading);
  setText(el('cs2-why-body'), why.body);

  setText(el('cs2-strip-rec'), recommended ? `${recommended.sizeMm2} mm²` : 'none');
  setText(
    el('cs2-strip-note-text'),
    `Smallest size inside your ${formatPercent(evaluation.dropLimitPercent, 1)} limit:`,
  );

  setText(el('cs2-scope-current'), formatCurrent(evaluation.designCurrentAmps));

  setText(el('cs2-mobile-size'), selected ? `${selected.sizeMm2} mm²` : '—');
  setText(
    el('cs2-mobile-drop'),
    `${formatPercent(selected?.voltageDropPercent ?? 0)} of ${formatPercent(evaluation.dropLimitPercent, 1)}`,
  );

  // screen-reader announcement (§27)
  const live = el('cs2-live');
  const announcement = selected
    ? `${selected.sizeMm2} mm² selected: ${formatVoltage(selected.voltageDropVolts)} drop, ${formatPercent(
        selected.voltageDropPercent,
      )} of ${formatPercent(evaluation.dropLimitPercent, 1)} limit — ${status.label}. Recommended ${
        recommended ? `${recommended.sizeMm2} mm²` : 'size: none on this ladder'
      }.`
    : '';
  if (live && announcement && announcement !== lastAnnouncement) {
    lastAnnouncement = announcement;
    live.textContent = announcement;
  }
}

function paintStrip(evaluation: CableSizeEvaluation): void {
  const row = el('cs2-strip-row');
  if (!row) return;
  const buttons = row.querySelectorAll<HTMLButtonElement>('.cs2-candidate');
  const recommendedSize = evaluation.recommendedCable?.sizeMm2 ?? null;

  for (const button of buttons) {
    const size = num(button.dataset.size ?? '', Number.NaN);
    const candidate = evaluation.candidates.find((item) => item.sizeMm2 === size);
    if (!candidate) continue;
    const isSelected = size === evaluation.selectedSizeMm2;
    const isRecommended = size === recommendedSize;

    setAttr(button, 'data-status', candidate.status);
    setAttr(button, 'aria-pressed', isSelected ? 'true' : 'false');
    setText(button.querySelector('[data-role="status"]'), statusWord(candidate.status));
    setText(button.querySelector('[data-role="volts"]'), formatVoltage(candidate.voltageDropVolts));
    setText(button.querySelector('[data-role="pct"]'), formatPercent(candidate.voltageDropPercent));
    setText(
      button.querySelector('[data-role="flag"]'),
      isRecommended ? (isSelected ? 'IN USE' : 'RECOMMENDED') : isSelected ? 'INSPECTING' : '',
    );
  }
}

/* ── the form follows the result, not the other way round ───────────────── */

let sizeOptionsSignature = '';

/**
 * The size picker in the inputs panel is the same control as the strip: it lists
 * every candidate with its verdict and moves when the strip is clicked.
 */
function paintSizeOptions(evaluation: CableSizeEvaluation): void {
  const select = el<HTMLSelectElement>('cs2-size');
  if (!select) return;

  const recommended = evaluation.recommendedCable?.sizeMm2 ?? null;
  const signature = evaluation.candidates
    .map((c) => `${c.sizeMm2}:${c.status}:${c.sizeMm2 === recommended ? 'r' : ''}`)
    .join('|');

  if (signature !== sizeOptionsSignature) {
    sizeOptionsSignature = signature;
    const previous = select.value;
    select.textContent = '';
    for (const candidate of evaluation.candidates) {
      const option = document.createElement('option');
      option.value = String(candidate.sizeMm2);
      const verdict = candidate.status === 'pass' ? 'inside the limit' : 'over the limit';
      const mark = candidate.sizeMm2 === recommended ? ' — smallest that passes' : '';
      option.textContent = `${candidate.sizeMm2} mm² · ${formatPercent(candidate.voltageDropPercent)} drop · ${verdict}${mark}`;
      select.append(option);
    }
    if (previous && evaluation.candidates.some((c) => String(c.sizeMm2) === previous)) {
      select.value = previous;
    }
  }

  const shown = evaluation.selected?.sizeMm2 ?? recommended;
  if (shown != null && String(shown) !== select.value) select.value = String(shown);
}

/**
 * The nominal-voltage shortcuts. The ladder belongs to the system — 12/24/48/220
 * V on DC, 120/230/400 V on AC — so it is rebuilt whenever the toggle moves, and
 * the chip that matches the live voltage is pressed (§30).
 */
function paintVoltagePresets(): void {
  const host = el('cs2-volt-presets');
  if (!host) return;
  const signature = `${state.systemType}:${state.voltage}`;
  if (host.dataset.signature === signature) return;
  host.dataset.signature = signature;

  host.textContent = '';
  for (const preset of SYSTEM_VOLTAGE_PRESETS[state.systemType]) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'cs2-volt-chip';
    chip.dataset.volts = String(preset.volts);
    chip.title = preset.note;
    chip.textContent = preset.label;
    chip.setAttribute('aria-pressed', String(preset.volts === state.voltage));
    host.append(chip);
  }
}

/**
 * The temperature shortcuts. These do not swap with the system — they are the
 * three conductor temperatures anyone actually sizes at: cold, thermoplastic
 * under load, thermosetting under load.
 */
function paintTemperaturePresets(): void {
  const host = el('cs2-temp-presets');
  if (!host) return;
  const signature = String(state.temperatureC);
  if (host.dataset.signature === signature) return;
  host.dataset.signature = signature;
  for (const chip of host.querySelectorAll<HTMLElement>('.cs2-temp-chip')) {
    const celsius = num(chip.dataset.celsius ?? '', Number.NaN);
    chip.setAttribute('aria-pressed', String(celsius === state.temperatureC));
  }
}

/**
 * Reactance reads better in milliohms per metre — the raw ohms-per-metre figure
 * the engine works in is unreadably small on screen.
 */
function formatReactance(ohmsPerMeter: number): string {
  return `${(ohmsPerMeter * 1000).toFixed(2)} mΩ/m`;
}

/** The two sentences in the form that explain the choice you just made. */
function paintFormNotes(evaluation: CableSizeEvaluation, scene: CableSceneState): void {
  const preset = getLoadPreset(scene.loadType);
  const isDc = scene.systemType === 'dc';

  const systemNote = el('cs2-system-note');
  if (systemNote) {
    setText(
      systemNote,
      isDc
        ? 'DC: no power factor and no reactance — current is simply P ÷ V, so a load that has a power factor draws less current here than it does on AC.'
        : `AC: current is P ÷ (V × cos φ), and the drop comes from resistance and reactance together (R cos φ + X sin φ), so a lower power factor costs more than resistance alone suggests. Reactance is taken as a typical ${formatReactance(DEFAULT_LINE_REACTANCE)} per conductor for multicore cable at 50 Hz — roughly 20% higher on a 60 Hz supply, and nothing at all at unity power factor.`,
    );
  }

  // power factor is meaningless on a DC run: say so instead of ignoring a value
  const pf = el<HTMLInputElement>('cs2-pf');
  if (pf) {
    pf.disabled = isDc;
    const pfField = pf.closest('.ts-field') as HTMLElement | null;
    if (pfField) pfField.classList.toggle('ts-field--disabled', isDc);
  }

  const summary = el('cs2-load-summary');
  if (summary) {
    const power =
      scene.loadType === 'custom'
        ? `${formatLoadPower(scene.loadPowerWatts)} of your own`
        : preset.name;
    setText(
      summary,
      `${power} · ${formatLoadPower(scene.loadPowerWatts)} · PF ${
        isDc ? '—' : preset.powerFactor.toFixed(2)
      } · ${formatCurrent(scene.designCurrent)} at ${formatVoltage(scene.sourceVoltage)}`,
    );
  }
}

/* ── the one place a change is applied ──────────────────────────────────── */

function recompute(): void {
  const evaluation = evaluateCableRun(state);
  // keep the URL honest about a selection that fell back to the recommendation
  recommendedFallback = evaluation.recommendedCable?.sizeMm2 ?? null;
  const scene = buildSceneState(evaluation, {
    systemType: state.systemType,
    voltage: state.voltage,
    loadType: state.loadType,
  });
  paintScene(evaluation);
  paintResults(evaluation);
  paintStrip(evaluation);
  paintSizeOptions(evaluation);
  const range = el<HTMLInputElement>('cs2-length-range');
  if (range) syncLengthRange(range);
  paintVoltagePresets();
  paintTemperaturePresets();
  paintFormNotes(evaluation, scene);
  syncUrl();
}

function applyChange(): void {
  const loadBefore = state.loadType;
  const problem = readForm();
  // the clicked control is the checked one now, whatever the value turned out
  // to be: mirror it before we bail out on a bad number
  syncRadioVisuals();
  if (problem) {
    showValidation(problem);
    return;
  }
  showValidation(null);
  toggleCustomFields();
  // choosing a preset writes its numbers into the custom fields, so the form
  // always shows what the run is using and "Custom" continues from there
  if (state.loadType !== loadBefore) {
    const power = el<HTMLInputElement>('cs2-power');
    if (power) power.value = String(state.customPowerWatts);
    const pf = el<HTMLInputElement>('cs2-pf');
    if (pf) pf.value = String(state.customPowerFactor);
  }
  recompute();
}

function resetAll(): void {
  state = { ...DEFAULTS, candidateSizes: [...DEFAULTS.candidateSizes] };
  limitChoice = '3';
  voltageTouched = false;
  syncForm();
  showValidation(null);
  recompute();
}

/* ── motion (§28) ───────────────────────────────────────────────────────── */

/**
 * The cable's current markers are SMIL `<animateMotion>` elements, and SMIL
 * reads neither CSS custom properties nor a changed `dur` on its own: the period
 * is a literal attribute, re-timed here and restarted at its own stagger offset.
 */
function retimeFlow(seconds: number): void {
  const period = `${seconds.toFixed(2)}s`;
  for (const anim of document.querySelectorAll<SVGAnimationElement>(
    '#cs2-scene-root .cs2-flow animateMotion',
  )) {
    // State lives on the element, not in a module variable: the scene can be
    // re-mounted (tests, hot reload) and a cached period would then be written
    // to a DOM that no longer exists.
    const previous = anim.getAttribute('dur');
    if (previous === period) continue;
    anim.setAttribute('dur', period);
    if (previous === null) continue; // first paint: the authored `begin` offsets stand
    try {
      anim.beginElementAt(-Number(anim.dataset.delay ?? '0'));
    } catch {
      /* SMIL unavailable: the markers simply stay put */
    }
  }
}

/** Pause or resume the SVG's own timeline, so "off" stops the walk mid-stride. */
function setTimelinePaused(paused: boolean): void {
  const svg = document.querySelector('#cs2-scene-svg') as
    | (SVGSVGElement & {
        pauseAnimations?: () => void;
        unpauseAnimations?: () => void;
      })
    | null;
  if (!svg) return;
  try {
    if (paused) svg.pauseAnimations?.();
    else svg.unpauseAnimations?.();
  } catch {
    /* jsdom and friends have no SMIL timeline */
  }
}

function applyMotion(): void {
  const stage = el('interactive-stage');
  const on = motionEnabled && !REDUCED_MOTION.matches;
  setAttr(el('cs2-scene-root'), 'data-motion', on ? 'on' : 'off');
  if (stage) stage.classList.toggle('scene-paused', !on);
  setTimelinePaused(!on);
  const button = el<HTMLButtonElement>('cs2-animate-toggle');
  if (button) {
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.classList.toggle('active', on);
  }
}

function toggleMotion(): void {
  motionEnabled = !motionEnabled;
  applyMotion();
}

/* ── drawers (touch layout) and collapse (desktop) ──────────────────────── */

const SHEETS = {
  inputs: { panel: 'cs2-inputs-container', trigger: 'cs2-mob-inputs' },
  results: { panel: 'cs2-results-container', trigger: 'cs2-mob-results' },
} as const;
type SheetKey = keyof typeof SHEETS;
let openSheetKey: SheetKey | null = null;

function drawerMode(): boolean {
  const stage = el('interactive-stage');
  if (stage?.dataset.layout) return stage.dataset.layout === 'drawer';
  return win.ElectraStage?.layout ? win.ElectraStage.layout() === 'drawer' : false;
}

function setSheetsInert(inert: boolean): void {
  for (const key of Object.keys(SHEETS) as SheetKey[]) {
    const panel = el(SHEETS[key].panel);
    if (panel) panel.inert = inert && openSheetKey !== key;
  }
}

function closeSheet(options: { focus?: boolean } = {}): void {
  for (const key of Object.keys(SHEETS) as SheetKey[]) {
    const panel = el(SHEETS[key].panel);
    if (!panel) continue;
    panel.classList.remove('sheet-open', 'is-expanded', 'is-dragging');
    panel.style.removeProperty('transform');
  }
  const wasOpen = openSheetKey;
  openSheetKey = null;
  const scrim = el('cs2-scrim');
  if (scrim) scrim.hidden = true;
  el('interactive-stage')?.classList.remove('sheet-peeking');
  document.body.style.overflow = '';
  if (!drawerMode()) setSheetsInert(false);
  if (options.focus !== false && wasOpen) el(SHEETS[wasOpen].trigger)?.focus();
  stageHandle?.fit();
}

function showSheet(key: SheetKey): void {
  const spec = SHEETS[key];
  const panel = el(spec.panel);
  if (!panel) return;
  for (const other of Object.keys(SHEETS) as SheetKey[]) {
    if (other !== key) el(SHEETS[other].panel)?.classList.remove('sheet-open', 'is-expanded');
  }
  openSheetKey = key;
  panel.inert = false;
  panel.classList.add('sheet-open');
  panel.style.removeProperty('transform');
  const scrim = el('cs2-scrim');
  if (scrim) scrim.hidden = false;
  el('interactive-stage')?.classList.add('sheet-peeking');
  document.body.style.overflow = 'hidden';
  if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
  panel.focus({ preventScroll: true });
  stageHandle?.fit();
}

function wireSheets(): void {
  for (const key of Object.keys(SHEETS) as SheetKey[]) {
    el<HTMLButtonElement>(SHEETS[key].trigger)?.addEventListener('click', () => {
      if (openSheetKey === key) closeSheet();
      else {
        closeSheet({ focus: false });
        showSheet(key);
      }
    });
    const panel = el(SHEETS[key].panel);
    panel
      ?.querySelector<HTMLButtonElement>('.ts-sheet-close')
      ?.addEventListener('click', () => closeSheet());
    wireGrabber(panel);
  }

  el('cs2-scrim')?.addEventListener('click', () => closeSheet());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && openSheetKey) closeSheet();
  });
}

/** Pull down to dismiss, push up to grow — and keyboard equivalents. */
function wireGrabber(panel: HTMLElement | null): void {
  const grabber = panel?.querySelector<HTMLButtonElement>('.ts-sheet-grabber');
  if (!grabber || !panel) return;
  let startY: number | null = null;

  const finish = (dismiss: boolean) => {
    if (startY === null) return;
    startY = null;
    panel.classList.remove('is-dragging');
    panel.style.removeProperty('transform');
    if (dismiss) closeSheet();
    else panel.classList.add('is-expanded');
  };

  grabber.addEventListener('pointerdown', (event) => {
    startY = event.clientY;
    panel.classList.add('is-dragging');
    grabber.setPointerCapture(event.pointerId);
  });
  grabber.addEventListener('pointermove', (event) => {
    if (startY === null) return;
    const dy = event.clientY - startY;
    if (dy < -40) panel.classList.add('is-expanded');
    panel.style.transform = `translateY(${Math.max(0, dy)}px)`;
  });
  for (const evt of ['pointerup', 'pointercancel'] as const) {
    grabber.addEventListener(evt, (event) =>
      finish((event as PointerEvent).clientY - (startY ?? 0) > 90),
    );
  }
  grabber.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      panel.classList.add('is-expanded');
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (panel.classList.contains('is-expanded')) panel.classList.remove('is-expanded');
      else closeSheet();
    }
  });
  grabber.addEventListener('dblclick', () => panel.classList.toggle('is-expanded'));
}

/* ── wiring ─────────────────────────────────────────────────────────────── */

function wireInputs(): void {
  const form = el('cs2-inputs-body');
  if (!form) return;

  form.addEventListener('input', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;
    // the length slider and its number field are one control
    if (target.id === 'cs2-length-range') {
      const lengthInput = el<HTMLInputElement>('cs2-length');
      if (lengthInput) {
        lengthInput.value = String(roundSliderLength(num((target as HTMLInputElement).value, 1)));
      }
    }
    if (target.id === 'cs2-length') {
      const range = el<HTMLInputElement>('cs2-length-range');
      if (range)
        syncLengthRange(range, num((target as HTMLInputElement).value, state.lengthMeters));
    }
    // a voltage the reader typed is theirs: keep it across a system change
    if (target.id === 'cs2-voltage') voltageTouched = true;
    applyChange();
  });
  form.addEventListener('change', () => applyChange());
  form.addEventListener('submit', (event) => event.preventDefault());
}

/**
 * The nominal-voltage chips. A chip writes its number into the voltage field
 * exactly as typing it would, but a preset is not a hand-typed value — so it
 * does not stop the AC/DC toggle from moving the run to the other system's
 * nominal the next time it is flipped (§30).
 */
function wireVoltagePresets(): void {
  const host = el('cs2-volt-presets');
  if (!host) return;
  host.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const chip = target?.closest<HTMLElement>('.cs2-volt-chip');
    if (!chip) return;
    const volts = num(chip.dataset.volts ?? '', Number.NaN);
    if (!Number.isFinite(volts)) return;
    const input = el<HTMLInputElement>('cs2-voltage');
    if (input) input.value = String(volts);
    voltageTouched = false;
    applyChange();
  });
}

/** The temperature chips are shortcuts into the temperature field. */
function wireTemperaturePresets(): void {
  const host = el('cs2-temp-presets');
  if (!host) return;
  host.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const chip = target?.closest<HTMLElement>('.cs2-temp-chip');
    if (!chip) return;
    const celsius = num(chip.dataset.celsius ?? '', Number.NaN);
    if (!Number.isFinite(celsius)) return;
    const input = el<HTMLInputElement>('cs2-temp');
    if (input) input.value = String(celsius);
    applyChange();
  });
}

/**
 * The size picker in the form drives the same selection as the strip. It listens
 * on `input` as well as `change` because the form's own delegated `input`
 * handler repaints the options: this way the new size is already in the state
 * before that repaint, so the picker cannot be snapped back mid-interaction.
 */
function wireSizeSelect(): void {
  const select = el<HTMLSelectElement>('cs2-size');
  if (!select) return;
  const apply = (): void => {
    const size = num(select.value, Number.NaN);
    if (!Number.isFinite(size)) return;
    state.selectedSizeMm2 = size;
    recompute();
  };
  select.addEventListener('input', apply);
  select.addEventListener('change', apply);
}

function wireStrip(): void {
  const row = el('cs2-strip-row');
  if (!row) return;
  row.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      '.cs2-candidate',
    );
    if (!button) return;
    const size = num(button.dataset.size ?? '', Number.NaN);
    if (!Number.isFinite(size)) return;
    state.selectedSizeMm2 = size;
    recompute();
  });
}

function wireChrome(): void {
  el('cs2-reset')?.addEventListener('click', resetAll);
  el<HTMLButtonElement>('cs2-animate-toggle')?.addEventListener('click', toggleMotion);
  el('cs2-share')?.addEventListener('click', (event) => {
    win.ToolShare?.copyCurrentUrl?.((event.currentTarget as HTMLElement) ?? null);
  });

  const chrome = win.ElectraChrome;
  chrome?.register?.('reset', resetAll);
  chrome?.register?.('animate', toggleMotion);
}

function main(): void {
  restoreFromUrl();
  syncForm();
  applyMotion();
  wireInputs();
  wireVoltagePresets();
  wireTemperaturePresets();
  wireStrip();
  wireSizeSelect();
  wireSheets();
  /*
   * Collapsing is stage chrome, and `scene-stage.js` owns it: it folds the dock
   * to a rail, widens the other dock into the freed space and re-fits the scene
   * from its panel ResizeObserver. A second handler here used to toggle
   * `body.hidden` — with an independent idea of the state, so a dock that
   * started folded (narrow windows) took two clicks to open: CSS said
   * "expanded" while the attribute still said "hidden", and the panel opened
   * empty. One owner, one state.
   */
  wireChrome();

  REDUCED_MOTION.addEventListener?.('change', applyMotion);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    applyMotion();
  });

  if (win.ElectraStage?.attach) {
    stageHandle = win.ElectraStage.attach({
      stage: el('scene-frame') ?? el('interactive-stage'),
      svgId: 'cs2-scene-svg',
      baseWidth: SCENE_GEOMETRY.baseWidth,
      baseHeight: SCENE_GEOMETRY.baseHeight,
      content: SCENE_GEOMETRY.content,
      /*
       * Stacked and drawer layouts have no panels floating over the artwork, so
       * the scaler would otherwise fit the whole 1280×640 canvas into a short
       * banner and the run would arrive as a thin strip. Fitting the authored
       * band instead puts SOURCE → CABLE → LOAD where the space is.
       */
      fitContentInBanner: true,
      panelSelector: '#panel-wrap .ts-panel',
    });
  }

  // the drawer hides panels a touch visitor has not opened
  if (drawerMode()) setSheetsInert(true);

  recompute();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main, { once: true });
} else {
  main();
}
