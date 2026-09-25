-- Member-owned simulator project persistence. Free/Pro quotas are enforced transactionally
-- by the application service; RLS always restricts projects and revisions to their owner.
create table simulator_projects (
  id uuid primary key,
  owner_user_id uuid not null references users(id),
  title text not null,
  supply_family text not null check (supply_family in ('us_110_120', 'international_230_240')),
  current_revision_number integer not null default 0 check (current_revision_number >= 0),
  share_id uuid unique,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulator_projects_title_ck check (length(btrim(title)) between 1 and 120)
);
create index simulator_projects_owner_updated_idx
  on simulator_projects(owner_user_id, updated_at desc) where archived_at is null;

create table simulator_project_revisions (
  id uuid primary key,
  project_id uuid not null references simulator_projects(id),
  revision_number integer not null check (revision_number > 0),
  circuit_document jsonb not null,
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique (project_id, revision_number),
  constraint simulator_project_document_ck check (
    jsonb_typeof(circuit_document) = 'object' and
    circuit_document->>'schemaVersion' = '1'
  )
);
create index simulator_project_revisions_project_idx
  on simulator_project_revisions(project_id, revision_number desc);

alter table simulator_projects enable row level security;
alter table simulator_projects force row level security;
alter table simulator_project_revisions enable row level security;
alter table simulator_project_revisions force row level security;

create policy simulator_projects_owner_all on simulator_projects for all
  using (owner_user_id = app_private.current_user_id())
  with check (owner_user_id = app_private.current_user_id());
create policy simulator_project_revisions_owner_read on simulator_project_revisions for select
  using (exists (
    select 1 from simulator_projects projects
    where projects.id = project_id and projects.owner_user_id = app_private.current_user_id()
  ));
create policy simulator_project_revisions_owner_insert on simulator_project_revisions for insert
  with check (
    created_by_user_id = app_private.current_user_id() and exists (
      select 1 from simulator_projects projects
      where projects.id = project_id and projects.owner_user_id = app_private.current_user_id()
    )
  );

create or replace function app_private.get_shared_simulator_project(requested_share_id uuid)
returns table (project_id uuid, title text, supply_family text, revision_number integer, circuit_document jsonb)
language sql stable security definer set search_path = pg_catalog, public as $$
  select projects.id, projects.title, projects.supply_family,
    revisions.revision_number, revisions.circuit_document
  from simulator_projects projects
  join simulator_project_revisions revisions
    on revisions.project_id = projects.id
    and revisions.revision_number = projects.current_revision_number
  where projects.share_id = requested_share_id and projects.archived_at is null
  limit 1
$$;
revoke all on function app_private.get_shared_simulator_project(uuid) from public;
