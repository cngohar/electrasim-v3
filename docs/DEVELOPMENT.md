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
| Lint and run affected unit tests for a small fix | `bun run check:changed` |
| Check the phase runner after changing gate tooling | `bun run test:gates` |
| Check domain core types/lint/tests | `bun run check:core` |
| Work in the app with hot reload | `bun run dev` |
| Build assets for inspection | `bun run build` |
| Accept the E.1 source/editing/measurement milestone | `bun run verify:phase-1.5e1` |
| Accept the E.2 motor/coil/pole milestone | `bun run verify:phase-1.5e2` |

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

All phase commands support named stages through the shared runner:

```sh
bun run verify:phase-1.5e2 --list
bun run verify:phase-1.5e2 --only unit
bun run verify:phase-1.5e2 --only browser
bun run verify:phase-1.5e2 --from test:domain-local
bun run verify:phase-1.5e2 --from build --dry-run
```

`--from` starts at that stage and runs the remaining stages; `--only` runs the named
stage or comma-separated stages in their original order. `--list` and `--dry-run`
show commands without executing them. Types, lint and unit tests are separate
stages, so a unit-test failure need not repeat a successful typecheck. A normal
invocation without selectors still runs every required check.
Gates with multiple browser groups list them as `browser`, `browser:2`, etc.

These options select work explicitly; they do not cache or certify skipped checks.
Selected runs report partial acceptance. Retain earlier evidence only when the fix
leaves the checks' inputs and behavior valid, and rerun from the earliest affected
stage. Changes to shared solver/contracts/catalogue, dependencies, runtime wiring,
authorization or test/build configuration can affect multiple stages and require
broader verification. Rebuild before checking generated assets when their inputs
change. For a small isolated fix after a gate attempt, a focused rerun plus valid
earlier evidence can close that attempt; a new milestone still needs evidence for
every required stage. Do not turn a partial run into a full-gate claim.

`check:changed` runs repository lint and Vitest tests affected by staged, unstaged
and untracked Git changes. It can report no relevant unit tests for documentation
or standalone script edits. It is a development check; typechecks, browser/runtime
checks and phase acceptance remain separate. After committing, supply a comparison
reference to `test:changed` (for example `bun run test:changed HEAD~1`) to check the
committed change.

Every Worker, D1, browser and performance target stays on localhost, with Wrangler `--local` and
isolated local persistence. These faster commands do not change the local-only rules, membership
authorization gates or final Phase 1 acceptance requirements. See [AGENTS.md](../AGENTS.md),
[Phase 1](phases/phase-1-simulator-core.md) and [performance guidance](PERFORMANCE.md).
