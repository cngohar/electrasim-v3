-- Explicit, session-bound proof records for high-risk administration actions.

alter table sessions add constraint sessions_id_user_uq unique (id, user_id);

create table step_up_sessions (
  id uuid primary key,
  session_id uuid not null,
  user_id uuid not null references users(id) on delete cascade,
  method text not null,
  verified_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  request_id text not null,
  created_at timestamptz not null default now(),
  constraint step_up_sessions_session_user_fk foreign key (session_id, user_id)
    references sessions(id, user_id) on delete cascade,
  constraint step_up_sessions_method_ck check (method in ('password', 'passkey')),
  constraint step_up_sessions_expiry_ck check (expires_at > verified_at)
);

create index step_up_sessions_session_expiry_idx
  on step_up_sessions (session_id, expires_at desc)
  where revoked_at is null;

alter table step_up_sessions enable row level security;
alter table step_up_sessions force row level security;
create policy step_up_sessions_self on step_up_sessions
  using (user_id = app_private.current_user_id())
  with check (user_id = app_private.current_user_id());
