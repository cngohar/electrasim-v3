-- Immutable learner-owned simulator lesson evidence. Instructor assignment visibility will be
-- granted through bounded workspace functions, never by weakening this owner RLS boundary.
create table simulator_lesson_submissions (
  id uuid primary key,
  learner_user_id uuid not null references users(id),
  lesson_id text not null check (lesson_id in ('build_protected_lamp', 'diagnose_open_cpc', 'insulation_fault')),
  circuit_revision integer not null check (circuit_revision > 0),
  completed boolean not null,
  evidence jsonb not null check (jsonb_typeof(evidence) = 'object'),
  submitted_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index simulator_lesson_submissions_learner_idx
  on simulator_lesson_submissions(learner_user_id, submitted_at desc);

alter table simulator_lesson_submissions enable row level security;
alter table simulator_lesson_submissions force row level security;
create policy simulator_lesson_submissions_owner_read on simulator_lesson_submissions for select
  using (learner_user_id = app_private.current_user_id());
create policy simulator_lesson_submissions_owner_insert on simulator_lesson_submissions for insert
  with check (learner_user_id = app_private.current_user_id());
