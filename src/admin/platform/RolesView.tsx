import { BookOpen, ShieldCheck, Users, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Permission } from '../../platform/registry';
import { Pill } from './AdminShell';
import { useAdminResource } from './resource';
import type { Policy, Role, RolePage, Tools } from './types';

export function PermissionChoices({
  permissions,
  selected,
  name = 'permissions',
}: { permissions: Permission[]; selected: string[]; name?: string }) {
  return (
    <div className="permission-list">
      {permissions
        .filter((p) => !p.protected)
        .map((p) => (
          <label className="check" key={p.key}>
            <input
              type="checkbox"
              name={name}
              value={p.key}
              defaultChecked={selected.includes(p.key)}
            />
            {p.label}
          </label>
        ))}
    </div>
  );
}
export function RolesView(tools: Tools) {
  const { data: roles, loading } = useAdminResource<RolePage>('admin/roles', tools.fail);
  const { data: policy } = useAdminResource<Policy>('admin/permissions', tools.fail);
  const [editing, setEditing] = useState<string | null>(null);
  if (loading || !roles || !policy) return <output>Loading roles and permissions…</output>;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">PLATFORM WORKSPACE</span>
          <h1>Access &amp; roles</h1>
          <p>Give each team member the access they need, with protected actions kept explicit.</p>
        </div>
        <button className="btn primary" onClick={() => setEditing('new')}>
          Create custom role
        </button>
      </div>
      <div className="role-cards">
        {[
          {
            title: 'Super admin',
            text: 'Protected staff, account and membership controls.',
            Icon: ShieldCheck,
            count: policy.permissions.length,
            tone: 'purple',
          },
          {
            title: 'Administrator',
            text: 'User directory, ordinary-user restrictions and settings.',
            Icon: Users,
            count: policy.policy.admin.length,
            tone: '',
          },
          {
            title: 'Moderator',
            text: 'Community policy, scoped history and standards.',
            Icon: BookOpen,
            count: policy.policy.moderator.length,
            tone: 'amber',
          },
        ].map(({ title, text, Icon, count, tone }) => (
          <article className="panel role-card" key={title}>
            <div className={`metric-icon ${tone}`}>
              <Icon className="icon" />
            </div>
            <h2>{title}</h2>
            <p>{text}</p>
            <footer>
              <span>{count} system permissions</span>
              {title === 'Super admin' ? (
                <Pill tone="purple">Protected</Pill>
              ) : (
                <a className="text-button" href="#permission-matrix">
                  View permissions ↓
                </a>
              )}
            </footer>
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Custom roles</h2>
            <p>Reusable access for your team.</p>
          </div>
          <Pill>{roles.items.filter((role) => !role.archived).length} active</Pill>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Assigned users</th>
                <th>Permissions</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {roles.items.map((role) => (
                <tr key={role.id}>
                  <td>
                    <strong>{role.name}</strong>
                  </td>
                  <td>{role.assignedCount} people</td>
                  <td>{role.permissions.length} permissions</td>
                  <td>
                    <Pill tone={role.archived ? '' : 'green'}>
                      {role.archived ? 'Archived' : 'Active'}
                    </Pill>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      aria-label={`Edit ${role.name}`}
                      onClick={() => setEditing(role.id)}
                    >
                      Manage →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!roles.items.length && (
            <p className="empty">
              No custom roles yet. Create a role to define reusable staff access.
            </p>
          )}
        </div>
      </section>
      <section className="panel mt-large" id="permission-matrix">
        <div className="panel-heading">
          <div>
            <h2>System permission matrix</h2>
            <p>Compare effective system grants before changing them.</p>
          </div>
          <Pill tone="purple">Protected actions locked</Pill>
        </div>
        <form
          key={policy.version}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const next = {
              moderator: data.getAll('moderator').map(String),
              admin: data.getAll('admin').map(String),
            };
            tools.review({
              path: 'admin/permissions',
              method: 'PATCH',
              data: { policy: next, version: policy.version },
              summary: [
                'Update default system-role grants. Active custom roles add to these grants.',
                ...(['moderator', 'admin'] as const).map(
                  (role) =>
                    `${role}: ${policy.policy[role].join(', ') || 'none'} → ${next[role].join(', ') || 'none'}`,
                ),
              ],
            });
          }}
        >
          <div className="table-scroll">
            <table className="matrix">
              <thead>
                <tr>
                  <th>Permission</th>
                  <th>Moderator</th>
                  <th>Admin</th>
                  <th>Super admin</th>
                </tr>
              </thead>
              <tbody>
                {policy.permissions.map((permission) => (
                  <tr key={permission.key}>
                    <th scope="row">{permission.label}</th>
                    {(['moderator', 'admin'] as const).map((role) => (
                      <td key={role}>
                        {permission.protected ? (
                          <span className="locked">Protected</span>
                        ) : (
                          <input
                            type="checkbox"
                            name={role}
                            value={permission.key}
                            defaultChecked={policy.policy[role].includes(permission.key)}
                            aria-label={`${role === 'moderator' ? 'Moderator' : 'Admin'} permissions: ${permission.label}`}
                          />
                        )}
                      </td>
                    ))}
                    <td>
                      <span aria-label="Granted to super admin">✓</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-content inline-actions spread">
            <p className="note">Active custom roles add to system grants.</p>
            <button className="btn primary">Review permission matrix</button>
          </div>
        </form>
        <div className="panel-content protected-actions">
          <h3>Protected super-admin actions</h3>
          <ul>
            {policy.permissions
              .filter((p) => p.protected)
              .map((p) => (
                <li key={p.key}>{p.label}</li>
              ))}
          </ul>
        </div>
      </section>
      {editing && (
        <RoleEditor
          role={roles.items.find((role) => role.id === editing)}
          policy={policy}
          version={roles.version}
          close={() => setEditing(null)}
          {...tools}
        />
      )}
    </>
  );
}
function RoleEditor({
  close,
  role,
  ...tools
}: Tools & { close: () => void; role?: Role; policy: Policy; version: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      className="review-dialog role-editor"
      ref={dialog}
      aria-labelledby="role-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <div className="dialog-heading">
        <h2 id="role-editor-title">{role ? 'Manage custom role' : 'Create custom role'}</h2>
        <button className="icon-button" aria-label="Close role editor" onClick={close}>
          <X />
        </button>
      </div>
      <p className="dialog-description">Review staff access and record a reason before saving.</p>
      <RoleForm role={role} {...tools} />
    </dialog>
  );
}
function RoleForm({
  role,
  policy,
  version,
  ...tools
}: Tools & { role?: Role; policy: Policy; version: number }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const name = String(data.get('name'));
        const permissions = data.getAll('permissions').map(String);
        const archived = data.has('archived');
        tools.review({
          path: `admin/roles${role ? `/${encodeURIComponent(role.id)}` : ''}`,
          method: role ? 'PATCH' : 'POST',
          data: { name, permissions, ...(role ? { archived } : {}), version },
          summary: [
            `${role ? 'Update' : 'Create'} role: ${name}`,
            `Permissions: ${role?.permissions.join(', ') || 'none'} → ${permissions.join(', ') || 'none'}`,
            ...(role
              ? [
                  `${role.assignedCount} assigned users; ${archived ? 'archive revokes this role’s effective grants' : 'grants apply on the next protected request'}.`,
                ]
              : []),
          ],
        });
      }}
    >
      <label>
        Role name
        <input name="name" defaultValue={role?.name ?? ''} required maxLength={80} />
      </label>
      <fieldset>
        <legend>Role permissions</legend>
        <PermissionChoices permissions={policy.permissions} selected={role?.permissions ?? []} />
      </fieldset>
      {role && (
        <label className="check">
          <input name="archived" type="checkbox" defaultChecked={Boolean(role.archived)} />
          Archive role
        </label>
      )}
      <button>{role ? 'Review role change' : 'Review new role'}</button>
    </form>
  );
}
