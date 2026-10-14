# Standard learning modes cleanup

Status: complete locally within this removal scope. The subsequent [Phase 1.9 verification](phase-1-full-verification.md) closed locally with user-accepted performance exceptions on 2026-10-12.

The user requested removal of the optional modifier-driven diagnosis mode on
2026-10-10. Phase 1.9 verification was paused at the user's request; its earlier
partial browser/API results do not certify this changed tree.

## Resulting contract

- Learning modes are Challenge Mode and Diagnosis Lab. Diagnosis Lab retains
  beginner, intermediate and advanced difficulty, normal repair grading, hints,
  elapsed-time scoring and deterministic seed replay.
- Removed settings, tier UI, presentation/circuit/fault modifiers, timed grading,
  generator profile inputs, shared-ticket extras, API mode options, package
  exports, dedicated tests/stress command, marketing cards and documentation.
- Ordinary generated identities retain the reserved hash slot so existing
  standard seeds keep their identities. Replay rejects unsupported modes and
  extra generation fields. Old nonstandard exercise snapshots cannot resume or
  earn fresh grades; ordinary saved exercises retain their existing handling.
- Current and historical gate definitions now run the two remaining stress
  commands. Earlier counts stay historical; they cannot be applied to the new
  tree or described as a renewed full green phase gate.
- The local data-only migration refreshes untouched seeded benefit copy while
  preserving operator-edited descriptions, plans, grants and circuits.

## Local evidence

- `bun run check`: all project typechecks, the **152-module** pure-domain
  boundary and lint passed, followed by **142 files / 2,147 unit tests**.
  Evidence: `.wrangler/mode-removal-check-final.log`.
- `bun run test:membership`: **36 groups passed** against real local Worker/D1
  and cookie sessions. This includes advanced server-owned diagnosis, repair
  grading, reload, revocation and the real paid browser/API boundary. Evidence:
  `.wrangler/mode-removal-membership.log` and
  `.wrangler/membership-tests-cNOBua/`.
- `bun run test:domain-local`: **842 exact parity cases passed**, including
  simulation/compiler/preflight/MNA behavior. Evidence:
  `.wrangler/mode-removal-domain-local.log` and
  `.wrangler/domain-tests-8V74nI/`.
- `bun run test:graph`: **5 tests passed**. Evidence:
  `.wrangler/mode-removal-graph-tests.log`.
- Migration `0006_diagnosis_benefit_copy.sql` was applied to the normal local
  `.wrangler/state` database with Wrangler `--local`. Fresh test databases apply
  the same migration through their existing local startup routines.
- The working source, documentation and filenames contain no retired mode
  identifiers or dedicated module paths. Unused symptom-masking/placement
  helpers and modifier-only test cases were removed as part of the final review.
- `bun run build`: simulator and Astro output built successfully. Final
  `check:perf`, `check:links`, `check:seo` and `check:csp` passed: **250,689 B
  gzip initial JS / 300,000 B**, **27,173 B CSS / 30,000 B**, **194 HTML link
  checks** and **191 SEO pages**. Evidence:
  `.wrangler/mode-removal-build-final.log`.
- Focused Diagnosis Lab and assessment browser command recorded in the graph:
  **20 passed / 1 expected Safari clipboard skip** in one final uninterrupted
  run across Chromium desktop, Pixel 7 Chrome and iPad Safari. Covers ordinary
  difficulty controls, both required answers, wrong-answer continuity, clipboard
  replay, exact Comlink simulation, real repairs/reload and obsolete-model
  rejection. Evidence: `.wrangler/mode-removal-browser-verified.log`.
- The final Astro layout uses two desktop columns and one phone column for its
  two learning cards. A browser checked both computed layouts; screenshots were
  reviewed at `.wrangler/mode-removal-landing-desktop.png` and
  `.wrangler/mode-removal-landing-phone.png`. The built assets contain no retired
  mode identifiers. The refreshed graph contains no retired feature nodes or
  edges; Git deletion paths remain legitimate freshness metadata.

The initial browser attempt exposed a removed panel-opening step in the test
helper; it was restored.
The next run passed 19 cases, skipped Safari clipboard permissions and failed
the desktop clipboard case while opening the fresh replay page. That failed
attempt remains recorded in `.wrangler/mode-removal-browser-final.log` and is
not represented as a passing run. The successful final browser run held source
steady and ran after type/lint/unit checks and the simulator/Astro build. The
only later display change was the Astro two-column CSS, which received a renewed
build, static checks and the desktop/phone layout review.

All bindings, migrations and browser URLs remain local. The D1 burst in the
membership suite proves authenticated content/ownership behavior; its HTTP
timings include auth, queueing and transport and are not SQL-latency evidence.

## Knowledge and handoff

The `diagnosis-standard-only` graph feature maps the domain, persistence,
settings, API and Astro entry points to the checks and this evidence. Its review
is scoped to this removal. Unreviewed/changed baselines for earlier and future
features are not renewed. A matching fingerprint does not claim a passing test.
Phase 1.9 retains its paused/partial status and its documented performance and
browser follow-up work.

Local app, admin page and Worker health were restarted and returned HTTP 200.
The built Astro preview is available separately on port 8788. No publication,
remote migration, deployment, account operation or credential change occurred.
