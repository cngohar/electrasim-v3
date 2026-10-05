import {
  TIMER_PERIODS,
  type TimerModel,
  isTimerModel,
  timerModelFitsType,
} from '@electrasim/domain/core/timerModel';
import type { ComponentInstance } from '@electrasim/domain/types';
import { useState } from 'react';
import { useCircuitStore } from '../../../store/circuitStore';

const input =
  'w-full min-w-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900';
const button = 'rounded border px-2 py-1 font-semibold disabled:opacity-50';

export default function TimerModelEditor({
  component,
  locked,
}: { component: ComponentInstance; locked: string | null }) {
  const existing = component.state.timerModel;
  const period = TIMER_PERIODS[component.type];
  const powered = component.type === 'countdown-timer';
  const configuredSupply = existing?.kind === 'interval' ? existing.controlSupply : undefined;
  const [duration, setDuration] = useState(
    String(existing?.kind === 'interval' ? existing.durationSeconds : 30),
  );
  const [retrigger, setRetrigger] = useState(
    existing?.kind === 'interval' ? existing.retrigger : 'restart',
  );
  const [offset, setOffset] = useState(
    String(existing?.kind === 'schedule' ? existing.offsetSeconds : 0),
  );
  const [windows, setWindows] = useState(
    (existing?.kind === 'schedule' ? existing.windows : [{ startSeconds: 1, endSeconds: 10 }]).map(
      (w, id) => ({ id, start: String(w.startSeconds), end: String(w.endSeconds) }),
    ),
  );
  const [supply, setSupply] = useState({
    kind: configuredSupply?.supply.kind ?? 'ac-single-phase',
    voltage: configuredSupply ? String(configuredSupply.supply.voltage) : '',
    frequency:
      configuredSupply?.supply.kind === 'ac-single-phase'
        ? String(configuredSupply.supply.frequencyHz)
        : '50',
    power: configuredSupply ? String(configuredSupply.nominalPowerWatts) : '',
    threshold: String(configuredSupply?.minimumVoltageRatio ?? 0.8),
  });
  const [error, setError] = useState('');
  return (
    <form
      className="space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        const model: unknown = period
          ? {
              version: 1,
              kind: 'schedule',
              periodSeconds: period,
              offsetSeconds: Number(offset),
              windows: windows
                .map((w) => ({ startSeconds: Number(w.start), endSeconds: Number(w.end) }))
                .sort((a, b) => a.startSeconds - b.startSeconds),
            }
          : {
              version: 1,
              kind: 'interval',
              durationSeconds: Number(duration),
              retrigger,
              ...(powered
                ? {
                    controlSupply: {
                      supply:
                        supply.kind === 'dc'
                          ? { kind: 'dc', voltage: Number(supply.voltage) }
                          : {
                              kind: 'ac-single-phase',
                              voltage: Number(supply.voltage),
                              frequencyHz: Number(supply.frequency),
                            },
                      nominalPowerWatts: Number(supply.power),
                      minimumVoltageRatio: Number(supply.threshold),
                    },
                  }
                : {}),
            };
        const blanks = period
          ? !offset.trim() || windows.some((w) => !w.start.trim() || !w.end.trim())
          : !duration.trim();
        if (blanks || !isTimerModel(model) || !timerModelFitsType(component.type, model)) {
          setError(
            period
              ? 'Use separate, non-overlapping ON intervals inside the cycle and a start position before its end.'
              : 'Enter a positive interval up to 86400 s. Countdown timers also need positive supply ratings and an operating ratio from 0 to 1 (excluding 0).',
          );
          return;
        }
        setError('');
        useCircuitStore
          .getState()
          .updateComponentState(component.id, { timerModel: model as TimerModel });
      }}
    >
      <p>Timer programs use simulated time. Stop and Run resets the clock and trigger latch.</p>
      <fieldset disabled={!!locked} className="space-y-2">
        {period ? (
          <>
            <p>
              {period === 86_400 ? 'Daily' : 'Weekly'} cycle: {period} seconds. The clock is
              independent of the switched supply; clock power and backup are unassessed.
            </p>
            <label className="block">
              Start position in cycle (s)
              <input
                aria-label="Timer start position (s)"
                type="number"
                required
                min="0"
                max={period - 0.000001}
                step="any"
                className={input}
                value={offset}
                onChange={(e) => setOffset(e.target.value)}
              />
            </label>
            <p>
              ON intervals include their start and exclude their end. Use seconds from the start of
              the cycle.
            </p>
            {windows.map((window, index) => (
              <div key={window.id} className="grid grid-cols-2 gap-2 rounded border p-2">
                <label>
                  ON at (s)
                  <input
                    aria-label={`Timer interval ${index + 1} start (s)`}
                    required
                    type="number"
                    min="0"
                    max={period}
                    step="any"
                    className={input}
                    value={window.start}
                    onChange={(e) =>
                      setWindows(
                        windows.map((w) =>
                          w.id === window.id ? { ...w, start: e.target.value } : w,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  OFF at (s)
                  <input
                    aria-label={`Timer interval ${index + 1} end (s)`}
                    required
                    type="number"
                    min="0"
                    max={period}
                    step="any"
                    className={input}
                    value={window.end}
                    onChange={(e) =>
                      setWindows(
                        windows.map((w) =>
                          w.id === window.id ? { ...w, end: e.target.value } : w,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className={button}
                  aria-label={`Remove timer interval ${index + 1}`}
                  onClick={() => setWindows(windows.filter((w) => w.id !== window.id))}
                >
                  Remove interval
                </button>
              </div>
            ))}
            {!windows.length && <p>No ON intervals: the output stays open.</p>}
            <button
              type="button"
              className={button}
              disabled={windows.length >= 32}
              onClick={() =>
                setWindows([
                  ...windows,
                  { id: Math.max(-1, ...windows.map((w) => w.id)) + 1, start: '', end: '' },
                ])
              }
            >
              Add ON interval
            </button>
          </>
        ) : (
          <>
            <label className="block">
              Timer duration (s)
              <input
                aria-label="Timer duration (s)"
                type="number"
                min="0.000001"
                max="86400"
                step="any"
                required
                className={input}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </label>
            <label className="block">
              Trigger during an active interval
              <select
                aria-label="Timer retrigger behavior"
                className={input}
                value={retrigger}
                onChange={(e) => setRetrigger(e.target.value as typeof retrigger)}
              >
                <option value="restart">Restart the full interval</option>
                <option value="ignore">Keep the original deadline</option>
              </select>
            </label>
            <p>
              Press Trigger to start; Release re-arms the input without stopping the interval. A
              held input starts only once.
            </p>
            {!powered && (
              <p>
                The staircase timer uses an independent external clock; its control supply and
                consumption are unassessed.
              </p>
            )}
          </>
        )}
        {powered && (
          <>
            <p>
              Declare the countdown electronics supply across L-in / N-in. Supply loss opens the
              contact and clears progress; restore needs a fresh trigger.
            </p>
            <label className="block">
              Timer supply waveform
              <select
                aria-label="Timer supply waveform"
                className={input}
                value={supply.kind}
                onChange={(e) =>
                  setSupply({ ...supply, kind: e.target.value as typeof supply.kind })
                }
              >
                <option value="ac-single-phase">Single-phase AC</option>
                <option value="dc">DC</option>
              </select>
            </label>
            {(
              [
                'voltage',
                'power',
                'threshold',
                ...(supply.kind === 'ac-single-phase' ? (['frequency'] as const) : []),
              ] as const
            ).map((key) => {
              const label = {
                voltage: 'Timer nominal voltage (V)',
                power: 'Timer nominal power (W)',
                threshold: 'Timer minimum voltage ratio',
                frequency: 'Timer frequency (Hz)',
              }[key];
              return (
                <label key={key} className="block">
                  {label}
                  <input
                    aria-label={label}
                    required
                    type="number"
                    step="any"
                    min="0.001"
                    max={key === 'threshold' ? 1 : 100_000}
                    className={input}
                    value={supply[key]}
                    onChange={(e) => setSupply({ ...supply, [key]: e.target.value })}
                  />
                </label>
              );
            })}
            <p>
              Resistive electronics approximation. Startup, energy storage, damage and manufacturer
              timing are unassessed.
            </p>
          </>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className={button}>
            Apply timer program
          </button>
          {existing && (
            <button
              type="button"
              className={button}
              onClick={() =>
                useCircuitStore
                  .getState()
                  .updateComponentState(component.id, { timerModel: undefined })
              }
            >
              Remove timer program
            </button>
          )}
        </div>
      </fieldset>
      {locked && <p>{locked}</p>}
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
