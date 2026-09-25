-- Database-backed product entitlements. Payment-provider ingestion is deliberately deferred;
-- grants are provider-neutral and can later be written by a reviewed billing worker.
create table account_entitlements (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  entitlement_key text not null,
  source text not null,
  source_reference text,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_entitlements_key_ck check (entitlement_key in ('simulator_pro')),
  constraint account_entitlements_source_ck check (source in ('manual', 'binance_pay', 'nowpayments', 'promotion')),
  constraint account_entitlements_dates_ck check (expires_at is null or expires_at > starts_at)
);
create unique index account_entitlements_active_source_uq
  on account_entitlements(user_id, entitlement_key, source, coalesce(source_reference, ''))
  where revoked_at is null;
create index account_entitlements_user_active_idx
  on account_entitlements(user_id, entitlement_key, expires_at)
  where revoked_at is null;

alter table account_entitlements enable row level security;
alter table account_entitlements force row level security;
create policy account_entitlements_self_read on account_entitlements for select
  using (user_id = app_private.current_user_id());

create or replace function app_private.has_active_entitlement(requested_key text)
returns boolean
language sql stable security invoker set search_path = pg_catalog, public as $$
  select exists (
    select 1 from account_entitlements
    where user_id = app_private.current_user_id()
      and entitlement_key = requested_key
      and starts_at <= now()
      and (expires_at is null or expires_at > now())
      and revoked_at is null
  )
$$;
revoke all on function app_private.has_active_entitlement(text) from public;
