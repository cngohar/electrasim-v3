import { RotateCw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, request } from '../client';
import { AdminShell, SignOutIcon } from './AdminShell';
import { ComponentsView } from './ComponentsView';
import { ProfilesView } from './ProfilesView';
import { PublicationsView } from './PublicationsView';
import { AuditView, OverviewView, StandardsView } from './ReadViews';
import { RolesView } from './RolesView';
import { SettingsView } from './SettingsView';
import { UsersView } from './UsersView';
import type { Access, Change, Tools } from './types';

const titles: Record<string, string> = {
  '': 'Overview',
  users: 'Users',
  permissions: 'Access & roles',
  settings: 'Community settings',
  audit: 'Audit log',
  standards: 'Standards',
  components: 'Components',
  community: 'Community',
};
export function PlatformAdmin() {
  const view = window.location.pathname.split('/').filter(Boolean)[1] ?? '';
  const [access, setAccess] = useState<Access | null>(null);
  const [status, setStatus] = useState<'checking' | 'allowed' | 'login' | 'denied' | 'error'>(
    'checking',
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [change, setChange] = useState<Change | null>(null);
  const [busy, setBusy] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [generation, setGeneration] = useState(0);
  const epoch = useRef(0);
  const accessEpoch = useRef(0);
  const currentAccess = useRef<Access | null>(null);
  const writing = useRef(false);
  const revalidating = useRef(false);
  const fail = useCallback((cause: unknown) => {
    setError(cause instanceof Error ? cause.message : 'Administration unavailable; try again');
    if (
      (cause instanceof ApiError && ([401, 403].includes(cause.status) || cause.status >= 500)) ||
      cause instanceof TypeError
    ) {
      epoch.current++;
      accessEpoch.current++;
      currentAccess.current = null;
      setAccess(null);
      setChange(null);
      setNotice('');
      setBusy(false);
      setStatus(
        cause instanceof ApiError && cause.status === 401
          ? 'login'
          : cause instanceof ApiError && cause.status === 403
            ? 'denied'
            : 'error',
      );
    }
    if (cause instanceof ApiError && cause.status === 409) setConflict(true);
  }, []);
  const refresh = useCallback(
    async (full = true) => {
      const token = ++accessEpoch.current;
      if (full) {
        epoch.current++;
        currentAccess.current = null;
        setAccess(null);
        setChange(null);
        setError('');
        setConflict(false);
        setStatus('checking');
      }
      const lifecycle = epoch.current;
      try {
        const result = await request<Access>('admin/access');
        if (token !== accessEpoch.current || lifecycle !== epoch.current) return;
        const old = currentAccess.current;
        if (
          !old ||
          old.actor.id !== result.actor.id ||
          old.actor.globalRole !== result.actor.globalRole ||
          old.permissions.join() !== result.permissions.join()
        ) {
          setGeneration((v) => v + 1);
          setChange(null);
        }
        currentAccess.current = result;
        setAccess(result);
        setStatus('allowed');
      } catch (cause) {
        if (token === accessEpoch.current && lifecycle === epoch.current) {
          if (full) setStatus('error');
          fail(cause);
        }
      }
    },
    [fail],
  );
  useEffect(() => {
    void refresh();
    return () => {
      epoch.current++;
    };
  }, [refresh]);
  useEffect(() => {
    if (status !== 'allowed') return;
    const recheck = async () => {
      if (revalidating.current || writing.current || document.visibilityState === 'hidden') return;
      revalidating.current = true;
      try {
        await refresh(false);
      } finally {
        revalidating.current = false;
      }
    };
    const timer = window.setInterval(() => {
      void recheck();
    }, 30000);
    window.addEventListener('focus', recheck);
    window.addEventListener('online', recheck);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', recheck);
      window.removeEventListener('online', recheck);
      document.removeEventListener('visibilitychange', recheck);
    };
  }, [status, refresh]);
  async function save(reason: string) {
    if (!change || busy || writing.current || conflict) return;
    const token = epoch.current;
    writing.current = true;
    setBusy(true);
    setError('');
    try {
      await request(change.path, change.method, { ...change.data, reason });
      if (token === epoch.current) {
        setNotice('Change saved and audited.');
        setChange(null);
        await refresh();
      }
    } catch (cause) {
      if (token === epoch.current) fail(cause);
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  const tools: Tools | null = access
    ? {
        access,
        fail,
        conflict,
        review: (value) => {
          setError('');
          setConflict(false);
          setChange(value);
        },
      }
    : null;
  const currentPath = `/admin/${view ? `${view}/` : ''}`;
  const allowedView = !view || access?.navigation.some((nav) => nav.href === currentPath);
  return (
    <AdminShell
      access={status === 'allowed' ? access : null}
      title={titles[view] ?? 'Administration'}
      fail={fail}
      actions={
        status === 'allowed' && access ? (
          <>
            <button
              className="btn small admin-reload"
              aria-label="Reload administration"
              disabled={busy}
              onClick={() => {
                void refresh();
              }}
            >
              <RotateCw className="icon" aria-hidden="true" />
              <span>Reload administration</span>
            </button>
            <button
              className="icon-button"
              aria-label="Sign out"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void request('auth/sign-out', 'POST', {})
                  .then(() => {
                    epoch.current++;
                    accessEpoch.current++;
                    currentAccess.current = null;
                    setAccess(null);
                    setChange(null);
                    setNotice('');
                    setStatus('login');
                  })
                  .catch(fail)
                  .finally(() => setBusy(false));
              }}
            >
              <SignOutIcon />
            </button>
          </>
        ) : undefined
      }
    >
      {error && !change && <p role="alert">{error}</p>}
      {notice && <output>{notice}</output>}
      {conflict && !change && <p>Administration changed. Reload before making another change.</p>}
      <div key={generation}>
        {status === 'checking' && <output>Checking access…</output>}
        {status === 'login' && (
          <section>
            <h2>Sign in</h2>
            <p>Your session is missing or expired.</p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                setBusy(true);
                setError('');
                void request('auth/sign-in/email', 'POST', {
                  email: String(data.get('email')),
                  password: String(data.get('password')),
                })
                  .then(() => refresh())
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
        {status === 'denied' && (
          <section>
            <h2>Access denied</h2>
            <p>Your account does not have access to this administration.</p>
            <button
              onClick={() => {
                void refresh();
              }}
            >
              Check access again
            </button>
          </section>
        )}
        {status === 'error' && (
          <button
            onClick={() => {
              void refresh();
            }}
          >
            Try again
          </button>
        )}
        {status === 'allowed' &&
          tools &&
          (!allowedView ? (
            <section>
              <h2>Access denied</h2>
              <p>Choose an available module from the navigation.</p>
            </section>
          ) : (
            <>
              {!['users', 'permissions', 'standards', 'components', 'community'].includes(view) && (
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">PLATFORM WORKSPACE</span>
                    <h1>
                      {(
                        {
                          '': 'Workspace overview',
                          users: 'People & access',
                          permissions: 'Access & roles',
                          settings: 'Community settings',
                          audit: 'Audit log',
                          standards: 'Standards',
                        } as Record<string, string>
                      )[view] ?? 'Administration'}
                    </h1>
                    <p>
                      {view === ''
                        ? 'An overview of people, access and platform activity.'
                        : view === 'settings'
                          ? 'Set clear defaults for healthy community participation.'
                          : 'Recorded changes, reasons and scoped administration history.'}
                    </p>
                  </div>
                  {view === 'settings' && (
                    <span className="pill blue">
                      {tools.access.permissions.includes('community.settings.write')
                        ? 'Editable by admins'
                        : 'Read only'}
                    </span>
                  )}
                </div>
              )}
              {view === '' && <OverviewView {...tools} />}
              {view === 'users' && <UsersView {...tools} />}
              {view === 'permissions' && <RolesView {...tools} />}
              {view === 'settings' && <SettingsView {...tools} />}
              {view === 'audit' && <AuditView {...tools} />}
              {view === 'standards' && <StandardsView {...tools} />}
              {view === 'components' && <ComponentsView {...tools} />}
              {view === 'community' && (
                <>
                  <nav className="actions" aria-label="Community subjects">
                    <a className="btn" href="/admin/community/">
                      Profiles & reports
                    </a>
                    {(tools.access.permissions.includes('community.publications.read') ||
                      tools.access.permissions.includes('community.reports.read')) && (
                      <a className="btn" href="/admin/community/?section=publications">
                        Publications & reports
                      </a>
                    )}
                  </nav>
                  {new URLSearchParams(location.search).get('section') === 'publications' ? (
                    <PublicationsView key={tools.access.version} {...tools} />
                  ) : (
                    <ProfilesView key={tools.access.version} {...tools} />
                  )}
                </>
              )}
            </>
          ))}
      </div>
      {change && (
        <ReviewDialog
          change={change}
          busy={busy}
          conflict={conflict}
          error={error}
          save={save}
          close={() => {
            if (!busy) setChange(null);
          }}
          reload={() => {
            void refresh();
          }}
        />
      )}
    </AdminShell>
  );
}
function ReviewDialog({
  change,
  busy,
  conflict,
  error,
  save,
  close,
  reload,
}: {
  change: Change;
  busy: boolean;
  conflict: boolean;
  error: string;
  save: (reason: string) => Promise<void>;
  close: () => void;
  reload: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    ref.current?.querySelector<HTMLTextAreaElement>('textarea[name="reason"]')?.focus();
  }, []);
  return (
    <dialog
      ref={ref}
      className="review-dialog"
      aria-labelledby="review-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) close();
      }}
    >
      <div className="dialog-heading">
        <h2 id="review-title">Review administrative change</h2>
        <button className="icon-button" aria-label="Close review" disabled={busy} onClick={close}>
          <X />
        </button>
      </div>
      <div className="review-summary">
        <ul>
          {change.summary.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      {error && <p role="alert">{error}</p>}
      {conflict && <p>Reload administration and review the current values before trying again.</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(String(new FormData(event.currentTarget).get('reason')));
        }}
      >
        <label>
          Reason
          <textarea
            name="reason"
            required
            minLength={change.path.startsWith('admin/community/') ? 8 : undefined}
            maxLength={1000}
          />
        </label>
        <p className="note">
          Reasons are retained in the audit. Community restriction reasons are shown to the affected
          user.
        </p>
        {change.data.globalRole === 'super_admin' && (
          <label className="check">
            <input type="checkbox" required />I understand this grants super-admin authority.
          </label>
        )}
        <div className="actions">
          <button className="btn" type="button" disabled={busy} onClick={close}>
            Back to edit
          </button>
          <button className="btn primary" disabled={busy || conflict}>
            Confirm change
          </button>
          {conflict && (
            <button type="button" onClick={reload}>
              Reload administration
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}
