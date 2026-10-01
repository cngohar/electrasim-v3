# Phase 1.5 — local state, simulation and persistence

Implementation and verification resumed on 2026-09-28 from the existing uncommitted Phase 1.5 work and reached the final local acceptance gate on 2026-09-29. All databases, sessions, browser targets and migrations used localhost and local Wrangler persistence. No deployment or live-account operation occurred.

## Implemented boundaries

- `packages/domain/src/circuitFormat.ts` owns the shared version-1 circuit format. Browser imports, account documents and local restores preserve voltage, device configuration, structured faults and legacy fault fields, with bounded validation and unknown-type rejection.
- `src/store/circuitAccess.ts` centralizes editor mutation authorization. Basic edits remain synchronous and offline. Premium changes check current membership for both the original document and any added requirements; delayed edits cannot overwrite a changed document. Undo/redo retain their history when authorization fails. A released momentary contact cancels its delayed press.
- The existing Comlink simulation worker now runs behind fresh authorization for protected content and drops obsolete results. Safety computation uses the same electrical model regardless of membership or display mode. Naturally occurring hazards are not classified as paid fault injection.
- Migration 0005 adds owner-scoped circuit documents and server-owned diagnosis attempts. Hono validates content, checks primary D1 membership and repeats capability/owner/version predicates in writes. Downgrade preserves reads and raw backups while denying protected edits and accepted results.
- Advanced Diagnosis Lab and every Ohmageddon tier use server-generated scenarios and server-evaluated answers, repairs, counters and scores. Basic version-2 diagnosis selects eligible recipes before generation. Version-1 tickets retain their original generator inputs.
- IndexedDB retains interrupted repair circuits and original scenario records. Explicit basic-copy recovery validates removal choices and writes the original backup before replacing the working copy. A failed backup cancels replacement.

## Gaps closed during this continuation

Paid completion and timeout previously wrote back an active local record, and paid completions did not update aggregate statistics. Finished server attempts now clear that record and update local statistics once. Reloading an attempt returns its server-derived score, including a completion accepted before the browser received its response. Further actions on finished attempts are refused. Abandonment avoids double-counting.

Failed diagnosis startup restores the previous exercise access context; resumed authorized exercises clear their blocked state. A late failed action for an exited exercise cannot mark the replacement exercise blocked.

The paid Playwright fixture now creates its data through a dedicated `scripts/browser-test-worker.ts` entrypoint and the serving Worker's own D1 instance. This removes competing workerd instances opening the same SQLite file. The application Worker does not import this fixture route; the API gate verifies it returns 404 there. Static guide/CSP tests use the ordinary guest fixture.

Relay operation, coil/contact isolation and canonical DPDT port compatibility are recorded in [the relay audit](phase-1-relay-regression.md). A browser regression imports a free SPDT circuit, operates its coil supply from the keyboard, and checks exclusive NO/NC transfer, dropout, derived artwork state and actual Comlink worker use.

The final browser acceptance rerun also closed a saved-circuit UI gap: the selected account document, name and optimistic-concurrency version now live in an owner-scoped Zustand store instead of the lazy modal component. Closing and reopening Saved circuits therefore retains the document needed by Update, while a sign-in/sign-out account change clears it.

## Verification

- Baseline before continuation: `bun run check` passed 1,541 tests in 108 files, typechecks and lint. `bun run test:membership` passed 24 real local D1/cookie/browser groups.
- After the lifecycle fixes: `bun run test:simulator` passed 9 groups, including real Chromium without API mocks. The browser completes a guest exercise offline, signs in and saves a premium document, completes a paid exercise, verifies the cleared active record, reloads after revocation, exports the preserved original and creates a basic copy.
- Targeted lifecycle/access/relay checks passed 44 tests. Final `bun run check` passed all 1,546 tests in 109 files, all project typechecks and repository lint; the added saved-circuit store regression covers same-owner retention and account-change clearing.
- Selected desktop Chromium regression: 48/51 passed in the main run; all three failures passed in the targeted rerun. Two long protection flows needed budgets for actual membership round trips; the Ohmageddon walkthrough now waits for an accepted server version before its next answer instead of a fixed 120 ms. Coverage includes challenges, diagnosis, protection/fault recovery, guides/CSP, paid controls and the new guest relay worker test. No SQLite lock errors recurred with the revised fixture.
- The regular local `.wrangler/state` database is current through migration 0005; the local migration command reported no outstanding migrations.
- `bun run benchmark:simulation` measured 3.14 ms median / 5.62 ms p95 on 200 components and 396 wires after the other CPU-heavy gates finished. This meets the solver median target and does not measure canvas frame rate.
- `bun run test:membership` passed 25 real local D1/cookie/browser groups, and the dedicated relay Chromium test passed 1/1.
- `bun run build`, `check:perf`, `check:links`, `check:seo` and `check:csp` passed. Initial JS: 242,822 bytes gzip (250,000-byte budget); CSS: 26,394 bytes (30,000-byte budget). Internal links covered 193 generated HTML files; SEO covered 191 pages.

Generated evidence stays ignored under `.wrangler/resume-phase15-*.log`; the latest simulator run used `.wrangler/membership-tests-d6IJJl`. The commands and assertions above are committed and reproducible without those local artifacts.

## Remaining Phase 1 work

The sequence was revised on 2026-09-30: [Phase 1.5A closed locally](phase-1-audit-baseline.md). The user resumed and completed 1.5B locally on 2026-10-01; [electrical contracts and graph](phase-1-electrical-contracts.md) passed the full local acceptance gate. Numerical/device work and integration in 1.5C–1.5F must precede the effects phase below.

Phase 1.6 adds visual-only Matter effects. Phase 1.7 covers the broader simulator interface, membership discoverability and mode presentation. Phase 1.8 adds the super-admin membership interface. Phase 1.9 retains the full `bun run verify`, complete device/access matrix and D1/performance gates. The existing dense-canvas 60 fps target remains unresolved; this persistence gate does not claim it is met.

The rail-continuity solver's relay limitations remain explicit: ideal supply detection, bounded static feedback resolution, no coil voltage/transient/mechanical-delay model. Deployment remains disabled pending the user's new Cloudflare account and separate authorization.
