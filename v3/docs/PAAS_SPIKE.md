# Managed PaaS Foundation Spike — Railway vs Render

- **Status:** Local foundation implemented; live provider trials pending deployment credentials, region selection, and cost approval.
- **Date:** 2026-09-24
- **Decision authority:** ADR 0009

## Artifact under test

The same `v3/Dockerfile` must be built on both platforms. No source conditional may inspect `RAILWAY_*` or `RENDER_*` variables to change product behavior. Runtime configuration is limited to ordinary environment variables and provider-neutral connection URLs.

## Evidence matrix

| Criterion | Railway trial | Render trial | Required evidence |
|---|---|---|---|
| Build portable Dockerfile | Pending live trial | Pending live trial | Build log and image digest |
| Bun 1.4.2 runtime | Defined | Defined | `/health` runtime header and startup log |
| Health/readiness behavior | Configured | Configured | rollout and failure screenshots/logs |
| Custom domain behind Cloudflare | Pending | Pending | proxied DNS, TLS, cache-status checks |
| Graceful SIGTERM | Local code complete | Local code complete | deploy/restart log with in-flight request test |
| PostgreSQL connectivity | Port pending adapter ADR | Port pending adapter ADR | migration/read/write test |
| S3-compatible storage | Contract implemented | Contract implemented | put/get/delete against candidate provider |
| Durable outbox worker | Contract implemented | Contract implemented | idempotent retry evidence |
| WebSocket/SSE | Product need unresolved | Product need unresolved | timeout/reconnect test if retained |
| Region availability/latency | Pending market test | Pending market test | p50/p95 from launch regions |
| Rollback | Pending | Pending | previous-image rollback rehearsal |
| Logs/metrics export | Pending | Pending | structured-log and alert export |
| Backup/restore | Pending | Pending | timed restore rehearsal |
| Monthly cost | Pending usage model | Pending usage model | dated compute/egress/database estimate |
| Provider exit | OCI image defined | OCI image defined | run image on independent environment |

## Local evidence completed

- Bun 1.4.2 lockfile generated from a clean workspace install.
- Biome checked 18 foundation files with no errors.
- TypeScript 7.0.2 strict `tsc --noEmit` passed.
- Bun ran 24 HTTP/configuration/port/tenancy tests with 84 assertions: all passed.
- The full tenancy migration executed in PGlite as a supplemental PostgreSQL-compatible syntax/catalog check; forced RLS, policies, and cross-tenant hierarchy rejection were verified. Real managed PostgreSQL remains mandatory for role/pool isolation.
- Bun produced a 3.42 kB minified server bundle plus source map.
- Source server and production bundle both bound to `0.0.0.0`, returned healthy responses, and logged structured startup/request/shutdown events.
- `/health`, `/ready`, and `/v1/session-probe` returned `private, no-store`.
- `/public/version` returned the bounded public CDN policy.
- SIGTERM produced an orderly `server.stopping` → `server.stopped` sequence.
- OCI image build remains unverified locally because this environment has no Docker/Podman daemon.

## Selection rule

Do not choose by landing-page price alone. The selected platform must:

1. run the unchanged non-root OCI image;
2. meet health, graceful shutdown, deploy, rollback, and observability gates;
3. offer acceptable latency to US and international launch users;
4. provide predictable compute and egress costs for simulator/LMS traffic;
5. connect securely to managed PostgreSQL and object storage;
6. work behind Cloudflare without caching private responses;
7. allow the same image and data to leave the platform.

If both pass, prefer the platform with simpler rollback/operations and the lower measured total cost. Record the final provider in a follow-up ADR; the application architecture remains provider-neutral.

## Cloudflare verification cases

Test through the proxied staging domain:

- hashed static asset returns a long-lived public cache policy and reaches `HIT` after warm-up;
- `/public/version` follows its bounded public policy;
- `/health`, `/ready`, and `/v1/session-probe` remain uncached;
- responses with cookies or authorization never become shared-cache hits;
- two test accounts cannot receive each other's personalized response;
- bypassing Cloudflare through a controlled origin test produces equivalent application behavior;
- forwarded scheme/IP/request IDs are accepted only under the trusted-proxy policy.

## Local limitations

This repository environment currently has no Docker/Podman daemon and no configured Railway or Render account. Bun checks can be executed via the pinned Bun package fetched from the npm registry, but OCI image construction and live PaaS/CDN evidence require the deployment environment. These are explicit pending gates, not assumed successes.
