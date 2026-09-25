# ADR 0009 — Bun on a Managed PaaS with Cloudflare as CDN/DNS Only

- **Status:** Accepted
- **Date:** 2026-09-24
- **Phase:** v3 foundation
- **Deciders:** Product owner and architecture owner
- **Supersedes:** [ADR 0007](./0007-bun-cloudflare-portable-runtime.md)
- **Retains:** Bun-first tooling, strict TypeScript, Web Standards application contracts, PostgreSQL, S3-compatible storage, infrastructure ports, and hosting independence from ADR 0007
- **Plan references:** `PLAN.md` §§2.1, 6.1, 16, 18

## Context

After reviewing Cloudflare Workers documentation, the product owner decided not to run the ElectraSim application backend on Workers. The primary application will be hosted elsewhere, while Cloudflare's free plan will provide authoritative DNS, TLS proxying, CDN caching for eligible public/static responses, basic edge protections available on that plan, and origin shielding where applicable.

The selected initial hosting model is a **managed platform-as-a-service (PaaS)** such as Railway or Render. The exact vendor will be selected during the foundation spike using current region, cost, Bun/container support, PostgreSQL connectivity, health-check, deployment, backup, and operational evidence.

Cloudflare must not become required for application correctness. Requests must continue to work when sent directly to the origin in controlled health and recovery scenarios. Dynamic authenticated pages, grades, payments, assessments, entitlements, and personalized API responses must not be cached accidentally at the CDN.

## Decision

ElectraSim v3 will use this deployment topology:

```text
Browser
  -> Cloudflare free DNS/CDN/TLS proxy
      -> managed PaaS load balancer
          -> portable OCI container running the Bun HTTP server
              -> managed PostgreSQL
              -> S3-compatible object storage
              -> portable queue/job provider
              -> provider-neutral transactional email
```

### Primary runtime and artifact

- Bun is the production application runtime.
- Build one portable, non-root OCI container image from the greenfield workspace.
- The container exposes an HTTP health endpoint and uses graceful startup/shutdown.
- Configuration and secrets are injected at runtime, never baked into the image.
- The application binds to `0.0.0.0` and the platform-provided port.
- The image must run on the chosen managed PaaS and in a local/container test environment without source changes.
- Do not build or maintain a Cloudflare Worker application adapter in the initial production foundation.

### Application portability boundary

Application handlers continue to use Web Platform `Request` and `Response` contracts. The Bun HTTP adapter translates Bun's server request into the shared application entry point. Domain and application packages do not import PaaS-specific SDKs.

A second full production runtime adapter is no longer required in the initial spike. Portability is instead enforced through:

- an OCI-standard image;
- Web Standards application contracts;
- external PostgreSQL;
- S3-compatible object storage;
- owned queue, email, cache, and observability ports;
- provider-neutral health/readiness and migration procedures;
- integration tests that run the production image outside the chosen PaaS.

### Cloudflare boundary

Cloudflare is limited to edge concerns:

- DNS;
- TLS proxying;
- CDN for hashed static assets and explicitly cacheable public content;
- compression and supported transport optimization;
- free-plan security/rate controls where useful;
- optional maintenance routing that does not contain product-domain logic.

Cloudflare Workers, D1, Hyperdrive, KV, Durable Objects, R2, Queues, and Pages are not baseline v3 application dependencies. Adopting any of them later requires an ADR and a provider-exit plan.

### CDN cache policy

Default dynamic behavior is **do not cache**. The origin sets explicit headers:

- hashed immutable assets: `public, max-age=31536000, immutable`;
- public versioned content where safe: explicit bounded `s-maxage` plus revalidation policy;
- HTML requiring per-request variation: short or no shared caching according to route review;
- authenticated pages/APIs, sessions, grades, assessments, payments, entitlements, personal feeds, and private files: `private, no-store`;
- responses setting cookies: never shared-cacheable;
- private downloads: short-lived signed origin/object-storage URLs, not public CDN objects.

Cloudflare cache rules must be represented as version-controlled infrastructure/configuration and tested against representative routes. Cache keys must not silently omit authorization, tenant, locale, or content version where those dimensions matter.

### Origin protection

- Accept proxied traffic through the managed PaaS controls available; do not assume a hidden origin if the platform cannot restrict ingress safely.
- Validate forwarded-proxy headers only from trusted proxy hops.
- Preserve the original scheme and client IP using an explicit trusted-proxy policy.
- Apply application-level authentication, authorization, CSRF, idempotency, and rate limits at the origin; CDN controls are defense in depth.
- Maintain an emergency procedure for DNS/CDN bypass without disabling TLS or exposing secrets.

### Data services

- Use managed PostgreSQL outside Cloudflare as the source of truth. Provider selection remains independent from the application PaaS where practical.
- Use S3-compatible object storage outside Cloudflare for course assets, submissions, exports, and simulator artifacts.
- Select a portable durable-job mechanism during the spike. Financial, grade, entitlement, and XP correctness remains transactionally recorded in PostgreSQL/outbox state.
- Use the accepted provider-neutral email boundary: Resend at launch, with Amazon SES as an alternative.

### Managed PaaS selection gate

Evaluate Railway and Render, plus another managed option if evidence warrants it, using a dated comparison of:

- Bun and OCI-container support;
- deployment and rollback behavior;
- regions and latency for initial markets;
- health checks, zero/low-downtime rollout, autoscaling, and restart behavior;
- private networking and managed PostgreSQL connectivity;
- persistent egress IP requirements for providers;
- log/metrics/export support;
- backup/restore and disaster-recovery capabilities;
- bandwidth, storage, compute, and idle/sleep pricing;
- custom domains behind Cloudflare;
- contractual, residency, and support requirements;
- ease of exporting data and moving the same container elsewhere.

Do not encode the selected PaaS name into domain package names or public product contracts.

## CI and deployment gates

Every release candidate must pass:

1. formatting/lint and `tsc --noEmit`;
2. Bun unit, integration, and contract tests;
3. PostgreSQL migration tests;
4. Playwright browser journeys;
5. OCI image build and vulnerability scan;
6. non-root/container security assertions;
7. production-image smoke tests against a disposable PostgreSQL instance;
8. graceful shutdown and health/readiness tests;
9. cache-header tests for public, authenticated, tenant, payment, and assessment routes;
10. staging deployment behind Cloudflare with origin and proxied health checks;
11. rollback rehearsal for schema-compatible releases.

## Rationale

- Running Bun directly removes the Worker/Bun runtime mismatch from the primary deployment.
- A managed PaaS lowers initial operational load compared with a self-managed VM.
- A portable OCI image is a stronger practical exit mechanism than maintaining an unused second runtime adapter.
- Cloudflare remains useful for global DNS, TLS, and eligible content delivery without owning product-domain execution or data.
- Explicit cache policy prevents CDN use from compromising tenant isolation, privacy, grading, or payment correctness.

## Consequences

### Positive

- Bun is both the primary toolchain and production runtime.
- The same image can move to another PaaS, Kubernetes, a VM, ECS, or another OCI-compatible environment.
- Application code has no Workers/Hyperdrive/R2 dependency.
- Cloudflare can be removed or replaced without changing product-domain logic.
- Managed hosting reduces patching and infrastructure administration compared with a raw VM.

### Costs and limitations

- The PaaS origin may have higher regional latency than edge-executed Workers; measure rather than assume.
- Cloudflare's free CDN does not replace application compute, durable jobs, database pooling, or object-storage design.
- Dynamic application traffic still reaches the origin and contributes to PaaS bandwidth/compute usage.
- Vendor-specific deployment configuration and operational limits still require documentation and periodic exit testing.
- Direct WebSocket/SSE behavior, connection limits, and idle timeouts must be verified on the selected PaaS and through Cloudflare.

## Foundation spike acceptance criteria

Before production feature implementation:

- the Bun server exposes shared `Request`/`Response` application handlers;
- a production OCI image runs locally as non-root and on both shortlisted PaaS trials without code changes;
- health, readiness, graceful shutdown, environment validation, and structured logs work;
- PostgreSQL migration/read/write and S3-compatible object read/write work through ports;
- one durable outbox job is processed idempotently;
- the application is reachable through Cloudflare proxy and custom-domain staging;
- authenticated/private responses are proven `private, no-store` and cannot be served cross-user;
- hashed assets are cached correctly and invalidation/versioning behavior is demonstrated;
- WebSocket/SSE needs, if retained, pass timeout/reconnection tests;
- deployment, rollback, backup restore, CDN bypass, and provider exit procedures are documented;
- a dated Railway-versus-Render decision record selects the initial PaaS.

## Revisit triggers

Revisit this ADR if managed PaaS cost or limits exceed targets, latency fails SLOs, a residency/customer requirement demands another topology, the application requires specialized long-running compute, or Cloudflare edge compute becomes justified by measured—not hypothetical—need.
