import type { SupplyModel } from './contracts';
import { isSupplyModel } from './supplies';

export const TIMER_PERIODS: Readonly<Record<string, number>> = {
  'timer-switch': 86_400,
  'digital-weekly-timer': 604_800,
};
export const INTERVAL_TIMER_TYPES = ['staircase-timer', 'countdown-timer'] as const;
export const TIMER_APPROXIMATION =
  'Ideal timed contacts using simulated seconds. Two-terminal timers use an independent external clock; clock consumption and backup are unassessed. Countdown electronics use the declared resistive supply and reset on power loss. No wall-clock, timezone, contact wear or damage model.';

export interface TimerSupply {
  supply: Exclude<SupplyModel, { kind: 'ac-three-phase' }>;
  nominalPowerWatts: number;
  minimumVoltageRatio: number;
}

export type TimerModel =
  | {
      version: 1;
      kind: 'schedule';
      periodSeconds: number;
      offsetSeconds: number;
      /** Sorted, disjoint half-open intervals within one daily or weekly cycle. */
      windows: { startSeconds: number; endSeconds: number }[];
    }
  | {
      version: 1;
      kind: 'interval';
      durationSeconds: number;
      retrigger: 'restart' | 'ignore';
      /** Required on the three-terminal countdown timer; absent on the staircase timer. */
      controlSupply?: TimerSupply;
    };

const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const bounded = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const seconds = (v: unknown, min: number, max: number): v is number =>
  bounded(v, min, max) && Math.abs(v * 1_000_000 - Math.round(v * 1_000_000)) < 0.0001;
const keys = (v: Record<string, unknown>, allowed: string[]) =>
  Object.keys(v).every((key) => allowed.includes(key));

export function isTimerSupply(value: unknown): value is TimerSupply {
  return (
    record(value) &&
    keys(value, ['supply', 'nominalPowerWatts', 'minimumVoltageRatio']) &&
    isSupplyModel(value.supply) &&
    value.supply.kind !== 'ac-three-phase' &&
    bounded(value.supply.voltage, 0.001, 100_000) &&
    bounded(value.nominalPowerWatts, 0.001, 100_000) &&
    bounded(value.minimumVoltageRatio, 0.001, 1)
  );
}

export function isTimerModel(value: unknown): value is TimerModel {
  if (!record(value) || value.version !== 1) return false;
  if (value.kind === 'interval')
    return (
      keys(value, ['version', 'kind', 'durationSeconds', 'retrigger', 'controlSupply']) &&
      seconds(value.durationSeconds, 0.000001, 86_400) &&
      ['restart', 'ignore'].includes(value.retrigger as string) &&
      (value.controlSupply === undefined || isTimerSupply(value.controlSupply))
    );
  if (
    value.kind !== 'schedule' ||
    !keys(value, ['version', 'kind', 'periodSeconds', 'offsetSeconds', 'windows']) ||
    ![86_400, 604_800].includes(value.periodSeconds as number) ||
    !seconds(value.offsetSeconds, 0, (value.periodSeconds as number) - 0.000001) ||
    !Array.isArray(value.windows) ||
    value.windows.length > 32
  )
    return false;
  let previousEnd = -1;
  return value.windows.every((window: unknown) => {
    if (
      !record(window) ||
      !keys(window, ['startSeconds', 'endSeconds']) ||
      !seconds(window.startSeconds, 0, value.periodSeconds as number) ||
      !seconds(window.endSeconds, 0.000001, value.periodSeconds as number) ||
      window.startSeconds >= window.endSeconds ||
      window.startSeconds <= previousEnd
    )
      return false;
    previousEnd = window.endSeconds;
    return true;
  });
}

export function timerModelFitsType(type: string, model: TimerModel): boolean {
  if (model.kind === 'schedule') return TIMER_PERIODS[type] === model.periodSeconds;
  return type === 'countdown-timer'
    ? !!model.controlSupply
    : type === 'staircase-timer' && !model.controlSupply;
}

export function hasTimerSettings(type: string): boolean {
  return Object.hasOwn(TIMER_PERIODS, type) || INTERVAL_TIMER_TYPES.some((item) => item === type);
}

export function copyTimerModel(model: TimerModel): TimerModel {
  // Configuration identity must depend on values, not imported JSON key order.
  if (model.kind === 'schedule')
    return {
      version: 1,
      kind: 'schedule',
      periodSeconds: model.periodSeconds,
      offsetSeconds: model.offsetSeconds,
      windows: model.windows.map((window) => ({
        startSeconds: window.startSeconds,
        endSeconds: window.endSeconds,
      })),
    };
  const control = model.controlSupply;
  return {
    version: 1,
    kind: 'interval',
    durationSeconds: model.durationSeconds,
    retrigger: model.retrigger,
    ...(control
      ? {
          controlSupply: {
            supply:
              control.supply.kind === 'dc'
                ? { kind: 'dc' as const, voltage: control.supply.voltage }
                : {
                    kind: 'ac-single-phase' as const,
                    voltage: control.supply.voltage,
                    frequencyHz: control.supply.frequencyHz,
                  },
            nominalPowerWatts: control.nominalPowerWatts,
            minimumVoltageRatio: control.minimumVoltageRatio,
          },
        }
      : {}),
  };
}

/** Integer microseconds avoid drift at cycle and half-open interval boundaries. */
export function scheduleAt(model: Extract<TimerModel, { kind: 'schedule' }>, now: number) {
  const period = Math.round(model.periodSeconds * 1_000_000);
  const position =
    (Math.round(now * 1_000_000) + Math.round(model.offsetSeconds * 1_000_000)) % period;
  const windows = model.windows.map(
    (w) => [Math.round(w.startSeconds * 1_000_000), Math.round(w.endSeconds * 1_000_000)] as const,
  );
  const closed = windows.some(([start, end]) => position >= start && position < end);
  const boundaries = [...new Set(windows.flatMap(([start, end]) => [start, end % period]))].filter(
    (at) => {
      const before = (at + period - 1) % period;
      return (
        windows.some(([start, end]) => at >= start && at < end) !==
        windows.some(([start, end]) => before >= start && before < end)
      );
    },
  );
  const distance = Math.min(...boundaries.map((at) => (at - position + period) % period || period));
  return {
    closed,
    nextSeconds: Number.isFinite(distance)
      ? (Math.round(now * 1_000_000) + distance) / 1_000_000
      : null,
  };
}
