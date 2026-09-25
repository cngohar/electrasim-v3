# Changelog — ElectraSim v3

All notable v3 planning and implementation changes are recorded here. The completed v2 history is preserved in [`docs/archive/CHANGELOG-v2-legacy-2026-09-24.md`](./docs/archive/CHANGELOG-v2-legacy-2026-09-24.md).

## [Unreleased]

### Added
- Audit-backed greenfield v3 master plan with explicit product, LMS, simulator, tenancy, payments, community, quality, and delivery boundaries.
- Full source and rendered-UX evidence report at [`docs/audits/V3_CODEBASE_UX_AUDIT.md`](./docs/audits/V3_CODEBASE_UX_AUDIT.md), including retained Chromium captures.
- Standalone responsive shell prototype at [`docs/prototypes/v3-shell-demo.html`](./docs/prototypes/v3-shell-demo.html) with mandatory onboarding, electrical-blue identity, persistent sidebar, mobile navigation, free sandbox positioning, and a non-dashboard personal home.
- Interactive simulator workbench prototype at [`docs/prototypes/v3-simulator-workbench-demo.html`](./docs/prototypes/v3-simulator-workbench-demo.html), linked from the learner home and organized around Build, Test, Diagnose, and Review rather than generic dashboard panels.
- Animated fault lab at [`docs/prototypes/v3-fault-animation-demo.html`](./docs/prototypes/v3-fault-animation-demo.html), comparing safe breaker operation with failed protection, conductor overheating, persistent damage, and an open-conductor outcome using run/pause/step/reset controls.
- ADR 0008 accepting deterministic electrical/thermal outcomes with mandatory animation, explicit persistent-damage lifecycles, selective Matter.js use, reduced-motion parity, and animation release gates.
- ADR 0009 superseding ADR 0007's Worker deployment: Bun now runs the production application in a portable OCI container on a managed PaaS, while Cloudflare is limited to free DNS/CDN/TLS edge duties.
- Isolated greenfield implementation foundation under [`v3/`](./v3/): pinned Bun workspace, strict TypeScript, portable Web Request/Response application, Bun server, cache-policy probes, infrastructure ports, contract tests, production bundle, non-root Dockerfile, and Railway/Render trial configurations.
- Managed-PaaS evidence matrix at [`v3/docs/PAAS_SPIKE.md`](./v3/docs/PAAS_SPIKE.md), separating completed local evidence from pending live deployments and OCI verification.
- ADR 0010 and the first PostgreSQL tenancy foundation: global users, personal/instructor/institution workspaces, hierarchy, scoped RBAC, separate platform roles, invitations, audit/outbox records, transaction-local context, forced RLS policies, and composite hierarchy keys that prevent cross-tenant parent relationships.
- ADR 0011 and the Better Auth 1.7.5 account foundation: email/password verification and recovery, passkey/MFA storage, explicit origin controls, raw Web Request mounting, mandatory onboarding gates, idempotent personal/instructor provisioning, session-aware authorization policies, provider-neutral transactional-email port, and PGlite signup integration coverage.
- Versioned authorization catalog with stable platform, personal, independent-instructor, and institution roles and permissions.
- Durable global system-job queue with leases, idempotent enqueue, bounded retries, redacted failures, personal-workspace reconciliation dispatch, and provider-neutral transactional email processing.
- Resend transactional-email adapter with reviewed first-party verification, recovery, invitation, and security templates; provider calls use message idempotency keys.
- Ordered onboarding persistence and `/api/account/onboarding`, platform-admin MFA gating, exact-workspace protected route handling, Better Auth session resolution, and database-backed permission resolution.
- Administrative PostgreSQL role/grant script separating Better Auth, request-time application, and worker connections without superuser or RLS-bypass privileges.
- Email-bound institution and independent-instructor invitation acceptance with hashed high-entropy tokens, explicit role ceilings, idempotent membership activation, audit, and outbox writes.
- Session-bound password step-up using Better Auth verification, forced self-RLS proof records, and permission/MFA/fresh-proof gates for high-risk job operations.
- Redacted administration job-health summaries exposing counts and failure classes without job payloads or authentication links.
- First integrated redesign implementation at `/app`: electrical-blue responsive navigation, adult authentication, mandatory onboarding, local verification mailbox, dual-voltage setup, and a spacious free-sandbox home wired to real APIs.
- Development-only transactional-email capture adapter and no-store mailbox endpoint; production explicitly rejects capture mode.
- Loopback-only PostgreSQL 17 Compose profile applying all migrations and provisioning separate local auth, application, and worker logins before any hosting trial.
- Permission-gated invitation issuance and revocation with role ceilings, seven-day expiry, durable email enqueue, audit/outbox atomicity, and redesign deep-link continuity through onboarding.
- ADR 0012 and `@electrasim/localization`: BCP 47 preference resolution, English fallback, Intl formatting, RTL detection, translated-content versioning rules, and safety-translation review gates.
- Desktop, tablet, and mobile prototype captures under `docs/prototypes/images/`.
- Bounded first-party Content Studio with immutable revisions, review/publication lifecycle, private-to-published media linkage, legacy import, horizontal Platform Switchboard editor, and safe public article/page rendering.
- Account-security surface for passkeys, TOTP recovery, session management, same-user passkey step-up, and idempotent independent-instructor/institution-root creation.
- Deterministic animated simulator vertical slice with circuit/command/event contracts, regional-supply execution, thermal/protection faults, persistent damage and repair, responsive drawers, accessible evidence, JSON import/export, and npm-distributed Chromium visual validation.
- Member-owned simulator projects with immutable revisions, forced RLS, opaque public sharing, authenticated save/reopen APIs, and transactionally enforced five-project Free/unlimited-Pro quota semantics.
- Typed simulator policy and electrical-profile catalog, provider-neutral database-backed Pro entitlements, an account project library, and technical-hybrid source/MCB/conductor/lamp visuals with explicit schematic terminals and state overlays.
- Responsive horizontal teaching-workspace administration with self-workspace discovery/switching, campus and department creation, permission-bounded adult rosters, invitation role ceilings, MFA/step-up-protected membership status changes, protected owners, and auditable writes.
- Dependency-free simulator kernel v0 with stable terminal references, AC/DC-ready terminal roles, strict circuit validation, modified nodal analysis for resistive networks, real branch-specific voltage/current/power, deterministic per-conductor thermal state, per-breaker inverse-time state, and renderer-independent events. Pakistan is visibly included in the international 220–240 V supply family while installation-rule packs remain separate.
- Physical open-component, open-terminal, finite-impedance bridge, and terminal-swap faults; complex RMS phasor solving; explicit source windings; per-winding telemetry; North American 120/240 V split-phase support; and balanced 230/400 V three-phase wye fixtures.
- Reproducible SVG/PixiJS 8.21 renderer benchmark with 12 desktop/mobile density cases, animated technical-hybrid scene parity, parallel-DOM accessibility gates, raw JSON evidence, and a hardware-acceleration production-adoption gate.
- Protection and fault-loop kernel v0.1 with solved complex source/loop impedance, explicit TN-S/TT/open-PE fixtures, separate IEC 60898/IEC residual/UL manufacturer/Class A GFCI behavior, I²t/touch/interruption evidence, deterministic hazard chronology, coordinated protection goldens, and reduced-motion-equivalent SVG fault animation.
- Circuit schema v2 with fail-closed v1 migration, explicit warnings for non-standard legacy breaker timing, actual imported-circuit execution, v2 project saves, immutable v1 database revision compatibility, and rejection of unknown future versions.
- Dedicated TN-C-S, impedance-earthed IT, and North American grounded-system fixtures; open PEN/EGC hazards; insulation-monitor alarms; local-reference touch potential; bounded installation-rule evidence; fail-closed manufacturer let-through data; conductor adiabatic checks; and a 50-case deterministic earthing/fault golden matrix.
- Free-form schema-v2 simulator editor with blank-circuit creation, a seven-part Free equipment bench, terminal-to-terminal wiring, drag positioning, bounded property editing, server-validated inverse commands, undo/redo, saved SVG layout, accessible component/terminal controls, and topology-driven simulation. Original technical-hybrid SVG equipment adds recognizable field-device construction without falsely claiming exact manufacturer identity or certification.
- Editor usability v0.4 with persisted pointer-centered zoom, Shift/middle-button panning, fit-view framing, keyboard grid movement, accessible wire selection/deletion, draggable visual bend points, automatic route restoration, and inverse commands that preserve routes across disconnects and component removal.
- Electrical assemblies and measurement v0.5: ideal multi-terminal junctions, electrically distinct neutral and protective bars, visual consumer-unit/service-panel enclosures, a 10 MΩ voltmeter, low-burden series ammeter, non-invasive clamp meter, explicit open-lead/over-range/no-target states, generic high-fidelity instrument SVGs, Shift multi-selection, atomic group movement, and alignment controls.
- Safe diagnostics v0.6 with a persisted prove–isolate–lock–test–re-prove state machine, normal-energization lockout, two-probe terminal selection, lead resistance/nulling, graph-solved continuity, insulation-fault resistance, selectable educational test voltages, 30 V live-circuit inhibition, modeled capacitive charge, mandatory automatic discharge, validated HTTP transitions, and a responsive diagnostic workplane.
- Advanced authoring and component breadth v0.7: drag selection rectangle, copy/paste/duplicate, 90-degree rotation, center/middle alignment, horizontal/vertical distribution, persisted enclosure containment, DIN-rail snapping, direct diagnose-mode probe placement, reactive loads, motors, relay contacts, contactors, generic regional socket/outlet assemblies, and directly authorable 230/400 V three-phase supply.
- Guided diagnostics v0.8: domain-level lockout of normal energization, controlled lock release after re-prove/discharge, open-CPC, high-resistance-joint, neutral-earth-bond, insulation-damage, and parallel-path fixtures, plus deterministic protected-lamp, open-CPC, and insulation guided lesson evaluations through the UI and HTTP API.
- Worker/transient/scale hardening v0.9: bounded worker-hosted simulation with abort/timeout/queue controls, separately bundled production worker, deterministic motor inrush that feeds protection and thermal calculations, and selected-component voltage-drop/current/real-power evidence.
- Control/LMS/scale v0.10: solved AC control coils with deterministic relay/contactor coupling and pickup/release events, validated contact references, authenticated immutable lesson submissions with forced-RLS PostgreSQL persistence, a workbench LMS submission action, and a 100-branch worker-hosted scale case.
- Dual visuals and regional conversion v0.11: persistent beginner-icon/technical-hybrid switching across the component bench and canvas, immediate live wire movement during component dragging, and confirmation-gated conversion of compatible source, protection, load, coil, and outlet defaults when changing regional supply families.
- Context menu and engineering review v0.12: target-aware component/wire/canvas commands, keyboard menu operation, a visible and consistently enforced 30–375% zoom range, browser proof of pre-release live-wire movement, immediate active-worker cancellation, escaped Account Security dynamic values, and reduced drag-routing work.

### Changed
- Declared v3 a line-1 rewrite; v2 remains a behavioral reference and fixture source only.
- Adopted Bun-first development and production tooling with required TypeScript and browser-test exceptions, packaged as a portable non-root OCI container.
- Selected a managed PaaS as the primary application host, with Railway and Render to be compared during the foundation spike; Cloudflare remains free DNS/CDN/TLS only.
- Kept PostgreSQL, S3-compatible storage, Web Standards APIs, queue/email ports, and the container artifact hosting-independent.
- Defined adults-only, US 110–120 V and international 230–240 V launch coverage.
- Defined a complete first-party LMS, independent-instructor workspaces, institution hierarchy, tenant-aware RBAC, and teaching-context-only assessments.
- Locked free registered-user sandbox access, capped one-time sandbox XP, Binance Pay and NOWPayments, deferred cards, and the limited no-chat community model.
- Made simulator animation a non-negotiable launch requirement, with deterministic domain events driving SVG/Canvas/WebGL/Web Animations and selective Matter.js physical responses.
- Improved the workbench prototype with independently collapsible desktop panels, responsive Parts/Inspector drawers, and larger, higher-contrast supporting text—especially Free sandbox and Why this matters guidance.
- Selected a provider-neutral transactional email boundary: Resend preferred for launch and Amazon SES retained as a scale/cost alternative.
- Kept global Better Auth tables outside tenant RLS so pre-tenant signup/verification works; production isolation now requires a separate least-privilege authentication database role while all tenant-owned tables remain forced-RLS protected.

### Removed
- v2 release history from the active v3 changelog; it remains available in the archive linked above.
- User-account/data migration work from v3 scope because there are no current users to migrate.
