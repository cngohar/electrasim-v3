import { ChevronRight, PanelRightOpen, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { dateValue, grantState } from '../client';
import { Pill, personInitials, roleName } from './AdminShell';
import { MembershipHistory } from './MembershipHistory';
import { Pagination, actionLabel } from './ReadViews';
import { useAdminResource } from './resource';
import type { UserDetail as Detail, Person, Policy, RolePage, Tools } from './types';

export function UsersView(tools: Tools) {
  const searchField = useRef<HTMLInputElement>(null);
  const [q, setQuery] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState('all');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(() => userHash());
  const [quick, setQuick] = useState<string | null>(null);
  useEffect(() => {
    const update = () => {
      setSelected(userHash());
      setQuick(null);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const { data, loading } = useAdminResource<{ version: number; items: Person[]; total: number }>(
    selected
      ? null
      : `admin/users?q=${encodeURIComponent(q)}&role=${role}&status=${status}&limit=20&offset=${offset}`,
    tools.fail,
  );
  const { data: detail, loading: detailLoading } = useAdminResource<Detail>(
    selected ? `admin/users/${encodeURIComponent(selected)}` : null,
    tools.fail,
  );
  const canRoles = tools.access.permissions.includes('platform.roles.manage');
  const { data: roles } = useAdminResource<RolePage>(
    selected && canRoles ? 'admin/roles' : null,
    tools.fail,
  );
  const { data: policy } = useAdminResource<Policy>(
    selected && canRoles ? 'admin/permissions' : null,
    tools.fail,
  );
  if (selected)
    return (
      <>
        <div className="actions">
          <a className="btn" href="/admin/users/">
            ← All users
          </a>
        </div>
        {detailLoading && <output>Loading account…</output>}
        {detail && (
          <UserDetail
            key={`${detail.user.id}/${detail.version}`}
            detail={detail}
            roles={roles}
            policy={policy}
            openQuick={() => setQuick(selected)}
            {...tools}
          />
        )}
        {quick && <QuickView id={quick} close={() => setQuick(null)} {...tools} />}
      </>
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PLATFORM WORKSPACE</span>
          <h1>People &amp; access</h1>
          <p>Everything you need to understand an account before making a change.</p>
        </div>
        <button className="btn primary" onClick={() => searchField.current?.focus()}>
          <Search className="icon" />
          Find an account
        </button>
      </div>
      <section className="panel table-panel">
        <div className="panel-heading">
          <div>
            <h2>User directory</h2>
            <p>Find a person, inspect access and review account actions.</p>
          </div>
          {data && <Pill tone="blue">{data.total} users</Pill>}
        </div>
        <form
          className="directory-tools"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            setQuery(String(form.get('q')));
            setRole(String(form.get('role')));
            setStatus(String(form.get('status')));
            setOffset(0);
          }}
        >
          <label>
            <span className="sr-only">Search ID, name or email prefix</span>
            <input
              name="q"
              ref={searchField}
              type="search"
              defaultValue={q}
              maxLength={200}
              placeholder="Name, email or user ID…"
            />
          </label>
          <label>
            System role
            <select name="role" defaultValue={role}>
              {['all', 'individual', 'moderator', 'admin', 'super_admin'].map((value) => (
                <option key={value} value={value}>
                  {value === 'all' ? 'All roles' : roleName(value)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Account status
            <select name="status" defaultValue={status}>
              {['all', 'active', 'restricted', 'suspended'].map((value) => (
                <option key={value} value={value}>
                  {value === 'all' ? 'All statuses' : value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <button>Search users</button>
        </form>
        {loading && <output>Loading users…</output>}
        {data && (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>System role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <a className="user-link" href={`#${encodeURIComponent(user.id)}`}>
                          <span className="avatar mint">{personInitials(user.name)}</span>
                          <span>
                            <strong>{user.name}</strong>
                            <small>{user.email}</small>
                          </span>
                        </a>
                      </td>
                      <td>
                        <Pill tone={user.globalRole === 'super_admin' ? 'purple' : 'blue'}>
                          {roleName(user.globalRole)}
                        </Pill>
                      </td>
                      <td>
                        <Pill tone={user.suspended ? 'rose' : user.restricted ? 'amber' : 'green'}>
                          {user.suspended ? 'Suspended' : user.restricted ? 'Restricted' : 'Active'}
                        </Pill>
                      </td>
                      <td className="muted">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        <div className="inline-actions">
                          <button
                            className="icon-button"
                            aria-label={`View ${user.name}`}
                            onClick={() => {
                              window.location.hash = encodeURIComponent(user.id);
                            }}
                          >
                            <ChevronRight className="icon" />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Quick view for ${user.name}`}
                            onClick={() => setQuick(user.id)}
                          >
                            <PanelRightOpen className="icon" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.items.length === 0 && <div className="empty">No matching users.</div>}
            </div>
            <Pagination offset={offset} total={data.total} change={setOffset} />
          </>
        )}
        {quick && <QuickView id={quick} close={() => setQuick(null)} {...tools} />}
      </section>
    </>
  );
}
function userHash() {
  try {
    return decodeURIComponent(window.location.hash.slice(1)) || null;
  } catch {
    return null;
  }
}
function QuickView({ id, close, ...tools }: Tools & { id: string; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState('overview');
  const { data, loading } = useAdminResource<Detail>(
    `admin/users/${encodeURIComponent(id)}`,
    tools.fail,
  );
  const canRoles = tools.access.permissions.includes('platform.roles.manage');
  const { data: roles } = useAdminResource<RolePage>(canRoles ? 'admin/roles' : null, tools.fail);
  const { data: policy } = useAdminResource<Policy>(
    canRoles ? 'admin/permissions' : null,
    tools.fail,
  );
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="account-drawer"
      aria-labelledby="quick-view-name"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="drawer-top">
        <span>USER DIRECTORY / ACCOUNT</span>
        <button className="icon-button" aria-label="Close account" onClick={close}>
          <X />
        </button>
      </div>
      <div className="drawer-identity">
        <span className="avatar mint large">{personInitials(data?.user.name ?? 'Account')}</span>
        <div>
          <h2 id="quick-view-name">{data?.user.name ?? 'Account quick view'}</h2>
          <p>{data?.user.email}</p>
        </div>
      </div>
      <div className="drawer-profile-link">
        <a className="btn primary" href={`/admin/users/#${encodeURIComponent(id)}`} onClick={close}>
          Open full profile <span aria-hidden="true">→</span>
        </a>
      </div>
      <AccountTabs
        value={tab}
        change={setTab}
        prefix="drawer"
        label="Account sections"
        items={[
          ['overview', 'Account overview'],
          ['access', 'Access & roles'],
          ['activity', 'Activity'],
        ]}
        drawer
      />
      <div
        className="drawer-body"
        role="tabpanel"
        id="drawer-panel"
        aria-labelledby={`drawer-tab-${tab}`}
      >
        {loading && <output>Loading account…</output>}
        {data && tab === 'overview' && (
          <>
            <AccountFacts detail={data} compact />
            <MembershipSummary userId={id} {...tools} />
            <AccountControls detail={data} {...tools} />
          </>
        )}
        {data && tab === 'access' && (
          <StaffAccess detail={data} roles={roles} policy={policy} {...tools} />
        )}
        {data && tab === 'activity' && <AccountHistory detail={data} {...tools} />}
      </div>
    </dialog>
  );
}
function AccountTabs({
  value,
  change,
  items,
  prefix,
  label,
  drawer = false,
}: {
  value: string;
  change: (value: string) => void;
  items: readonly (readonly [string, string])[];
  prefix: string;
  label: string;
  drawer?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  return (
    <div
      className={drawer ? 'drawer-tabs' : 'section-tabs profile-tabs'}
      role="tablist"
      aria-label={label}
    >
      {items.map(([id, text], index) => (
        <button
          key={id}
          ref={(element) => {
            refs.current[index] = element;
          }}
          className={drawer ? 'drawer-tab' : `section-tab${value === id ? ' active' : ''}`}
          role="tab"
          aria-selected={value === id}
          aria-controls={`${prefix}-panel`}
          id={`${prefix}-tab-${id}`}
          tabIndex={value === id ? 0 : -1}
          onClick={() => change(id)}
          onKeyDown={(event) => {
            if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? items.length - 1
                  : (index + (event.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length;
            change(items[next][0]);
            refs.current[next]?.focus();
          }}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
function AccountFacts({ detail, compact = false }: { detail: Detail; compact?: boolean }) {
  const now = Date.now();
  const suspended =
    detail.controls.suspended && (detail.controls.endsAt === null || detail.controls.endsAt > now);
  const facts = compact
    ? [
        ['Account state', suspended ? 'Suspended' : 'Active'],
        ['System role', roleName(detail.user.globalRole)],
        ['Joined', new Date(detail.user.createdAt).toLocaleDateString()],
        ['Account ID', detail.user.id],
      ]
    : [
        ['User ID', detail.user.id],
        ['Email verification', detail.user.emailVerified ? 'Verified' : 'Not verified'],
        ['Joined', new Date(detail.user.createdAt).toLocaleDateString()],
        ['Last sign-in', 'Unavailable'],
        ['System role', roleName(detail.user.globalRole)],
        [
          'Custom roles',
          detail.roles.map((r) => `${r.name}${r.archived ? ' (archived)' : ''}`).join(', ') ||
            'None',
        ],
      ];
  return (
    <dl className={compact ? 'detail-grid account-facts' : 'profile-facts'}>
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
function MembershipSummary({
  userId,
  history,
  ...tools
}: Tools & { userId: string; history?: () => void }) {
  const canRead = tools.access.permissions.includes('memberships.manage');
  const { data, loading } = useAdminResource<{ items: import('../client').Row[]; total: number }>(
    canRead ? `admin/pro/memberships?userId=${encodeURIComponent(userId)}&limit=1&offset=0` : null,
    tools.fail,
  );
  return (
    <section className="detail-section">
      <h3>Membership overview</h3>
      {!canRead ? (
        <p>Membership administration is reserved for super admins.</p>
      ) : (
        <>
          <div className="detail-box">
            {loading && <output>Loading membership overview…</output>}
            {data && (
              <>
                <div className="row">
                  <strong>
                    {data.total
                      ? `${data.total} recorded ${data.total === 1 ? 'grant' : 'grants'}`
                      : 'Basic access'}
                  </strong>
                  <Pill tone={data.total ? 'blue' : ''}>
                    {data.total ? 'Manual membership' : 'Default access'}
                  </Pill>
                </div>
                {data.items.map((grant) => (
                  <p key={String(grant.id)}>
                    {String(grant.planName ?? grant.planId)} · {grantState(grant)} ·{' '}
                    {grant.noExpiry
                      ? 'No expiry'
                      : `Ends ${new Date(Number(grant.endsAt)).toLocaleDateString()}`}
                  </p>
                ))}
                <p>
                  {data.total
                    ? 'Latest grant shown. Review the full history for all grants and their current states.'
                    : 'No membership grants. Basic access is the default.'}
                </p>
              </>
            )}
          </div>
          {history ? (
            <button className="text-button" onClick={history}>
              Review memberships →
            </button>
          ) : (
            <a
              className="text-button"
              href={`/admin/pro/?assignUser=${encodeURIComponent(userId)}`}
            >
              Assign membership →
            </a>
          )}
        </>
      )}
    </section>
  );
}
function StaffAccess({
  detail,
  roles,
  policy,
  ...tools
}: Tools & { detail: Detail; roles: RolePage | null; policy: Policy | null }) {
  return (
    <>
      <h3>Roles &amp; permissions</h3>
      <p className="note">
        System and active custom roles determine staff access. Membership grants determine simulator
        capabilities.
      </p>
      {detail.user.id !== tools.access.actor.id &&
      tools.access.permissions.includes('platform.roles.manage') ? (
        roles && policy ? (
          <AssignmentForm
            key={`${roles.version}/${policy.version}`}
            detail={detail}
            roles={roles}
            policy={policy}
            {...tools}
          />
        ) : (
          <output>Loading role choices…</output>
        )
      ) : (
        <p>Staff access for this account cannot be changed with your current permissions.</p>
      )}
      <details>
        <summary>Effective staff permissions ({detail.effectivePermissions.length})</summary>
        {detail.effectivePermissions.length ? (
          <ul>
            {detail.effectivePermissions.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        ) : (
          <p>No staff permissions.</p>
        )}
      </details>
    </>
  );
}
function AccountControls({ detail, ...tools }: Tools & { detail: Detail }) {
  const now = Date.now();
  const active = detail.restrictions.find(
    (r) => r.revokedAt === null && (r.endsAt === null || r.endsAt > now),
  );
  const suspended =
    detail.controls.suspended === 1 &&
    (detail.controls.endsAt === null || detail.controls.endsAt > now);
  const self = detail.user.id === tools.access.actor.id;
  const staff = detail.user.globalRole !== 'individual' || detail.roles.some((r) => !r.archived);
  const canRestrict =
    !self &&
    tools.access.permissions.includes('community.restrictions.write') &&
    (!staff || tools.access.actor.globalRole === 'super_admin');
  const canSuspend = !self && tools.access.permissions.includes('platform.accounts.suspend');
  function control(action: string, endsAt: number | null = null) {
    tools.review({
      path: `admin/users/${encodeURIComponent(detail.user.id)}/${action}`,
      method: 'POST',
      data: {
        version: detail.version,
        ...(action === 'restore' || action.endsWith('/revoke') ? {} : { endsAt }),
      },
      summary: [
        `${action === 'suspend' ? 'Suspend platform account' : action === 'restore' ? 'Restore platform account' : action.endsWith('/revoke') ? 'Revoke community restriction' : 'Restrict community writes'}: ${detail.user.name} (${detail.user.email})`,
        ...(action === 'suspend'
          ? ['All active sessions will be revoked. Restoring access requires a new sign-in.']
          : []),
        ...(action === 'community-restrictions'
          ? ['Community writes stop; private circuit work and paid grants remain available.']
          : []),
        ...(!action.endsWith('/revoke') && action !== 'restore'
          ? [endsAt === null ? 'Indefinite duration' : `Ends at ${new Date(endsAt).toISOString()}`]
          : []),
      ],
    });
  }
  return (
    <>
      <section className="detail-section">
        <h3>Community restrictions</h3>
        <div className="detail-box">
          <div className="row">
            <strong>{active ? 'Writes restricted' : 'Unrestricted'}</strong>
            <Pill tone={active ? 'amber' : 'green'}>
              {active ? 'Restriction active' : 'No restriction'}
            </Pill>
          </div>
          {active ? (
            <>
              <p>Restricted: {active.reason}</p>
              <p>
                {active.endsAt ? `Until ${new Date(active.endsAt).toISOString()}` : 'Indefinitely'}
              </p>
              {canRestrict && (
                <button
                  className="btn small"
                  onClick={() =>
                    control(`community-restrictions/${encodeURIComponent(active.id)}/revoke`)
                  }
                >
                  Review restriction revocation
                </button>
              )}
            </>
          ) : (
            <>
              <p>No active community restriction.</p>
              {canRestrict && (
                <DurationForm
                  label="Restriction ends at (UTC, optional)"
                  button="Review community restriction"
                  submit={(endsAt) => control('community-restrictions', endsAt)}
                  fail={tools.fail}
                />
              )}
            </>
          )}
          <details>
            <summary>Restriction history</summary>
            <ul className="records">
              {detail.restrictions.map((r) => (
                <li key={r.id}>
                  <p>{r.reason}</p>
                  <p>
                    {r.revokedAt
                      ? 'Revoked'
                      : r.endsAt !== null && r.endsAt <= now
                        ? 'Expired'
                        : 'Active'}
                  </p>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </section>
      <section className="detail-section">
        <h3>Platform account access</h3>
        <div className="detail-box danger-zone">
          <div className="row">
            <strong>Platform account {suspended ? 'suspended' : 'active'}</strong>
          </div>
          <p>
            Suspension signs out active sessions. Private circuits and membership records are
            retained.
          </p>
          {canSuspend &&
            (suspended ? (
              <button className="btn small" onClick={() => control('restore')}>
                Review account restoration
              </button>
            ) : (
              <DurationForm
                label="Suspension ends at (UTC, optional)"
                button="Review platform suspension"
                submit={(endsAt) => control('suspend', endsAt)}
                fail={tools.fail}
              />
            ))}
        </div>
      </section>
    </>
  );
}
function AccountHistory({
  detail,
  compact = false,
  ...tools
}: Tools & { detail: Detail; compact?: boolean }) {
  const [offset, setOffset] = useState(0);
  const { data, loading } = useAdminResource<{
    items: {
      id: string;
      action: string;
      reason: string;
      actorName: string | null;
      actorId: string;
      createdAt: number;
      before: unknown;
      after: unknown;
    }[];
    total: number;
  }>(
    !compact && tools.access.auditNamespaces.length
      ? `admin/audit?targetId=${encodeURIComponent(detail.user.id)}&limit=20&offset=${offset}`
      : null,
    tools.fail,
  );
  const rows = compact ? detail.history.slice(0, 3) : (data?.items ?? []);
  return (
    <>
      {loading && <output>Loading account activity…</output>}
      {!loading && !rows.length && <p className="empty">No permitted action history.</p>}
      <div className="profile-history">
        {rows.map((row) => (
          <article className="history-entry" key={row.id}>
            <strong>{actionLabel(row.action)}</strong>
            <p>
              {'actorName' in row ? `${row.actorName ?? row.actorId} · ` : ''}
              {new Date(row.createdAt).toLocaleString()}
            </p>
            <p>{row.reason}</p>
            {'before' in row && (
              <details>
                <summary>Before and after</summary>
                <dl>
                  <dt>Before</dt>
                  <dd>
                    <pre>{JSON.stringify(row.before, null, 2)}</pre>
                  </dd>
                  <dt>After</dt>
                  <dd>
                    <pre>{JSON.stringify(row.after, null, 2)}</pre>
                  </dd>
                </dl>
              </details>
            )}
          </article>
        ))}
      </div>
      {!compact && data && <Pagination offset={offset} total={data.total} change={setOffset} />}
    </>
  );
}
function UserDetail({
  detail,
  roles,
  policy,
  openQuick,
  ...tools
}: Tools & {
  detail: Detail;
  roles: RolePage | null;
  policy: Policy | null;
  openQuick: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [tab, setTab] = useState('overview');
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const suspended =
    detail.controls.suspended &&
    (detail.controls.endsAt === null || detail.controls.endsAt > Date.now());
  const active = detail.restrictions.some(
    (r) => r.revokedAt === null && (r.endsAt === null || r.endsAt > Date.now()),
  );
  return (
    <div className="account-profile">
      <header className="profile-hero">
        <div className="profile-identity">
          <span className="avatar mint large">{personInitials(detail.user.name)}</span>
          <div>
            <span className="eyebrow">USER PROFILE</span>
            <h1 ref={heading} tabIndex={-1}>
              {detail.user.name}
            </h1>
            <p>{detail.user.email}</p>
            <div className="inline-actions">
              <Pill tone="blue">{roleName(detail.user.globalRole)}</Pill>
              <Pill tone={suspended ? 'rose' : active ? 'amber' : 'green'}>
                {suspended ? 'Suspended' : active ? 'Restricted' : 'Active'}
              </Pill>
            </div>
          </div>
        </div>
        <button className="btn" onClick={openQuick}>
          Quick view
        </button>
      </header>
      <AccountTabs
        value={tab}
        change={setTab}
        prefix="profile"
        label="User profile sections"
        items={[
          ['overview', 'Overview'],
          ['access', 'Access & roles'],
          ['memberships', 'Memberships'],
          ['activity', 'Activity'],
        ]}
      />
      <div id="profile-panel" role="tabpanel" aria-labelledby={`profile-tab-${tab}`}>
        {tab === 'overview' && (
          <div className="profile-layout">
            <div>
              <section className="panel profile-card">
                <div className="panel-heading">
                  <h2>Account overview</h2>
                </div>
                <AccountFacts detail={detail} />
              </section>
              <section className="panel profile-card mt-large">
                <div className="panel-heading">
                  <h2>Latest account activity</h2>
                  <button className="text-button" onClick={() => setTab('activity')}>
                    All activity →
                  </button>
                </div>
                <div className="panel-content">
                  <AccountHistory detail={detail} compact {...tools} />
                </div>
              </section>
            </div>
            <aside>
              <section className="panel profile-side">
                <MembershipSummary
                  userId={detail.user.id}
                  history={() => setTab('memberships')}
                  {...tools}
                />
              </section>
              <section className="panel profile-side mt-large">
                <AccountControls detail={detail} {...tools} />
              </section>
            </aside>
          </div>
        )}
        {tab === 'access' && (
          <div className="profile-layout">
            <section className="panel profile-side">
              <StaffAccess detail={detail} roles={roles} policy={policy} {...tools} />
            </section>
            <aside className="panel profile-side">
              <h2>Access boundaries</h2>
              <p>
                System and custom roles determine staff access. Membership plans determine simulator
                capabilities.
              </p>
              <p>
                Community restrictions and platform suspension are reviewed independently from staff
                roles.
              </p>
            </aside>
          </div>
        )}
        {tab === 'memberships' && (
          <section className="panel">
            {tools.access.permissions.includes('memberships.manage') ? (
              <MembershipHistory userId={detail.user.id} {...tools} />
            ) : (
              <div className="panel-content">
                <h2>Membership history</h2>
                <p>Membership administration is reserved for super admins.</p>
              </div>
            )}
          </section>
        )}
        {tab === 'activity' && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>Account activity</h2>
                <p>Permitted changes, recorded reasons and their before/after values.</p>
              </div>
              <Pill>Scoped history</Pill>
            </div>
            <div className="panel-content">
              <AccountHistory detail={detail} {...tools} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
function DurationForm({
  label,
  button,
  submit,
  fail,
}: {
  label: string;
  button: string;
  submit: (endsAt: number | null) => void;
  fail: (error: unknown) => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const value = new FormData(event.currentTarget).get('endsAt');
        try {
          submit(value ? dateValue(value) : null);
        } catch (error) {
          fail(error);
        }
      }}
    >
      <details className="duration-control">
        <summary>Set duration (optional)</summary>
        <label>
          {label}
          <input name="endsAt" type="datetime-local" />
        </label>
      </details>
      <button className="btn small danger-soft">{button}</button>
    </form>
  );
}
function AssignmentForm({
  detail,
  roles,
  policy,
  ...tools
}: Tools & { detail: Detail; roles: RolePage; policy: Policy }) {
  const [role, setRole] = useState(detail.user.globalRole);
  const [ids, setIds] = useState(detail.roles.filter((r) => !r.archived).map((r) => r.id));
  const effective =
    role === 'super_admin'
      ? policy.permissions.map((p) => p.key)
      : [
          ...new Set([
            ...(role === 'individual' ? [] : policy.policy[role]),
            ...roles.items
              .filter((r) => !r.archived && ids.includes(r.id))
              .flatMap((r) => r.permissions),
          ]),
        ].sort();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        tools.review({
          path: `admin/users/${encodeURIComponent(detail.user.id)}/roles`,
          method: 'POST',
          data: { version: detail.version, globalRole: role, roleIds: ids },
          summary: [
            `Change staff roles for ${detail.user.name} (${detail.user.email})`,
            `System role: ${detail.user.globalRole} → ${role}`,
            `Custom roles: ${detail.roles.map((r) => r.name).join(', ') || 'none'} → ${
              roles.items
                .filter((r) => ids.includes(r.id))
                .map((r) => r.name)
                .join(', ') || 'none'
            }`,
            `Effective permissions: ${detail.effectivePermissions.join(', ') || 'none'} → ${effective.join(', ') || 'none'}`,
            ...(role === 'super_admin'
              ? [
                  'Provision super admin: includes role administration, account suspension and membership management.',
                ]
              : []),
          ],
        });
      }}
    >
      <label>
        System role
        <select
          value={role}
          onChange={(event) => setRole(event.currentTarget.value as typeof role)}
        >
          {['individual', 'moderator', 'admin', 'super_admin'].map((r) => (
            <option key={r} value={r}>
              {r.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Custom role assignments</legend>
        {roles.items
          .filter((r) => !r.archived)
          .map((r) => (
            <label key={r.id} className="check">
              <input
                type="checkbox"
                checked={ids.includes(r.id)}
                onChange={(event) =>
                  setIds(
                    event.currentTarget.checked ? [...ids, r.id] : ids.filter((id) => id !== r.id),
                  )
                }
              />
              {r.name}
            </label>
          ))}
        {roles.items.every((r) => r.archived) && <p>No active custom roles.</p>}
      </fieldset>
      <details open>
        <summary>Resulting effective permissions ({effective.length})</summary>
        <ul>
          {effective.map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      </details>
      <button>Review staff roles</button>
    </form>
  );
}
