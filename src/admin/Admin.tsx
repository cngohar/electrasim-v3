import { LogOut, X } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
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
import { AdminShell, Pill, personInitials } from './platform/AdminShell';
import type { Access } from './platform/types';
const views: Record<View, string> = {
  plans: 'Plans',
  features: 'Benefits',
  memberships: 'Member grants',
  audit: 'Audit',
};
export function Admin() {
  const [access, setAccess] = useState<'checking' | 'allowed' | 'login' | 'denied' | 'error'>(
    'checking',
  );
  const [platformAccess, setPlatformAccess] = useState<Access | null>(null);
  const deepLinkUsed = useRef(false);
  const tabButtons = useRef<Array<HTMLButtonElement | null>>([]);
  const [view, setView] = useState<View>('plans');
  const [page, setPage] = useState<Page>({ items: [], total: 0 });
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState('');
  const [editor, setEditor] = useState<{ row: Row | null; userId?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [conflict, setConflict] = useState(false);
  const [revision, setRevision] = useState(0);
  const epoch = useRef(0);
  const accessEpoch = useRef(0);
  const revalidating = useRef(false);
  const fail = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : 'Service unavailable. Try again.');
    if (cause instanceof ApiError && [401, 403].includes(cause.status)) {
      accessEpoch.current++;
      epoch.current++;
      setBusy(false);
      setPage({ items: [], total: 0 });
      setEditor(null);
      setNotice('');
      setPlatformAccess(null);
      setAccess(cause.status === 401 ? 'login' : 'denied');
    }
    if (cause instanceof ApiError && cause.status === 409) setConflict(true);
  }, []);
  const check = useCallback(async () => {
    accessEpoch.current++;
    const token = ++epoch.current;
    setAccess('checking');
    setBusy(false);
    setPage({ items: [], total: 0 });
    setEditor(null);
    setError('');
    setNotice('');
    try {
      await request('admin/ping');
      const shell = await request<Access>('admin/access');
      if (token === epoch.current) {
        setPlatformAccess(shell);
        setAccess('allowed');
      }
    } catch (cause) {
      if (token === epoch.current) {
        setAccess('error');
        fail(cause);
      }
    }
  }, [fail]);
  useEffect(() => {
    void check();
    return () => {
      epoch.current++;
      accessEpoch.current++;
    };
  }, [check]);
  useEffect(() => {
    const focus = async () => {
      // Revalidate private access without unmounting forms or resetting lists.
      // Signed-out forms contain no private data, and duplicate events coalesce.
      if (access !== 'allowed' || revalidating.current) return;
      const token = ++accessEpoch.current;
      revalidating.current = true;
      try {
        await request('admin/ping');
      } catch (cause) {
        if (token === accessEpoch.current) fail(cause);
      } finally {
        revalidating.current = false;
      }
    };
    window.addEventListener('focus', focus);
    window.addEventListener('online', focus);
    return () => {
      window.removeEventListener('focus', focus);
      window.removeEventListener('online', focus);
    };
  }, [access, fail]);
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
  useEffect(() => {
    if (access !== 'allowed' || deepLinkUsed.current) return;
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('assignUser');
    const grant = params.get('grant');
    if (!userId && !grant) return;
    deepLinkUsed.current = true;
    setView('memberships');
    if (userId) setEditor({ row: null, userId });
    let active = true;
    if (grant)
      void request<Row>(`admin/pro/memberships/${encodeURIComponent(grant)}`)
        .then((row) => {
          if (active) setEditor({ row });
        })
        .catch((error) => {
          if (active) fail(error);
        });
    return () => {
      active = false;
    };
  }, [access, fail]);
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
    <AdminShell
      access={access === 'allowed' ? platformAccess : null}
      title="Memberships"
      fail={fail}
      actions={
        access === 'allowed' ? (
          <button
            className="icon-button"
            aria-label="Sign out"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void request('auth/sign-out', 'POST', {})
                .then(check)
                .catch(fail)
                .finally(() => setBusy(false));
            }}
          >
            <LogOut />
          </button>
        ) : undefined
      }
    >
      {editor && view === 'plans' && (
        <button
          className="back-link"
          onClick={() => {
            setEditor(null);
            setConflict(false);
            setError('');
          }}
        >
          ← Memberships / Plans
        </button>
      )}
      <div className="page-heading">
        <div>
          <span className="eyebrow">PLATFORM WORKSPACE</span>
          <h1>
            {editor && view === 'plans'
              ? editor.row
                ? 'Manage membership plan'
                : 'Create membership plan'
              : 'Memberships'}
          </h1>
          <p>
            {editor && view === 'plans'
              ? 'Define the access a membership provides. Review your changes before saving.'
              : 'Create reusable access plans and assign them to members. Super admins only.'}
          </p>
        </div>
        {access === 'allowed' && !editor && ['plans', 'memberships'].includes(view) && (
          <div className="heading-actions membership-page-actions">
            <button
              className="btn"
              disabled={busy}
              onClick={() => {
                setView('memberships');
                setOffset(0);
                setFilter('');
                setNotice('');
                setEditor({ row: null });
                setConflict(false);
                setError('');
              }}
            >
              Assign membership
            </button>
            <button
              className="btn primary"
              disabled={busy}
              onClick={() => {
                setView('plans');
                setOffset(0);
                setFilter('');
                setNotice('');
                setEditor({ row: null });
                setConflict(false);
                setError('');
              }}
            >
              Create membership plan
            </button>
          </div>
        )}
      </div>
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
          <div className="membership-nav-row" hidden={!!editor && view !== 'memberships'}>
            <div
              className="section-tabs membership-tabs"
              role="tablist"
              aria-label="Membership sections"
            >
              {Object.entries(views).map(([key, title], index) => (
                <button
                  key={key}
                  className={`section-tab${view === key ? ' active' : ''}`}
                  role="tab"
                  aria-selected={view === key}
                  aria-controls="membership-section-panel"
                  tabIndex={view === key ? 0 : -1}
                  ref={(element) => {
                    tabButtons.current[index] = element;
                  }}
                  onKeyDown={(event) => {
                    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                    event.preventDefault();
                    const next =
                      event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? Object.keys(views).length - 1
                          : (index +
                              (event.key === 'ArrowRight' ? 1 : Object.keys(views).length - 1)) %
                            Object.keys(views).length;
                    tabButtons.current[next]?.click();
                    tabButtons.current[next]?.focus();
                  }}
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
            </div>
          </div>
          <div id="membership-section-panel" role="tabpanel" aria-label={views[view]}>
            {editor && view !== 'audit' ? (
              <>
                {view === 'memberships' ? (
                  <MembershipEditorDialog
                    close={() => {
                      if (!busy) {
                        setEditor(null);
                        setConflict(false);
                        setError('');
                      }
                    }}
                  >
                    {' '}
                    <Editor
                      key={`${view}:${editor.row?.version ?? 'new'}`}
                      resource={view}
                      userId={editor.userId}
                      row={editor.row}
                      busy={busy || conflict}
                      conflict={conflict}
                      error={error}
                      reload={() => {
                        setEditor(null);
                        void open(editor.row!);
                      }}
                      fail={fail}
                      save={save}
                      cancel={() => {
                        setEditor(null);
                        setConflict(false);
                        setError('');
                      }}
                    />
                  </MembershipEditorDialog>
                ) : (
                  <Editor
                    key={`${view}:${editor.row?.version ?? 'new'}`}
                    resource={view}
                    userId={editor.userId}
                    row={editor.row}
                    busy={busy || conflict}
                    conflict={conflict}
                    error={error}
                    reload={() => {
                      setEditor(null);
                      void open(editor.row!);
                    }}
                    fail={fail}
                    save={save}
                    cancel={() => {
                      setEditor(null);
                      setConflict(false);
                      setError('');
                    }}
                  />
                )}
              </>
            ) : (
              <>
                <div className="membership-summary">
                  <span>
                    <strong>{page.total}</strong> {views[view].toLowerCase()}
                  </span>
                  <span>
                    <strong>Super admin only</strong>
                  </span>
                  {view !== 'audit' && view !== 'plans' && view !== 'memberships' && (
                    <button
                      className="btn"
                      disabled={busy}
                      onClick={() => {
                        setNotice('');
                        setEditor({ row: null });
                        setConflict(false);
                        setError('');
                      }}
                    >
                      Create benefit
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
                  <section className="panel panel-content empty-state">
                    <h2>No {views[view].toLowerCase()} found</h2>
                    <p>
                      {view === 'plans'
                        ? 'Create a plan to define reusable simulator access.'
                        : view === 'memberships'
                          ? 'Assign an active plan to add access for a member.'
                          : 'Records will appear here when available.'}
                    </p>
                  </section>
                ) : view === 'plans' ? (
                  <div className="plan-cards">
                    {page.items.map((row) => (
                      <article
                        className={`panel plan-card${row.status === 'active' ? ' featured' : ''}`}
                        key={identifier(row)}
                      >
                        <div className="inline-actions spread">
                          <span className="plan-symbol">ES</span>
                          <Pill
                            tone={
                              row.status === 'active'
                                ? 'green'
                                : row.status === 'archived'
                                  ? 'rose'
                                  : 'amber'
                            }
                          >
                            {String(row.status ?? 'Draft')}
                          </Pill>
                        </div>
                        <h2>{label(row)}</h2>
                        <p>{String(row.description ?? 'No description provided.')}</p>
                        <small className="plan-code">{String(row.slug ?? identifier(row))}</small>
                        <strong className="plan-duration">
                          {row.noExpiry ? 'No expiry' : `${String(row.durationDays ?? 0)} days`}
                          <small>access per assignment</small>
                        </strong>
                        <ul className="permission-summary">
                          {((row.benefits ?? []) as Row[]).map((benefit) => (
                            <li key={String(benefit.key)}>
                              {benefit.enabled ? '✓' : '—'} {label(benefit)}
                              {!benefit.enabled ? ' (disabled)' : ''}
                            </li>
                          ))}
                        </ul>
                        <div className="plan-footer">
                          <span>
                            {String(row.activeMemberCount ?? 0)} active{' '}
                            {Number(row.activeMemberCount) === 1 ? 'member' : 'members'}
                          </span>
                          <button className="text-button" onClick={() => void open(row)}>
                            Manage plan →
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : view === 'memberships' ? (
                  <section className="panel table-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>Member grants</h2>
                        <p>Who has access, for how long, and who assigned it.</p>
                      </div>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Member</th>
                            <th>Plan</th>
                            <th>Status</th>
                            <th>Starts</th>
                            <th>Ends</th>
                            <th>Assigned by</th>
                            <th>Grant ID</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {page.items.map((row) => (
                            <tr key={identifier(row)}>
                              <td>
                                <a
                                  className="user-link"
                                  href={`/admin/users/#${encodeURIComponent(String(row.userId))}`}
                                >
                                  <span className="avatar mint">
                                    {personInitials(String(row.userName ?? row.userId))}
                                  </span>
                                  <strong>{String(row.userName ?? row.userId)}</strong>
                                </a>
                                <small className="table-subtext">{String(row.userId)}</small>
                              </td>
                              <td>{String(row.planName ?? row.planId)}</td>
                              <td>
                                <Pill tone={grantState(row) === 'active' ? 'green' : 'amber'}>
                                  {grantState(row)}
                                </Pill>
                              </td>
                              <td>{new Date(Number(row.startsAt)).toLocaleString()}</td>
                              <td>
                                {row.noExpiry
                                  ? 'No expiry'
                                  : row.endsAt
                                    ? new Date(Number(row.endsAt)).toLocaleString()
                                    : '—'}
                              </td>
                              <td>{String(row.createdByName ?? row.createdBy)}</td>
                              <td>
                                <small>{identifier(row)}</small>
                              </td>
                              <td>
                                <button className="text-button" onClick={() => void open(row)}>
                                  Manage grant
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ) : view === 'features' ? (
                  <div className="plan-cards">
                    {page.items.map((row) => (
                      <article className="panel plan-card" key={identifier(row)}>
                        <div className="inline-actions spread">
                          <span className="eyebrow">BENEFIT</span>
                          <Pill tone={row.enabled && !row.archivedAt ? 'green' : 'amber'}>
                            {row.enabled && !row.archivedAt
                              ? 'Enabled'
                              : row.archivedAt
                                ? 'Archived'
                                : 'Disabled'}
                          </Pill>
                        </div>
                        <h2>{label(row)}</h2>
                        <p>{String((row.description as Row | undefined)?.en ?? '')}</p>
                        <div className="plan-footer">
                          <span>{identifier(row)}</span>
                          <button className="text-button" onClick={() => void open(row)}>
                            Manage benefit →
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <section className="panel table-panel membership-audit">
                    <div className="panel-heading">
                      <div>
                        <h2>Membership audit</h2>
                        <p>Recorded reasons and changes to protected membership records.</p>
                      </div>
                    </div>
                    <ul className={`records membership-${view}`}>
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
                                    {
                                      before: row.before,
                                      after: row.after,
                                      requestId: row.requestId,
                                    },
                                    null,
                                    2,
                                  )}
                                </pre>
                              </details>
                            </>
                          ) : (
                            <>
                              <strong>{label(row)}</strong>
                              {view === 'plans' && (
                                <>
                                  <p>{String(row.description ?? '')}</p>
                                  <p className="plan-duration">
                                    {row.noExpiry ? 'No expiry' : `${row.durationDays} days`}
                                    <small>per assignment</small>
                                  </p>
                                </>
                              )}
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
                  </section>
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
              </>
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}

function MembershipEditorDialog({ children, close }: { children: ReactNode; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="membership-editor-dialog"
      aria-label="Membership assignment"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="dialog-heading">
        <span className="eyebrow">MEMBER ACCESS</span>
        <button className="icon-button" aria-label="Close assignment" onClick={close}>
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
