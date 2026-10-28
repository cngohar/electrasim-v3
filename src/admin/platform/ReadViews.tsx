import { Activity, ArrowRight, ShieldCheck, Users } from 'lucide-react';
import { useState } from 'react';
import { dateValue } from '../client';
import { Pill, personInitials, roleName } from './AdminShell';
import { useAdminResource } from './resource';
import type { Tools } from './types';

type RecentActivity = {
  id: string;
  namespace: string;
  action: string;
  targetId: string;
  actorId: string;
  actorName: string | null;
  createdAt: number;
};
export function OverviewView({ access, fail }: Tools) {
  const { data, loading } = useAdminResource<{
    counts: { label: string; count: number }[];
    recentUsers: {
      id: string;
      name: string;
      email: string;
      globalRole: string;
      createdAt: number;
    }[];
    recentActivity: RecentActivity[];
  }>('admin/overview', fail);
  if (loading || !data) return <output>Loading overview…</output>;
  return (
    <>
      <div className="metric-grid">
        {[...data.counts]
          .sort(
            (a, b) =>
              [
                'Users',
                'Active custom roles',
                'Community restrictions',
                'Suspended accounts',
              ].indexOf(a.label) -
              [
                'Users',
                'Active custom roles',
                'Community restrictions',
                'Suspended accounts',
              ].indexOf(b.label),
          )
          .map((item) => (
            <article className="panel metric-card" key={item.label}>
              <div className="panel-content">
                <div className="inline-actions spread">
                  <span>{item.label === 'Users' ? 'Registered users' : item.label}</span>
                  <span
                    className={`metric-icon ${item.label === 'Active custom roles' ? 'purple' : item.label === 'Community restrictions' ? 'amber' : item.label === 'Suspended accounts' ? 'rose' : ''}`}
                  >
                    {item.label === 'Users' ? (
                      <Users className="icon" />
                    ) : (
                      <ShieldCheck className="icon" />
                    )}
                  </span>
                </div>
                <strong className="metric-value">{item.count.toLocaleString()}</strong>
                <p className="note">Current platform records</p>
              </div>
            </article>
          ))}
      </div>
      <div className="overview-columns">
        {access.permissions.includes('platform.users.read') && (
          <section className="panel">
            <div className="panel-heading">
              <h2>Recent users</h2>
              <a className="text-button" href="/admin/users/">
                View all users <ArrowRight className="icon" />
              </a>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <a
                          className="user-link"
                          href={`/admin/users/#${encodeURIComponent(user.id)}`}
                        >
                          <span className="avatar mint">{personInitials(user.name)}</span>
                          <span>
                            <strong>{user.name}</strong>
                            <small>{user.email}</small>
                          </span>
                        </a>
                      </td>
                      <td>
                        <Pill>{roleName(user.globalRole)}</Pill>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.recentUsers.length && <p className="empty">No users yet.</p>}
            </div>
          </section>
        )}
        <section className="panel">
          <div className="panel-heading">
            <h2>Recent activity</h2>
            {access.auditNamespaces.length > 0 && (
              <a className="text-button" href="/admin/audit/">
                View audit <ArrowRight className="icon" />
              </a>
            )}
          </div>
          <div className="panel-content">
            {data.recentActivity.map((event) => (
              <div className="activity-item" key={event.id}>
                <span className="activity-symbol">
                  <Activity className="icon" />
                </span>
                <div>
                  <p>
                    <strong>{event.actorName ?? event.actorId}</strong> ·{' '}
                    {actionLabel(event.action)}
                  </p>
                  <small>
                    {event.targetId} · {new Date(event.createdAt).toLocaleString()}
                  </small>
                </div>
              </div>
            ))}
            {!data.recentActivity.length && <p>No permitted activity yet.</p>}
          </div>
        </section>
      </div>
      {data.counts.length === 0 && <p>Choose a module from the navigation.</p>}
    </>
  );
}
export function actionLabel(action: string) {
  return (
    (
      {
        'platform.roles.create': 'Created a custom role',
        'platform.roles.update': 'Updated a custom role',
        'platform.users.roles': 'Changed staff access',
        'platform.permissions.update': 'Updated system permissions',
        'platform.accounts.suspend': 'Suspended a platform account',
        'platform.accounts.restore': 'Restored a platform account',
        'community.restrictions.apply': 'Restricted community writes',
        'community.restrictions.revoke': 'Removed a community restriction',
        'community.settings.update': 'Updated community settings',
        'catalog.components.access.update': 'Changed component access',
      } as Record<string, string>
    )[action] ?? action
  );
}
export function StandardsView({ fail }: Tools) {
  const { data, loading } = useAdminResource<{
    items: {
      code: string;
      label: string;
      citation: string;
      nominalVoltage: number;
      frequencyHz: number;
      version: string;
    }[];
  }>('admin/standards', fail);
  if (loading || !data) return <output>Loading standards…</output>;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PLATFORM WORKSPACE</span>
          <h1>Standards reference</h1>
          <p>Code-owned electrical references used by the simulator. Read only.</p>
        </div>
        <Pill>Read only</Pill>
      </div>
      {data.items.length === 0 && (
        <section className="panel panel-content">
          <p>No standards have been seeded in this local database.</p>
        </section>
      )}
      <div className="standards-grid">
        {data.items.map((row) => (
          <article className="panel standard-card" key={row.code}>
            <div className="panel-heading">
              <div>
                <h2>{row.label}</h2>
              </div>
              <Pill tone="blue">{row.code.toUpperCase()}</Pill>
            </div>
            <div className="values">
              <span>
                {row.nominalVoltage} V<small>Nominal voltage</small>
              </span>
              <span>
                {row.frequencyHz} Hz
                <small>Frequency</small>
              </span>
            </div>
            <p>{row.citation}</p>
            <small>Model version {row.version} · maintained with the simulator</small>
          </article>
        ))}
      </div>
    </>
  );
}
type Entry = {
  id: string;
  namespace: string;
  actorId: string;
  actorName: string | null;
  action: string;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: number;
  before: unknown;
  after: unknown;
};
export function AuditView({ access, fail }: Tools) {
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const { data, loading } = useAdminResource<{ items: Entry[]; total: number; actions: string[] }>(
    `admin/audit?limit=20&offset=${offset}${query}`,
    fail,
  );
  return (
    <>
      <form
        className="panel audit-filter-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const params = new URLSearchParams();
          for (const name of ['namespace', 'actorId', 'targetId', 'action']) {
            const value = String(form.get(name) ?? '').trim();
            if (value) params.set(name, value);
          }
          try {
            for (const name of ['from', 'to']) {
              if (form.get(name)) params.set(name, String(dateValue(form.get(name))));
            }
            setQuery(`&${params}`);
            setOffset(0);
          } catch (error) {
            fail(error);
          }
        }}
      >
        <div className="audit-primary">
          <label>
            <span className="sr-only">Audit namespace</span>
            <select name="namespace">
              <option value="">All permitted namespaces</option>
              {access.auditNamespaces.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="audit-action">
            <span className="sr-only">Action</span>
            <input
              name="action"
              list="audit-actions"
              maxLength={200}
              placeholder="Filter by action…"
            />
          </label>
          <datalist id="audit-actions">
            {(data?.actions ?? []).map((action) => (
              <option key={action} value={action} />
            ))}
          </datalist>
          <button className="btn">Filter audit</button>
        </div>
        <details className="audit-advanced">
          <summary>More filters</summary>
          <div className="audit-extra">
            <label>
              Actor ID
              <input name="actorId" maxLength={200} />
            </label>
            <label>
              Target ID
              <input name="targetId" maxLength={200} />
            </label>
            <label>
              From (UTC)
              <input name="from" type="datetime-local" />
            </label>
            <label>
              To (UTC)
              <input name="to" type="datetime-local" />
            </label>
          </div>
        </details>
      </form>
      {loading && <output>Loading audit…</output>}
      {data && (
        <>
          <p>{data.total} audit entries</p>
          {data.items.length === 0 && <p>No matching audit entries.</p>}
          <section className="panel readable-audit">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Actor</th>
                    <th>Action & subject</th>
                    <th>Scope</th>
                    <th>When</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.actorName ?? row.actorId}</strong>
                        <small className="muted">{row.actorId}</small>
                      </td>
                      <td>
                        <strong>{actionLabel(row.action)}</strong>
                        <p>
                          {row.targetType}: {row.targetId}
                        </p>
                        <p>{row.reason}</p>
                        <small className="muted">{row.action}</small>
                      </td>
                      <td>
                        <Pill tone={row.namespace === 'platform' ? 'blue' : 'purple'}>
                          {row.namespace}
                        </Pill>
                      </td>
                      <td>{new Date(row.createdAt).toLocaleString()}</td>
                      <td>
                        <details>
                          <summary>View change</summary>
                          <h4>Before</h4>
                          <pre>{JSON.stringify(row.before, null, 2)}</pre>
                          <h4>After</h4>
                          <pre>{JSON.stringify(row.after, null, 2)}</pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <Pagination offset={offset} total={data.total} change={setOffset} />
        </>
      )}
    </>
  );
}
export function Pagination({
  offset,
  total,
  change,
}: { offset: number; total: number; change: (value: number) => void }) {
  return (
    <nav className="result-pages" aria-label="Results pages">
      <button disabled={offset === 0} onClick={() => change(Math.max(0, offset - 20))}>
        Previous
      </button>
      <span>
        {total ? `${offset + 1}–${Math.min(offset + 20, total)} of ${total}` : '0 results'}
      </span>
      <button disabled={offset + 20 >= total} onClick={() => change(offset + 20)}>
        Next
      </button>
    </nav>
  );
}
