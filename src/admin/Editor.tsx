import { useEffect, useState } from 'react';
import {
  type Page,
  type Resource,
  type Row,
  dateInput,
  dateValue,
  identifier,
  label,
  removalMessage,
  request,
} from './client';

type Props = {
  resource: Resource;
  row: Row | null;
  busy: boolean;
  save: (method: string, data: Row) => Promise<void>;
  cancel: () => void;
  fail: (error: unknown) => void;
};
function Field({
  title,
  name,
  value,
  type = 'text',
  required = true,
  disabled = false,
}: {
  title: string;
  name: string;
  value?: unknown;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label>
      {title}
      <input
        name={name}
        type={type}
        defaultValue={String(value ?? '')}
        required={required}
        disabled={disabled}
        step={type === 'number' ? 1 : undefined}
      />
    </label>
  );
}
function Check({ title, name, value }: { title: string; name: string; value?: unknown }) {
  return (
    <label className="check">
      <input type="checkbox" name={name} defaultChecked={Boolean(value)} />
      {title}
    </label>
  );
}
function Picker({
  resource,
  name,
  selected,
  fail,
  onPick,
}: {
  resource: 'plans' | 'users';
  name: string;
  selected?: unknown;
  fail: Props['fail'];
  onPick?: (row: Row) => void;
}) {
  const [page, setPage] = useState<Page>({ items: [], total: 0 });
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState('');
  const [value, setValue] = useState(String(selected ?? ''));
  const [chosen, setChosen] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let current = true;
    setLoading(true);
    request<Page>(`admin/pro/${resource}?limit=20&offset=${offset}&q=${encodeURIComponent(query)}`)
      .then((result) => {
        if (current) setPage(result);
      })
      .catch((error) => {
        if (current) fail(error);
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [resource, offset, query, fail]);
  return (
    <fieldset>
      <legend>{name === 'userId' ? 'Member' : 'Plan'}</legend>
      {resource === 'users' && (
        <label>
          Search name or email
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOffset(0);
            }}
          />
        </label>
      )}
      <label>
        Selected {resource === 'users' ? 'member' : 'plan'}
        <select
          name={name}
          value={value}
          required
          onChange={(event) => {
            setValue(event.target.value);
            const row = page.items.find((item) => identifier(item) === event.target.value);
            if (row) {
              setChosen(label(row));
              onPick?.(row);
            }
          }}
        >
          <option value="">Choose…</option>
          {value && !page.items.some((row) => identifier(row) === value) && (
            <option value={value}>{chosen || value}</option>
          )}
          {page.items
            .filter(
              (row) => resource !== 'plans' || row.status === 'active' || identifier(row) === value,
            )
            .map((row) => (
              <option key={identifier(row)} value={identifier(row)}>
                {label(row)}
                {row.email ? ` — ${row.email}` : ''}
              </option>
            ))}
        </select>
      </label>
      {loading && <output>Loading choices…</output>}
      <div className="actions">
        <button type="button" disabled={!offset || loading} onClick={() => setOffset(offset - 20)}>
          Previous choices
        </button>
        <button
          type="button"
          disabled={offset + 20 >= page.total || loading}
          onClick={() => setOffset(offset + 20)}
        >
          Next choices
        </button>
      </div>
    </fieldset>
  );
}
function Benefits({ row, fail }: { row: Row | null; fail: Props['fail'] }) {
  const [items, setItems] = useState<Row[] | null>(null);
  useEffect(() => {
    let current = true;
    void (async () => {
      const all: Row[] = [];
      for (let offset = 0; ; offset += 100) {
        const page = await request<Page>(`admin/pro/features?limit=100&offset=${offset}`);
        all.push(...page.items);
        if (offset + 100 >= page.total) break;
      }
      if (current) setItems(all);
    })().catch((error) => {
      if (current) fail(error);
    });
    return () => {
      current = false;
    };
  }, [fail]);
  const links = (row?.features ?? []) as Row[];
  return (
    <fieldset>
      <legend>Plan benefits</legend>
      {items && <input type="hidden" name="benefitsReady" value="yes" />}
      {items ? (
        items
          .filter((item) => !item.archivedAt || links.some((link) => link.featureKey === item.key))
          .map((item) => (
            <Check
              key={String(item.key)}
              name={`benefit:${item.key}`}
              title={`${label(item)}${!item.enabled ? ' (globally disabled)' : ''}${item.archivedAt ? ' (archived)' : ''}`}
              value={links.some((link) => link.featureKey === item.key && link.enabled)}
            />
          ))
      ) : (
        <>
          <p>Loading benefits…</p>
        </>
      )}
    </fieldset>
  );
}
export function Editor({ resource, row, busy, save, cancel, fail }: Props) {
  const [review, setReview] = useState<{ method: string; data: Row } | null>(null);
  const [noExpiry, setNoExpiry] = useState(Boolean(row?.noExpiry ?? true));
  const [ends, setEnds] = useState(dateInput(row?.endsAt));
  const [starts, setStarts] = useState(dateInput(row?.startsAt ?? Date.now()));
  const [formError, setFormError] = useState('');
  function prepare(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? '').trim();
    let payload: Row;
    if (resource === 'plans') {
      if (!data.has('benefitsReady'))
        throw new Error('Wait for benefits to load before reviewing this plan.');
      payload = {
        slug: text('slug'),
        name: text('name'),
        description: text('description'),
        status: text('status'),
        noExpiry,
        durationDays: noExpiry ? null : Number(text('durationDays')),
        priceMinor: text('priceMinor') ? Number(text('priceMinor')) : null,
        currency: text('currency') || null,
        features: Array.from(data.keys())
          .filter((key) => key.startsWith('benefit:'))
          .map((key) => ({ featureKey: key.slice(8), enabled: true, config: {} })),
      };
    } else if (resource === 'features') {
      const localized = (field: string) => {
        const extra = JSON.parse(text(`${field}Locales`) || '{}');
        if (!extra || typeof extra !== 'object' || Array.isArray(extra))
          throw new Error('Translations must be a locale-to-text object.');
        return { ...extra, en: text(field) };
      };
      payload = {
        key: row?.key ?? text('key'),
        handler: row?.handler ?? text('handler'),
        name: localized('name'),
        description: localized('description'),
        enabled: data.has('enabled'),
        archived: data.has('archived'),
        sortOrder: Number(text('sortOrder')),
      };
    } else {
      const start =
        row && text('startsAt') === dateInput(row.startsAt)
          ? Number(row.startsAt)
          : dateValue(data.get('startsAt'));
      const end = noExpiry
        ? null
        : row?.endsAt != null && text('endsAt') === dateInput(row.endsAt)
          ? Number(row.endsAt)
          : dateValue(data.get('endsAt'));
      if (end !== null && end <= start) throw new Error('End must be after start.');
      payload = {
        userId: row?.userId ?? text('userId'),
        planId: text('planId'),
        startsAt: start,
        endsAt: end,
        noExpiry,
        status: text('status'),
      };
    }
    setReview({ method: row ? 'PATCH' : 'POST', data: payload });
  }
  const translations = (field: string) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries((row?.[field] ?? {}) as Row).filter(([key]) => key !== 'en'),
      ),
      null,
      2,
    );
  return (
    <section aria-label="Record editor">
      <h2>
        {row
          ? `Edit ${label(row)}`
          : `Create ${resource === 'memberships' ? 'grant' : resource === 'features' ? 'benefit' : 'plan'}`}
      </h2>
      {row && (
        <p>
          Version {String(row.version)} ·{' '}
          {resource === 'plans'
            ? `${row.affectedMemberCount} affected members · ${row.grantCount} retained grants`
            : resource === 'features'
              ? `${row.referenceCount} plan references`
              : `Member ${row.userId}`}
        </p>
      )}
      {formError && <p role="alert">{formError}</p>}
      {review && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void save(review.method, {
              ...review.data,
              reason: String(data.get('reason')).trim(),
              ...(row ? { version: row.version } : {}),
            });
          }}
        >
          <h3>Review change</h3>
          <p>
            {review.method === 'DELETE'
              ? removalMessage(resource, row!)
              : resource === 'plans'
                ? 'Benefit changes affect existing members on their next protected action. Price and duration defaults do not change existing grant dates.'
                : resource === 'features'
                  ? 'Disabling stops this benefit authorizing access. Archiving only hides marketing and new attachments.'
                  : 'Access is the union of all currently valid grants. Revoked grants cannot be resumed.'}
          </p>
          {review.method !== 'DELETE' && (
            <dl>
              {Object.entries(review.data).map(([key, value]) => (
                <div key={key}>
                  <dt>
                    {(
                      {
                        priceMinor: 'Price in minor units',
                        durationDays: 'Default duration in days',
                        noExpiry: 'No expiry',
                        userId: 'Member',
                        planId: 'Plan',
                        startsAt: 'Starts at (UTC)',
                        endsAt: 'Ends at (UTC)',
                        sortOrder: 'Display order',
                        handler: 'Capability',
                        features: 'Benefits',
                      } as Record<string, string>
                    )[key] ?? key}
                  </dt>
                  <dd>
                    {value == null
                      ? 'None'
                      : key === 'startsAt' || key === 'endsAt'
                        ? new Date(Number(value)).toISOString()
                        : typeof value === 'boolean'
                          ? value
                            ? 'Yes'
                            : 'No'
                          : typeof value === 'object'
                            ? JSON.stringify(value)
                            : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <label>
            Reason
            <textarea name="reason" required maxLength={1000} />
          </label>
          <div className="actions">
            <button disabled={busy}>Confirm change</button>
            <button type="button" disabled={busy} onClick={() => setReview(null)}>
              Back to edit
            </button>
            <button type="button" disabled={busy} onClick={cancel}>
              Cancel
            </button>
          </div>
        </form>
      )}
      <form
        hidden={!!review}
        onSubmit={(event) => {
          event.preventDefault();
          try {
            setFormError('');
            prepare(event.currentTarget);
          } catch (error) {
            setFormError(error instanceof Error ? error.message : 'Invalid values');
          }
        }}
      >
        <fieldset disabled={busy || row?.status === 'revoked'}>
          {resource === 'plans' && (
            <>
              <Field title="Plan name" name="name" value={row?.name} />
              <Field title="Slug" name="slug" value={row?.slug} />
              <Field
                title="Description"
                name="description"
                value={row?.description}
                required={false}
              />
              <label>
                Status
                <select name="status" defaultValue={String(row?.status ?? 'draft')}>
                  <option>draft</option>
                  <option>active</option>
                  <option>archived</option>
                </select>
              </label>
              <Field
                title="Price in minor units (optional)"
                name="priceMinor"
                type="number"
                value={row?.priceMinor}
                required={false}
              />
              <Field
                title="Currency (three uppercase letters)"
                name="currency"
                value={row?.currency}
                required={false}
              />
              <p>Descriptive pricing only; membership is assigned manually.</p>
              <Benefits row={row} fail={fail} />
            </>
          )}
          {resource === 'features' && (
            <>
              <Field title="Benefit key" name="key" value={row?.key} disabled={!!row} />
              <label>
                Implemented capability
                <select
                  name="handler"
                  defaultValue={String(row?.handler ?? 'pro_components')}
                  disabled={!!row}
                >
                  <option>pro_components</option>
                  <option>advanced_faults</option>
                  <option>advanced_diagnostics</option>
                </select>
              </label>
              <Field title="English name" name="name" value={(row?.name as Row)?.en} />
              <Field
                title="English description"
                name="description"
                value={(row?.description as Row)?.en}
                required={false}
              />
              <label>
                Name translations (locale-to-text JSON)
                <textarea name="nameLocales" defaultValue={translations('name')} />
              </label>
              <label>
                Description translations (locale-to-text JSON)
                <textarea name="descriptionLocales" defaultValue={translations('description')} />
              </label>
              <Field
                title="Display order"
                name="sortOrder"
                type="number"
                value={row?.sortOrder ?? 0}
              />
              <Check title="Enabled for access" name="enabled" value={row?.enabled ?? true} />
              <Check title="Archived from marketing" name="archived" value={row?.archivedAt} />
            </>
          )}
          {resource === 'memberships' && (
            <>
              {!row && <Picker resource="users" name="userId" fail={fail} />}
              <Picker
                resource="plans"
                name="planId"
                selected={row?.planId}
                fail={fail}
                onPick={(plan) => {
                  if (!row) {
                    setNoExpiry(Boolean(plan.noExpiry));
                    setEnds(
                      plan.noExpiry
                        ? ''
                        : dateInput(
                            Date.parse(`${starts}:00Z`) + Number(plan.durationDays) * 86400000,
                          ),
                    );
                  }
                }}
              />
              <label>
                Status
                <select name="status" defaultValue={String(row?.status ?? 'active')}>
                  <option>active</option>
                  <option>suspended</option>
                  {row?.status === 'revoked' && <option>revoked</option>}
                </select>
              </label>
              <label>
                Starts at (UTC)
                <input
                  type="datetime-local"
                  name="startsAt"
                  required
                  value={starts}
                  onChange={(event) => setStarts(event.target.value)}
                />
              </label>
            </>
          )}
          {resource !== 'features' && (
            <>
              <label className="check">
                <input
                  type="checkbox"
                  checked={noExpiry}
                  onChange={(event) => setNoExpiry(event.target.checked)}
                />
                No expiry
              </label>
              {!noExpiry &&
                (resource === 'plans' ? (
                  <Field
                    title="Default duration (days)"
                    name="durationDays"
                    type="number"
                    value={row?.durationDays ?? 30}
                  />
                ) : (
                  <label>
                    Ends at (UTC)
                    <input
                      type="datetime-local"
                      name="endsAt"
                      required
                      value={ends}
                      onChange={(event) => setEnds(event.target.value)}
                    />
                  </label>
                ))}
            </>
          )}
          <button>Review change</button>
        </fieldset>
        <div className="actions">
          {row && row.status !== 'revoked' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => setReview({ method: 'DELETE', data: {} })}
            >
              {resource === 'memberships' ? 'Revoke grant' : 'Remove record'}
            </button>
          )}
          <button type="button" disabled={busy} onClick={cancel}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
