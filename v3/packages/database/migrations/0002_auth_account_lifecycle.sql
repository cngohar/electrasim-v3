-- Better Auth core/plugin storage and ElectraSim account lifecycle.
-- Auth tables are global identity infrastructure, not tenant-owned data. Production grants them only
-- to the dedicated NOSUPERUSER/NOBYPASSRLS auth connection role and the migration owner.

alter table users
  add column email_verified boolean not null default false,
  add column image text,
  add column two_factor_enabled boolean not null default false,
  add column primary_goal text,
  add column experience_level text,
  add column supply_family text,
  add column accessibility_presented_at timestamptz,
  add column safety_terms_version text,
  add column onboarding_completed_at timestamptz,
  add constraint users_primary_goal_ck check (
    primary_goal is null or primary_goal in ('learn', 'teach_independently', 'join_or_manage_institution')
  ),
  add constraint users_experience_level_ck check (
    experience_level is null or experience_level in ('new', 'student_or_apprentice', 'working_professional')
  ),
  add constraint users_supply_family_ck check (
    supply_family is null or supply_family in ('us_110_120', 'international_230_240')
  );

-- Better Auth must create users and verify/recover accounts before an application tenant context exists.
-- Keep these global identity rows outside tenant RLS and enforce access with a dedicated auth DB role.
drop policy if exists users_self_select on users;
drop policy if exists users_self_update on users;
alter table users no force row level security;
alter table users disable row level security;

alter table workspaces add column personal_owner_user_id uuid references users(id);
create unique index workspaces_personal_owner_uq
  on workspaces(personal_owner_user_id)
  where type = 'personal';
alter table workspaces add constraint workspaces_personal_owner_ck check (
  (type = 'personal' and personal_owner_user_id is not null)
  or (type <> 'personal' and personal_owner_user_id is null)
);

create table sessions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index sessions_user_idx on sessions(user_id);
create index sessions_expiry_idx on sessions(expires_at);

create table accounts (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  account_id text not null,
  provider_id text not null,
  access_token text,
  refresh_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  id_token text,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_provider_account_uq unique (provider_id, account_id)
);
create index accounts_user_idx on accounts(user_id);

create table verifications (
  id uuid primary key,
  identifier text not null,
  value text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index verifications_identifier_idx on verifications(identifier);

create table passkeys (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  name text,
  public_key text not null,
  credential_id text not null unique,
  counter integer not null check (counter >= 0),
  device_type text not null,
  backed_up boolean not null,
  transports text,
  aaguid text,
  created_at timestamptz default now()
);
create index passkeys_user_idx on passkeys(user_id);

create table two_factors (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  secret text not null,
  backup_codes text not null,
  verified boolean not null default false,
  failed_verification_count integer not null default 0 check (failed_verification_count >= 0),
  locked_until timestamptz
);
create index two_factors_user_idx on two_factors(user_id);

create table identity_operations (
  idempotency_key text primary key,
  user_id uuid not null references users(id),
  operation text not null,
  workspace_id uuid references workspaces(id),
  created_at timestamptz not null default now()
);
create index identity_operations_user_idx on identity_operations(user_id);

-- Provisioning responsibility:
-- * auth role: users, sessions, accounts, verifications, passkeys, two_factors only;
-- * application role: lifecycle fields through reviewed use cases, not raw auth secrets/tokens;
-- * lifecycle transaction: identity_operations + workspace/membership/role/audit/outbox tables.
-- Neither runtime role owns these tables or has SUPERUSER/BYPASSRLS.
