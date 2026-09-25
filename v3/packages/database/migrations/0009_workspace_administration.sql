-- Narrow workspace discovery and roster readers. Security-definer functions are used
-- because ordinary forced-RLS context exposes exactly one selected workspace at a time.
create or replace function app_private.has_workspace_permission(
  requested_workspace_id uuid,
  requested_permission text
) returns boolean
language sql stable security definer set search_path = pg_catalog, public as $$
  select exists (
    select 1
    from workspace_memberships memberships
    join membership_role_assignments assignments on assignments.membership_id = memberships.id
    join role_permissions grants on grants.role_id = assignments.role_id
    where memberships.workspace_id = requested_workspace_id
      and memberships.user_id = app_private.current_user_id()
      and memberships.status = 'active'
      and grants.permission_key = requested_permission
  )
$$;

create or replace function app_private.list_my_workspaces()
returns table (
  workspace_id uuid,
  workspace_name text,
  workspace_type text,
  membership_status text,
  role_keys text[]
)
language sql stable security definer set search_path = pg_catalog, public as $$
  select workspaces.id, workspaces.name, workspaces.type, memberships.status,
    coalesce(array_agg(distinct roles.key order by roles.key) filter (where roles.key is not null), '{}')
  from workspace_memberships memberships
  join workspaces on workspaces.id = memberships.workspace_id and workspaces.archived_at is null
  left join membership_role_assignments assignments on assignments.membership_id = memberships.id
  left join roles on roles.id = assignments.role_id
  where memberships.user_id = app_private.current_user_id()
    and memberships.status in ('active', 'suspended')
  group by workspaces.id, workspaces.name, workspaces.type, memberships.status, workspaces.created_at
  order by workspaces.created_at, workspaces.name
$$;

create or replace function app_private.get_workspace_roster(requested_workspace_id uuid)
returns table (
  membership_id uuid,
  user_id uuid,
  display_name text,
  email_normalized text,
  membership_status text,
  role_keys text[],
  joined_at timestamptz
)
language sql stable security definer set search_path = pg_catalog, public as $$
  select memberships.id, users.id, users.display_name, users.email_normalized, memberships.status,
    coalesce(array_agg(distinct roles.key order by roles.key) filter (where roles.key is not null), '{}'),
    memberships.joined_at
  from workspace_memberships memberships
  join users on users.id = memberships.user_id
  left join membership_role_assignments assignments on assignments.membership_id = memberships.id
  left join roles on roles.id = assignments.role_id
  where memberships.workspace_id = requested_workspace_id
    and app_private.has_workspace_permission(requested_workspace_id, 'workspace.membership.read')
  group by memberships.id, users.id, users.display_name, users.email_normalized,
    memberships.status, memberships.joined_at
  order by users.display_name, users.email_normalized
$$;

revoke all on function app_private.has_workspace_permission(uuid, text) from public;
revoke all on function app_private.list_my_workspaces() from public;
revoke all on function app_private.get_workspace_roster(uuid) from public;
