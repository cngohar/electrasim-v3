import { useState } from 'react';
import { useAdminResource } from './resource';
import type { Tools } from './types';

type Values = {
  bannedWords: string[];
  autoHideThreshold: number;
  writesPerMinute: number;
  reportsPerDay: number;
  preModeration: boolean;
};
type Settings = { version: number; values: Values; defaults: Values; canWrite: boolean };
export function SettingsView(tools: Tools) {
  const { data, loading } = useAdminResource<Settings>('admin/settings/community', tools.fail);
  if (loading || !data) return <output>Loading settings…</output>;
  return <SettingsForm key={data.version} data={data} {...tools} />;
}
function SettingsForm({ data, ...tools }: Tools & { data: Settings }) {
  const [values, setValues] = useState(data.values);
  return (
    <div className="settings-layout">
      <aside className="settings-menu">
        <strong>Moderation &amp; limits</strong>
        <span>Community policy defaults</span>
        <span>Changes require a reason</span>
        {!data.canWrite && <span className="settings-readonly">Read-only access</span>}
      </aside>
      <form
        className="panel settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          const next = {
            ...values,
            bannedWords: values.bannedWords.map((v) => v.trim()).filter(Boolean),
          };
          tools.review({
            path: 'admin/settings/community',
            method: 'PATCH',
            data: { values: next, version: data.version },
            summary: [
              'Update community settings.',
              `Banned words: ${data.values.bannedWords.join(', ') || 'none'} → ${values.bannedWords.join(', ') || 'none'}`,
              `Auto-hide threshold: ${data.values.autoHideThreshold} → ${values.autoHideThreshold}`,
              `Writes per minute: ${data.values.writesPerMinute} → ${values.writesPerMinute}`,
              `Reports per day: ${data.values.reportsPerDay} → ${values.reportsPerDay}`,
              `Pre-moderation: ${data.values.preModeration ? 'on' : 'off'} → ${values.preModeration ? 'on' : 'off'}`,
            ],
          });
        }}
      >
        <h2>Moderation &amp; rate limits</h2>
        <p>Review policy changes before they take effect.</p>
        <fieldset disabled={!data.canWrite} className="borderless">
          {(
            [
              [
                'autoHideThreshold',
                'Auto-hide threshold',
                'Distinct eligible reports before automatic hiding.',
                2,
                100,
              ],
              [
                'writesPerMinute',
                'Writes per minute',
                'Maximum community writes per account.',
                1,
                120,
              ],
              [
                'reportsPerDay',
                'Reports per day',
                'Maximum reports submitted by one account.',
                1,
                50,
              ],
            ] as const
          ).map(([key, label, description, min, max]) => (
            <label className="setting-row" key={key}>
              <span>
                <strong>{label}</strong>
                <p>{description}</p>
              </span>
              <input
                type="number"
                aria-label={label}
                required
                min={min}
                max={max}
                value={values[key]}
                onChange={(event) =>
                  setValues({ ...values, [key]: event.currentTarget.valueAsNumber })
                }
              />
            </label>
          ))}
          <label className="setting-row">
            <span>
              <strong>Pre-moderation</strong>
              <p>Hold new contributions for review before publication.</p>
            </span>
            <input
              className="switch"
              type="checkbox"
              aria-label="Pre-moderation"
              checked={values.preModeration}
              onChange={(event) =>
                setValues({ ...values, preModeration: event.currentTarget.checked })
              }
            />
          </label>
          <label className="field">
            Banned words (one per line)
            <textarea
              aria-label="Banned words (one per line)"
              placeholder="One word per line"
              maxLength={8100}
              value={values.bannedWords.join('\n')}
              onChange={(event) =>
                setValues({ ...values, bannedWords: event.currentTarget.value.split('\n') })
              }
            />
          </label>
        </fieldset>
        {data.canWrite && (
          <div className="settings-actions">
            <button
              type="button"
              onClick={() =>
                setValues({ ...data.defaults, bannedWords: [...data.defaults.bannedWords] })
              }
            >
              Use default values
            </button>
            <button className="btn primary">Review settings</button>
          </div>
        )}
      </form>
    </div>
  );
}
