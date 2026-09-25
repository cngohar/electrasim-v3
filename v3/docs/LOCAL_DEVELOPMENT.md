# Local integrated validation

This is the required stage before any Railway, Render, or Cloudflare trial. It runs the Bun application against local PostgreSQL with separate auth, application, and worker login roles and captures transactional email in memory.

## Requirements

- Bun 1.4.2
- Docker with Compose, or an equivalent PostgreSQL 17 installation

The Arena sandbox currently has no Docker/Podman/PostgreSQL executable, so the Compose path is committed but cannot be executed in this environment. PGlite and all application tests still run here.

## Start

```bash
cd v3
cp env.local.example .env.local
bun install --frozen-lockfile
docker compose -f compose.local.yml up -d postgres
set -a; source .env.local; set +a
bun run dev
```

Open <http://localhost:3000/app>.

The local database initializes all reviewed migrations and then provisions three constrained logins:

- `electrasim_auth`
- `electrasim_app`
- `electrasim_worker`

Local passwords are intentionally fixed and loopback-only. Never reuse them for hosted or shared environments.

## Account flow

1. Select **Create account**.
2. Register with a test email.
3. Select **Open local mailbox** and open the captured verification link.
4. Sign in.
5. Complete adult eligibility, goal, experience, supply family, accessibility, safety, and completion steps.
6. Confirm the personal home and free-sandbox entry appear.

Captured messages are available only in development capture mode at `GET /api/dev/emails`. Production rejects capture mode during configuration validation.

## Validation

```bash
bun run check
curl -fsS http://localhost:3000/health
curl -fsS http://localhost:3000/ready
```

Then run the browser flow at desktop, tablet, and phone widths. Confirm keyboard navigation, visible focus, no horizontal overflow, reduced-motion behavior, and readable supporting text.

## Reset

```bash
docker compose -f compose.local.yml down -v
```

The `-v` is intentional for a complete disposable reset. Do not use it against a non-local database.
