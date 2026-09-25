-- Global durable work queue for pre-tenant identity and transactional-email work.
-- This table is intentionally outside tenant RLS. Production grants must restrict
-- producers to INSERT/SELECT-by-id and workers to claim/complete operations.

create table durable_system_jobs (
  id text primary key,
  type text not null,
  payload jsonb not null,
  status text not null default 'pending',
  available_at timestamptz not null default now(),
  attempts integer not null default 0,
  max_attempts integer not null default 8,
  lease_owner text,
  lease_expires_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint durable_system_jobs_status_ck
    check (status in ('pending', 'processing', 'completed', 'failed')),
  constraint durable_system_jobs_attempts_ck
    check (attempts >= 0 and max_attempts > 0 and attempts <= max_attempts),
  constraint durable_system_jobs_completion_ck
    check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);

create index durable_system_jobs_claim_idx
  on durable_system_jobs (available_at, created_at)
  where status = 'pending';

create index durable_system_jobs_expired_lease_idx
  on durable_system_jobs (lease_expires_at)
  where status = 'processing';

comment on table durable_system_jobs is
  'Global provider-neutral durable jobs; no tenant RLS, protected by dedicated database-role grants';
