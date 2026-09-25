-- ElectraSim v3 tenancy foundation
-- IDs are application-generated UUIDv7 values. This migration intentionally does not depend on extensions.

create schema if not exists app_private;

create table users (
  id uuid primary key,
  email_normalized text not null unique,
  display_name text not null,
  adult_eligibility_confirmed_at timestamptz,
  disabled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_normalized_ck check (email_normalized = lower(btrim(email_normalized)))
);

create table workspaces (
  id uuid primary key,
  type text not null,
  name text not null,
  slug text not null unique,
  created_by_user_id uuid not null references users(id),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_type_ck check (type in ('personal', 'independent_instructor', 'institution'))
);

create table workspace_memberships (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id),
  user_id uuid not null references users(id),
  status text not null,
  joined_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_memberships_workspace_user_uq unique (workspace_id, user_id),
  constraint workspace_memberships_status_ck check (status in ('active', 'invited', 'suspended', 'left'))
);
create index workspace_memberships_user_idx on workspace_memberships(user_id);

create table institutions (
  id uuid primary key,
  workspace_id uuid not null unique references workspaces(id),
  legal_name text not null,
  display_name text not null,
  verified_domain text,
  country_code text not null,
  timezone text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index institutions_id_workspace_uq on institutions(id, workspace_id);

create table campuses (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id),
  institution_id uuid not null,
  name text not null,
  code text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campuses_institution_workspace_fk foreign key (institution_id, workspace_id)
    references institutions(id, workspace_id)
);
create index campuses_workspace_idx on campuses(workspace_id);
create unique index campuses_id_workspace_uq on campuses(id, workspace_id);

create table departments (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id),
  institution_id uuid not null,
  campus_id uuid,
  parent_department_id uuid,
  name text not null,
  code text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint departments_institution_workspace_fk foreign key (institution_id, workspace_id)
    references institutions(id, workspace_id),
  constraint departments_campus_workspace_fk foreign key (campus_id, workspace_id)
    references campuses(id, workspace_id)
);
create index departments_workspace_idx on departments(workspace_id);
create unique index departments_id_workspace_uq on departments(id, workspace_id);
alter table departments add constraint departments_parent_workspace_fk
  foreign key (parent_department_id, workspace_id) references departments(id, workspace_id);

create table permissions (
  key text primary key,
  description text not null,
  scope_type text not null check (scope_type in ('platform', 'workspace', 'course')),
  high_risk boolean not null default false,
  created_at timestamptz not null default now()
);

create table roles (
  id uuid primary key,
  workspace_id uuid references workspaces(id),
  key text not null,
  name text not null,
  scope_type text not null check (scope_type in ('platform', 'workspace', 'course')),
  system boolean not null default false,
  permission_version integer not null default 1 check (permission_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint roles_platform_workspace_ck check (
    (scope_type = 'platform' and workspace_id is null) or scope_type <> 'platform'
  )
);
create unique index roles_scope_workspace_key_uq on roles(scope_type, coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid), key);

create table role_permissions (
  role_id uuid not null references roles(id),
  permission_key text not null references permissions(key),
  created_at timestamptz not null default now(),
  primary key (role_id, permission_key)
);

create table membership_role_assignments (
  membership_id uuid not null references workspace_memberships(id),
  role_id uuid not null references roles(id),
  granted_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  primary key (membership_id, role_id)
);

create table platform_role_assignments (
  user_id uuid not null references users(id),
  role_id uuid not null references roles(id),
  granted_by_user_id uuid not null references users(id),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table invitations (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id),
  email_normalized text not null,
  token_hash text not null unique,
  status text not null check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by_user_id uuid not null references users(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_email_normalized_ck check (email_normalized = lower(btrim(email_normalized)))
);
create index invitations_workspace_email_idx on invitations(workspace_id, email_normalized);
create unique index invitations_one_pending_email_idx
  on invitations(workspace_id, email_normalized) where status = 'pending';

create table invitation_roles (
  invitation_id uuid not null references invitations(id),
  role_id uuid not null references roles(id),
  primary key (invitation_id, role_id)
);

create table audit_events (
  id uuid primary key,
  workspace_id uuid references workspaces(id),
  actor_user_id uuid not null references users(id),
  support_actor_user_id uuid references users(id),
  action text not null,
  target_type text not null,
  target_id text not null,
  request_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index audit_events_workspace_time_idx on audit_events(workspace_id, occurred_at desc);
create index audit_events_actor_time_idx on audit_events(actor_user_id, occurred_at desc);

create table outbox_events (
  id uuid primary key,
  workspace_id uuid references workspaces(id),
  topic text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  payload jsonb not null,
  occurred_at timestamptz not null,
  available_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  processed_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index outbox_events_pending_idx on outbox_events(processed_at, available_at) where processed_at is null;

create or replace function app_private.current_user_id()
returns uuid
language sql
stable
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.current_user_id', true), '')::uuid
$$;

create or replace function app_private.current_workspace_id()
returns uuid
language sql
stable
set search_path = pg_catalog
as $$
  select nullif(current_setting('app.current_workspace_id', true), '')::uuid
$$;

revoke all on schema app_private from public;
revoke all on all functions in schema app_private from public;
-- The provisioning migration grants EXECUTE on these two functions only to the application/worker roles.

alter table users enable row level security;
alter table users force row level security;
create policy users_self_select on users for select using (id = app_private.current_user_id());
create policy users_self_update on users for update using (id = app_private.current_user_id()) with check (id = app_private.current_user_id());

alter table workspaces enable row level security;
alter table workspaces force row level security;
create policy workspaces_current on workspaces using (id = app_private.current_workspace_id()) with check (id = app_private.current_workspace_id());

alter table workspace_memberships enable row level security;
alter table workspace_memberships force row level security;
create policy workspace_memberships_current on workspace_memberships using (workspace_id = app_private.current_workspace_id()) with check (workspace_id = app_private.current_workspace_id());

alter table institutions enable row level security;
alter table institutions force row level security;
create policy institutions_current on institutions using (workspace_id = app_private.current_workspace_id()) with check (workspace_id = app_private.current_workspace_id());

alter table campuses enable row level security;
alter table campuses force row level security;
create policy campuses_current on campuses using (workspace_id = app_private.current_workspace_id()) with check (workspace_id = app_private.current_workspace_id());

alter table departments enable row level security;
alter table departments force row level security;
create policy departments_current on departments using (workspace_id = app_private.current_workspace_id()) with check (workspace_id = app_private.current_workspace_id());

alter table roles enable row level security;
alter table roles force row level security;
create policy roles_current_or_system_workspace on roles for select using (
  workspace_id = app_private.current_workspace_id()
  or (workspace_id is null and scope_type in ('workspace', 'course'))
);
create policy roles_current_write on roles for all using (workspace_id = app_private.current_workspace_id()) with check (workspace_id = app_private.current_workspace_id());

alter table role_permissions enable row level security;
alter table role_permissions force row level security;
create policy role_permissions_visible_role on role_permissions for select using (
  exists (
    select 1 from roles r
    where r.id = role_permissions.role_id
      and (r.workspace_id = app_private.current_workspace_id() or (r.workspace_id is null and r.scope_type in ('workspace', 'course')))
  )
);

alter table membership_role_assignments enable row level security;
alter table membership_role_assignments force row level security;
create policy membership_roles_current on membership_role_assignments using (
  exists (
    select 1 from workspace_memberships m
    where m.id = membership_role_assignments.membership_id
      and m.workspace_id = app_private.current_workspace_id()
  )
) with check (
  exists (
    select 1 from workspace_memberships m
    where m.id = membership_role_assignments.membership_id
      and m.workspace_id = app_private.current_workspace_id()
  )
);

alter table platform_role_assignments enable row level security;
alter table platform_role_assignments force row level security;
create policy platform_roles_self_select on platform_role_assignments for select using (user_id = app_private.current_user_id());

alter table invitations enable row level security;
alter table invitations force row level security;
create policy invitations_current on invitations using (workspace_id = app_private.current_workspace_id()) with check (workspace_id = app_private.current_workspace_id());

alter table invitation_roles enable row level security;
alter table invitation_roles force row level security;
create policy invitation_roles_current on invitation_roles using (
  exists (
    select 1 from invitations i
    where i.id = invitation_roles.invitation_id
      and i.workspace_id = app_private.current_workspace_id()
  )
) with check (
  exists (
    select 1 from invitations i
    where i.id = invitation_roles.invitation_id
      and i.workspace_id = app_private.current_workspace_id()
  )
);

alter table audit_events enable row level security;
alter table audit_events force row level security;
create policy audit_events_current_select on audit_events for select using (workspace_id = app_private.current_workspace_id());
create policy audit_events_current_insert on audit_events for insert with check (
  workspace_id = app_private.current_workspace_id()
  and actor_user_id = app_private.current_user_id()
);

alter table outbox_events enable row level security;
alter table outbox_events force row level security;
create policy outbox_events_current_insert on outbox_events for insert with check (workspace_id = app_private.current_workspace_id());

-- Runtime grants and ownership are environment provisioning concerns. Production must verify:
-- 1. application and worker roles are NOSUPERUSER NOBYPASSRLS;
-- 2. neither runtime role owns these tables;
-- 3. only the migration role can alter schema/policies;
-- 4. worker access to pending outbox rows uses a separately reviewed policy/function.
