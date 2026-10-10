import { useCallback, useEffect, useRef, useState } from 'react';
import { Editor } from './Editor';
import {
  ApiError,
  type Page,
  type Row,
  type View,
  grantState,
  identifier,
  label,
  request,
} from './client';
const views: Record<View, string> = {
  plans: 'Plans',
  features: 'Benefits',
  memberships: 'Members',
  audit: 'Audit',
};
export function Admin() {
  const [access, setAccess] = useState<'checking' | 'allowed' | 'login' | 'denied' | 'error'>(
    'checking',
  );
  const [view, setView] = useState<View>('plans');
  const [page, setPage] = useState<Page>({ items: [], total: 0 });
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState('');
  const [editor, setEditor] = useState<{ row: Row | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const [revision, setRevision] = useState(0);
  const epoch = useRef(0);
  const fail = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : 'Service unavailable. Try again.');
    if (cause instanceof ApiError && [401, 403].includes(cause.status)) {
      epoch.current++;
      setBusy(false);
      setPage({ items: [], total: 0 });
      setEditor(null);
      setNotice('');
      setAccess(cause.status === 401 ? 'login' : 'denied');
    }
    if (cause instanceof ApiError && cause.status === 409) setConflict(true);
  }, []);
  const check = useCallback(async () => {
    const token = ++epoch.current;
    setAccess('checking');
    setBusy(false);
    setPage({ items: [], total: 0 });
    setEditor(null);
    setError('');
    setNotice('');
    try {
      await request('admin/ping');
      if (token === epoch.current) setAccess('allowed');
    } catch (cause) {
      if (token === epoch.current) {
        setAccess('error');
        fail(cause);
      }
    }
  }, [fail]);
  useEffect(() => {
    void check();
    const focus = () => {
      void check();
    };
    window.addEventListener('focus', focus);
    window.addEventListener('online', focus);
    return () => {
      epoch.current++;
      window.removeEventListener('focus', focus);
      window.removeEventListener('online', focus);
    };
  }, [check]);
  useEffect(() => {
    if (access !== 'allowed') return;
    void revision;
    let current = true;
    const token = ++epoch.current;
    setBusy(true);
    setError('');
    setPage({ items: [], total: 0 });
    const query =
      view === 'memberships'
        ? `&userId=${encodeURIComponent(filter)}`
        : view === 'audit'
          ? `&targetId=${encodeURIComponent(filter)}`
          : '';
    request<Page>(`admin/pro/${view}?limit=20&offset=${offset}${filter ? query : ''}`)
      .then((result) => {
        if (current && token === epoch.current) setPage(result);
      })
      .catch((cause) => {
        if (current && token === epoch.current) fail(cause);
      })
      .finally(() => {
        if (current && token === epoch.current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [access, view, offset, filter, revision, fail]);
  async function open(row: Row) {
    setNotice('');
    const token = epoch.current;
    setBusy(true);
    setError('');
    setConflict(false);
    try {
      const detail = await request<Row>(`admin/pro/${view}/${encodeURIComponent(identifier(row))}`);
      if (token === epoch.current) setEditor({ row: detail });
    } catch (cause) {
      if (token === epoch.current) fail(cause);
    } finally {
      if (token === epoch.current) setBusy(false);
    }
  }
  async function save(method: string, data: Row) {
    if (busy || conflict) return;
    const token = epoch.current;
    setBusy(true);
    setError('');
    try {
      await request(
        `admin/pro/${view}${editor?.row ? `/${encodeURIComponent(identifier(editor.row))}` : ''}`,
        method,
        data,
      );
      if (token === epoch.current) {
        setEditor(null);
        setNotice('Change saved and audited.');
        setRevision((value) => value + 1);
      }
    } catch (cause) {
      if (token === epoch.current) fail(cause);
    } finally {
      if (token === epoch.current) setBusy(false);
    }
  }
  return (
    <main>
      <header>
        <a href="/app/">ElectraSim</a>
        <h1>Membership administration</h1>
        <p>Manual plans and grants · Super admins only</p>
      </header>
      {error && <p role="alert">{error}</p>}
      {notice && <output>{notice}</output>}
      {access === 'checking' && <output>Checking access…</output>}
      {access === 'login' && (
        <section>
          <h2>Sign in</h2>
          <p>Your session is missing or expired.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              setBusy(true);
              setError('');
              void request('auth/sign-in/email', 'POST', {
                email: String(form.get('email')),
                password: String(form.get('password')),
              })
                .then(check)
                .catch(fail)
                .finally(() => setBusy(false));
            }}
          >
            <label>
              Email
              <input name="email" type="email" autoComplete="username" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            <button disabled={busy}>Sign in</button>
          </form>
        </section>
      )}
      {access === 'denied' && (
        <section>
          <h2>Access denied</h2>
          <p>
            Only a super admin can manage memberships. Paid membership, staff and organization roles
            do not grant this access.
          </p>
          <button
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void request('auth/sign-out', 'POST', {})
                .then(check)
                .catch(fail)
                .finally(() => setBusy(false));
            }}
          >
            Sign out
          </button>
        </section>
      )}
      {access !== 'checking' && access !== 'allowed' && (
        <button onClick={() => void check()}>Check access again</button>
      )}
      {access === 'allowed' && (
        <>
          <div className="actions">
            <nav aria-label="Membership sections">
              {Object.entries(views).map(([key, title]) => (
                <button
                  key={key}
                  aria-current={view === key ? 'page' : undefined}
                  disabled={busy}
                  onClick={() => {
                    setView(key as View);
                    setOffset(0);
                    setFilter('');
                    setEditor(null);
                    setError('');
                    setNotice('');
                    setConflict(false);
                  }}
                >
                  {title}
                </button>
              ))}
            </nav>
            <button
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void request('auth/sign-out', 'POST', {})
                  .then(check)
                  .catch(fail)
                  .finally(() => setBusy(false));
              }}
            >
              Sign out
            </button>
          </div>
          {editor && view !== 'audit' ? (
            <>
              {conflict && (
                <p role="alert">
                  This record changed elsewhere. Reload the current record and review your changes
                  again.{' '}
                  <button
                    onClick={() => {
                      setEditor(null);
                      void open(editor.row!);
                    }}
                  >
                    Reload record
                  </button>
                </p>
              )}
              <Editor
                key={`${view}:${editor.row?.version ?? 'new'}`}
                resource={view}
                row={editor.row}
                busy={busy || conflict}
                fail={fail}
                save={save}
                cancel={() => {
                  setEditor(null);
                  setConflict(false);
                  setError('');
                }}
              />
            </>
          ) : (
            <section>
              <h2>{views[view]}</h2>
              <div className="actions">
                {view !== 'audit' && (
                  <button
                    disabled={busy}
                    onClick={() => {
                      setNotice('');
                      setEditor({ row: null });
                      setConflict(false);
                      setError('');
                    }}
                  >
                    Create {view === 'plans' ? 'plan' : view === 'features' ? 'benefit' : 'grant'}
                  </button>
                )}
                <button disabled={busy} onClick={() => setRevision((value) => value + 1)}>
                  Refresh
                </button>
              </div>
              {(view === 'memberships' || view === 'audit') && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setFilter(String(new FormData(event.currentTarget).get('filter') ?? ''));
                    setOffset(0);
                  }}
                >
                  <label>
                    {view === 'audit' ? 'Filter by target ID' : 'Filter by member ID'}
                    <input name="filter" />
                  </label>
                  <button disabled={busy}>Apply filter</button>
                </form>
              )}
              {busy ? (
                <output>Loading…</output>
              ) : !page.items.length ? (
                <p>No records found.</p>
              ) : (
                <ul className="records">
                  {page.items.map((row) => (
                    <li key={identifier(row)}>
                      {view === 'audit' ? (
                        <>
                          <strong>{String(row.action)}</strong>
                          <p>
                            {String(row.reason)} ·{' '}
                            {new Date(Number(row.createdAt)).toLocaleString()} · Actor{' '}
                            {String(row.actorId)} · Target {String(row.targetId)}
                          </p>
                          <details>
                            <summary>Before and after</summary>
                            <pre>
                              {JSON.stringify(
                                { before: row.before, after: row.after, requestId: row.requestId },
                                null,
                                2,
                              )}
                            </pre>
                          </details>
                        </>
                      ) : (
                        <>
                          <strong>{label(row)}</strong>
                          <p>
                            {view === 'memberships'
                              ? `${grantState(row)} · Plan ${row.planId} · ${new Date(Number(row.startsAt)).toLocaleString()} → ${row.noExpiry ? 'No expiry' : new Date(Number(row.endsAt)).toLocaleString()}`
                              : view === 'features'
                                ? `${row.enabled ? 'Enabled' : 'Disabled'}${row.archivedAt ? ' · Archived' : ''}`
                                : String(row.status)}
                          </p>
                          <small>{identifier(row)}</small>
                          <button onClick={() => void open(row)}>Edit {label(row)}</button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <div className="actions">
                <button disabled={busy || offset === 0} onClick={() => setOffset(offset - 20)}>
                  Previous page
                </button>
                <span>
                  {page.total
                    ? `${offset + 1}–${Math.min(offset + 20, page.total)} of ${page.total}`
                    : '0 records'}
                </span>
                <button
                  disabled={busy || offset + 20 >= page.total}
                  onClick={() => setOffset(offset + 20)}
                >
                  Next page
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
