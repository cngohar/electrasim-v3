import { ArrowLeft, ArrowRight, LockKeyhole, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ApiError, request } from '../client';
import { Pill } from './AdminShell';
import type { Tools } from './types';

type Component = {
  id: string;
  label: string;
  description: string;
  category: string;
  originalTier: 'basic' | 'pro';
  protectedBasic: boolean;
  access: 'free' | 'pro';
  overrideVersion: number | null;
};
type Catalogue = {
  version: number;
  policyRevision: number;
  categories: string[];
  inventory: { total: number; protectedBasic: number };
  items: Component[];
  total: number;
  limit: number;
  offset: number;
};
type Detail = {
  version: number;
  policyRevision: number;
  component: Component;
  impact: { savedCircuits: number | null; publicContent: number | null };
  history: {
    id: string;
    actorId: string;
    reason: string;
    requestId: string;
    createdAt: number;
    before: { access: 'free' | 'pro'; policyRevision: number };
    after: { access: 'free' | 'pro'; policyRevision: number };
  }[];
};
const accessLabel = (value: Component['access']) => (value === 'free' ? 'Free' : 'Pro');
function AccessPill({ value }: { value: Component['access'] }) {
  return <Pill tone={value === 'free' ? 'green' : 'purple'}>{accessLabel(value)}</Pill>;
}
function componentHash() {
  try {
    return decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return window.location.hash.slice(1);
  }
}

// Keep errors local when the resource is missing/invalid, and let the shared
// shell remove all protected data on session, permission or service failure.
// A response for an obsolete filter, selection or reload is never rendered.
function useCatalogueResource<T>(path: string, attempt: number, fail: Tools['fail']) {
  const [result, setResult] = useState<{
    path: string;
    attempt: number;
    data?: T;
    error?: string;
  } | null>(null);
  useEffect(() => {
    let active = true;
    request<T>(path).then(
      (data) => {
        if (active) setResult({ path, attempt, data });
      },
      (cause) => {
        if (!active) return;
        setResult({
          path,
          attempt,
          error: cause instanceof Error ? cause.message : 'Component catalogue unavailable',
        });
        if (
          !(cause instanceof ApiError) ||
          [401, 403].includes(cause.status) ||
          cause.status >= 500
        )
          fail(cause);
      },
    );
    return () => {
      active = false;
    };
  }, [path, attempt, fail]);
  const current = result?.path === path && result.attempt === attempt ? result : null;
  return { data: current?.data, error: current?.error, loading: !current };
}

export function ComponentsView({ fail }: Tools) {
  const [selected, setSelected] = useState(componentHash);
  const [q, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [filter, setFilter] = useState('all');
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [notice, setNotice] = useState('');
  const searchField = useRef<HTMLInputElement>(null);
  const previousSelection = useRef(selected);
  useEffect(() => {
    if (previousSelection.current && !selected) searchField.current?.focus();
    previousSelection.current = selected;
  }, [selected]);
  useEffect(() => {
    const update = () => {
      setSelected(componentHash());
      setNotice('');
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const params = new URLSearchParams({ q, access: filter, limit: '12', offset: String(offset) });
  if (category) params.set('category', category);
  const path = selected
    ? `admin/components/${encodeURIComponent(selected)}`
    : `admin/components?${params}`;
  const { data, loading, error } = useCatalogueResource<Catalogue | Detail>(path, attempt, fail);
  const catalogue = data && 'items' in data ? data : undefined;
  const detail = data && 'component' in data ? data : undefined;
  const reload = () => setAttempt((value) => value + 1);
  return (
    <>
      {notice && <output aria-live="polite">{notice}</output>}
      {!selected && (
        <>
          <div className="page-heading">
            <div>
              <span className="eyebrow">PLATFORM WORKSPACE</span>
              <h1>Component access</h1>
              <p>
                Decide who can use existing Pro components. The confirmed Basic catalogue stays
                free.
              </p>
            </div>
            <Pill tone="purple">Super admin only</Pill>
          </div>
          <section className="panel table-panel">
            <div className="panel-heading">
              <div>
                <h2>Component catalogue</h2>
                {catalogue && (
                  <p>
                    {catalogue.inventory.total} components · {catalogue.inventory.protectedBasic}{' '}
                    protected Basic · policy revision {catalogue.policyRevision}
                  </p>
                )}
              </div>
            </div>
            <form
              className="directory-tools component-tools"
              onSubmit={(event) => {
                event.preventDefault();
                setQuery(search.trim());
                setOffset(0);
                reload();
              }}
            >
              <label>
                Search components
                <input
                  ref={searchField}
                  value={search}
                  maxLength={200}
                  placeholder="Component name or ID…"
                  onChange={(event) => setSearch(event.currentTarget.value)}
                />
              </label>
              <label>
                Component category
                <select
                  value={category}
                  onChange={(event) => {
                    setCategory(event.currentTarget.value);
                    setOffset(0);
                  }}
                >
                  <option value="">All categories</option>
                  {(catalogue?.categories ?? (category ? [category] : [])).map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
              <label>
                Component access filter
                <select
                  value={filter}
                  onChange={(event) => {
                    setFilter(event.currentTarget.value);
                    setOffset(0);
                  }}
                >
                  <option value="all">All access</option>
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="protected">Protected Basic</option>
                </select>
              </label>
              <button className="btn" type="submit">
                <Search className="icon" /> Search catalogue
              </button>
            </form>
            {loading && <output className="panel-content">Loading component catalogue…</output>}
            {catalogue && (
              <>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Category</th>
                        <th>Code tier</th>
                        <th>Effective access</th>
                        <th>
                          <span className="sr-only">Details</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {catalogue.items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.label}</strong>
                            <small className="table-subtext">{item.id}</small>
                          </td>
                          <td>{item.category}</td>
                          <td>{item.protectedBasic ? 'Basic · locked' : 'Pro'}</td>
                          <td>
                            <AccessPill value={item.access} />
                          </td>
                          <td>
                            <a
                              className="text-button"
                              href={`#${encodeURIComponent(item.id)}`}
                              aria-label={`View ${item.label}`}
                            >
                              View <ArrowRight className="icon" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {catalogue.items.length === 0 && (
                    <div className="empty">
                      <strong>No matching components</strong>
                      <p>Change the search or filters.</p>
                    </div>
                  )}
                </div>
                <div className="result-pages">
                  <span>
                    {catalogue.total} matching components · page{' '}
                    {Math.floor(catalogue.offset / catalogue.limit) + 1} of{' '}
                    {Math.max(1, Math.ceil(catalogue.total / catalogue.limit))}
                  </span>
                  <button
                    className="btn small"
                    disabled={!offset}
                    onClick={() => setOffset(Math.max(0, offset - 12))}
                  >
                    Previous components
                  </button>
                  <button
                    className="btn small"
                    disabled={offset + 12 >= catalogue.total}
                    onClick={() => setOffset(offset + 12)}
                  >
                    Next components
                  </button>
                </div>
              </>
            )}
          </section>
        </>
      )}
      {selected && (
        <>
          <div className="actions">
            <button
              className="btn"
              onClick={() => {
                window.location.hash = '';
              }}
            >
              <ArrowLeft className="icon" /> All components
            </button>
            <button className="btn" onClick={reload}>
              Reload current policy
            </button>
          </div>
          {loading && <output>Loading component detail…</output>}
          {detail && (
            <ComponentDetail
              key={`${detail.component.id}/${detail.version}/${detail.policyRevision}/${attempt}`}
              detail={detail}
              fail={fail}
              reload={reload}
              saved={() => {
                setNotice('Component access saved and audited.');
                reload();
              }}
            />
          )}
        </>
      )}
      {error && (
        <section className="panel panel-content">
          <h2>Component unavailable</h2>
          <p role="alert">{error}</p>
          <button className="btn" onClick={reload}>
            Try catalogue again
          </button>
        </section>
      )}
    </>
  );
}

function ComponentDetail({
  detail,
  fail,
  reload,
  saved,
}: {
  detail: Detail;
  fail: Tools['fail'];
  reload: () => void;
  saved: () => void;
}) {
  const item = detail.component;
  const [review, setReview] = useState(false);
  const [stale, setStale] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const reviewButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <>
      {stale && !review && (
        <p role="alert">
          Policy changed during review. Reload the current policy before making another change.
        </p>
      )}
      <div className="page-heading">
        <div>
          <span className="eyebrow">COMPONENT CATALOGUE</span>
          <h1 ref={heading} tabIndex={-1}>
            {item.label}
          </h1>
          <p>{item.description}</p>
        </div>
      </div>
      <div className="component-detail-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Component access</h2>
            <AccessPill value={item.access} />
          </div>
          <div className="panel-content">
            <span className="detail-label">CANONICAL COMPONENT ID</span>
            <p className="component-id">{item.id}</p>
            <dl className="component-facts">
              <dt>Category</dt>
              <dd>{item.category}</dd>
              <dt>Code-defined tier</dt>
              <dd>{item.protectedBasic ? 'Basic · protected baseline' : 'Pro'}</dd>
              <dt>Effective access</dt>
              <dd>
                {item.access === 'free'
                  ? 'Free for everyone'
                  : 'Requires the Pro component benefit'}
              </dd>
              <dt>Policy revision</dt>
              <dd>{detail.policyRevision}</dd>
            </dl>
            {item.protectedBasic ? (
              <>
                <p className="note">
                  <LockKeyhole className="icon" /> This confirmed Basic component stays free.
                  Administrators cannot put it behind a membership.
                </p>
                <button className="btn" disabled>
                  Basic access locked
                </button>
              </>
            ) : (
              <>
                <p>
                  Choose whether everyone can use this component, or require the existing Pro
                  component benefit.
                </p>
                <button
                  ref={reviewButton}
                  className="btn primary"
                  disabled={stale}
                  onClick={() => setReview(true)}
                >
                  {item.access === 'free' ? 'Review Pro requirement' : 'Review free access'}
                </button>
              </>
            )}
          </div>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Impact &amp; recovery</h2>
          </div>
          <div className="panel-content">
            <p>
              Saved circuit count: <strong>{detail.impact.savedCircuits ?? 'Unavailable'}</strong>
            </p>
            <p>
              Public content count: <strong>{detail.impact.publicContent ?? 'Unavailable'}</strong>
            </p>
            <p>
              When access becomes Pro, people without the benefit keep their original circuit
              read-only, a raw backup, and an explicit Basic-copy recovery. Fresh authorized access
              restores editing.
            </p>
            <p className="note">
              Electrical models, ratings, standards and automatic safety findings stay code-owned.
            </p>
          </div>
        </section>
      </div>
      <section className="panel mt-large">
        <div className="panel-heading">
          <h2>Component access history</h2>
          <Pill>Latest {detail.history.length} changes</Pill>
        </div>
        <div className="panel-content">
          {!detail.history.length && <p>No recorded access changes.</p>}
          {detail.history.map((event) => (
            <article className="history-entry" key={event.id}>
              <strong>
                {accessLabel(event.before.access)} → {accessLabel(event.after.access)}
              </strong>
              <p>
                Actor: {event.actorId} ·{' '}
                <time dateTime={new Date(event.createdAt).toISOString()}>
                  {new Date(event.createdAt).toLocaleString()}
                </time>
              </p>
              <p>Reason: {event.reason}</p>
              <details>
                <summary>Before and after</summary>
                <pre>
                  {JSON.stringify(
                    { before: event.before, after: event.after, requestId: event.requestId },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </article>
          ))}
        </div>
      </section>
      {review && (
        <ComponentReview
          detail={detail}
          fail={fail}
          saved={saved}
          reload={reload}
          onConflict={() => setStale(true)}
          close={() => {
            setReview(false);
            reviewButton.current?.focus();
          }}
        />
      )}
    </>
  );
}

function ComponentReview({
  detail,
  fail,
  saved,
  reload,
  close,
  onConflict,
}: {
  detail: Detail;
  fail: Tools['fail'];
  saved: () => void;
  reload: () => void;
  close: () => void;
  onConflict: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useRef(true);
  const writing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [reason, setReason] = useState('');
  const item = detail.component;
  const desired = item.access === 'free' ? 'pro' : 'free';
  const dismiss = () => {
    dialog.current?.close();
    close();
  };
  useEffect(() => {
    active.current = true;
    dialog.current?.showModal();
    dialog.current?.querySelector('textarea')?.focus();
    return () => {
      active.current = false;
    };
  }, []);
  async function save() {
    if (!reason.trim() || writing.current || conflict) return;
    writing.current = true;
    setBusy(true);
    setError('');
    try {
      await request(`admin/components/${encodeURIComponent(item.id)}/access`, 'PATCH', {
        access: desired,
        version: detail.version,
        policyRevision: detail.policyRevision,
        reason: reason.trim(),
      });
      if (active.current) {
        dialog.current?.close();
        saved();
      }
    } catch (cause) {
      if (!active.current) return;
      setError(cause instanceof Error ? cause.message : 'Component access change unavailable');
      if (cause instanceof ApiError && cause.status === 409) {
        setConflict(true);
        onConflict();
      } else if (
        !(cause instanceof ApiError) ||
        [401, 403].includes(cause.status) ||
        cause.status >= 500
      )
        fail(cause);
    } finally {
      writing.current = false;
      if (active.current) setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="review-dialog component-review"
      aria-labelledby="component-review-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!writing.current) dismiss();
      }}
    >
      <div className="dialog-heading">
        <h2 id="component-review-title">Review component access</h2>
        <button className="icon-button" aria-label="Close review" disabled={busy} onClick={dismiss}>
          <X />
        </button>
      </div>
      <p>
        Change access to <strong>{item.label}</strong> ({item.id}).
      </p>
      <div className="review-summary">
        <span className="detail-label">ACCESS CHANGE</span>
        <p>
          {accessLabel(item.access)} → <strong>{accessLabel(desired)}</strong>
        </p>
        <p>
          {desired === 'pro'
            ? 'Existing circuits stay intact. Users without the benefit move to read-only recovery; no component is removed.'
            : 'Everyone can use this component after a fresh access check. Membership plans retain the overall Pro component benefit.'}
        </p>
        <p>
          Electrical behavior stays unchanged. Reviewing policy revision {detail.policyRevision}.
        </p>
      </div>
      {error && <p role="alert">{error}</p>}
      {conflict && (
        <p>
          Your change was not applied. Reload the current policy, then review again with a new
          reason.
        </p>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label>
          Reason
          <textarea
            required
            maxLength={1000}
            value={reason}
            disabled={busy || conflict}
            onChange={(event) => setReason(event.currentTarget.value)}
          />
        </label>
        <p className="note">
          The reason and before/after values are retained in the protected catalogue audit.
        </p>
        <div className="actions">
          <button className="btn" type="button" disabled={busy} onClick={dismiss}>
            Back to component
          </button>
          <button className="btn primary" disabled={busy || conflict || !reason.trim()}>
            Confirm access change
          </button>
          {conflict && (
            <button className="btn" type="button" onClick={reload}>
              Reload current policy
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}
