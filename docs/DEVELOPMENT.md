# Local development feedback

Use a small feedback loop while editing, then run the required phase gate when the milestone is
ready. `bun run build` builds Vite/Astro assets and post-processes them; it does not run Vitest,
Playwright or Worker/D1 acceptance. Those checks are included in `check`/`verify` and the scoped
phase commands.

| Work | Command |
|------|---------|
| Run one test file once | `bun run test packages/domain/src/core/phasor.test.ts` |
| Watch one feature's tests | `bun run test:watch packages/domain/src/core/phasor.test.ts` |
| Run tests related to specified source files | `bun run test:related packages/domain/src/core/phasor.ts` |
| Run tests affected by current Git changes | `bun run test:changed` |
| Check domain core types/lint/tests | `bun run check:core` |
| Work in the app with hot reload | `bun run dev` |
| Build assets for inspection | `bun run build` |
| Accept the E.1 source/editing/measurement milestone | `bun run verify:phase-1.5e1` |

`test:related` and `test:changed` use Vitest's dependency graph. A shared compiler, catalogue or
configuration change can affect many tests and should run them. File-specific tests are fastest
for a narrow edit; they do not prove every importing consumer still works. `check:core` covers the
domain core's strict indexed-access typecheck, lint and core tests; it is not the full app/access/
Astro/API typecheck or a browser acceptance command.

During implementation, use the targeted checks appropriate to the affected behavior. Before
closing the milestone, run its full required local gate. If the gate passes type/unit/build checks
then exposes a runtime failure, fix the failure and rerun that focused stage first. Repeat broader
checks when the fix affects them; previously passing unrelated checks need not be rerun for an
unchanged implementation. Record split runs accurately instead of claiming one end-to-end pass.

Every Worker, D1, browser and performance target stays on localhost, with Wrangler `--local` and
isolated local persistence. These faster commands do not change the local-only rules, membership
authorization gates or final Phase 1 acceptance requirements. See [AGENTS.md](../AGENTS.md),
[Phase 1](phases/phase-1-simulator-core.md) and [performance guidance](PERFORMANCE.md).
