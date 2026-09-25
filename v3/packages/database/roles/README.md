# PostgreSQL runtime roles

`001_runtime_roles.sql` is an administrative provisioning script, not an application migration. Run it only after migrations 0001–0004 using the managed PostgreSQL administrative identity.

The script creates or hardens three fixed group roles:

- `electrasim_auth` — Better Auth global credential/session tables and producer-only job enqueue;
- `electrasim_app` — request-time lifecycle fields and RLS-protected authorization reads;
- `electrasim_worker` — durable job claims and idempotent workspace provisioning.

The provider should create separate LOGIN identities, grant each exactly one group role, and place their URLs in `AUTH_DATABASE_URL`, `APPLICATION_DATABASE_URL`, and `WORKER_DATABASE_URL`. Never put role passwords in this repository or in migration SQL.

Before production, execute the real-PostgreSQL role suite and verify all three roles are `NOSUPERUSER`, `NOBYPASSRLS`, and do not own tenant tables. PGlite cannot prove those properties.
